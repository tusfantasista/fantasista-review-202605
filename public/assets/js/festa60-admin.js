(function () {
  const token = document.getElementById("admin-token");
  const message = document.getElementById("admin-message");
  const body = document.getElementById("applications-body");
  const paymentFilter = document.getElementById("payment-filter");
  const emailDraft = document.getElementById("email-draft");
  const emailSubject = document.getElementById("email-subject");
  const emailBody = document.getElementById("email-body");
  const emailMailto = document.getElementById("email-mailto");
  let rowsCache = [];

  document.getElementById("load-applications").addEventListener("click", loadApplications);
  document.getElementById("export-csv").addEventListener("click", exportCsv);
  document.getElementById("import-csv").addEventListener("click", importCsv);
  paymentFilter.addEventListener("change", () => renderApplications(rowsCache));
  body.addEventListener("click", handleTableAction);

  async function loadApplications() {
    setMessage("読み込み中です...", "");
    try {
      const result = await apiJson("/api/festa60/admin/applications");
      rowsCache = result.applications || [];
      renderApplications(rowsCache);
      setMessage(`${result.applications.length}件を読み込みました。`, "success");
    } catch (error) {
      setMessage(error.message, "error");
    }
  }

  async function exportCsv() {
    try {
      const response = await fetch("/api/festa60/admin/export", { headers: adminHeaders() });
      if (!response.ok) throw new Error("CSVエクスポートに失敗しました。");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "festa60-applications.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message, "error");
    }
  }

  async function importCsv() {
    setMessage("CSV取込中です...", "");
    try {
      const csv = document.getElementById("csv-input").value;
      const result = await apiJson("/api/festa60/admin/import", {
        method: "POST",
        body: JSON.stringify({ file_name: "dummy-members-preview.csv", csv }),
      });
      setMessage(`取込完了: ${result.inserted}件追加 / ${result.updated}件更新 / ${result.errors}件エラー`, "success");
    } catch (error) {
      setMessage(error.message, "error");
    }
  }

  async function apiJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...adminHeaders(),
        ...(options.headers || {}),
      },
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || result.error || "API error");
    return result;
  }

  function adminHeaders() {
    return token.value ? { "x-admin-token": token.value } : {};
  }

  function renderApplications(rows) {
    const filter = paymentFilter.value;
    const visibleRows = filter ? rows.filter((row) => row.payment_status === filter) : rows;
    if (!visibleRows.length) {
      body.innerHTML = '<tr><td colspan="10">申込はまだありません。</td></tr>';
      return;
    }
    body.innerHTML = visibleRows
      .map(
        (row) => `<tr>
          <td>${escapeHtml(row.application_code)}</td>
          <td>${escapeHtml(row.full_name)}<br><span class="crm-small">${escapeHtml(row.email)}<br>${escapeHtml(row.phone || "")}</span></td>
          <td>${escapeHtml(row.quantity || 1)}</td>
          <td>${formatYen(row.total_amount_jpy || row.amount_total)}</td>
          <td>予定: ${escapeHtml(row.expected_transfer_name || "-")}<br><span class="crm-small">実際: ${escapeHtml(row.actual_transfer_name || "-")}<br>外部ID: ${escapeHtml(row.external_payment_id || "-")}<br>メモ: ${escapeHtml(row.admin_note || "-")}</span></td>
          <td>${escapeHtml(methodLabel(row.payment_method))}<br><span class="crm-small">${escapeHtml(providerLabel(row.payment_provider))}</span></td>
          <td><strong>${escapeHtml(statusLabel(row.payment_status))}</strong></td>
          <td>${escapeHtml(row.match_status)}<br><span class="crm-small">${escapeHtml(row.member_code || "")}</span></td>
          <td>申込: ${escapeHtml(row.created_at || "")}<br><span class="crm-small">入金: ${escapeHtml(row.paid_at || "-")}</span></td>
          <td>
            <div class="crm-actions">
              <button class="crm-mini-button" data-action="paid" data-id="${escapeHtml(row.id)}" ${row.payment_status === "paid" ? "disabled" : ""}>入金済みにする</button>
              <button class="crm-mini-button" data-action="cancelled" data-id="${escapeHtml(row.id)}" ${row.payment_status === "cancelled" ? "disabled" : ""}>キャンセル</button>
              <button class="crm-mini-button" data-action="refunded" data-id="${escapeHtml(row.id)}" ${row.payment_status === "refunded" ? "disabled" : ""}>返金済み</button>
            </div>
          </td>
        </tr>`,
      )
      .join("");
  }

  async function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    const row = rowsCache.find((item) => item.id === id);
    if (!row) return;

    let actualTransferName = row.actual_transfer_name || "";
    let externalPaymentId = row.external_payment_id || "";
    let adminNote = row.admin_note || "";
    if (action === "paid") {
      actualTransferName = window.prompt("実際の振込名義を入力してください。空欄でも入金済みにできます。", actualTransferName) || actualTransferName;
      externalPaymentId = window.prompt("外部決済ID・入金照合IDがあれば入力してください。銀行振込のみの場合は空欄で構いません。", externalPaymentId) || externalPaymentId;
    }
    adminNote = window.prompt("管理メモを入力してください。空欄でも更新できます。", adminNote) || adminNote;

    button.disabled = true;
    setMessage("更新中です...", "");
    try {
      const result = await apiJson(`/api/festa60/admin/applications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentStatus: action,
          actualTransferName,
          externalPaymentId,
          adminNote,
          sendEmail: false,
        }),
      });
      const index = rowsCache.findIndex((item) => item.id === id);
      if (index >= 0) rowsCache[index] = { ...rowsCache[index], ...result.application };
      renderApplications(rowsCache);
      if (result.confirmation_email) renderEmailDraft(result.application, result.confirmation_email);
      setMessage(`${row.application_code} を ${statusLabel(action)} に更新しました。`, "success");
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  }

  function renderEmailDraft(application, email) {
    emailDraft.hidden = false;
    emailSubject.value = email.subject || "";
    emailBody.value = email.body || "";
    const mailto = new URL(`mailto:${application.email || ""}`);
    mailto.searchParams.set("subject", email.subject || "");
    mailto.searchParams.set("body", email.body || "");
    emailMailto.href = mailto.toString();
  }

  function setMessage(text, kind) {
    message.hidden = false;
    message.textContent = text;
    message.dataset.kind = kind;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[char]);
  }

  function formatYen(value) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("ja-JP")}円`;
  }

  function ticketLabel(value) {
    const labels = {
      obog: "一般OBOG",
      young_obog: "OBOG 6〜10年目",
      obog_6_10: "OBOG 6〜10年目",
      obog_5_under: "OBOG 5年目以下",
      obog_staff: "OBOG役員・当日手伝い",
      current_student: "現役部員",
      donation_only: "プレミアム参加枠",
      premium: "プレミアム参加枠",
    };
    return labels[value] || value || "";
  }

  function periodLabel(value) {
    const labels = {
      early: "早期入金",
      year_end: "年内入金",
      regular: "通常",
    };
    return labels[value] || "";
  }

  function receptionLabel(value) {
    const labels = {
      attending: "懇親会参加",
      without_reception: "懇親会なし",
    };
    return labels[value] || "";
  }

  function methodLabel(value) {
    const labels = {
      bank_transfer: "銀行振込",
      card: "カード",
      convenience_store: "コンビニ",
      paypay: "PayPay",
    };
    return labels[value] || value || "";
  }

  function providerLabel(value) {
    const labels = {
      manual: "手動管理",
      stripe: "Stripe",
      payjp: "PAY.JP",
      komoju: "KOMOJU",
    };
    return labels[value] || value || "";
  }

  function statusLabel(value) {
    const labels = {
      unpaid: "未入金",
      pending: "確認中",
      paid: "入金済み",
      cancelled: "キャンセル",
      refunded: "返金済み",
    };
    return labels[value] || value || "";
  }
})();

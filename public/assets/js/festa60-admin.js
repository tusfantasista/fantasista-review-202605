(function () {
  const token = document.getElementById("admin-token");
  const message = document.getElementById("admin-message");
  const body = document.getElementById("applications-body");

  document.getElementById("load-applications").addEventListener("click", loadApplications);
  document.getElementById("export-csv").addEventListener("click", exportCsv);
  document.getElementById("import-csv").addEventListener("click", importCsv);

  async function loadApplications() {
    setMessage("読み込み中です...", "");
    try {
      const result = await apiJson("/api/festa60/admin/applications");
      renderApplications(result.applications || []);
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
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="10">申込はまだありません。</td></tr>';
      return;
    }
    body.innerHTML = rows
      .map(
        (row) => `<tr>
          <td>${escapeHtml(row.application_code)}</td>
          <td>${escapeHtml(row.full_name)}<br><span class="crm-small">${escapeHtml(row.email)}</span></td>
          <td>${escapeHtml(row.graduation_year || "")}</td>
          <td>${escapeHtml(ticketLabel(row.ticket_type))}</td>
          <td>${escapeHtml(periodLabel(row.fee_period))}<br><span class="crm-small">${escapeHtml(receptionLabel(row.reception_attendance))}</span></td>
          <td>${escapeHtml(row.match_status)}<br><span class="crm-small">${escapeHtml(row.member_code || "")}</span></td>
          <td>${escapeHtml(row.latest_payment_status || row.payment_status)}</td>
          <td>${escapeHtml(row.attendance_status)}</td>
          <td>${formatYen(row.amount_total)}</td>
          <td>${escapeHtml(row.created_at)}</td>
        </tr>`,
      )
      .join("");
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
    return amount ? `${amount.toLocaleString("ja-JP")}円` : "-";
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
})();

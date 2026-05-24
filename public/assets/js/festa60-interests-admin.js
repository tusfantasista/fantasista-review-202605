(function () {
  const token = document.getElementById("admin-token");
  const message = document.getElementById("interest-admin-message");
  const body = document.getElementById("interests-body");
  const detail = document.getElementById("interest-detail");
  const attendanceFilter = document.getElementById("attendance-filter");
  const categoryFilter = document.getElementById("category-filter");
  const interestFilter = document.getElementById("interest-filter");
  let rowsCache = [];

  document.getElementById("load-interests").addEventListener("click", loadInterests);
  document.getElementById("export-interests").addEventListener("click", exportInterests);
  [attendanceFilter, categoryFilter, interestFilter].forEach((select) => select.addEventListener("change", () => renderRows(rowsCache)));
  body.addEventListener("click", handleAction);

  async function loadInterests() {
    setMessage("読み込み中です...", "");
    try {
      const result = await apiJson("/api/festa60/admin/interests");
      rowsCache = result.interests || [];
      renderRows(rowsCache);
      setMessage(`${rowsCache.length}件を読み込みました。`, "success");
    } catch (error) {
      setMessage(error.message, "error");
    }
  }

  async function exportInterests() {
    try {
      const response = await fetch("/api/festa60/admin/interests/export", { headers: adminHeaders() });
      if (!response.ok) throw new Error("CSVエクスポートに失敗しました。");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "festa60-interest-registrations.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message, "error");
    }
  }

  function renderRows(rows) {
    const visible = applyFilters(rows);
    if (!visible.length) {
      body.innerHTML = '<tr><td colspan="10">該当する意向登録はありません。</td></tr>';
      return;
    }
    body.innerHTML = visible
      .map((row) => {
        const name = `${row.last_name || ""} ${row.first_name || ""}`.trim();
        const kana = `${row.last_kana || ""} ${row.first_kana || ""}`.trim();
        const duplicate = Number(row.duplicate_count || 0) > 1 ? `<br><span class="crm-small">重複候補: ${row.duplicate_count}件</span>` : "";
        return `<tr>
          <td>${escapeHtml(row.created_at || "")}</td>
          <td><strong>${escapeHtml(row.interest_code)}</strong>${duplicate}</td>
          <td>${escapeHtml(name)}<br><span class="crm-small">${escapeHtml(kana)}${row.maiden_name ? `<br>旧姓: ${escapeHtml(row.maiden_name)}` : ""}</span></td>
          <td>${escapeHtml(row.email)}<br><button class="crm-mini-button" data-action="copy-email" data-email="${escapeHtml(row.email)}">メールコピー</button><br><span class="crm-small">${escapeHtml(row.phone || "")}</span></td>
          <td>${escapeHtml(categoryLabel(row.participant_category))}<br><span class="crm-small">卒部年度: ${graduationLabel(row)}</span></td>
          <td>${escapeHtml(attendanceLabel(row.attendance_intent))}</td>
          <td>${escapeHtml(companionLabel(row.companion_status))}<br><span class="crm-small">人数: ${escapeHtml(row.companion_count ?? "")}<br>${escapeHtml(hostSummary(row))}</span></td>
          <td>${supportSummary(row)}</td>
          <td>${escapeHtml(statusLabel(row.status))}<br><span class="crm-small">${escapeHtml(row.admin_memo || "")}</span></td>
          <td>
            <div class="crm-actions">
              <button class="crm-mini-button" data-action="detail" data-id="${escapeHtml(row.id)}">詳細</button>
              <button class="crm-mini-button" data-action="status" data-id="${escapeHtml(row.id)}">ステータス更新</button>
              <button class="crm-mini-button" data-action="memo" data-id="${escapeHtml(row.id)}">メモ更新</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
  }

  function applyFilters(rows) {
    return rows.filter((row) => {
      if (attendanceFilter.value && row.attendance_intent !== attendanceFilter.value) return false;
      if (categoryFilter.value && row.participant_category !== categoryFilter.value) return false;
      if (interestFilter.value === "donation" && row.donation_interest !== "yes") return false;
      if (interestFilter.value === "sponsorship" && row.sponsorship_interest !== "yes") return false;
      if (interestFilter.value === "archive" && row.archive_material_interest !== "yes") return false;
      if (interestFilter.value === "eligibility" && row.participant_category !== "eligibility_consultation") return false;
      return true;
    });
  }

  async function handleAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = rowsCache.find((item) => item.id === button.dataset.id);

    if (button.dataset.action === "copy-email") {
      await navigator.clipboard.writeText(button.dataset.email || "");
      setMessage("メールアドレスをコピーしました。", "success");
      return;
    }
    if (!row) return;

    if (button.dataset.action === "detail") {
      detail.textContent = JSON.stringify(row, null, 2);
      return;
    }
    if (button.dataset.action === "status") {
      const next = window.prompt(
        "ステータスを入力してください: new / reviewed / needs_followup / duplicate / invalid / formal_registration_invited / converted_to_formal_registration",
        row.status || "new",
      );
      if (!next) return;
      await updateRow(row.id, { status: next });
    }
    if (button.dataset.action === "memo") {
      const adminMemo = window.prompt("事務局メモを入力してください。", row.admin_memo || "");
      if (adminMemo === null) return;
      await updateRow(row.id, { adminMemo });
    }
  }

  async function updateRow(id, payload) {
    setMessage("更新中です...", "");
    const result = await apiJson(`/api/festa60/admin/interests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const index = rowsCache.findIndex((row) => row.id === id);
    if (index >= 0) rowsCache[index] = { ...rowsCache[index], ...result.interest };
    renderRows(rowsCache);
    detail.textContent = JSON.stringify(result.interest, null, 2);
    setMessage("更新しました。", "success");
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

  function graduationLabel(row) {
    if (row.graduation_year_unknown) return "不明";
    return row.graduation_year || "-";
  }

  function hostSummary(row) {
    const name = `${row.companion_host_last_name || ""} ${row.companion_host_first_name || ""}`.trim();
    if (!name && !row.companion_host_note) return "同伴元: 未入力";
    return `同伴元: ${name || "-"} ${row.companion_host_graduation_year || ""} ${row.companion_host_note || ""}`.trim();
  }

  function supportSummary(row) {
    return [
      `寄付: ${interestLabel(row.donation_interest)}`,
      `協賛: ${interestLabel(row.sponsorship_interest)}`,
      `資料: ${archiveLabel(row.archive_material_interest)}`,
      `手伝い: ${volunteerLabel(row.volunteer_interest)}`,
    ]
      .map(escapeHtml)
      .join("<br>");
  }

  function categoryLabel(value) {
    return {
      tus_obog: "東京理科大学舞踏研究部OBOG",
      gakushuin_oyu: "学習院大学社交舞踏研究会桜友会",
      tus_obog_companion: "理科大OBOGの同伴者",
      gakushuin_oyu_companion: "学習院桜友会の同伴者",
      eligibility_consultation: "参加資格について相談",
    }[value] || value || "";
  }

  function attendanceLabel(value) {
    return {
      want_to_attend: "参加したい",
      considering: "検討中",
      not_attending_info: "不参加だが案内希望",
    }[value] || value || "";
  }

  function companionLabel(value) {
    return {
      none: "なし",
      yes: "あり",
      undecided: "未定",
      unanswered: "未回答",
    }[value] || value || "";
  }

  function interestLabel(value) {
    return {
      yes: "関心あり",
      maybe: "案内を見て検討",
      no: "現時点ではなし",
      unanswered: "未回答",
    }[value] || value || "";
  }

  function archiveLabel(value) {
    return {
      yes: "提供できそう",
      maybe: "探してみる",
      no: "現時点ではなし",
      unanswered: "未回答",
    }[value] || value || "";
  }

  function volunteerLabel(value) {
    return {
      yes: "手伝える",
      maybe: "内容次第で検討",
      no: "今回は難しい",
      unanswered: "未回答",
    }[value] || value || "";
  }

  function statusLabel(value) {
    return {
      new: "新規",
      reviewed: "確認済み",
      needs_followup: "要確認",
      duplicate: "重複",
      invalid: "無効",
      formal_registration_invited: "正式登録案内済み",
      converted_to_formal_registration: "正式登録へ移行済み",
    }[value] || value || "";
  }
})();

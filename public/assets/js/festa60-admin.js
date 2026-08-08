(() => {
  "use strict";

  const API_URL = "../api/festa60/admin/applications";
  const CONFIG_URL = "../api/festa60/config";

  const state = {
    applications: [],
    filtered: [],
    participationSummary: null,
    config: null,
    actor: "",
    filters: {
      search: "",
      payment: "all",
      plan: "all",
      sort: "newest"
    }
  };

  const elements = {
    environmentBanner: document.querySelector("#environment-banner"),
    actor: document.querySelector("#admin-actor"),
    lastUpdated: document.querySelector("#last-updated"),
    message: document.querySelector("#admin-message"),
    tableWrapper: document.querySelector("#table-wrapper"),
    tableBody: document.querySelector("#applications-body"),
    resultCount: document.querySelector("#result-count"),
    searchInput: document.querySelector("#search-input"),
    paymentFilter: document.querySelector("#payment-filter"),
    planFilter: document.querySelector("#plan-filter"),
    sortSelect: document.querySelector("#sort-select"),
    clearFilters: document.querySelector("#clear-filters"),
    refreshButton: document.querySelector("#refresh-button"),
    paymentChart: document.querySelector("#payment-chart"),
    planChart: document.querySelector("#plan-chart"),
    participantChart: document.querySelector("#participant-chart"),
    receptionChart: document.querySelector("#reception-chart"),
    cohortChart: document.querySelector("#cohort-chart"),
    dialog: document.querySelector("#application-dialog"),
    dialogTitle: document.querySelector("#dialog-title"),
    dialogContent: document.querySelector("#dialog-content")
  };

  const metricElements = {
    applications: document.querySelector("#metric-applications"),
    festaAttendees: document.querySelector("#metric-festa-attendees"),
    confirmedFesta: document.querySelector("#metric-confirmed-festa"),
    receptionAttendees: document.querySelector("#metric-reception-attendees"),
    confirmedReception: document.querySelector("#metric-confirmed-reception"),
    receptionNonAttendees: document.querySelector("#metric-reception-non-attendees"),
    applicantCompanion: document.querySelector("#metric-applicant-companion"),
    attendingApplications: document.querySelector("#metric-attending-applications"),
    paid: document.querySelector("#metric-paid"),
    paidAmount: document.querySelector("#metric-paid-amount"),
    partial: document.querySelector("#metric-partial"),
    partialAmount: document.querySelector("#metric-partial-amount"),
    pending: document.querySelector("#metric-pending"),
    outstanding: document.querySelector("#metric-outstanding"),
    expectedTotal: document.querySelector("#metric-expected-total"),
    receivedTotal: document.querySelector("#metric-received-total"),
    collectionRate: document.querySelector("#metric-collection-rate")
  };

  const paymentLabels = {
    paid: "入金済み",
    partially_funded: "不足入金",
    pending: "手続中",
    unpaid: "未入金",
    cancelled: "取消",
    refunded: "返金済み",
    failed: "決済失敗",
    expired: "期限切れ"
  };

  const attendanceLabels = {
    confirmed: "参加確定",
    pending: "未確定",
    cancelled: "取消",
    refunded: "返金済み"
  };

  const feePeriodLabels = {
    early: "9月末まで",
    year_end: "年内",
    regular: "通常"
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatYen(value) {
    return `${Number(value || 0).toLocaleString("ja-JP")}円`;
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function planKey(ticketType) {
    const value = String(ticketType || "");
    if (value.includes("__platinum")) return "platinum";
    if (value.includes("__gold")) return "gold";
    if (value.includes("__silver")) return "silver";
    if (value.includes("__bronze")) return "bronze";
    if (value.startsWith("absent_donation_")) return "absent_donation";
    if (value.startsWith("obog_staff")) return "staff";
    if (value === "current_student") return "current_student";
    return "standard";
  }

  function planLabel(ticketType) {
    const value = String(ticketType || "");
    const key = planKey(value);
    if (value.startsWith("obog_staff__")) {
      const tier = value.includes("__platinum") ? "プラチナ" : value.includes("__gold") ? "ゴールド" : value.includes("__silver") ? "シルバー" : "ブロンズ";
      return `役員・お手伝い／${tier}`;
    }
    const labels = {
      platinum: "プラチナ",
      gold: "ゴールド",
      silver: "シルバー",
      bronze: "ブロンズ",
      staff: "役員・お手伝い",
      current_student: "現役",
      absent_donation: value.endsWith("30000") ? "欠席寄付 プレミアム" : value.endsWith("10000") ? "欠席寄付 アドバンス" : "欠席寄付 スタンダード",
      standard: value === "obog_6_10" ? "通常参加（卒部6〜10年）" : value === "obog_5_under" ? "通常参加（卒部5年以下）" : "通常参加"
    };
    return labels[key];
  }

  function effectivePaymentStatus(application) {
    if (application.latest_payment_status === "partially_funded") return "partially_funded";
    if (["failed", "expired"].includes(application.latest_payment_status)) return application.latest_payment_status;
    return application.payment_status || application.paymentStatus || application.latest_payment_status || "unpaid";
  }

  function receivedAmount(application) {
    const status = effectivePaymentStatus(application);
    if (status === "paid") return Number(application.amount_total ?? application.total_amount_jpy ?? application.amount ?? 0);
    if (status === "partially_funded") return Number(application.amount_received_jpy || 0);
    return 0;
  }

  function expectedAmount(application) {
    return Number(application.amount_total ?? application.total_amount_jpy ?? application.amount ?? 0);
  }

  function outstandingAmount(application) {
    const status = effectivePaymentStatus(application);
    if (["cancelled", "refunded"].includes(status)) return 0;
    return Math.max(0, expectedAmount(application) - receivedAmount(application));
  }

  function statusBadge(status) {
    const label = paymentLabels[status] || status || "未設定";
    const className = status === "partially_funded" ? "partial" : status;
    return `<span class="admin-status admin-status--${escapeHtml(className)}">${escapeHtml(label)}</span>`;
  }

  function attendanceBadge(status) {
    const normalized = status || "pending";
    const label = attendanceLabels[normalized] || normalized;
    return `<span class="admin-status admin-status--${escapeHtml(normalized)}">${escapeHtml(label)}</span>`;
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      const error = new Error(result?.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return result;
  }

  async function loadApplications() {
    elements.refreshButton.disabled = true;
    elements.message.hidden = false;
    elements.message.className = "admin-message";
    elements.message.textContent = "申込データを読み込んでいます。";
    elements.tableWrapper.hidden = true;
    try {
      const [applicationResult, configResult] = await Promise.all([
        fetchJson(API_URL),
        fetchJson(CONFIG_URL).catch(() => null)
      ]);
      state.applications = applicationResult.applications || [];
      state.participationSummary = applicationResult.participation_summary || null;
      state.actor = applicationResult.actor || "Cloudflare Access user";
      state.config = configResult;
      elements.actor.textContent = state.actor;
      elements.environmentBanner.hidden = Boolean(configResult?.is_production);
      renderSummary();
      applyFilters();
      elements.lastUpdated.textContent = `最終更新 ${formatDateTime(new Date().toISOString())}`;
    } catch (error) {
      elements.message.hidden = false;
      elements.message.className = "admin-message admin-message--error";
      elements.message.textContent = error.status === 401
        ? "Cloudflare Accessの認証が必要です。ページを再読み込みして認証してください。"
        : "申込データを取得できませんでした。時間をおいて更新してください。";
      elements.lastUpdated.textContent = "取得失敗";
    } finally {
      elements.refreshButton.disabled = false;
    }
  }

  function renderSummary() {
    const applications = state.applications;
    const active = applications.filter((item) => !["cancelled", "refunded"].includes(effectivePaymentStatus(item)));
    const paid = applications.filter((item) => effectivePaymentStatus(item) === "paid");
    const partial = applications.filter((item) => effectivePaymentStatus(item) === "partially_funded");
    const pending = applications.filter((item) => ["unpaid", "pending", "failed", "expired"].includes(effectivePaymentStatus(item)));
    const expectedTotal = active.reduce((sum, item) => sum + expectedAmount(item), 0);
    const receivedTotal = active.reduce((sum, item) => sum + receivedAmount(item), 0);
    const outstandingTotal = active.reduce((sum, item) => sum + outstandingAmount(item), 0);
    const collectionRate = expectedTotal > 0 ? Math.round((receivedTotal / expectedTotal) * 100) : 0;
    const participation = state.participationSummary || fallbackParticipationSummary(applications);

    metricElements.applications.textContent = `${applications.length}件`;
    metricElements.festaAttendees.textContent = `${participation.festa_attendee_count}名`;
    metricElements.confirmedFesta.textContent = `入金済み・参加確定 ${participation.confirmed_festa_attendee_count}名`;
    metricElements.receptionAttendees.textContent = `${participation.reception_attendee_count}名`;
    metricElements.confirmedReception.textContent = `入金済み・参加確定 ${participation.confirmed_reception_attendee_count}名`;
    metricElements.receptionNonAttendees.textContent = `${participation.reception_non_attendee_count}名`;
    metricElements.applicantCompanion.textContent = `${participation.application_count}名 / ${participation.companion_count}名`;
    metricElements.attendingApplications.textContent = `参加申込 ${participation.application_count}件`;
    metricElements.paid.textContent = `${paid.length}件`;
    metricElements.paidAmount.textContent = formatYen(paid.reduce((sum, item) => sum + receivedAmount(item), 0));
    metricElements.partial.textContent = `${partial.length}件`;
    metricElements.partialAmount.textContent = `不足 ${formatYen(partial.reduce((sum, item) => sum + outstandingAmount(item), 0))}`;
    metricElements.pending.textContent = `${pending.length}件`;
    metricElements.outstanding.textContent = `未収 ${formatYen(outstandingTotal)}`;
    metricElements.expectedTotal.textContent = formatYen(applications.reduce((sum, item) => sum + expectedAmount(item), 0));
    metricElements.receivedTotal.textContent = formatYen(receivedTotal);
    metricElements.collectionRate.textContent = `入金率 ${collectionRate}%`;

    renderBarChart(elements.paymentChart, [
      { label: "入金済み", value: paid.length, className: "paid" },
      { label: "不足入金", value: partial.length, className: "partial" },
      { label: "未入金等", value: pending.length, className: "pending" },
      { label: "取消・返金", value: applications.length - active.length, className: "" }
    ]);

    renderBarChart(elements.participantChart, [
      { label: "OBOG本人", value: participation.obog_applicant_count, className: "" },
      { label: "現役本人", value: participation.current_student_applicant_count, className: "" },
      { label: "大人同伴", value: participation.adult_companion_count, className: "" },
      { label: "子供同伴", value: participation.child_companion_count, className: "" }
    ].filter((item) => item.value > 0));

    renderBarChart(elements.receptionChart, [
      { label: "OBOG本人", value: participation.obog_reception_count, className: "paid" },
      { label: "現役本人", value: participation.current_student_reception_count, className: "paid" },
      { label: "大人同伴", value: participation.adult_companion_reception_count, className: "paid" },
      { label: "子供同伴", value: participation.child_companion_reception_count, className: "paid" }
    ].filter((item) => item.value > 0));

    renderBarChart(elements.cohortChart, [
      { label: "卒部11年以上", value: participation.cohort_eleven_over_count, className: "" },
      { label: "卒部6〜10年", value: participation.cohort_six_ten_count, className: "" },
      { label: "卒部5年以下", value: participation.cohort_five_under_count, className: "" },
      { label: "学習院桜友会", value: participation.cohort_gakushuin_count, className: "" },
      { label: "現役", value: participation.cohort_current_student_count, className: "" },
      { label: "年次未確認", value: participation.cohort_unknown_count, className: "pending" }
    ].filter((item) => item.value > 0));

    const planCounts = ["platinum", "gold", "silver", "bronze", "standard", "staff", "current_student", "absent_donation"]
      .map((key) => ({ key, value: applications.filter((item) => planKey(item.ticket_type) === key).length }))
      .filter((item) => item.value > 0)
      .map((item) => ({
        label: {
          platinum: "プラチナ",
          gold: "ゴールド",
          silver: "シルバー",
          bronze: "ブロンズ",
          standard: "通常参加",
          staff: "役員等",
          current_student: "現役",
          absent_donation: "欠席寄付"
        }[item.key],
        value: item.value,
        className: ""
      }));
    renderBarChart(elements.planChart, planCounts);
  }

  function fallbackParticipationSummary(applications) {
    const attendees = applications.filter((item) => {
      const status = effectivePaymentStatus(item);
      return !["cancelled", "refunded"].includes(status) && planKey(item.ticket_type) !== "absent_donation";
    });
    const paid = attendees.filter((item) => effectivePaymentStatus(item) === "paid");
    const summarizePeople = (rows) => rows.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    const summarizeReception = (rows) => rows.reduce((sum, item) => {
      return sum + (item.reception_attendance === "attending" ? Number(item.quantity || 1) : 0);
    }, 0);
    const festaCount = summarizePeople(attendees);
    const receptionCount = summarizeReception(attendees);
    return {
      application_count: attendees.length,
      festa_attendee_count: festaCount,
      confirmed_festa_attendee_count: summarizePeople(paid),
      companion_count: attendees.reduce((sum, item) => sum + Number(item.companion_count || 0), 0),
      reception_attendee_count: receptionCount,
      confirmed_reception_attendee_count: summarizeReception(paid),
      reception_non_attendee_count: Math.max(0, festaCount - receptionCount),
      obog_applicant_count: attendees.filter((item) => item.ticket_type !== "current_student").length,
      current_student_applicant_count: attendees.filter((item) => item.ticket_type === "current_student").length,
      adult_companion_count: attendees.reduce((sum, item) => sum + Number(item.companion_count || 0), 0),
      child_companion_count: 0,
      obog_reception_count: attendees.filter((item) => item.ticket_type !== "current_student" && item.reception_attendance === "attending").length,
      current_student_reception_count: attendees.filter((item) => item.ticket_type === "current_student" && item.reception_attendance === "attending").length,
      adult_companion_reception_count: 0,
      child_companion_reception_count: 0,
      cohort_eleven_over_count: attendees.filter((item) => item.ticket_type !== "current_student" && item.school_lineage !== "gakushuin_ouyukai" && Number(item.graduation_year) > 0 && Number(item.graduation_year) <= 2015).length,
      cohort_six_ten_count: attendees.filter((item) => item.ticket_type !== "current_student" && item.school_lineage !== "gakushuin_ouyukai" && Number(item.graduation_year) >= 2016 && Number(item.graduation_year) <= 2020).length,
      cohort_five_under_count: attendees.filter((item) => item.ticket_type !== "current_student" && item.school_lineage !== "gakushuin_ouyukai" && Number(item.graduation_year) >= 2021).length,
      cohort_gakushuin_count: attendees.filter((item) => item.ticket_type !== "current_student" && item.school_lineage === "gakushuin_ouyukai").length,
      cohort_current_student_count: attendees.filter((item) => item.ticket_type === "current_student").length,
      cohort_unknown_count: attendees.filter((item) => item.ticket_type !== "current_student" && item.school_lineage !== "gakushuin_ouyukai" && !Number(item.graduation_year)).length
    };
  }

  function renderBarChart(container, items) {
    const maximum = Math.max(1, ...items.map((item) => item.value));
    container.innerHTML = items.length
      ? items.map((item) => `
          <div class="admin-bar-row">
            <span>${escapeHtml(item.label)}</span>
            <span class="admin-bar-row__track"><span class="admin-bar-row__fill admin-bar-row__fill--${escapeHtml(item.className)}" style="width:${Math.round((item.value / maximum) * 100)}%"></span></span>
            <strong>${item.value}</strong>
          </div>`).join("")
      : '<p class="admin-empty">データがありません。</p>';
  }

  function applyFilters() {
    const normalizedSearch = state.filters.search.trim().toLocaleLowerCase("ja");
    const filtered = state.applications.filter((application) => {
      const searchable = [
        application.application_code,
        application.full_name,
        application.full_name_kana,
        application.email,
        application.graduation_year
      ].join(" ").toLocaleLowerCase("ja");
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesPayment = state.filters.payment === "all" || effectivePaymentStatus(application) === state.filters.payment;
      const matchesPlan = state.filters.plan === "all" || planKey(application.ticket_type) === state.filters.plan;
      return matchesSearch && matchesPayment && matchesPlan;
    });

    filtered.sort((a, b) => {
      if (state.filters.sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (state.filters.sort === "amount_desc") return expectedAmount(b) - expectedAmount(a);
      if (state.filters.sort === "amount_asc") return expectedAmount(a) - expectedAmount(b);
      if (state.filters.sort === "code") return String(a.application_code).localeCompare(String(b.application_code), "ja");
      return new Date(b.created_at) - new Date(a.created_at);
    });

    state.filtered = filtered;
    renderTable();
  }

  function renderTable() {
    elements.resultCount.textContent = `${state.filtered.length}件 / 全${state.applications.length}件`;
    elements.message.hidden = true;
    elements.tableWrapper.hidden = false;

    if (!state.filtered.length) {
      elements.tableBody.innerHTML = '<tr><td class="admin-empty" colspan="7">条件に一致する申込はありません。</td></tr>';
      return;
    }

    elements.tableBody.innerHTML = state.filtered.map((application) => {
      const paymentStatus = effectivePaymentStatus(application);
      const amount = expectedAmount(application);
      const received = receivedAmount(application);
      const paymentDetail = paymentStatus === "partially_funded"
        ? `入金 ${formatYen(received)} / 不足 ${formatYen(outstandingAmount(application))}`
        : paymentStatus === "paid" ? formatYen(received) : "";
      return `
        <tr>
          <td data-label="受付番号"><span class="admin-table__code">${escapeHtml(application.application_code)}</span><small>${escapeHtml(formatDateTime(application.created_at))}</small></td>
          <td data-label="申込者"><span class="admin-table__name">${escapeHtml(application.full_name || "-")}</span><small>${application.graduation_year ? `${escapeHtml(application.graduation_year)}年度卒` : escapeHtml(application.school_lineage || "-")}</small></td>
          <td data-label="プラン"><span>${escapeHtml(planLabel(application.ticket_type))}</span><small>${escapeHtml(feePeriodLabels[application.fee_period] || application.fee_period || "-")}・${Number(application.quantity || 1)}名</small></td>
          <td data-label="金額"><span class="admin-table__amount">${escapeHtml(formatYen(amount))}</span><small>${escapeHtml(paymentDetail)}</small></td>
          <td data-label="入金状態">${statusBadge(paymentStatus)}</td>
          <td data-label="参加状態">${attendanceBadge(application.attendance_status)}</td>
          <td data-label="操作"><button class="admin-row-action" type="button" data-application-id="${escapeHtml(application.id)}">詳細</button></td>
        </tr>`;
    }).join("");
  }

  function detailRow(label, value) {
    return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "-")}</dd>`;
  }

  function stripePaymentUrl(paymentIntentId) {
    if (!paymentIntentId) return "";
    const prefix = state.config?.is_production ? "" : "test/";
    return `https://dashboard.stripe.com/${prefix}payments/${encodeURIComponent(paymentIntentId)}`;
  }

  function openApplicationDetail(applicationId) {
    const application = state.applications.find((item) => item.id === applicationId);
    if (!application) return;
    const paymentStatus = effectivePaymentStatus(application);
    const stripeUrl = stripePaymentUrl(application.stripe_payment_intent_id);
    const address = [application.postal_code ? `〒${application.postal_code}` : "", application.prefecture, application.city, application.street_address, application.building]
      .filter(Boolean)
      .join(" ");

    elements.dialogTitle.textContent = `${application.application_code} ${application.full_name || ""}`;
    elements.dialogContent.innerHTML = `
      <div class="admin-detail-summary">
        ${statusBadge(paymentStatus)}
        ${attendanceBadge(application.attendance_status)}
        <span class="admin-status">${escapeHtml(planLabel(application.ticket_type))}</span>
      </div>
      <div class="admin-detail-grid">
        <section class="admin-detail-section">
          <h3>本人・連絡先</h3>
          <dl class="admin-detail-list">
            ${detailRow("氏名", application.full_name)}
            ${detailRow("ふりがな", application.full_name_kana)}
            ${detailRow("メール", application.email)}
            ${detailRow("電話番号", application.phone)}
            ${detailRow("所属区分", application.school_lineage)}
            ${detailRow("卒部年度", application.graduation_year ? `${application.graduation_year}年度` : "-")}
            ${detailRow("住所", address)}
          </dl>
        </section>
        <section class="admin-detail-section">
          <h3>申込内容</h3>
          <dl class="admin-detail-list">
            ${detailRow("受付番号", application.application_code)}
            ${detailRow("プラン", planLabel(application.ticket_type))}
            ${detailRow("申込時期", feePeriodLabels[application.fee_period] || application.fee_period)}
            ${detailRow("参加人数", `${Number(application.quantity || 1)}名`)}
            ${detailRow("同伴者", `${Number(application.companion_count || 0)}名`)}
            ${detailRow("同伴者の懇親会", application.companion_summary || "-")}
            ${detailRow("懇親会", application.reception_attendance === "attending" ? "参加" : "不参加")}
            ${detailRow("申込日時", formatDateTime(application.created_at))}
          </dl>
        </section>
        <section class="admin-detail-section">
          <h3>入金</h3>
          <dl class="admin-detail-list">
            ${detailRow("支払予定額", formatYen(expectedAmount(application)))}
            ${detailRow("入金確認額", formatYen(receivedAmount(application)))}
            ${detailRow("不足額", formatYen(outstandingAmount(application)))}
            ${detailRow("入金状態", paymentLabels[paymentStatus] || paymentStatus)}
            ${detailRow("入金確認日", formatDateTime(application.paid_at))}
            ${detailRow("不足入金通知", formatDateTime(application.partial_payment_email_sent_at))}
            ${detailRow("決済手段", application.latest_payment_method || application.payment_method)}
          </dl>
        </section>
        <section class="admin-detail-section">
          <h3>照合・システム</h3>
          <dl class="admin-detail-list">
            ${detailRow("照合状態", application.match_status)}
            ${detailRow("名簿コード", application.member_code)}
            ${detailRow("Stripe顧客", application.stripe_customer_id)}
            ${detailRow("PaymentIntent", application.stripe_payment_intent_id)}
            ${detailRow("Checkout", application.stripe_checkout_session_id)}
            ${detailRow("管理メモ", application.admin_note)}
          </dl>
        </section>
      </div>
      <div class="admin-detail-actions">
        ${stripeUrl ? `<a class="admin-button admin-button--primary" href="${escapeHtml(stripeUrl)}" target="_blank" rel="noopener noreferrer">Stripe決済詳細を開く</a>` : ""}
        <button class="admin-button" type="button" data-copy-value="${escapeHtml(application.application_code)}">受付番号をコピー</button>
        <a class="admin-button" href="mailto:${escapeHtml(application.email || "")}">メールを作成</a>
      </div>`;
    elements.dialog.showModal();
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      state.filters.search = event.target.value;
      applyFilters();
    });
    elements.paymentFilter.addEventListener("change", (event) => {
      state.filters.payment = event.target.value;
      applyFilters();
    });
    elements.planFilter.addEventListener("change", (event) => {
      state.filters.plan = event.target.value;
      applyFilters();
    });
    elements.sortSelect.addEventListener("change", (event) => {
      state.filters.sort = event.target.value;
      applyFilters();
    });
    elements.clearFilters.addEventListener("click", () => {
      state.filters = { search: "", payment: "all", plan: "all", sort: "newest" };
      elements.searchInput.value = "";
      elements.paymentFilter.value = "all";
      elements.planFilter.value = "all";
      elements.sortSelect.value = "newest";
      applyFilters();
    });
    elements.refreshButton.addEventListener("click", loadApplications);
    elements.tableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-application-id]");
      if (button) openApplicationDetail(button.dataset.applicationId);
    });
    elements.dialogContent.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-copy-value]");
      if (!button) return;
      await navigator.clipboard.writeText(button.dataset.copyValue);
      button.textContent = "コピーしました";
    });
    elements.dialog.addEventListener("click", (event) => {
      if (event.target === elements.dialog) elements.dialog.close();
    });
  }

  bindEvents();
  loadApplications();
})();

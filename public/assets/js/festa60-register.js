(function () {
  const form = document.getElementById("festa60-form");
  const message = document.getElementById("form-message");
  const companionCount = document.getElementById("companion_count");
  const companions = document.getElementById("companions");
  const ticketType = document.getElementById("ticket_type");
  const feePeriod = document.getElementById("fee_period");
  const receptionAttendance = document.getElementById("reception_attendance");
  const feePreview = document.getElementById("fee-preview");
  const completionPanel = document.getElementById("completion-panel");
  let turnstileToken = "";
  const obogSixTenFrom = 2016;
  const obogSixTenTo = 2020;
  const obogFiveUnderFrom = 2021;
  const baseFees = {
    obog: { early: 13000, year_end: 14000, regular: 15000 },
    obog_6_10: { early: 11000, year_end: 12000, regular: 12000 },
    obog_5_under: { early: 9000, year_end: 10000, regular: 10000 },
    current_student: { early: 4000, year_end: 4000, regular: 4000 },
    premium: { early: 30000, year_end: 30000, regular: 30000 },
  };
  const companionFees = {
    adult: { attending: 8000, without_reception: 6000 },
    child: { attending: 3000, without_reception: 1000 },
  };

  if (!form) return;

  fetch("/api/festa60/config")
    .then((response) => response.json())
    .then((config) => {
      if (!config.turnstile_site_key) return;
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = function () {
        window.turnstile.render("#turnstile-slot", {
          sitekey: config.turnstile_site_key,
          callback(token) {
            turnstileToken = token;
          },
        });
      };
      document.head.appendChild(script);
    })
    .catch(() => {});

  companionCount.addEventListener("input", renderCompanions);
  ticketType.addEventListener("change", updateGraduationRequirement);
  ticketType.addEventListener("change", updateFeePreview);
  feePeriod.addEventListener("change", updateFeePreview);
  receptionAttendance.addEventListener("change", updateFeePreview);
  form.addEventListener("input", function (event) {
    if (["donation_amount_jpy", "sponsorship_amount_jpy"].includes(event.target.name)) {
      updateFeePreview();
    }
  });
  renderCompanions();
  updateGraduationRequirement();
  updateFeePreview();

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setMessage("送信中です...", "");
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;

    try {
      const payload = formPayload(new FormData(form));
      const clientErrors = validatePayload(payload);
      if (clientErrors.length) {
        throw new Error(clientErrors.join("\n"));
      }
      payload.turnstile_token = turnstileToken;
      payload.pay_now = false;

      const response = await fetch("/api/festa60/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.message || result.error || "送信に失敗しました。");
      }

      renderCompletion(result, payload);
      setMessage(`申込を保存しました。受付番号: ${result.application.applicationId || result.application.application_code}`, "success");
      form.reset();
      renderCompanions();
      completionPanel.hidden = false;
      completionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  function renderCompanions() {
    const count = Math.max(0, Math.min(5, Number(companionCount.value || 0)));
    companions.innerHTML = "";
    for (let index = 0; index < count; index += 1) {
      const card = document.createElement("fieldset");
      card.className = "crm-companion";
      card.innerHTML = `
        <legend>同伴者${index + 1}</legend>
        <div class="crm-two">
          <div class="crm-field">
            <label for="companion_${index}_name">氏名 <span class="crm-required">必須</span></label>
            <input id="companion_${index}_name" name="companion_${index}_name" required />
          </div>
          <div class="crm-field">
            <label for="companion_${index}_relationship">続柄・関係 <span class="crm-required">必須</span></label>
            <input id="companion_${index}_relationship" name="companion_${index}_relationship" placeholder="例: 配偶者、子、友人、OBOG" required />
          </div>
        </div>
        <div class="crm-two">
          <div class="crm-field">
            <label for="companion_${index}_attendee_type">同伴者属性 <span class="crm-required">必須</span></label>
            <select id="companion_${index}_attendee_type" name="companion_${index}_attendee_type" required>
              <option value="">選択してください</option>
              <option value="adult">同伴者（大人）</option>
              <option value="child">同伴者（子供）</option>
            </select>
          </div>
          <div class="crm-field">
            <label for="companion_${index}_email">メールアドレス <span class="crm-optional">任意</span></label>
            <input id="companion_${index}_email" name="companion_${index}_email" type="email" autocomplete="email" />
          </div>
        </div>
        <div class="crm-field">
          <label for="companion_${index}_note">補足 <span class="crm-optional">任意</span></label>
          <input id="companion_${index}_note" name="companion_${index}_note" placeholder="年齢区分、配慮事項など" />
        </div>
      `;
      companions.appendChild(card);
    }
    companions.querySelectorAll("select").forEach((select) => select.addEventListener("change", updateFeePreview));
    updateFeePreview();
  }

  function formPayload(data) {
    const payload = Object.fromEntries(data.entries());
    payload.privacy_consent = data.has("privacy_consent");
    payload.contact_consent = data.has("contact_consent");
    payload.photo_consent = data.has("photo_consent");
    payload.donation_amount_jpy = normalizeAmount(payload.donation_amount_jpy);
    payload.sponsorship_amount_jpy = normalizeAmount(payload.sponsorship_amount_jpy);
    payload.expected_transfer_name = String(payload.expected_transfer_name || "").trim();
    const count = Number(payload.companion_count || 0);
    payload.companions = [];
    for (let index = 0; index < count; index += 1) {
      const fullName = payload[`companion_${index}_name`];
      if (!fullName) continue;
      payload.companions.push({
        full_name: fullName,
        relationship: payload[`companion_${index}_relationship`] || "",
        attendee_type: payload[`companion_${index}_attendee_type`] || "",
        email: payload[`companion_${index}_email`] || "",
        note: payload[`companion_${index}_note`] || "",
      });
      delete payload[`companion_${index}_name`];
      delete payload[`companion_${index}_relationship`];
      delete payload[`companion_${index}_attendee_type`];
      delete payload[`companion_${index}_email`];
      delete payload[`companion_${index}_note`];
    }
    delete payload.generation;
    return payload;
  }

  function updateGraduationRequirement() {
    const graduationYear = document.getElementById("graduation_year");
    const requiresYear = ["obog", "obog_6_10", "obog_5_under", "obog_staff"].includes(ticketType.value);
    graduationYear.required = requiresYear;
  }

  function updateFeePreview() {
    const data = new FormData(form);
    const payload = formPayload(data);
    const amount = calculateAmount(payload);
    feePreview.textContent = `概算会費: ${amount.toLocaleString("ja-JP")}円`;
  }

  function validatePayload(payload) {
    const errors = [];
    const graduationYear = Number(payload.graduation_year || 0);
    if (["obog", "obog_6_10", "obog_5_under", "obog_staff"].includes(payload.ticket_type) && !graduationYear) {
      errors.push("OBOGは卒部年度を入力してください。");
    }
    if (payload.ticket_type === "obog_6_10" && (graduationYear < obogSixTenFrom || graduationYear > obogSixTenTo)) {
      errors.push(`OBOG 6〜10年目は${obogSixTenFrom}〜${obogSixTenTo}年度卒を想定しています。会費区分または卒部年度を確認してください。`);
    }
    if (payload.ticket_type === "obog_5_under" && graduationYear < obogFiveUnderFrom) {
      errors.push(`OBOG 5年目以下は${obogFiveUnderFrom}年度以降の卒部生を想定しています。会費区分または卒部年度を確認してください。`);
    }
    payload.companions.forEach((companion, index) => {
      if (!companion.full_name || !companion.relationship || !companion.attendee_type) {
        errors.push(`同伴者${index + 1}の氏名、続柄・関係、同伴者属性を入力してください。`);
      }
      if (companion.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companion.email)) {
        errors.push(`同伴者${index + 1}のメールアドレスを確認してください。`);
      }
    });
    if (payload.donation_amount_jpy < 0) {
      errors.push("寄付金額を確認してください。");
    }
    if (payload.sponsorship_amount_jpy < 0) {
      errors.push("協賛金額を確認してください。");
    }
    return errors;
  }

  function calculateAmount(payload) {
    const period = payload.fee_period || "regular";
    const reception = payload.reception_attendance || "attending";
    let base = baseFees[payload.ticket_type]?.[period] ?? baseFees.obog[period];
    if (payload.ticket_type === "obog_staff") {
      base = Math.round((baseFees.obog[period] - noReceptionDiscount(reception)) * 0.5);
    } else if (payload.ticket_type === "current_student") {
      base = reception === "attending" ? baseFees.current_student[period] : 0;
    } else if (payload.ticket_type !== "premium") {
      base = Math.max(0, base - noReceptionDiscount(reception));
    }

    const companionTotal = payload.companions.reduce((sum, companion) => {
      const type = companion.attendee_type === "child" ? "child" : "adult";
      return sum + companionFees[type][reception];
    }, base);
    return companionTotal + normalizeAmount(payload.donation_amount_jpy) + normalizeAmount(payload.sponsorship_amount_jpy);
  }

  function noReceptionDiscount(reception) {
    return reception === "without_reception" ? 2000 : 0;
  }

  function normalizeAmount(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
  }

  function setMessage(text, kind) {
    message.hidden = false;
    message.textContent = text;
    message.dataset.kind = kind;
  }

  function renderCompletion(result, payload) {
    const application = result.application || {};
    const payment = result.payment || {};
    const applicationId = application.applicationId || application.application_code || payment.applicationId || "";
    const amount = Number(application.amount || application.total_amount_jpy || payment.amount || 0);
    const transferName = payment.transferNameExample || `${applicationId} ${payload.full_name}`.trim();
    const bank = payment.bankInfo || {};
    const dueDateText = payment.dueDateText || "お申し込み日から7日以内";
    document.getElementById("complete-application-id").textContent = applicationId;
    document.getElementById("complete-amount").textContent = `${amount.toLocaleString("ja-JP")}円`;
    document.getElementById("complete-transfer-name").textContent = transferName;
    document.getElementById("complete-due-date").textContent = dueDateText;
    document.getElementById("complete-bank-info").innerHTML = [
      `銀行名：${escapeHtml(bank.bankName || "銀行名未設定")}`,
      `支店名：${escapeHtml(bank.branchName || "支店名未設定")}`,
      `支店コード：${escapeHtml(bank.branchCode || "支店コード未設定")}`,
      `口座種別：${escapeHtml(bank.accountType || "口座種別未設定")}`,
      `口座番号：${escapeHtml(bank.accountNumber || "口座番号未設定")}`,
      `口座名義：${escapeHtml(bank.accountHolder || bank.accountName || "口座名義未設定")}`,
      `口座名義カナ：${escapeHtml(bank.accountHolderKana || "口座名義カナ未設定")}`,
      `備考：${escapeHtml(bank.transferNote || "振込手数料は参加者様のご負担となります。")}`,
    ].join("<br>");
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
})();

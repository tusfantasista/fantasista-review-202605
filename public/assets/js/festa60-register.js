(function () {
  const form = document.getElementById("festa60-form");
  const message = document.getElementById("form-message");
  const companionCount = document.getElementById("companion_count");
  const companions = document.getElementById("companions");
  const applicationMode = document.getElementById("application_mode");
  const schoolLineage = document.getElementById("school_lineage");
  const graduationYear = document.getElementById("graduation_year");
  const graduationRequiredLabel = document.getElementById("graduation-required-label");
  const graduationHelp = document.getElementById("graduation-help");
  const ticketType = document.getElementById("ticket_type");
  const ticketTypeDisplay = document.getElementById("ticket_type_display");
  const supportTier = document.getElementById("support_tier");
  const absentDonationTier = document.getElementById("absent_donation_tier");
  const feePeriod = document.getElementById("fee_period");
  const feePeriodDisplay = document.getElementById("fee_period_display");
  const receptionAttendance = document.getElementById("reception_attendance");
  const receptionAttendanceHelp = document.getElementById("reception-attendance-help");
  const feePreview = document.getElementById("fee-preview");
  const entryPanel = document.getElementById("entry-panel");
  const confirmationPanel = document.getElementById("confirmation-panel");
  const confirmationSummary = document.getElementById("confirmation-summary");
  const confirmationMessage = document.getElementById("confirmation-message");
  const confirmationPaymentTitle = document.getElementById("confirmation-payment-title");
  const confirmationPaymentNote = document.getElementById("confirmation-payment-note");
  const editApplicationButton = document.getElementById("edit-application");
  const confirmApplicationButton = document.getElementById("confirm-application");
  const confirmationActions = document.getElementById("confirmation-actions");
  const paymentChoice = document.getElementById("payment-choice");
  const paymentChoiceInputs = Array.from(document.querySelectorAll("input[name='confirmation_payment_method']"));
  const bankTransferPreview = document.getElementById("bank-transfer-preview");
  const confirmBankTransferButton = document.getElementById("confirm-bank-transfer");
  const changeToOnlinePaymentButton = document.getElementById("change-to-online-payment");
  const completionPanel = document.getElementById("completion-panel");
  const stripePaymentMethod = document.getElementById("stripe-payment-method");
  const stripePaymentHelp = document.getElementById("stripe-payment-help");
  const stripePaymentStatus = document.getElementById("stripe-payment-status");
  const environmentBanner = document.getElementById("environment-banner");
  const graduationSection = document.getElementById("graduation-section");
  const attendancePlanSection = document.getElementById("attendance-plan-section");
  const feePeriodSection = document.getElementById("fee-period-section");
  const attendanceTicketNotice = document.getElementById("attendance-ticket-notice");
  const attendanceOptionsSection = document.getElementById("attendance-options-section");
  const absentDonationSection = document.getElementById("absent-donation-section");
  const supportPlanDetail = document.getElementById("support-plan-detail");
  const absentPlanDetail = document.getElementById("absent-plan-detail");
  const photoConsentSection = document.getElementById("photo-consent-section");
  const photoConsent = form?.querySelector("input[name='photo_consent']");
  const returnAddressSection = document.getElementById("return-address-section");
  const postalCode = document.getElementById("postal_code");
  const postalLookupButton = document.getElementById("postal-lookup-button");
  const postalLookupStatus = document.getElementById("postal-lookup-status");
  const prefecture = document.getElementById("prefecture");
  const city = document.getElementById("city");
  const streetAddress = document.getElementById("street_address");
  const building = document.getElementById("building");
  const applicationModeSection = document.getElementById("application-mode-section");
  const staffModeBanner = document.getElementById("staff-mode-banner");
  const staffAccessSection = document.getElementById("staff-access-section");
  const staffAccessCode = document.getElementById("staff_access_code");
  const graduationYearGuide = document.getElementById("graduation-year-guide");
  const openGraduationYearGuide = document.getElementById("open-graduation-year-guide");
  const closeGraduationYearGuide = document.getElementById("close-graduation-year-guide");
  const checkoutState = new URLSearchParams(window.location.search);
  const staffMode = checkoutState.get("staff") === "1";
  let turnstileToken = "";
  let pendingPayload = null;
  let bankPreviewToken = "";
  let bankPreviewDetails = null;
  let postalLookupTimer = null;
  let lastLookedUpPostalCode = "";
  let stripeAvailable = false;
  const obogSixTenFrom = 2016;
  const obogSixTenTo = 2020;
  const obogFiveUnderFrom = 2021;
  const obogElevenOverTo = 2015;
  const baseFees = {
    obog: { early: 13000, year_end: 14000, regular: 15000 },
    obog_6_10: { early: 11000, year_end: 12000, regular: 13000 },
    obog_5_under: { early: 9000, year_end: 10000, regular: 11000 },
    current_student: { early: 4000, year_end: 4000, regular: 4000 },
  };
  const attendingPlanTotals = { platinum: 100000, gold: 50000, silver: 30000, bronze: 20000 };
  const attendingPlanTicketUnits = { platinum: 600, gold: 500, silver: 400, bronze: 300 };
  const staffTicketTypes = ["obog_staff", "obog_staff_6_10", "obog_staff_5_under"];
  const absentDonationTotals = {
    absent_donation_30000: 30000,
    absent_donation_10000: 10000,
    absent_donation_5000: 5000,
  };
  const supportPlanDetails = {
    bronze: {
      title: "ブロンズ（プラン料金20,000円）",
      benefits: ["300円券×5枚", "印刷した記念写真", "手書きメッセージ", "記念動画の視聴案内（QR）", "記念ステッカー（予定）"],
    },
    silver: {
      title: "シルバー（プラン料金30,000円）",
      benefits: ["400円券×12枚", "印刷した記念写真", "手書きメッセージ", "記念動画の視聴案内（QR）", "記念ステッカー（予定）"],
    },
    gold: {
      title: "ゴールド（プラン料金50,000円）",
      benefits: ["500円券×20枚", "印刷した記念写真", "手書きメッセージ", "記念動画の視聴案内（QR）", "記念ステッカー（予定）"],
    },
    platinum: {
      title: "プラチナ（プラン料金100,000円）",
      benefits: ["600円券×25枚", "印刷した記念写真", "手書きメッセージ", "記念動画の視聴案内（QR）", "記念ステッカー（予定）"],
    },
  };
  const absentPlanDetails = {
    absent_donation_5000: {
      title: "スタンダード（5,000円）",
      benefits: ["印刷写真", "手書き手紙", "記念動画の視聴案内（QR）", "記念ステッカー", "定形郵便等で配送予定"],
    },
    absent_donation_10000: {
      title: "アドバンス（10,000円）",
      benefits: ["印刷写真", "手書き手紙", "記念動画の視聴案内（QR）", "記念ステッカー", "写真スタンド", "レターパックで配送予定"],
    },
    absent_donation_30000: {
      title: "プレミアム（30,000円）",
      benefits: ["印刷写真", "手書き手紙", "記念動画の視聴案内（QR）", "記念ステッカー", "写真盾", "限定記念品（ハンカチ）", "宅急便コンパクトで配送予定"],
    },
  };
  const companionFees = {
    adult: { attending: 8000, without_reception: 6000 },
    child: { attending: 3000, without_reception: 1000 },
  };
  const feePeriodLabels = {
    early: "2026年9月30日までの申込",
    year_end: "2026年10月1日〜12月31日の申込",
    regular: "2027年1月1日以降の申込",
  };

  if (!form) return;

  if (checkoutState.get("checkout") === "success") {
    setMessage(`お支払いが完了し、申込が完了しました。参加確定メールをお送りします。受付番号: ${checkoutState.get("application") || "確認中"}`, "success");
  } else if (checkoutState.get("checkout") === "cancelled") {
    setMessage("お支払いが完了しなかったため、申込は完了していません。内容をご確認のうえ、もう一度お申し込みください。", "error");
  }

  fetch("/api/festa60/config")
    .then((response) => response.json())
    .then((config) => {
      applyFeePeriod(config.fee_period || feePeriodForNow(), config.fee_periods || feePeriodLabels);
      updateStripeAvailability(config);
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
    .catch(() => {
      applyFeePeriod(feePeriodForNow(), feePeriodLabels);
      updateStripeAvailability({ stripe_mode: "not_configured" });
    });

  companionCount.addEventListener("input", renderCompanions);
  applicationMode.addEventListener("change", updateApplicationMode);
  schoolLineage.addEventListener("change", updateIdentityAndTicketType);
  graduationYear.addEventListener("input", updateIdentityAndTicketType);
  supportTier.addEventListener("change", function () {
    updateReturnAddressRequirement();
    updatePlanDetails();
    updateFeePreview();
  });
  absentDonationTier.addEventListener("change", function () {
    updatePlanDetails();
    updateFeePreview();
  });
  receptionAttendance.addEventListener("change", function () {
    syncCompanionReceptionOptions();
    updatePlanDetails();
    updateFeePreview();
  });
  postalLookupButton.addEventListener("click", lookupAddressByPostalCode);
  openGraduationYearGuide?.addEventListener("click", function () {
    graduationYearGuide?.showModal();
  });
  closeGraduationYearGuide?.addEventListener("click", function () {
    graduationYearGuide?.close();
  });
  graduationYearGuide?.addEventListener("click", function (event) {
    if (event.target === graduationYearGuide) graduationYearGuide.close();
  });
  graduationYearGuide?.addEventListener("close", function () {
    openGraduationYearGuide?.focus();
  });
  postalCode.addEventListener("input", function () {
    window.clearTimeout(postalLookupTimer);
    const normalized = normalizePostalCode(postalCode.value);
    if (normalized.length !== 7 || normalized === lastLookedUpPostalCode) return;
    postalLookupTimer = window.setTimeout(lookupAddressByPostalCode, 400);
  });
  activateStaffMode();
  renderCompanions();
  applyFeePeriod(feePeriodForNow(), feePeriodLabels);
  updateIdentityAndTicketType();
  updateSupportTierAvailability();
  updateApplicationMode();
  updatePlanDetails();
  updateFeePreview();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      const payload = formPayload(new FormData(form));
      payload.client_submission_id = crypto.randomUUID();
      const clientErrors = validatePayload(payload);
      if (clientErrors.length) {
        throw new Error(clientErrors.join("\n"));
      }
      pendingPayload = payload;
      showConfirmation(payload);
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  editApplicationButton.addEventListener("click", async function () {
    await cancelBankPreview();
    pendingPayload = null;
    clearBankTransferPreview();
    resetTurnstile();
    confirmationPanel.hidden = true;
    entryPanel.hidden = false;
    setStep("entry");
    entryPanel.scrollIntoView({ block: "start" });
    form.querySelector("input, select, textarea")?.focus({ preventScroll: true });
  });

  confirmApplicationButton.addEventListener("click", submitConfirmedApplication);
  confirmBankTransferButton.addEventListener("click", function () {
    submitApplication("confirm_bank_transfer");
  });
  changeToOnlinePaymentButton.addEventListener("click", function () {
    const onlineChoice = paymentChoiceInputs.find((input) => input.value === "online");
    if (onlineChoice) onlineChoice.checked = true;
    bankTransferPreview.hidden = true;
    paymentChoice.hidden = false;
    confirmationActions.hidden = false;
    updateConfirmationPaymentChoice();
    confirmationPaymentTitle.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  paymentChoiceInputs.forEach((input) => input.addEventListener("change", updateConfirmationPaymentChoice));

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
            <input id="companion_${index}_relationship" name="companion_${index}_relationship" placeholder="例: 配偶者、子、友人" required />
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
            <p class="crm-help">大人には申込者本人の参加プランと同じ券種を1枚配布します。子供への自動配布はありません。</p>
          </div>
          <div class="crm-field">
            <label for="companion_${index}_reception_attendance">懇親会 <span class="crm-required">必須</span></label>
            <select id="companion_${index}_reception_attendance" name="companion_${index}_reception_attendance" required>
              <option value="attending">参加する</option>
              <option value="without_reception">参加しない</option>
            </select>
            <p class="crm-help" data-companion-reception-help>申込者本人が参加する場合、同伴者は参加・不参加を個別に選べます。</p>
          </div>
        </div>
        <div class="crm-field">
            <label for="companion_${index}_email">メールアドレス <span class="crm-optional">任意</span></label>
            <input id="companion_${index}_email" name="companion_${index}_email" type="email" autocomplete="email" />
        </div>
        <div class="crm-field">
          <label for="companion_${index}_note">補足 <span class="crm-optional">任意</span></label>
          <input id="companion_${index}_note" name="companion_${index}_note" placeholder="年齢区分、配慮事項など" />
        </div>
        <label class="crm-check">
          <input type="checkbox" name="companion_${index}_non_obog_confirmed" required />
          <span>この同伴者はOBOGではありません。OBOGの場合は別途申し込みます。</span>
        </label>
      `;
      companions.appendChild(card);
    }
    syncCompanionReceptionOptions();
    companions.querySelectorAll("input, select").forEach((control) => {
      control.addEventListener(control.tagName === "SELECT" ? "change" : "input", updateFeePreview);
    });
    updateFeePreview();
  }

  function syncCompanionReceptionOptions() {
    const applicantAttends = receptionAttendance.value === "attending";
    companions.querySelectorAll("select[name$='_reception_attendance']").forEach((select) => {
      const attendingOption = select.querySelector("option[value='attending']");
      if (attendingOption) attendingOption.disabled = !applicantAttends;
      if (!applicantAttends) select.value = "without_reception";
      const help = select.parentElement?.querySelector("[data-companion-reception-help]");
      if (help) {
        help.textContent = applicantAttends
          ? "申込者本人が参加する場合、同伴者は参加・不参加を個別に選べます。"
          : "申込者本人が参加しないため、同伴者も懇親会不参加となります。";
      }
    });
  }

  function formPayload(data) {
    const payload = Object.fromEntries(data.entries());
    if (staffMode) {
      payload.application_mode = "attending";
    }
    payload.full_name = [payload.family_name, payload.given_name].filter(Boolean).join(" ");
    payload.full_name_kana = [payload.family_name_kana, payload.given_name_kana].filter(Boolean).join(" ");
    payload.address = [payload.prefecture, payload.city, payload.street_address, payload.building]
      .filter((value) => String(value || "").trim())
      .join(" ");
    payload.privacy_consent = data.has("privacy_consent");
    payload.contact_consent = data.has("contact_consent");
    payload.photo_consent = data.has("photo_consent");
    payload.cancellation_policy_consent = data.has("cancellation_policy_consent");
    delete payload.expected_transfer_name;
    const isAbsentDonation = payload.application_mode === "absent_donation";
    if (isAbsentDonation) {
      payload.ticket_type = payload.absent_donation_tier;
      payload.support_tier = "none";
      payload.reception_attendance = "without_reception";
      payload.companion_count = "0";
    }
    delete payload.absent_donation_tier;
    const count = isAbsentDonation ? 0 : Number(payload.companion_count || 0);
    const companionTicketUnitAmount = danceTicketUnitAmount(payload.support_tier);
    payload.companions = [];
    for (let index = 0; index < count; index += 1) {
      const fullName = payload[`companion_${index}_name`];
      if (!fullName) continue;
      const attendeeType = payload[`companion_${index}_attendee_type`] || "";
      const danceTicketCount = attendeeType === "adult" ? 1 : 0;
      payload.companions.push({
        full_name: fullName,
        relationship: payload[`companion_${index}_relationship`] || "",
        attendee_type: attendeeType,
        reception_attendance: payload[`companion_${index}_reception_attendance`] || payload.reception_attendance,
        non_obog_confirmed: data.has(`companion_${index}_non_obog_confirmed`),
        email: payload[`companion_${index}_email`] || "",
        note: payload[`companion_${index}_note`] || "",
        dance_ticket_count: danceTicketCount,
        dance_ticket_unit_amount_jpy: danceTicketCount ? companionTicketUnitAmount : 0,
        dance_ticket_total_amount_jpy: danceTicketCount * companionTicketUnitAmount,
      });
      delete payload[`companion_${index}_name`];
      delete payload[`companion_${index}_relationship`];
      delete payload[`companion_${index}_attendee_type`];
      delete payload[`companion_${index}_reception_attendance`];
      delete payload[`companion_${index}_non_obog_confirmed`];
      delete payload[`companion_${index}_email`];
      delete payload[`companion_${index}_note`];
    }
    payload.adult_companion_count = payload.companions.filter((companion) => companion.attendee_type === "adult").length;
    payload.companion_dance_ticket_count = payload.adult_companion_count;
    payload.companion_dance_ticket_unit_amount_jpy = payload.adult_companion_count ? companionTicketUnitAmount : 0;
    payload.companion_dance_ticket_total_amount_jpy = payload.adult_companion_count * companionTicketUnitAmount;
    delete payload.generation;
    return payload;
  }

  function updateIdentityAndTicketType() {
    const isGakushuin = schoolLineage.value === "gakushuin_ouyukai";
    graduationYear.required = !isGakushuin;
    graduationRequiredLabel.textContent = isGakushuin ? "任意" : "必須";
    graduationRequiredLabel.className = isGakushuin ? "crm-optional" : "crm-required";
    graduationHelp.textContent = isGakushuin
      ? "学習院桜友会の方は任意です。参加プランの割引とチケット枚数は卒部11年目以上と同じ扱いです。"
      : "東京理科大学舞踏研究部OBOGは必須です。全参加プランの卒部年度割引とダンスタイムチケット枚数を自動判定します。";

    const year = Number(graduationYear.value);
    if (isGakushuin) {
      ticketType.value = "obog";
      ticketTypeDisplay.value = "一般OBOG（学習院桜友会）";
    } else if (!Number.isInteger(year) || !graduationYear.value) {
      ticketType.value = "obog";
      ticketTypeDisplay.value = "卒部年度を入力すると自動判定されます";
    } else if (year <= obogElevenOverTo) {
      ticketType.value = "obog";
      ticketTypeDisplay.value = "一般OBOG（11年目以上）";
    } else if (year <= obogSixTenTo) {
      ticketType.value = "obog_6_10";
      ticketTypeDisplay.value = "若手OBOG（6〜10年目）";
    } else {
      ticketType.value = "obog_5_under";
      ticketTypeDisplay.value = "若手OBOG（5年目以下）";
    }

    if (staffMode) {
      ticketType.value = staffTicketType(ticketType.value);
      ticketTypeDisplay.value = `${ticketTypeDisplay.value}／役員・当日お手伝い`;
    }

    updateSupportTierAvailability();
    updatePlanDetails();
    updateFeePreview();
  }

  function updateSupportTierAvailability() {
    const supportsPremium = applicationMode.value === "attending" && (["obog", "obog_6_10", "obog_5_under"].includes(ticketType.value) || staffTicketTypes.includes(ticketType.value));
    supportTier.disabled = !supportsPremium;
    if (!supportsPremium) supportTier.value = "none";
  }

  function updateApplicationMode() {
    if (staffMode) applicationMode.value = "attending";
    const isAbsentDonation = applicationMode.value === "absent_donation";
    graduationSection.hidden = false;
    attendancePlanSection.hidden = isAbsentDonation;
    feePeriodSection.hidden = isAbsentDonation;
    attendanceTicketNotice.hidden = isAbsentDonation;
    attendanceOptionsSection.hidden = isAbsentDonation;
    supportPlanDetail.hidden = isAbsentDonation;
    photoConsentSection.hidden = isAbsentDonation;
    absentDonationSection.hidden = !isAbsentDonation;
    absentDonationTier.required = isAbsentDonation;
    ticketType.disabled = isAbsentDonation;
    supportTier.disabled = isAbsentDonation;
    receptionAttendance.disabled = isAbsentDonation;
    companionCount.disabled = isAbsentDonation;
    photoConsent.required = !isAbsentDonation;
    if (isAbsentDonation) photoConsent.checked = false;
    if (isAbsentDonation) {
      companionCount.value = "0";
      companions.innerHTML = "";
    }
    updateIdentityAndTicketType();
    updateSupportTierAvailability();
    updateReturnAddressRequirement();
    updatePlanDetails();
    updateFeePreview();
  }

  function updateReturnAddressRequirement() {
    const isDonor = applicationMode.value === "absent_donation" || supportTier.value !== "none";
    returnAddressSection.hidden = !isDonor;
    postalCode.required = isDonor;
    prefecture.required = isDonor;
    city.required = isDonor;
    streetAddress.required = isDonor;
  }

  function normalizePostalCode(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 7);
  }

  async function lookupAddressByPostalCode() {
    const normalized = normalizePostalCode(postalCode.value);
    if (normalized.length !== 7) {
      postalLookupStatus.textContent = "郵便番号を7桁で入力してください。";
      return;
    }

    postalLookupButton.disabled = true;
    postalLookupStatus.textContent = "住所を検索しています…";
    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${encodeURIComponent(normalized)}&limit=1`);
      if (!response.ok) throw new Error("lookup_failed");
      const result = await response.json();
      const addressResult = result.results?.[0];
      if (!addressResult) {
        postalLookupStatus.textContent = "該当する住所が見つかりません。住所を直接入力してください。";
        return;
      }
      postalCode.value = `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
      prefecture.value = addressResult.address1 || "";
      city.value = `${addressResult.address2 || ""}${addressResult.address3 || ""}`;
      lastLookedUpPostalCode = normalized;
      postalLookupStatus.textContent = "都道府県と市区町村・町域を入力しました。番地をご確認ください。";
      streetAddress.focus();
    } catch (error) {
      postalLookupStatus.textContent = "住所を自動検索できませんでした。住所を直接入力してください。";
    } finally {
      postalLookupButton.disabled = false;
    }
  }

  function updatePlanDetails() {
    const support = supportPlanDetails[supportTier.value];
    if (support) {
      const discountedAmount = attendeePlanAmount(supportTier.value, ticketType.value, feePeriod.value, receptionAttendance.value);
      const ticketUnitAmount = danceTicketUnitAmount(supportTier.value);
      const staffExplanation = staffMode
        ? "<p>役員割引は参加費相当分にのみ適用し、上乗せ寄付相当分は割引しません。申込時期割引と卒部年度割引は一般申込と同額を適用します。</p>"
        : "<p>申込時期割引と卒部年度割引を併用しています。</p>";
      supportPlanDetail.innerHTML = `${planDetailMarkup(support)}<p><strong>現在の割引・控除適用額：${discountedAmount.toLocaleString("ja-JP")}円</strong></p><p>通常参加分の300円券は別途配布しません。有料の大人同伴者には${ticketUnitAmount}円券を1枚配布し、当日の追加購入も原則として${ticketUnitAmount}円券です。</p>${staffExplanation}`;
    } else {
      const standardDanceTicket = publicTicketType(ticketType.value) === "obog" ? "300円券×3枚" : "300円券×2枚";
      const staffAmount = staffMode ? staffParticipationAmount(ticketType.value, feePeriod.value, receptionAttendance.value) : null;
      const standardAmount = attendeePlanAmount("none", ticketType.value, feePeriod.value, receptionAttendance.value);
      supportPlanDetail.innerHTML = staffMode
        ? `<h3>役員・当日お手伝い 通常参加</h3><p>参加費15,000円（懇親会不参加は懇親会費控除後）の50%を起点に、申込時期割引と卒部年度割引を一般申込と同額で適用します。</p><p><strong>現在の割引・控除適用額：${staffAmount.toLocaleString("ja-JP")}円</strong></p><p>ダンスタイム用の${standardDanceTicket}が付きます。有料の大人同伴者には300円券を1枚配布し、当日の追加購入も原則として300円券です。</p>`
        : `<h3>通常参加（基準額15,000円）</h3><p>申込時期割引・卒部年度割引・懇親会不参加時の2,000円控除を自動適用します。</p><p><strong>現在の割引・控除適用額：${standardAmount.toLocaleString("ja-JP")}円</strong></p><p>ダンスタイム用の${standardDanceTicket}が付きます。有料の大人同伴者には300円券を1枚配布し、当日の追加購入も原則として300円券です。</p>`;
    }
    const absent = absentPlanDetails[absentDonationTier.value];
    absentPlanDetail.innerHTML = absent ? planDetailMarkup(absent) : "";
  }

  function planDetailMarkup(plan) {
    return `<h3>${plan.title}</h3><p>主な返礼内容</p><ul>${plan.benefits.map((benefit) => `<li>${benefit}</li>`).join("")}</ul>`;
  }

  function activateStaffMode() {
    if (!staffMode) return;
    staffModeBanner.hidden = false;
    staffAccessSection.hidden = false;
    staffAccessCode.required = true;
    applicationModeSection.hidden = true;
    applicationMode.value = "attending";
    attendancePlanSection.hidden = false;
    attendanceTicketNotice.hidden = false;
    ticketType.value = "obog_staff";
    ticketTypeDisplay.value = "一般OBOG（11年目以上）／役員・当日お手伝い";
    receptionAttendanceHelp.textContent = "役員・当日お手伝いは、懇親会不参加の場合に懇親会費相当額を控除してから参加費部分を50%にします。上乗せ寄付相当分と同伴者料金には役員割引を適用しません。";
  }

  function showConfirmation(payload) {
    message.hidden = true;
    confirmationMessage.hidden = true;
    clearBankTransferPreview();
    renderConfirmation(payload);
    entryPanel.hidden = true;
    confirmationPanel.hidden = false;
    setStep("confirm");
    confirmationPanel.scrollIntoView({ block: "start" });
    document.getElementById("confirmation-title")?.focus({ preventScroll: true });
  }

  async function submitConfirmedApplication() {
    if (!pendingPayload) {
      setConfirmationMessage("入力内容を再度確認してください。", "error");
      return;
    }

    if (selectedConfirmationPaymentMethod() === "bank_transfer") {
      await previewBankTransfer();
      return;
    }

    await submitApplication(bankPreviewToken ? "switch_to_online" : "submit_online");
  }

  async function previewBankTransfer() {
    confirmApplicationButton.disabled = true;
    editApplicationButton.disabled = true;
    setConfirmationMessage("振込先を確認しています。まだ申込は確定しません...", "");

    try {
      if (!stripeAvailable) throw new Error("銀行振込は現在利用できません。時間をおいて再度お試しください。");
      const payload = clonePendingPayload();
      payload.action = "preview_bank_transfer";
      payload.payment_method = "bank_transfer";
      payload.turnstile_token = turnstileToken;
      const result = await postApplication(payload);
      applicationSaved = true;
      bankPreviewToken = result.bank_preview_token;
      bankPreviewDetails = result.bank_transfer_preview;
      renderBankTransferPreview(bankPreviewDetails);
      paymentChoice.hidden = true;
      confirmationActions.hidden = true;
      bankTransferPreview.hidden = false;
      confirmationMessage.hidden = true;
      bankTransferPreview.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("bank-transfer-preview-title")?.focus({ preventScroll: true });
    } catch (error) {
      resetTurnstile();
      setConfirmationMessage(error.message, "error");
    } finally {
      confirmApplicationButton.disabled = false;
      editApplicationButton.disabled = false;
    }
  }

  async function submitApplication(action) {
    if (!pendingPayload) {
      setConfirmationMessage("入力内容を再度確認してください。", "error");
      return;
    }

    let applicationSaved = false;
    confirmApplicationButton.disabled = true;
    editApplicationButton.disabled = true;
    confirmBankTransferButton.disabled = true;
    changeToOnlinePaymentButton.disabled = true;
    setConfirmationMessage("申込内容を送信しています...", "");

    try {
      const payload = clonePendingPayload();
      payload.action = action;
      payload.payment_method = action === "confirm_bank_transfer" ? "bank_transfer" : "stripe";
      if (action === "submit_online") payload.turnstile_token = turnstileToken;
      if (action === "confirm_bank_transfer" || action === "switch_to_online") payload.bank_preview_token = bankPreviewToken;
      if (!stripeAvailable) {
        throw new Error("オンライン決済は現在準備中です。時間をおいて再度お試しいただくか、事務局へお問い合わせください。");
      }
      payload.pay_now = true;
      const result = await postApplication(payload);

      if (result.payment?.checkoutUrl) {
        setConfirmationMessage("決済画面を準備しました。お支払い完了後に申込完了となります...", "success");
        window.location.assign(result.payment.checkoutUrl);
        return;
      }

      renderCompletion(result, payload);
      pendingPayload = null;
      clearBankTransferPreview();
      form.reset();
      updateApplicationMode();
      renderCompanions();
      confirmationPanel.hidden = true;
      completionPanel.hidden = false;
      setStep("complete");
      completionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setConfirmationMessage(error.message, "error");
    } finally {
      confirmApplicationButton.disabled = applicationSaved;
      editApplicationButton.disabled = applicationSaved;
      confirmBankTransferButton.disabled = applicationSaved;
      changeToOnlinePaymentButton.disabled = applicationSaved;
    }
  }

  function clonePendingPayload() {
    const payload = { ...pendingPayload };
    payload.companions = (pendingPayload?.companions || []).map((companion) => ({ ...companion }));
    return payload;
  }

  async function postApplication(payload) {
    const response = await fetch("/api/festa60/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      if (result.application?.application_code) {
        throw new Error(`${result.message || "送信に失敗しました。"}\n受付番号: ${result.application.application_code}`);
      }
      throw new Error(formatApplicationError(result));
    }
    return result;
  }

  function formatApplicationError(result) {
    const fieldLabels = {
      family_name: "姓",
      given_name: "名",
      family_name_kana: "姓（ふりがな）",
      given_name_kana: "名（ふりがな）",
      email: "メールアドレス",
      ticket_type: "参加・寄付プラン",
      reception_attendance: "懇親会の参加",
      privacy_consent: "個人情報の取扱いへの同意",
      photo_consent: "写真撮影・掲載の確認",
      cancellation_policy_consent: "キャンセル規定への同意",
      school_lineage: "所属区分",
      staff_access_code: "役員用アクセスコード",
    };
    const invalidFields = Object.keys(result.details || {})
      .map((field) => fieldLabels[field] || (field.startsWith("companions.") ? "同伴者情報" : ""))
      .filter(Boolean);
    const uniqueFields = [...new Set(invalidFields)];
    if (uniqueFields.length) {
      return `${result.message || "入力内容を確認してください。"}\n確認が必要な項目: ${uniqueFields.join("、")}`;
    }
    return result.message || result.error || "送信に失敗しました。";
  }

  function renderConfirmation(payload) {
    const isAbsentDonation = Object.hasOwn(absentDonationTotals, payload.ticket_type);
    const isDonor = isAbsentDonation || payload.support_tier !== "none";
    const amount = calculateAmount(payload);
    const groups = [
      {
        title: "申込者情報",
        rows: [
          ["申込区分", staffMode ? "役員・当日お手伝い専用申込" : selectedLabel(applicationMode)],
          ["氏名", payload.full_name],
          ["ふりがな", payload.full_name_kana],
          ["旧姓", payload.maiden_name || "未入力"],
          ["メールアドレス", payload.email],
          ["電話番号", payload.phone || "未入力"],
          ["所属区分", selectedLabel(schoolLineage)],
          ["卒部年度", payload.graduation_year || "未入力"],
        ],
      },
    ];

    if (isAbsentDonation) {
      groups.push({
        title: "寄付内容",
        rows: [
          ["欠席者向け寄付", absentPlanDetails[payload.ticket_type]?.title || payload.ticket_type],
          ["お支払い予定額", formatYen(amount)],
        ],
      });
    } else {
      const companionTicketUnitAmount = danceTicketUnitAmount(payload.support_tier);
      const companionRows = payload.companions.length
        ? payload.companions.map((companion, index) => [
          `同伴者${index + 1}`,
          `${companion.full_name} / ${companion.relationship} / ${companion.attendee_type === "child" ? "子供（チケット自動配布なし）" : `大人（${companionTicketUnitAmount}円券×1枚）`} / ${companion.reception_attendance === "attending" ? "懇親会参加" : "懇親会不参加"}${companion.email ? ` / ${companion.email}` : ""}${companion.note ? `\n補足: ${companion.note}` : ""}`,
        ])
        : [["同伴者", "なし"]];
      groups.push({
        title: "参加・寄付内容",
        rows: [
          ["卒部区分（割引・チケット判定）", ticketTypeDisplay.value],
          ["参加費区分", staffMode ? "役員・当日お手伝い（参加費部分50%）" : feePeriodDisplay.value],
          ["参加プラン", selectedLabel(supportTier)],
          ["申込時期割引", applicationPeriodDiscount(payload.fee_period) ? `-${formatYen(applicationPeriodDiscount(payload.fee_period))}` : "割引なし"],
          ["卒部年度割引", graduationDiscount(payload.ticket_type) ? `-${formatYen(graduationDiscount(payload.ticket_type))}` : "割引なし"],
          ["懇親会", selectedLabel(receptionAttendance)],
          ...companionRows,
          ["同伴者向けチケット", payload.companion_dance_ticket_count ? `${companionTicketUnitAmount}円券×${payload.companion_dance_ticket_count}枚` : "なし"],
          ["当日追加購入できる券種", `${companionTicketUnitAmount}円券（原則）`],
          ["お支払い予定額", formatYen(amount)],
        ],
      });
    }

    if (isDonor) {
      groups.push({
        title: "返礼品・お礼状の送付先",
        rows: [
          ["郵便番号", payload.postal_code],
          ["住所", payload.address],
        ],
      });
    }

    groups.push({
      title: "お支払い・同意内容",
      rows: [
        ["お支払い方法", "この画面で選択"],
        ["連絡事項", payload.message || "なし"],
        ["個人情報の利用", payload.privacy_consent ? "同意する" : "同意しない"],
        ["事務局からの連絡", payload.contact_consent ? "受け取る" : "受け取らない"],
        ...(!isAbsentDonation ? [["撮影・限定公開", payload.photo_consent ? "了承する" : "了承しない"]] : []),
        ["キャンセル・返金規定", payload.cancellation_policy_consent ? "同意する" : "同意しない"],
      ],
    });

    confirmationSummary.replaceChildren(...groups.map(createConfirmationGroup));
    const onlineChoice = paymentChoiceInputs.find((input) => input.value === "online");
    if (onlineChoice) onlineChoice.checked = true;
    paymentChoice.hidden = false;
    confirmationActions.hidden = false;
    updateConfirmationPaymentChoice();
  }

  function createConfirmationGroup(group) {
    const section = document.createElement("section");
    section.className = "crm-confirmation-group";
    const heading = document.createElement("h3");
    heading.textContent = group.title;
    const list = document.createElement("dl");
    list.className = "crm-confirmation-list";
    group.rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = String(value ?? "");
      row.append(term, description);
      list.appendChild(row);
    });
    section.append(heading, list);
    return section;
  }

  function selectedLabel(select) {
    return select.options[select.selectedIndex]?.textContent.trim() || "未選択";
  }

  function paymentMethodLabel(method) {
    if (method === "stripe") return "オンライン決済（画面に表示された支払い方法）";
    if (method === "bank_transfer") return "銀行振込";
    return "オンライン決済";
  }

  function selectedConfirmationPaymentMethod() {
    return paymentChoiceInputs.find((input) => input.checked)?.value || "online";
  }

  function updateConfirmationPaymentChoice() {
    if (selectedConfirmationPaymentMethod() === "bank_transfer") {
      confirmationPaymentTitle.textContent = "振込先を確認してから最終確定できます";
      confirmationPaymentNote.textContent = "次の操作では実際の振込先を表示するだけで、申込はまだ確定しません。表示後に銀行振込で確定するか、カード等へ選び直せます。";
      confirmApplicationButton.textContent = "振込先を確認する（まだ確定しません）";
    } else {
      confirmationPaymentTitle.textContent = "カード・スマホ決済等でお支払い";
      confirmationPaymentNote.textContent = "安全な外部決済画面へ移動します。お支払い完了後に申込完了となります。利用できる支払い方法は端末やブラウザ等により異なります。";
      confirmApplicationButton.textContent = "決済画面へ進む（決済後に申込完了）";
    }
  }

  function renderBankTransferPreview(details) {
    document.getElementById("bank-preview-amount").textContent = formatYen(details.amount);
    document.getElementById("bank-preview-bank").textContent = [details.bank_name, details.bank_code ? `（銀行コード ${details.bank_code}）` : ""].filter(Boolean).join(" ");
    document.getElementById("bank-preview-branch").textContent = [details.branch_name, details.branch_code ? `（支店コード ${details.branch_code}）` : ""].filter(Boolean).join(" ");
    document.getElementById("bank-preview-account-type").textContent = bankAccountTypeLabel(details.account_type);
    document.getElementById("bank-preview-account-number").textContent = details.account_number;
    document.getElementById("bank-preview-account-holder").textContent = details.account_holder_name;
  }

  function bankAccountTypeLabel(value) {
    const labels = { futsu: "普通", toza: "当座", savings: "貯蓄" };
    return labels[value] || value || "普通";
  }

  function clearBankTransferPreview() {
    bankPreviewToken = "";
    bankPreviewDetails = null;
    bankTransferPreview.hidden = true;
    paymentChoice.hidden = false;
    confirmationActions.hidden = false;
  }

  async function cancelBankPreview() {
    if (!bankPreviewToken || !pendingPayload) return;
    try {
      const payload = clonePendingPayload();
      payload.action = "cancel_bank_preview";
      payload.payment_method = "bank_transfer";
      payload.bank_preview_token = bankPreviewToken;
      await postApplication(payload);
    } catch (error) {
      console.warn("Bank transfer preview cancellation failed.", error);
    }
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (window.turnstile?.reset) window.turnstile.reset();
  }

  function formatYen(amount) {
    return `${Number(amount || 0).toLocaleString("ja-JP")}円`;
  }

  function setStep(current) {
    const order = ["entry", "confirm", "complete"];
    const currentIndex = order.indexOf(current);
    order.forEach((step, index) => {
      const item = document.getElementById(`step-${step}`);
      if (!item) return;
      item.classList.toggle("is-current", index === currentIndex);
      item.classList.toggle("is-complete", index < currentIndex);
      if (index === currentIndex) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
  }

  function setConfirmationMessage(text, kind) {
    confirmationMessage.hidden = false;
    confirmationMessage.textContent = text;
    confirmationMessage.dataset.kind = kind;
  }

  function updateFeePreview() {
    const data = new FormData(form);
    const payload = formPayload(data);
    const amount = calculateAmount(payload);
    feePreview.textContent = `お支払い予定額: ${amount.toLocaleString("ja-JP")}円`;
  }

  function updateStripeAvailability(config) {
    const stripeMode = config.stripe_mode || "not_configured";
    const isAvailable = stripeMode === "live" || stripeMode === "sandbox";
    const isSandbox = stripeMode === "sandbox";
    stripeAvailable = isAvailable;
    if (stripePaymentStatus) stripePaymentStatus.textContent = isSandbox ? "テスト環境" : isAvailable ? "利用できます" : "準備中";
    if (stripePaymentHelp) {
      stripePaymentHelp.textContent = isAvailable
        ? "確認後、安全な外部決済画面へ移動します。表示された支払い方法から選択してください。"
        : "現在オンライン決済を準備中です。ご利用開始までお待ちください。";
    }
    if (environmentBanner) {
      environmentBanner.hidden = !(isSandbox || window.location.hostname.includes("-staging"));
    }
  }

  function applyFeePeriod(period, labels) {
    const normalized = ["early", "year_end", "regular"].includes(period) ? period : "regular";
    feePeriod.value = normalized;
    feePeriodDisplay.value = labels[normalized] || feePeriodLabels[normalized];
    updatePlanDetails();
    updateFeePreview();
  }

  function feePeriodForNow() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const date = `${values.year}-${values.month}-${values.day}`;
    if (date <= "2026-09-30") return "early";
    if (date <= "2026-12-31") return "year_end";
    return "regular";
  }

  function validatePayload(payload) {
    const errors = [];
    if (![payload.family_name, payload.given_name, payload.family_name_kana, payload.given_name_kana].every((value) => String(value || "").trim())) {
      errors.push("姓・名と、それぞれのふりがなを入力してください。");
    }
    if (!payload.cancellation_policy_consent) {
      errors.push("キャンセル・返金規定への同意が必要です。");
    }
    const graduationYear = Number(payload.graduation_year || 0);
    const isAbsentDonation = Object.hasOwn(absentDonationTotals, payload.ticket_type);
    const isGakushuin = payload.school_lineage === "gakushuin_ouyukai";
    const isStaffApplication = staffMode && staffTicketTypes.includes(payload.ticket_type);
    if (isStaffApplication && !String(payload.staff_access_code || "").trim()) {
      errors.push("役員・お手伝い用アクセスコードを入力してください。");
    }
    if (!["tus_obog", "gakushuin_ouyukai"].includes(payload.school_lineage)) {
      errors.push("所属区分を選択してください。");
    }
    if (!isGakushuin && !graduationYear) {
      errors.push("東京理科大学舞踏研究部OBOGは卒部年度を入力してください。");
    }
    if (graduationYear && (!Number.isInteger(graduationYear) || graduationYear < 1900 || graduationYear > 2026)) {
      errors.push("卒部年度は1900〜2026の西暦4桁で入力してください。");
    }
    if (!isStaffApplication && !isGakushuin && !isAbsentDonation && payload.ticket_type === "obog" && graduationYear > obogElevenOverTo) {
      errors.push(`一般OBOG（11年目以上）は${obogElevenOverTo}年度以前の卒部を対象とします。参加費区分または卒部年度を確認してください。`);
    }
    if (!isStaffApplication && !isGakushuin && !isAbsentDonation && payload.ticket_type === "obog_6_10" && (graduationYear < obogSixTenFrom || graduationYear > obogSixTenTo)) {
      errors.push(`OBOG 6〜10年目は${obogSixTenFrom}〜${obogSixTenTo}年度に卒部した方を想定しています。参加費区分または卒部年度を確認してください。`);
    }
    if (!isStaffApplication && !isGakushuin && !isAbsentDonation && payload.ticket_type === "obog_5_under" && graduationYear < obogFiveUnderFrom) {
      errors.push(`OBOG 5年目以下は${obogFiveUnderFrom}年度以降の卒部を想定しています。参加費区分または卒部年度を確認してください。`);
    }
    if (payload.support_tier && payload.support_tier !== "none" && !["obog", "obog_6_10", "obog_5_under", ...staffTicketTypes].includes(payload.ticket_type)) {
      errors.push("参加者向け支援プランはOBOG区分で選択してください。");
    }
    const isDonor = isAbsentDonation || payload.support_tier !== "none";
    if (isDonor && normalizePostalCode(payload.postal_code).length !== 7) {
      errors.push("寄付のお申し込みには7桁の郵便番号が必要です。");
    }
    if (isDonor && ![payload.prefecture, payload.city, payload.street_address].every((value) => String(value || "").trim())) {
      errors.push("寄付のお申し込みには都道府県、市区町村・町域、番地が必要です。");
    }
    payload.companions.forEach((companion, index) => {
      if (!companion.full_name || !companion.relationship || !companion.attendee_type) {
        errors.push(`同伴者${index + 1}の氏名、続柄・関係、同伴者属性を入力してください。`);
      }
      if (!["attending", "without_reception"].includes(companion.reception_attendance)) {
        errors.push(`同伴者${index + 1}の懇親会参加有無を選択してください。`);
      }
      if (payload.reception_attendance === "without_reception" && companion.reception_attendance === "attending") {
        errors.push(`申込者本人が懇親会に参加しない場合、同伴者${index + 1}のみの懇親会参加は選べません。`);
      }
      if (!companion.non_obog_confirmed) {
        errors.push(`同伴者${index + 1}がOBOGではないことを確認してください。`);
      }
      if (companion.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companion.email)) {
        errors.push(`同伴者${index + 1}のメールアドレスを確認してください。`);
      }
    });
    return errors;
  }

  function calculateAmount(payload) {
    const period = payload.fee_period || "regular";
    const reception = payload.reception_attendance || "attending";
    if (Object.hasOwn(absentDonationTotals, payload.ticket_type)) {
      return absentDonationTotals[payload.ticket_type];
    }
    let base = baseFees[payload.ticket_type]?.[period] ?? baseFees.obog[period];
    if (staffTicketTypes.includes(payload.ticket_type)) {
      base = payload.support_tier && payload.support_tier !== "none"
        ? attendeePlanAmount(payload.support_tier, payload.ticket_type, period, reception)
        : staffParticipationAmount(payload.ticket_type, period, reception);
    } else if (payload.ticket_type === "current_student") {
      base = reception === "attending" ? baseFees.current_student[period] : 0;
    } else if (payload.support_tier && payload.support_tier !== "none") {
      base = attendeePlanAmount(payload.support_tier, payload.ticket_type, period, reception);
    } else {
      base = Math.max(0, base - noReceptionDiscount(reception));
    }

    const companionTotal = payload.companions.reduce((sum, companion) => {
      const type = companion.attendee_type === "child" ? "child" : "adult";
      const companionReception = companion.reception_attendance || reception;
      return sum + companionFees[type][companionReception];
    }, base);
    return companionTotal;
  }

  function attendeePlanAmount(plan, attendeeType, period, reception = "attending") {
    const planBase = attendingPlanTotals[plan];
    if (!planBase) {
      const standardFee = baseFees[attendeeType]?.[period] ?? baseFees.obog[period];
      return Math.max(0, standardFee - noReceptionDiscount(reception));
    }
    if (staffTicketTypes.includes(attendeeType)) {
      const donationAddOn = Math.max(0, planBase - baseFees.obog.regular);
      return donationAddOn + staffParticipationAmount(attendeeType, period, reception);
    }
    const discountedStandardFee = baseFees[attendeeType]?.[period] ?? baseFees.obog[period];
    const combinedDiscount = Math.max(0, baseFees.obog.regular - discountedStandardFee);
    return Math.max(0, planBase - combinedDiscount - noReceptionDiscount(reception));
  }

  function applicationPeriodDiscount(period) {
    if (period === "early") return 2000;
    if (period === "year_end") return 1000;
    return 0;
  }

  function graduationDiscount(attendeeType) {
    const publicType = publicTicketType(attendeeType);
    if (publicType === "obog_6_10") return 2000;
    if (publicType === "obog_5_under") return 4000;
    return 0;
  }

  function staffParticipationAmount(attendeeType, period, reception) {
    const staffBase = Math.round((baseFees.obog.regular - noReceptionDiscount(reception)) * 0.5);
    return Math.max(0, staffBase - applicationPeriodDiscount(period) - graduationDiscount(attendeeType));
  }

  function publicTicketType(attendeeType) {
    if (attendeeType === "obog_staff_6_10") return "obog_6_10";
    if (attendeeType === "obog_staff_5_under") return "obog_5_under";
    if (attendeeType === "obog_staff") return "obog";
    return attendeeType;
  }

  function staffTicketType(attendeeType) {
    if (attendeeType === "obog_6_10") return "obog_staff_6_10";
    if (attendeeType === "obog_5_under") return "obog_staff_5_under";
    return "obog_staff";
  }

  function noReceptionDiscount(reception) {
    return reception === "without_reception" ? 2000 : 0;
  }

  function danceTicketUnitAmount(plan) {
    return attendingPlanTicketUnits[plan] || 300;
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
    const isAbsentDonation = Object.hasOwn(absentDonationTotals, payload.ticket_type);
    document.getElementById("completion-title").textContent = isAbsentDonation
      ? "寄付のお申し込みありがとうございます。"
      : "お申し込みありがとうございます。";
    document.getElementById("completion-status").textContent = isAbsentDonation
      ? "入金確認後に、寄付受付完了メールをお送りします。"
      : "入金確認後に、参加確定メールをお送りします。";
    document.getElementById("complete-application-id").textContent = applicationId;
    document.getElementById("complete-amount").textContent = `${amount.toLocaleString("ja-JP")}円`;
    document.getElementById("complete-payment-method").textContent = paymentMethodLabel(payload.payment_method);
    const paymentLink = document.getElementById("completion-payment-link");
    const bankInstructions = document.getElementById("complete-bank-instructions");
    if (payload.payment_method === "bank_transfer" && payment.hostedInstructionsUrl) {
      bankInstructions.href = payment.hostedInstructionsUrl;
      paymentLink.hidden = false;
      document.getElementById("completion-guide").textContent = "受付番号を発行しました。表示した振込先へお支払いください。振込案内はメールでもお送りします。";
    } else {
      paymentLink.hidden = true;
    }
  }
})();

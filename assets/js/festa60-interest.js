(function () {
  const form = document.querySelector("[data-interest-form]");
  if (!form) return;

  const apiBase = resolveApiBase(form);
  const message = document.getElementById("interest-form-message");
  const completion = document.getElementById("interest-completion");
  const codeOutput = document.getElementById("interest-code-output");
  const participantCategory = form.querySelector("[name='participant_category']");
  const graduationField = document.getElementById("graduation-year-field");
  const graduationYear = form.querySelector("[name='graduation_year']");
  const graduationUnknown = form.querySelector("[name='graduation_year_unknown']");
  const companionHost = document.getElementById("companion-host-fields");
  const consultationNote = document.getElementById("eligibility-consultation-note");
  let turnstileToken = "";

  loadTurnstile();
  syncConditionalFields();

  participantCategory.addEventListener("change", syncConditionalFields);
  graduationUnknown.addEventListener("change", syncGraduationInput);
  form.addEventListener("submit", handleSubmit);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("送信中です...", "");
    completion.hidden = true;

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.privacy_consent = form.querySelector("[name='privacy_consent']").checked;
      payload.graduation_year_unknown = graduationUnknown.checked;
      payload.turnstile_token = turnstileToken;
      payload.source_path = location.pathname;

      const errors = validatePayload(payload);
      if (errors.length) throw new Error(errors.join("\n"));

      const response = await fetch(`${apiBase}/api/festa60/interest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(errorMessage(result));
      }

      codeOutput.textContent = result.interest?.interestCode || result.interest?.interest_code || "";
      completion.hidden = false;
      setMessage("参加・寄付意向を受け付けました。", "success");
      form.reset();
      turnstileToken = "";
      if (window.turnstile && document.getElementById("interest-turnstile-slot")) {
        window.turnstile.reset("#interest-turnstile-slot");
      }
      syncConditionalFields();
      completion.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setMessage(error.message || "送信に失敗しました。", "error");
    } finally {
      button.disabled = false;
    }
  }

  function syncConditionalFields() {
    const category = participantCategory.value;
    const requiresGraduation = category === "tus_obog" || category === "gakushuin_oyu";
    const isCompanion = category === "tus_obog_companion" || category === "gakushuin_oyu_companion";
    const needsConsultation = category === "eligibility_consultation";

    graduationField.hidden = !requiresGraduation;
    graduationYear.required = requiresGraduation && !graduationUnknown.checked;
    companionHost.hidden = !isCompanion;
    consultationNote.hidden = !needsConsultation;
    syncGraduationInput();
  }

  function syncGraduationInput() {
    graduationYear.disabled = graduationUnknown.checked;
    graduationYear.required = !graduationUnknown.checked && !graduationField.hidden;
    if (graduationUnknown.checked) graduationYear.value = "";
  }

  function validatePayload(payload) {
    const errors = [];
    const required = [
      ["last_name", "姓"],
      ["first_name", "名"],
      ["last_kana", "ふりがな（せい）"],
      ["first_kana", "ふりがな（めい）"],
      ["email", "メールアドレス"],
      ["email_confirm", "メールアドレス確認用"],
      ["participant_category", "参加区分"],
      ["attendance_intent", "参加意向"],
    ];
    required.forEach(([name, label]) => {
      if (!String(payload[name] || "").trim()) errors.push(`${label}を入力してください。`);
    });
    if (payload.email && payload.email_confirm && payload.email.trim().toLowerCase() !== payload.email_confirm.trim().toLowerCase()) {
      errors.push("メールアドレスと確認用メールアドレスが一致していません。");
    }
    if ((payload.participant_category === "tus_obog" || payload.participant_category === "gakushuin_oyu") && !payload.graduation_year_unknown) {
      if (!/^\d{4}$/.test(String(payload.graduation_year || "").trim())) {
        errors.push("卒部年度は西暦4桁で入力するか、「不明」にチェックしてください。");
      }
    }
    if (payload.participant_category === "eligibility_consultation" && !String(payload.message || "").trim()) {
      errors.push("参加資格について相談したい場合は、その他連絡事項に状況をご記入ください。");
    }
    if (!payload.privacy_consent) {
      errors.push("個人情報の取り扱いに同意してください。");
    }
    return errors;
  }

  async function loadTurnstile() {
    try {
      const response = await fetch(`${apiBase}/api/festa60/config`);
      const config = await response.json();
      if (!config.turnstile_site_key) return;
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = function () {
        window.turnstile.render("#interest-turnstile-slot", {
          sitekey: config.turnstile_site_key,
          callback(token) {
            turnstileToken = token;
          },
        });
      };
      document.head.appendChild(script);
    } catch {
      // Local file preview can still validate form behavior without rendering Turnstile.
    }
  }

  function resolveApiBase(currentForm) {
    if (currentForm.dataset.apiBase) return currentForm.dataset.apiBase.replace(/\/$/, "");
    if (location.hostname === "tusfantasista.github.io") {
      return "https://fantasista-review-202605.tus-fantasista.workers.dev";
    }
    return "";
  }

  function setMessage(text, kind) {
    if (!message) return;
    message.hidden = false;
    message.textContent = text;
    message.dataset.kind = kind;
  }

  function errorMessage(result) {
    if (!result) return "送信に失敗しました。";
    if (result.details?.email_confirm === "mismatch") return "メールアドレスと確認用メールアドレスが一致していません。";
    if (result.details?.privacy_consent === "required") return "個人情報の取り扱いに同意してください。";
    if (result.details?.graduation_year) return "卒部年度は西暦4桁で入力するか、「不明」にチェックしてください。";
    return result.message || result.error || "送信に失敗しました。";
  }
})();

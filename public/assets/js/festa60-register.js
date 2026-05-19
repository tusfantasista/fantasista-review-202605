(function () {
  const form = document.getElementById("festa60-form");
  const message = document.getElementById("form-message");
  const companionCount = document.getElementById("companion_count");
  const companions = document.getElementById("companions");
  const ticketType = document.getElementById("ticket_type");
  let turnstileToken = "";
  const youngObogGraduationYearFrom = 2017;

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
  renderCompanions();
  updateGraduationRequirement();

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
      payload.pay_now = true;

      const response = await fetch("/api/festa60/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.message || result.error || "送信に失敗しました。");
      }

      if (result.checkout && result.checkout.url) {
        setMessage("申込を保存しました。Stripe Checkoutへ移動します。", "success");
        location.href = result.checkout.url;
        return;
      }

      setMessage(`申込を保存しました。受付番号: ${result.application.application_code}`, "success");
      form.reset();
      renderCompanions();
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
              <option value="family">家族</option>
              <option value="obog">OBOG</option>
              <option value="current_student">現役生</option>
              <option value="guest">一般同伴者</option>
              <option value="child">子ども</option>
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
  }

  function formPayload(data) {
    const payload = Object.fromEntries(data.entries());
    payload.privacy_consent = data.has("privacy_consent");
    payload.contact_consent = data.has("contact_consent");
    payload.photo_consent = data.has("photo_consent");
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
    const requiresYear = ["obog", "young_obog"].includes(ticketType.value);
    graduationYear.required = requiresYear;
  }

  function validatePayload(payload) {
    const errors = [];
    const graduationYear = Number(payload.graduation_year || 0);
    if (["obog", "young_obog"].includes(payload.ticket_type) && !graduationYear) {
      errors.push("OBOG・若手OBOGは卒部年度を入力してください。");
    }
    if (payload.ticket_type === "young_obog" && graduationYear < youngObogGraduationYearFrom) {
      errors.push(`若手OBOGは卒部10年以内（${youngObogGraduationYearFrom}年度以降）として扱います。チケット種別または卒部年度を確認してください。`);
    }
    payload.companions.forEach((companion, index) => {
      if (!companion.full_name || !companion.relationship || !companion.attendee_type) {
        errors.push(`同伴者${index + 1}の氏名、続柄・関係、同伴者属性を入力してください。`);
      }
      if (companion.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companion.email)) {
        errors.push(`同伴者${index + 1}のメールアドレスを確認してください。`);
      }
    });
    return errors;
  }

  function setMessage(text, kind) {
    message.hidden = false;
    message.textContent = text;
    message.dataset.kind = kind;
  }
})();

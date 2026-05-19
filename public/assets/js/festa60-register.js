(function () {
  const form = document.getElementById("festa60-form");
  const message = document.getElementById("form-message");
  const companionCount = document.getElementById("companion_count");
  const companions = document.getElementById("companions");
  let turnstileToken = "";

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
  renderCompanions();

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setMessage("送信中です...", "");
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;

    try {
      const payload = formPayload(new FormData(form));
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
      const row = document.createElement("div");
      row.className = "crm-two";
      row.innerHTML = `
        <div class="crm-field">
          <label for="companion_${index}_name">同伴者${index + 1} 氏名</label>
          <input id="companion_${index}_name" name="companion_${index}_name" />
        </div>
        <div class="crm-field">
          <label for="companion_${index}_relationship">続柄</label>
          <input id="companion_${index}_relationship" name="companion_${index}_relationship" />
        </div>
      `;
      companions.appendChild(row);
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
      });
      delete payload[`companion_${index}_name`];
      delete payload[`companion_${index}_relationship`];
    }
    return payload;
  }

  function setMessage(text, kind) {
    message.hidden = false;
    message.textContent = text;
    message.dataset.kind = kind;
  }
})();

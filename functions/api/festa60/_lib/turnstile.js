export async function verifyTurnstile(token, env, request) {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (canSkipTurnstile(env)) return { ok: true, skipped: true };
    return { ok: false, message: "Turnstile secret is not configured." };
  }
  if (!token) return { ok: false, message: "Turnstile token is missing." };

  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  form.append("remoteip", request.headers.get("cf-connecting-ip") || "");

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const result = await response.json();
  return { ok: Boolean(result.success), result };
}

function canSkipTurnstile(env) {
  const environment = String(env.ENVIRONMENT || "preview").toLowerCase();
  const branch = String(env.CF_PAGES_BRANCH || "").toLowerCase();
  if (environment === "production" || branch === "main") return false;
  if (env.TURNSTILE_SKIP_ENABLED === "false") return false;
  return true;
}

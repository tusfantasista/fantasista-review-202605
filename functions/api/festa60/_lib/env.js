export function environmentName(env) {
  return env.ENVIRONMENT || env.CF_PAGES_BRANCH || "preview";
}

export function isProduction(env) {
  return environmentName(env) === "production";
}

export function requireDb(env) {
  if (!env.DB) {
    throw new Error("D1 binding DB is not configured.");
  }
  return env.DB;
}

export function requireStripeSecret(env) {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");

  if (!key.startsWith("sk_test_")) {
    throw new Error("Festa 60 staging must use a Stripe test secret key.");
  }

  return key;
}

export function requireStripeWebhookSecret(env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  return env.STRIPE_WEBHOOK_SECRET;
}

export function publicBaseUrl(env, request) {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function adminActor(request, env) {
  return (
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("x-admin-actor") ||
    env.ADMIN_DEFAULT_ACTOR ||
    "admin"
  );
}

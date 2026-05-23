import { json, methodNotAllowed } from "./_lib/http.js";
import { environmentName, isProduction } from "./_lib/env.js";

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    environment: environmentName(env),
    is_production: isProduction(env),
    turnstile_site_key: env.TURNSTILE_SITE_KEY || "",
    payment_mode: "bank_transfer",
    payment_provider: "manual",
    stripe_mode: "disabled",
  });
}

export async function onRequestPost() {
  return methodNotAllowed();
}

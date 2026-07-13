import { json, methodNotAllowed } from "./_lib/http.js";
import { environmentName, isProduction } from "./_lib/env.js";

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    environment: environmentName(env),
    is_production: isProduction(env),
    turnstile_site_key: env.TURNSTILE_SITE_KEY || "",
    payment_mode: env.STRIPE_SECRET_KEY ? "card_or_bank_transfer" : "bank_transfer",
    payment_provider: env.STRIPE_SECRET_KEY ? "stripe_or_manual" : "manual",
    stripe_mode: env.STRIPE_SECRET_KEY ? "test" : "disabled",
  });
}

export async function onRequestPost() {
  return methodNotAllowed();
}

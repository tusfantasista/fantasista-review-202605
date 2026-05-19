import { json, methodNotAllowed } from "./_lib/http.js";
import { environmentName, isProduction } from "./_lib/env.js";

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    environment: environmentName(env),
    is_production: isProduction(env),
    turnstile_site_key: env.TURNSTILE_SITE_KEY || "",
    stripe_mode: isProduction(env) ? "live" : "test",
  });
}

export async function onRequestPost() {
  return methodNotAllowed();
}

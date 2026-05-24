import { json, methodNotAllowed } from "./_lib/http.js";
import { environmentName, isProduction } from "./_lib/env.js";

export async function onRequestGet({ request, env }) {
  return json(
    {
      ok: true,
      environment: environmentName(env),
      is_production: isProduction(env),
      turnstile_site_key: env.TURNSTILE_SITE_KEY || "",
      payment_mode: "bank_transfer",
      payment_provider: "manual",
      stripe_mode: "disabled",
      interest_mode: "d1",
    },
    { headers: corsHeaders(request) },
  );
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function onRequestPost() {
  return methodNotAllowed();
}

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowed = [
    "https://tusfantasista.github.io",
    "https://fantasista-review-202605.tus-fantasista.workers.dev",
  ];
  const isPreview = /\.pages\.dev$/.test(new URL(request.url).hostname);
  const allowOrigin = allowed.includes(origin) || (isPreview && origin.endsWith(".pages.dev")) ? origin : "";
  return {
    ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

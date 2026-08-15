const DEFAULT_RETRY_AFTER_SECONDS = 60;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}

function userAgentClass(request) {
  const value = String(request.headers.get("user-agent") || "").toLowerCase();
  if (!value) return "unknown";
  if (/bot|crawler|spider|scan|curl|wget|python|headless|httpclient/.test(value)) return "automated";
  if (value.includes("mozilla/")) return "browser";
  return "other";
}

async function privacySafeClientKey(request, scope) {
  const ipAddress = request.headers.get("cf-connecting-ip") || "unknown";
  const input = new TextEncoder().encode(`${scope}\u0000${ipAddress}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  const hash = [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `${scope}:${hash}`;
}

function rateLimitLog(request, bindingName) {
  const url = new URL(request.url);
  return {
    event: "api_rate_limited",
    binding: bindingName,
    method: request.method,
    path: url.pathname,
    country: request.cf?.country || "unknown",
    colo: request.cf?.colo || "unknown",
    user_agent_class: userAgentClass(request),
  };
}

export async function enforceRateLimit(request, env, bindingName, scope) {
  const limiter = env?.[bindingName];
  if (!limiter || typeof limiter.limit !== "function") return null;

  try {
    const key = await privacySafeClientKey(request, scope);
    const result = await limiter.limit({ key });
    if (result?.success !== false) return null;

    console.warn(rateLimitLog(request, bindingName));
    return json(
      {
        ok: false,
        error: "rate_limited",
        message: "アクセスが集中しています。少し時間をおいてから、もう一度お試しください。",
      },
      {
        status: 429,
        headers: { "retry-after": String(DEFAULT_RETRY_AFTER_SECONDS) },
      },
    );
  } catch {
    // Availability is preserved if Cloudflare's rate-limit binding is temporarily unavailable.
    console.error({
      event: "rate_limit_check_failed",
      binding: bindingName,
      method: request.method,
      path: new URL(request.url).pathname,
    });
    return null;
  }
}

export function publicSummaryCacheKey(request) {
  const url = new URL(request.url);
  url.search = "";
  return new Request(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
  });
}

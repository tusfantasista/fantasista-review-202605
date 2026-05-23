const PROTECTED_PREFIXES = [
  "/apply",
  "/admin",
  "/festa60-register",
  "/festa60-admin",
  "/api/festa60/applications",
  "/api/festa60/admin",
];

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!requiresAccess(url.pathname)) return next();
  if (hasAccessIdentity(request) || hasBypassToken(request, env)) return next();

  return new Response("Cloudflare Access authentication is required for the Festa 60 staging environment.", {
    status: 401,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function requiresAccess(pathname) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasAccessIdentity(request) {
  return Boolean(
    request.headers.get("cf-access-authenticated-user-email") ||
      request.headers.get("cf-access-jwt-assertion"),
  );
}

function hasBypassToken(request, env) {
  const expected = env.ACCESS_BYPASS_TOKEN || env.ADMIN_API_TOKEN;
  const actual = request.headers.get("x-access-bypass-token") || request.headers.get("x-admin-token");
  return Boolean(expected && actual && constantTimeEqual(actual, expected));
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

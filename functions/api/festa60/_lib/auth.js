import { json } from "./http.js";

export function assertAdmin(request, env) {
  const accessEmail = request.headers.get("cf-access-authenticated-user-email");
  if (accessEmail) return { ok: true, actor: accessEmail };

  const expected = env.ADMIN_API_TOKEN;
  if (!expected) {
    return {
      ok: false,
      response: json(
        {
          ok: false,
          error: "admin_auth_not_configured",
          message: "Configure Cloudflare Access or ADMIN_API_TOKEN for admin APIs.",
        },
        { status: 401 },
      ),
    };
  }

  const token = request.headers.get("x-admin-token") || bearerToken(request);
  if (token && constantTimeEqual(token, expected)) {
    return { ok: true, actor: "admin-token" };
  }

  return {
    ok: false,
    response: json({ ok: false, error: "unauthorized" }, { status: 401 }),
  };
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
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

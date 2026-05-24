export function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export function text(data, init = {}) {
  return new Response(data, {
    ...init,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export function methodNotAllowed() {
  return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

export function badRequest(message, details = undefined) {
  return json({ ok: false, error: "bad_request", message, details }, { status: 400 });
}

export function serverError(error) {
  console.error(error);
  return json({ ok: false, error: "server_error" }, { status: 500 });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getClientMeta(request) {
  return {
    ip_address: request.headers.get("cf-connecting-ip") || "",
    user_agent: request.headers.get("user-agent") || "",
  };
}

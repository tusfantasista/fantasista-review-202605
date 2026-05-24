import { assertAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed, readJson, serverError } from "../../_lib/http.js";
import { adminActor, requireDb } from "../../_lib/env.js";
import { updateInterestRegistration } from "../../_lib/db.js";

export async function onRequestPatch({ request, env, params }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const payload = (await readJson(request)) || {};
    const interest = await updateInterestRegistration(
      requireDb(env),
      params.id,
      {
        ...payload,
        actor: auth.actor || adminActor(request, env),
      },
      {
        user_agent: request.headers.get("user-agent") || "",
      },
    );
    if (!interest) return json({ ok: false, error: "not_found" }, { status: 404 });
    return json({ ok: true, interest });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestGet() {
  return methodNotAllowed();
}

export async function onRequestPost() {
  return methodNotAllowed();
}

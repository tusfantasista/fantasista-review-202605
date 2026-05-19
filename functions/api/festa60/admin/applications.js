import { assertAdmin } from "../_lib/auth.js";
import { json, methodNotAllowed, serverError } from "../_lib/http.js";
import { requireDb } from "../_lib/env.js";
import { listApplications } from "../_lib/db.js";

export async function onRequestGet({ request, env }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const rows = await listApplications(requireDb(env));
    return json({ ok: true, actor: auth.actor, applications: rows });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestPost() {
  return methodNotAllowed();
}

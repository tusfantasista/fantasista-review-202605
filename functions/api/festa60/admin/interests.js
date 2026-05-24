import { assertAdmin } from "../_lib/auth.js";
import { json, methodNotAllowed, serverError } from "../_lib/http.js";
import { adminActor, requireDb } from "../_lib/env.js";
import { listInterestRegistrations } from "../_lib/db.js";

export async function onRequestGet({ request, env }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const filters = Object.fromEntries(
      ["attendance_intent", "participant_category", "status", "donation_interest", "sponsorship_interest", "archive_material_interest"]
        .map((key) => [key, url.searchParams.get(key)])
        .filter(([, value]) => value),
    );
    const interests = await listInterestRegistrations(requireDb(env), filters);
    return json({ ok: true, actor: auth.actor || adminActor(request, env), interests });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestPost() {
  return methodNotAllowed();
}

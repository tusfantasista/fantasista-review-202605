import { assertAdmin } from "../_lib/auth.js";
import { methodNotAllowed, serverError, text } from "../_lib/http.js";
import { requireDb } from "../_lib/env.js";
import { listApplications } from "../_lib/db.js";
import { toCsv } from "../_lib/csv.js";

export async function onRequestGet({ request, env }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const rows = await listApplications(requireDb(env));
    return text(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="festa60-applications.csv"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestPost() {
  return methodNotAllowed();
}

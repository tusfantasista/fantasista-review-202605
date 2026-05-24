import { assertAdmin } from "../../_lib/auth.js";
import { methodNotAllowed, serverError, text } from "../../_lib/http.js";
import { requireDb } from "../../_lib/env.js";
import { listInterestRegistrations } from "../../_lib/db.js";
import { toCsv } from "../../_lib/csv.js";

const CSV_COLUMNS = [
  "interest_code",
  "created_at",
  "last_name",
  "first_name",
  "last_kana",
  "first_kana",
  "maiden_name",
  "graduation_year",
  "graduation_year_unknown",
  "participant_category",
  "email",
  "phone",
  "attendance_intent",
  "companion_status",
  "companion_count",
  "companion_host_category",
  "companion_host_last_name",
  "companion_host_first_name",
  "companion_host_graduation_year",
  "companion_host_note",
  "donation_interest",
  "sponsorship_interest",
  "archive_material_interest",
  "volunteer_interest",
  "status",
  "admin_memo",
  "message",
];

export async function onRequestGet({ request, env }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const rows = await listInterestRegistrations(requireDb(env));
    const csvRows = rows.map((row) => Object.fromEntries(CSV_COLUMNS.map((column) => [column, row[column] ?? ""])));
    return text(toCsv(csvRows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="festa60-interest-registrations.csv"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestPost() {
  return methodNotAllowed();
}

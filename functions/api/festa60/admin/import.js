import { assertAdmin } from "../_lib/auth.js";
import { adminActor, environmentName, requireDb } from "../_lib/env.js";
import { badRequest, getClientMeta, json, methodNotAllowed, serverError } from "../_lib/http.js";
import { audit } from "../_lib/db.js";
import { newId, nowIso } from "../_lib/ids.js";
import { parseCsv } from "../_lib/csv.js";

export async function onRequestPost({ request, env }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if (!body.csv) return badRequest("csv is required.");

    const rows = parseCsv(body.csv);
    const db = requireDb(env);
    const batchId = newId("imp");
    const now = nowIso();
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    await db
      .prepare(
        `INSERT INTO import_batches (
          id, file_name, imported_by, environment, row_count, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(batchId, body.file_name || "uploaded-members.csv", adminActor(request, env), environmentName(env), rows.length, "running", now)
      .run();

    for (const row of rows) {
      try {
        if (!row.full_name) {
          errors += 1;
          continue;
        }
        const memberId = row.id || newId("mem");
        const existing = row.email
          ? await db.prepare("SELECT id FROM members WHERE lower(email) = lower(?) LIMIT 1").bind(row.email).first()
          : null;

        if (existing) {
          await db
            .prepare(
              `UPDATE members
               SET full_name = ?, full_name_kana = ?, maiden_name = ?, phone = ?,
                   graduation_year = ?, generation = ?, school_lineage = ?, dance_role = ?,
                   source_batch_id = ?, updated_at = ?
               WHERE id = ?`,
            )
            .bind(
              row.full_name,
              row.full_name_kana || null,
              row.maiden_name || null,
              row.phone || null,
              numberOrNull(row.graduation_year),
              row.generation || null,
              row.school_lineage || null,
              row.dance_role || null,
              batchId,
              nowIso(),
              existing.id,
            )
            .run();
          updated += 1;
        } else {
          await db
            .prepare(
              `INSERT INTO members (
                id, member_code, full_name, full_name_kana, maiden_name, email, phone,
                graduation_year, generation, school_lineage, dance_role, source_batch_id,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              memberId,
              row.member_code || null,
              row.full_name,
              row.full_name_kana || null,
              row.maiden_name || null,
              row.email || null,
              row.phone || null,
              numberOrNull(row.graduation_year),
              row.generation || null,
              row.school_lineage || null,
              row.dance_role || null,
              batchId,
              nowIso(),
              nowIso(),
            )
            .run();
          inserted += 1;
        }
      } catch (error) {
        console.error(error);
        errors += 1;
      }
    }

    await db
      .prepare(
        `UPDATE import_batches
         SET inserted_count = ?, updated_count = ?, error_count = ?, status = ?, completed_at = ?
         WHERE id = ?`,
      )
      .bind(inserted, updated, errors, errors ? "completed_with_errors" : "completed", nowIso(), batchId)
      .run();

    await audit(db, {
      actor: auth.actor,
      action: "members.imported",
      target_type: "import_batch",
      target_id: batchId,
      details_json: JSON.stringify({ row_count: rows.length, inserted, updated, errors }),
      ...getClientMeta(request),
    });

    return json({ ok: true, batch_id: batchId, row_count: rows.length, inserted, updated, errors });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestGet() {
  return methodNotAllowed();
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

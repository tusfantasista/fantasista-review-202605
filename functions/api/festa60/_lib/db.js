import { newId, nowIso } from "./ids.js";

export const FEE_PERIODS = ["early", "year_end", "regular"];
export const RECEPTION_ATTENDANCE = ["attending", "without_reception"];

export const OBOG_6_10_GRADUATION_YEAR_FROM = 2016;
export const OBOG_6_10_GRADUATION_YEAR_TO = 2020;
export const OBOG_5_UNDER_GRADUATION_YEAR_FROM = 2021;

const BASE_FEES = {
  obog: { early: 13000, year_end: 14000, regular: 15000 },
  obog_6_10: { early: 11000, year_end: 12000, regular: 12000 },
  obog_5_under: { early: 9000, year_end: 10000, regular: 10000 },
  current_student: { early: 4000, year_end: 4000, regular: 4000 },
  premium: { early: 30000, year_end: 30000, regular: 30000 },
};

const COMPANION_FEES = {
  adult: { attending: 8000, without_reception: 6000 },
  child: { attending: 3000, without_reception: 1000 },
};

export function ticketAmount(ticketType, companions = 0, feePeriod = "regular", receptionAttendance = "attending") {
  const normalizedTicket = normalizeTicketType(ticketType);
  const normalizedPeriod = FEE_PERIODS.includes(feePeriod) ? feePeriod : "regular";
  const normalizedReception = RECEPTION_ATTENDANCE.includes(receptionAttendance) ? receptionAttendance : "attending";
  const companionRows = Array.isArray(companions) ? companions : Array.from({ length: Number(companions || 0) }, () => ({ attendee_type: "adult" }));

  let base = BASE_FEES[normalizedTicket]?.[normalizedPeriod] ?? BASE_FEES.obog[normalizedPeriod];
  if (normalizedTicket === "obog_staff") {
    base = Math.round((BASE_FEES.obog[normalizedPeriod] - noReceptionDiscount(normalizedReception)) * 0.5);
  } else if (normalizedTicket === "current_student") {
    base = normalizedReception === "attending" ? BASE_FEES.current_student[normalizedPeriod] : 0;
  } else if (normalizedTicket !== "premium") {
    base = Math.max(0, base - noReceptionDiscount(normalizedReception));
  }

  const companionTotal = companionRows.reduce((sum, companion) => {
    const type = companion.attendee_type === "child" ? "child" : "adult";
    return sum + COMPANION_FEES[type][normalizedReception];
  }, 0);

  return base + companionTotal;
}

export function normalizeTicketType(ticketType) {
  if (ticketType === "young_obog") return "obog_6_10";
  if (ticketType === "donation_only") return "premium";
  return ticketType || "obog";
}

function noReceptionDiscount(receptionAttendance) {
  return receptionAttendance === "without_reception" ? 2000 : 0;
}

export async function findMemberMatch(db, payload) {
  const email = (payload.email || "").trim().toLowerCase();
  if (email) {
    const byEmail = await db
      .prepare("SELECT * FROM members WHERE lower(email) = ? LIMIT 1")
      .bind(email)
      .first();
    if (byEmail) return { member: byEmail, status: "matched", confidence: 0.98 };
  }

  const fullName = (payload.full_name || "").trim();
  const kana = (payload.full_name_kana || "").trim();
  if (fullName) {
    const byName = await db
      .prepare(
        "SELECT * FROM members WHERE full_name = ? OR (full_name_kana IS NOT NULL AND full_name_kana = ?) LIMIT 1",
      )
      .bind(fullName, kana)
      .first();
    if (byName) return { member: byName, status: "possible_match", confidence: 0.72 };
  }

  return { member: null, status: "unmatched", confidence: 0 };
}

export async function insertApplication(db, payload, requestMeta = {}) {
  const match = await findMemberMatch(db, payload);
  const id = newId("app");
  const applicationCode = payload.application_code || `F60-${Date.now().toString(36).toUpperCase()}`;
  const companions = Array.isArray(payload.companions) ? payload.companions.filter((item) => item.full_name) : [];
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO applications (
        id, application_code, member_id, match_status, match_confidence, ticket_type, fee_period, reception_attendance,
        attendance_status, payment_status, full_name, full_name_kana, maiden_name,
        email, phone, graduation_year, generation, school_lineage, dance_role,
        postal_code, address, companion_count, message, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      applicationCode,
      match.member?.id || null,
      match.status,
      match.confidence,
      normalizeTicketType(payload.ticket_type),
      payload.fee_period || "regular",
      payload.reception_attendance || "attending",
      "pending",
      ticketAmount(payload.ticket_type, companions, payload.fee_period, payload.reception_attendance) > 0 ? "unpaid" : "not_required",
      payload.full_name,
      payload.full_name_kana || null,
      payload.maiden_name || null,
      payload.email,
      payload.phone || null,
      numberOrNull(payload.graduation_year),
      payload.generation || null,
      payload.school_lineage || null,
      payload.dance_role || null,
      payload.postal_code || null,
      payload.address || null,
      companions.length,
      payload.message || null,
      payload.source || "public_form",
      now,
      now,
    )
    .run();

  for (const companion of companions) {
    await db
      .prepare(
        `INSERT INTO companions (
          id, application_id, full_name, relationship, attendee_type, email, note, ticket_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId("cmp"),
        id,
        companion.full_name,
        companion.relationship || null,
        companion.attendee_type || null,
        companion.email || null,
        companion.note || null,
        "companion",
        now,
      )
      .run();
  }

  const consentRows = [
    ["privacy", payload.privacy_consent === true || payload.privacy_consent === "on", "個人情報の取り扱いに同意"],
    ["contact", payload.contact_consent === true || payload.contact_consent === "on", "事務局からの連絡に同意"],
    ["photo", payload.photo_consent === true || payload.photo_consent === "on", "当日の撮影・記録に関する確認"],
  ];

  for (const [type, value, text] of consentRows) {
    await db
      .prepare(
        `INSERT INTO consents (id, application_id, consent_type, consent_value, consent_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(newId("cns"), id, type, value ? 1 : 0, text, now)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO attendance (id, application_id, member_id, reception_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(newId("att"), id, match.member?.id || null, "not_checked_in", now, now)
    .run();

  await audit(db, {
    actor: "public_form",
    action: "application.created",
    target_type: "application",
    target_id: id,
    details_json: JSON.stringify({ match_status: match.status, ticket_type: normalizeTicketType(payload.ticket_type), fee_period: payload.fee_period, reception_attendance: payload.reception_attendance }),
    ...requestMeta,
  });

  return {
    id,
    application_code: applicationCode,
    member_id: match.member?.id || null,
    match_status: match.status,
    match_confidence: match.confidence,
    amount_total: ticketAmount(payload.ticket_type, companions, payload.fee_period, payload.reception_attendance),
  };
}

export async function createPayment(db, application, session, metadata) {
  const now = nowIso();
  const paymentId = newId("pay");
  await db
    .prepare(
      `INSERT INTO payments (
        id, application_id, member_id, stripe_checkout_session_id, stripe_payment_intent_id,
        stripe_customer_id, amount_total, currency, status, ticket_type, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      paymentId,
      application.id,
      application.member_id || null,
      session.id,
      session.payment_intent || null,
      session.customer || null,
      session.amount_total || application.amount_total || 0,
      session.currency || "jpy",
      session.payment_status || "created",
      application.ticket_type,
      JSON.stringify(metadata),
      now,
      now,
    )
    .run();
  return paymentId;
}

export async function markCheckoutCompleted(db, session) {
  const now = nowIso();
  const applicationId = session.metadata?.application_id;
  const memberId = session.metadata?.member_id || null;
  const status = session.payment_status === "paid" ? "paid" : "processing";

  await db
    .prepare(
      `UPDATE payments
       SET status = ?, stripe_payment_intent_id = ?, stripe_customer_id = ?, amount_total = ?,
           currency = ?, paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END, updated_at = ?
       WHERE stripe_checkout_session_id = ?`,
    )
    .bind(
      status,
      session.payment_intent || null,
      session.customer || null,
      session.amount_total || 0,
      session.currency || "jpy",
      status,
      now,
      now,
      session.id,
    )
    .run();

  if (applicationId) {
    await db
      .prepare("UPDATE applications SET payment_status = ?, attendance_status = ?, member_id = COALESCE(member_id, ?), updated_at = ? WHERE id = ?")
      .bind(status, status === "paid" ? "confirmed" : "pending", memberId, now, applicationId)
      .run();
  }

  await audit(db, {
    actor: "stripe",
    action: "payment.checkout_completed",
    target_type: "application",
    target_id: applicationId || session.id,
    details_json: JSON.stringify({ checkout_session_id: session.id, payment_status: status }),
  });
}

export async function listApplications(db) {
  const result = await db
    .prepare(
      `SELECT
        a.id, a.application_code, a.full_name, a.full_name_kana, a.email,
        a.graduation_year, a.ticket_type, a.fee_period, a.reception_attendance, a.companion_count, a.match_status,
        a.match_confidence, a.payment_status, a.attendance_status, a.created_at,
        m.member_code, m.full_name AS matched_member_name,
        p.stripe_checkout_session_id, p.status AS latest_payment_status, p.amount_total
       FROM applications a
       LEFT JOIN members m ON m.id = a.member_id
       LEFT JOIN payments p ON p.application_id = a.id
       ORDER BY a.created_at DESC
       LIMIT 500`,
    )
    .all();
  return (result.results || []).map((row) => ({
    ...row,
    amount_total: row.amount_total ?? ticketAmount(row.ticket_type, row.companion_count, row.fee_period, row.reception_attendance),
  }));
}

export async function audit(db, item) {
  await db
    .prepare(
      `INSERT INTO audit_logs (
        id, actor, action, target_type, target_id, details_json, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId("aud"),
      item.actor || null,
      item.action,
      item.target_type || null,
      item.target_id || null,
      item.details_json || null,
      item.ip_address || null,
      item.user_agent || null,
      nowIso(),
    )
    .run();
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

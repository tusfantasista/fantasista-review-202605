import { newId, nowIso } from "./ids.js";

export const FEE_PERIODS = ["early", "year_end", "regular"];
export const RECEPTION_ATTENDANCE = ["attending", "without_reception"];
export const PAYMENT_METHODS = ["bank_transfer", "card", "convenience_store", "paypay"];
export const PAYMENT_PROVIDERS = ["manual", "stripe", "payjp", "komoju"];
export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "cancelled", "refunded"];

export const OBOG_6_10_GRADUATION_YEAR_FROM = 2016;
export const OBOG_6_10_GRADUATION_YEAR_TO = 2020;
export const OBOG_5_UNDER_GRADUATION_YEAR_FROM = 2021;

const BASE_FEES = {
  obog: { early: 13000, year_end: 14000, regular: 15000 },
  obog_6_10: { early: 11000, year_end: 12000, regular: 12000 },
  obog_5_under: { early: 9000, year_end: 10000, regular: 10000 },
  current_student: { early: 4000, year_end: 4000, regular: 4000 },
  premium_gold: { early: 100000, year_end: 100000, regular: 100000 },
  premium_silver: { early: 50000, year_end: 50000, regular: 50000 },
  premium_bronze: { early: 30000, year_end: 30000, regular: 30000 },
  premium: { early: 30000, year_end: 30000, regular: 30000 },
};

const COMPANION_FEES = {
  adult: { attending: 8000, without_reception: 6000 },
  child: { attending: 3000, without_reception: 1000 },
};

const TICKET_LABELS = {
  obog: "60周年記念FESTA 一般OBOG参加費",
  obog_6_10: "60周年記念FESTA OBOG 6〜10年目参加費",
  obog_5_under: "60周年記念FESTA OBOG 5年目以下参加費",
  obog_staff: "60周年記念FESTA OBOG役員・当日手伝い参加費",
  current_student: "60周年記念FESTA 現役部員参加費",
  premium_gold: "60周年記念FESTA プレミアム Gold",
  premium_silver: "60周年記念FESTA プレミアム Silver",
  premium_bronze: "60周年記念FESTA プレミアム Bronze",
  premium: "60周年記念FESTA プレミアム Bronze",
};

export function ticketAmount(ticketType, companions = 0, feePeriod = "regular", receptionAttendance = "attending") {
  const companionRows = Array.isArray(companions)
    ? companions
    : Array.from({ length: Number(companions || 0) }, () => ({ attendee_type: "adult" }));
  return lineItemsTotal(buildPaymentLineItems({ ticket_type: ticketType, fee_period: feePeriod, reception_attendance: receptionAttendance }, companionRows));
}

export function buildPaymentLineItems(payload, companions = []) {
  const normalizedTicket = normalizeTicketType(payload.ticket_type);
  const normalizedPeriod = FEE_PERIODS.includes(payload.fee_period) ? payload.fee_period : "regular";
  const normalizedReception = RECEPTION_ATTENDANCE.includes(payload.reception_attendance) ? payload.reception_attendance : "attending";
  const items = [];
  const ticketAmountJpy = ticketLineAmount(normalizedTicket, normalizedPeriod, normalizedReception);

  if (ticketAmountJpy > 0) {
    items.push({
      item_type: "ticket",
      label: TICKET_LABELS[normalizedTicket] || TICKET_LABELS.obog,
      quantity: 1,
      unit_amount_jpy: ticketAmountJpy,
      amount_jpy: ticketAmountJpy,
      metadata: { ticket_type: normalizedTicket, fee_period: normalizedPeriod, reception_attendance: normalizedReception },
    });
  }

  companions.forEach((companion, index) => {
    const type = companion.attendee_type === "child" ? "child" : "adult";
    const amount = COMPANION_FEES[type][normalizedReception];
    if (amount <= 0) return;
    items.push({
      item_type: "companion",
      label: `同伴者${index + 1} ${type === "child" ? "子供" : "大人"}`,
      quantity: 1,
      unit_amount_jpy: amount,
      amount_jpy: amount,
      metadata: { attendee_type: type, relationship: companion.relationship || "" },
    });
  });

  const donation = amountOrZero(payload.donation_amount_jpy);
  if (donation > 0) {
    items.push({
      item_type: "donation",
      label: "60周年記念FESTA 寄付",
      quantity: 1,
      unit_amount_jpy: donation,
      amount_jpy: donation,
      metadata: {},
    });
  }

  const sponsorship = amountOrZero(payload.sponsorship_amount_jpy);
  if (sponsorship > 0) {
    items.push({
      item_type: "sponsorship",
      label: "60周年記念FESTA 協賛",
      quantity: 1,
      unit_amount_jpy: sponsorship,
      amount_jpy: sponsorship,
      metadata: {},
    });
  }

  return items;
}

export function lineItemsTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.amount_jpy || 0), 0);
}

function ticketLineAmount(ticketType, feePeriod, receptionAttendance) {
  let base = BASE_FEES[ticketType]?.[feePeriod] ?? BASE_FEES.obog[feePeriod];
  if (ticketType === "obog_staff") {
    return Math.round((BASE_FEES.obog[feePeriod] - noReceptionDiscount(receptionAttendance)) * 0.5);
  }
  if (ticketType === "current_student") {
    return receptionAttendance === "attending" ? BASE_FEES.current_student[feePeriod] : 0;
  }
  if (!isPremiumTicket(ticketType)) {
    base = Math.max(0, base - noReceptionDiscount(receptionAttendance));
  }
  return base;
}

export function normalizeTicketType(ticketType) {
  if (ticketType === "young_obog") return "obog_6_10";
  if (ticketType === "donation_only") return "premium_bronze";
  if (ticketType === "premium") return "premium_bronze";
  return ticketType || "obog";
}

function isPremiumTicket(ticketType) {
  return ["premium", "premium_gold", "premium_silver", "premium_bronze"].includes(ticketType);
}

function transferNameFor(applicationCode, fullName) {
  const normalizedName = String(fullName || "").replace(/\s+/g, "").trim();
  return `${applicationCode} ${normalizedName}`.trim();
}

function noReceptionDiscount(receptionAttendance) {
  return receptionAttendance === "without_reception" ? 2000 : 0;
}

function amountOrZero(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export async function findMemberMatch(db, payload) {
  const email = (payload.email || "").trim().toLowerCase();
  if (email) {
    const byEmail = await db
      .prepare("SELECT * FROM members WHERE lower(email) = ? LIMIT 1")
      .bind(email)
      .first();
    if (byEmail) return { member: byEmail, status: "exact_match", confidence: 0.98 };
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

  return { member: null, status: "new_record", confidence: 0 };
}

export async function insertApplication(db, payload, requestMeta = {}) {
  const match = await findMemberMatch(db, payload);
  const id = newId("app");
  const applicationCode = payload.application_code || (await nextApplicationCode(db));
  const companions = Array.isArray(payload.companions) ? payload.companions.filter((item) => item.full_name) : [];
  const lineItems = buildPaymentLineItems(payload, companions);
  const totalAmountJpy = lineItemsTotal(lineItems);
  const quantity = 1 + companions.length;
  const payNow = payload.pay_now === true || payload.payment_method === "card";
  const paymentMethod = payNow ? "card" : "bank_transfer";
  const paymentProvider = payNow ? "stripe" : "manual";
  const paymentStatus = totalAmountJpy > 0 ? (payNow ? "pending" : "unpaid") : "paid";
  const paidAt = paymentStatus === "paid" ? nowIso() : null;
  const now = nowIso();
  const expectedTransferName = paymentMethod === "bank_transfer" ? transferNameFor(applicationCode, payload.full_name_kana || payload.full_name) : null;

  await db
    .prepare(
      `INSERT INTO applications (
        id, application_code, member_id, match_status, match_confidence, status, ticket_type, fee_period, reception_attendance,
        attendance_status, payment_status, payment_method, payment_provider, external_payment_id, total_amount_jpy, quantity,
        full_name, full_name_kana, maiden_name,
        email, phone, graduation_year, generation, school_lineage, dance_role,
        postal_code, address, companion_count, expected_transfer_name, actual_transfer_name, message, source,
        paid_at, cancelled_at, refunded_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      applicationCode,
      match.member?.id || null,
      match.status,
      match.confidence,
      totalAmountJpy > 0 ? "pending" : "confirmed",
      normalizeTicketType(payload.ticket_type),
      payload.fee_period || "regular",
      payload.reception_attendance || "attending",
      totalAmountJpy > 0 ? "pending" : "confirmed",
      paymentStatus,
      paymentMethod,
      paymentProvider,
      payload.external_payment_id || null,
      totalAmountJpy,
      quantity,
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
      expectedTransferName,
      payload.actual_transfer_name || null,
      payload.message || null,
      payload.source || "public_form",
      paidAt,
      null,
      null,
      now,
      now,
    )
    .run();

  for (const item of lineItems) {
    await db
      .prepare(
        `INSERT INTO payment_line_items (
          id, application_id, item_type, label, quantity, unit_amount_jpy, amount_jpy, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId("pli"),
        id,
        item.item_type,
        item.label,
        item.quantity || 1,
        item.unit_amount_jpy || 0,
        item.amount_jpy || 0,
        JSON.stringify(item.metadata || {}),
        now,
      )
      .run();
  }

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

  const paymentId = paymentMethod === "bank_transfer"
    ? await createManualPayment(db, {
      id,
      member_id: match.member?.id || null,
      amount_total: totalAmountJpy,
      payment_status: paymentStatus,
      ticket_type: normalizeTicketType(payload.ticket_type),
      paid_at: paidAt,
    })
    : null;

  return {
    id,
    application_code: applicationCode,
    applicationId: applicationCode,
    member_id: match.member?.id || null,
    match_status: match.status,
    match_confidence: match.confidence,
    quantity,
    ticket_type: normalizeTicketType(payload.ticket_type),
    fee_period: payload.fee_period || "regular",
    reception_attendance: payload.reception_attendance || "attending",
    amount_total: totalAmountJpy,
    total_amount_jpy: totalAmountJpy,
    amount: totalAmountJpy,
    payment_method: paymentMethod,
    payment_provider: paymentProvider,
    payment_status: paymentStatus,
    paymentMethod,
    paymentProvider,
    paymentStatus,
    expected_transfer_name: expectedTransferName,
    expectedTransferName,
    paid_at: paidAt,
    payment_id: paymentId,
    line_items: lineItems,
  };
}

export async function nextApplicationCode(db) {
  await db
    .prepare("INSERT OR IGNORE INTO application_sequences (name, last_value, updated_at) VALUES (?, ?, ?)")
    .bind("festa60", 0, nowIso())
    .run();

  const row = await db
    .prepare("UPDATE application_sequences SET last_value = last_value + 1, updated_at = ? WHERE name = ? RETURNING last_value")
    .bind(nowIso(), "festa60")
    .first();

  if (!row?.last_value) throw new Error("Failed to issue Festa 60 application number.");
  return `FESTA-${String(row.last_value).padStart(6, "0")}`;
}

export async function createManualPayment(db, application) {
  const now = nowIso();
  const paymentId = newId("pay");
  await db
    .prepare(
      `INSERT INTO payments (
        id, application_id, member_id, amount_total, currency, status, payment_method, payment_provider,
        external_payment_id, ticket_type, metadata_json, created_at, paid_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      paymentId,
      application.id,
      application.member_id || null,
      application.amount_total || 0,
      "jpy",
      application.payment_status || "unpaid",
      "bank_transfer",
      "manual",
      null,
      application.ticket_type,
      JSON.stringify({ application_id: application.id, method: "bank_transfer", provider: "manual" }),
      now,
      application.paid_at || null,
      now,
    )
    .run();

  await db
    .prepare("UPDATE payment_line_items SET payment_id = ? WHERE application_id = ?")
    .bind(paymentId, application.id)
    .run();

  return paymentId;
}

export async function createPayment(db, application, session, metadata) {
  const now = nowIso();
  const paymentId = newId("pay");
  await db
    .prepare(
      `INSERT INTO payments (
        id, application_id, member_id, stripe_checkout_session_id, stripe_payment_intent_id,
        stripe_customer_id, amount_total, currency, status, payment_method, payment_provider,
        external_payment_id, ticket_type, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      "card",
      "stripe",
      session.id,
      application.ticket_type,
      JSON.stringify(metadata),
      now,
      now,
    )
    .run();

  await db
    .prepare("UPDATE payment_line_items SET payment_id = ? WHERE application_id = ?")
    .bind(paymentId, application.id)
    .run();

  return paymentId;
}

export async function recordStripeEvent(db, event, payloadJson) {
  const now = nowIso();
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO stripe_events (id, event_type, status, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(event.id, event.type, "processing", payloadJson, now)
    .run();
  return (result.meta?.changes || 0) > 0;
}

export async function markStripeEventProcessed(db, eventId) {
  await db
    .prepare("UPDATE stripe_events SET status = ?, processed_at = ? WHERE id = ?")
    .bind("processed", nowIso(), eventId)
    .run();
}

export async function markStripeEventFailed(db, eventId, error) {
  await db
    .prepare("UPDATE stripe_events SET status = ?, payload_json = COALESCE(payload_json, '') || ? WHERE id = ?")
    .bind("failed", `\n/* processing_error: ${String(error?.message || error).slice(0, 500)} */`, eventId)
    .run();
}

export async function markCheckoutCompleted(db, session, stripeEventId) {
  const now = nowIso();
  const applicationId = session.metadata?.application_id;
  const memberId = session.metadata?.member_id || null;
  const status = session.payment_status === "paid" ? "paid" : "pending";

  await db
    .prepare(
      `UPDATE payments
       SET status = ?, stripe_payment_intent_id = ?, stripe_customer_id = ?, amount_total = ?,
           currency = ?, stripe_event_id = ?, paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END, updated_at = ?
       WHERE stripe_checkout_session_id = ?`,
    )
    .bind(
      status,
      session.payment_intent || null,
      session.customer || null,
      session.amount_total || 0,
      session.currency || "jpy",
      stripeEventId || null,
      status,
      now,
      now,
      session.id,
    )
    .run();

  if (applicationId) {
    await db
      .prepare("UPDATE applications SET payment_status = ?, status = ?, attendance_status = ?, member_id = COALESCE(member_id, ?), updated_at = ? WHERE id = ?")
      .bind(status, status === "paid" ? "confirmed" : "payment_pending", status === "paid" ? "confirmed" : "pending", memberId, now, applicationId)
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

export async function markCheckoutExpired(db, session, stripeEventId) {
  const now = nowIso();
  const applicationId = session.metadata?.application_id;

  await db
    .prepare(
      `UPDATE payments
       SET status = ?, stripe_event_id = ?, updated_at = ?
       WHERE stripe_checkout_session_id = ?`,
    )
    .bind("cancelled", stripeEventId || null, now, session.id)
    .run();

  if (applicationId) {
    await db
      .prepare("UPDATE applications SET payment_status = ?, status = ?, attendance_status = ?, updated_at = ? WHERE id = ?")
      .bind("cancelled", "cancelled", "pending", now, applicationId)
      .run();
  }

  await audit(db, {
    actor: "stripe",
    action: "payment.checkout_expired",
    target_type: "application",
    target_id: applicationId || session.id,
    details_json: JSON.stringify({ checkout_session_id: session.id, payment_status: "cancelled" }),
  });
}

export async function getApplicationById(db, applicationId) {
  return db
    .prepare(
      `SELECT
        a.id, a.application_code, a.member_id, a.full_name, a.email, a.phone,
        a.quantity, a.companion_count, a.ticket_type, a.fee_period, a.reception_attendance,
        a.payment_status, a.payment_method, a.payment_provider, a.external_payment_id,
        a.expected_transfer_name, a.actual_transfer_name, a.admin_note, a.total_amount_jpy,
        a.status, a.attendance_status, a.created_at, a.updated_at, a.paid_at, a.cancelled_at, a.refunded_at
       FROM applications a
       WHERE a.id = ? OR a.application_code = ?
       LIMIT 1`,
    )
    .bind(applicationId, applicationId)
    .first();
}

export async function updateApplicationPaymentStatus(db, applicationId, update, requestMeta = {}) {
  const nextStatus = normalizePaymentStatus(update.payment_status || update.paymentStatus);
  const now = nowIso();
  const current = await getApplicationById(db, applicationId);
  if (!current) return null;

  const paidAt = nextStatus === "paid" ? now : current.paid_at || null;
  const cancelledAt = nextStatus === "cancelled" ? now : current.cancelled_at || null;
  const refundedAt = nextStatus === "refunded" ? now : current.refunded_at || null;
  const applicationStatus = applicationStatusForPayment(nextStatus);
  const attendanceStatus = nextStatus === "paid" ? "confirmed" : current.attendance_status || "pending";
  const actualTransferName = update.actual_transfer_name || update.actualTransferName || current.actual_transfer_name || null;
  const externalPaymentId = update.external_payment_id || update.externalPaymentId || current.external_payment_id || null;
  const adminNote = update.admin_note || update.adminNote || current.admin_note || null;

  await db
    .prepare(
      `UPDATE applications
       SET payment_status = ?, status = ?, attendance_status = ?, actual_transfer_name = ?,
           external_payment_id = ?, admin_note = ?, paid_at = ?, cancelled_at = ?, refunded_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      nextStatus,
      applicationStatus,
      attendanceStatus,
      actualTransferName,
      externalPaymentId,
      adminNote,
      paidAt,
      cancelledAt,
      refundedAt,
      now,
      current.id,
    )
    .run();

  await db
    .prepare(
      `UPDATE payments
       SET status = ?, actual_transfer_name = ?, external_payment_id = ?, paid_at = ?, cancelled_at = ?, refunded_at = ?, updated_at = ?
       WHERE application_id = ? AND payment_provider = 'manual'`,
    )
    .bind(nextStatus, actualTransferName, externalPaymentId, paidAt, cancelledAt, refundedAt, now, current.id)
    .run();

  await audit(db, {
    actor: update.actor || "admin",
    action: `payment.${nextStatus}`,
    target_type: "application",
    target_id: current.id,
    details_json: JSON.stringify({
      application_code: current.application_code,
      payment_status: nextStatus,
      external_payment_id: externalPaymentId ? "set" : "empty",
    }),
    ...requestMeta,
  });

  return getApplicationById(db, current.id);
}

function normalizePaymentStatus(status) {
  if (!PAYMENT_STATUSES.includes(status)) throw new Error("Invalid payment status.");
  return status;
}

function applicationStatusForPayment(paymentStatus) {
  if (paymentStatus === "paid") return "confirmed";
  if (paymentStatus === "cancelled") return "cancelled";
  if (paymentStatus === "refunded") return "refunded";
  return "pending";
}

export async function listApplications(db) {
  const result = await db
    .prepare(
      `SELECT
        a.id, a.application_code, a.full_name, a.full_name_kana, a.email, a.phone,
        a.graduation_year, a.ticket_type, a.fee_period, a.reception_attendance, a.companion_count, a.match_status,
        a.quantity, a.expected_transfer_name, a.actual_transfer_name,
        a.match_confidence, a.status, a.payment_status, a.payment_method, a.payment_provider, a.external_payment_id,
        a.admin_note, a.attendance_status, a.total_amount_jpy, a.created_at, a.updated_at, a.paid_at, a.cancelled_at, a.refunded_at,
        m.member_code, m.full_name AS matched_member_name,
        p.stripe_checkout_session_id, p.status AS latest_payment_status, p.amount_total,
        p.payment_method AS latest_payment_method, p.payment_provider AS latest_payment_provider,
        (
          SELECT COALESCE(SUM(
            CASE
              WHEN c.attendee_type = 'child' THEN
                CASE WHEN a.reception_attendance = 'without_reception' THEN 1000 ELSE 3000 END
              ELSE
                CASE WHEN a.reception_attendance = 'without_reception' THEN 6000 ELSE 8000 END
            END
          ), 0)
          FROM companions c
          WHERE c.application_id = a.id
        ) AS companion_fee_total
       FROM applications a
       LEFT JOIN members m ON m.id = a.member_id
       LEFT JOIN payments p ON p.id = (
        SELECT id FROM payments
        WHERE application_id = a.id
        ORDER BY created_at DESC
        LIMIT 1
       )
       ORDER BY a.created_at DESC
       LIMIT 500`,
    )
    .all();
  return (result.results || []).map((row) => ({
    ...row,
    applicationId: row.application_code,
    name: row.full_name,
    quantity: row.quantity || 1 + Number(row.companion_count || 0),
    amount: row.total_amount_jpy ?? row.amount_total ?? expectedApplicationAmount(row),
    paymentMethod: row.payment_method || row.latest_payment_method || "bank_transfer",
    paymentProvider: row.payment_provider || row.latest_payment_provider || "manual",
    paymentStatus: row.payment_status,
    externalPaymentId: row.external_payment_id || "",
    expectedTransferName: row.expected_transfer_name || "",
    actualTransferName: row.actual_transfer_name || "",
    adminNote: row.admin_note || "",
    paidAt: row.paid_at || "",
    amount_total: row.amount_total ?? row.total_amount_jpy ?? expectedApplicationAmount(row),
  }));
}

function expectedApplicationAmount(row) {
  if (row.companion_fee_total > 0 || row.companion_count === 0) {
    return ticketAmount(row.ticket_type, [], row.fee_period, row.reception_attendance) + Number(row.companion_fee_total || 0);
  }
  return ticketAmount(row.ticket_type, row.companion_count, row.fee_period, row.reception_attendance);
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

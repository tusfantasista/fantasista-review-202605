import { badRequest, getClientMeta, json, methodNotAllowed, readJson, serverError } from "./_lib/http.js";
import { publicBaseUrl, requireDb } from "./_lib/env.js";
import { verifyTurnstile } from "./_lib/turnstile.js";
import {
  FEE_PERIODS,
  OBOG_5_UNDER_GRADUATION_YEAR_FROM,
  OBOG_6_10_GRADUATION_YEAR_FROM,
  OBOG_6_10_GRADUATION_YEAR_TO,
  RECEPTION_ATTENDANCE,
  createPayment,
  insertApplication,
  normalizeTicketType,
} from "./_lib/db.js";
import { bankTransferGuide, maybeSendEmail, renderApplicationReceiptEmail } from "./_lib/email.js";
import { createCheckoutSession } from "./_lib/stripe.js";

export async function onRequestPost({ request, env }) {
  try {
    const payload = await readJson(request);
    if (!payload) return badRequest("Invalid JSON payload.");

    const validation = validateApplication(payload);
    if (!validation.ok) return badRequest("入力内容を確認してください。", validation.errors);

    const turnstile = await verifyTurnstile(payload.turnstile_token, env, request);
    if (!turnstile.ok) return badRequest("Turnstile verification failed.", turnstile.result || turnstile.message);

    const shouldPayByCard = payload.pay_now === true || payload.payment_method === "card";
    if (shouldPayByCard && !env.STRIPE_SECRET_KEY) {
      return badRequest("カード決済は現在利用できません。銀行振込を選択してください。", { payment_method: "stripe_not_configured" });
    }

    const db = requireDb(env);
    payload.ticket_type = normalizeTicketType(payload.ticket_type);
    const application = await insertApplication(
      db,
      {
        ...payload,
        ticket_type: payload.ticket_type || "obog",
      },
      getClientMeta(request),
    );
    const applicationForMail = {
      ...application,
      full_name: payload.full_name,
      email: payload.email,
      quantity: application.quantity,
    };

    if (shouldPayByCard && Number(application.amount_total || application.total_amount_jpy || 0) > 0) {
      const { session, metadata } = await createCheckoutSession({
        env,
        application: applicationForMail,
        request,
        baseUrl: publicBaseUrl(env, request),
      });
      const paymentId = await createPayment(db, applicationForMail, session, metadata);

      return json({
        ok: true,
        application: {
          ...application,
          payment_id: paymentId,
        },
        payment: {
          paymentMethod: "card",
          paymentProvider: "stripe",
          paymentStatus: "pending",
          amount: session.amount_total || application.amount_total || application.total_amount_jpy || 0,
          checkoutSessionId: session.id,
        },
        checkout: {
          id: session.id,
          url: session.url,
        },
        receipt_email: {
          sent: false,
          skipped: true,
          reason: "card_checkout_pending",
        },
        turnstile_skipped: Boolean(turnstile.skipped),
      });
    }

    const receiptEmail = renderApplicationReceiptEmail(applicationForMail, env);
    const emailDelivery = await maybeSendEmail(env, receiptEmail);

    return json({
      ok: true,
      application,
      payment: bankTransferGuide(applicationForMail, env),
      receipt_email: {
        sent: emailDelivery.sent,
        skipped: emailDelivery.skipped,
        reason: emailDelivery.reason || null,
        subject: receiptEmail.subject,
        body: emailDelivery.sent ? undefined : receiptEmail.body,
      },
      turnstile_skipped: Boolean(turnstile.skipped),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestGet() {
  return methodNotAllowed();
}

function validateApplication(payload) {
  const errors = {};
  for (const field of ["full_name", "email", "ticket_type"]) {
    if (!payload[field] || String(payload[field]).trim() === "") errors[field] = "required";
  }
  payload.ticket_type = normalizeTicketType(payload.ticket_type);
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.email = "invalid";
  }
  if (!FEE_PERIODS.includes(payload.fee_period)) {
    errors.fee_period = "required";
  }
  if (!RECEPTION_ATTENDANCE.includes(payload.reception_attendance)) {
    errors.reception_attendance = "required";
  }
  if (payload.payment_method && !["card", "bank_transfer"].includes(payload.payment_method)) {
    errors.payment_method = "invalid";
  }
  if (!payload.privacy_consent) {
    errors.privacy_consent = "required";
  }
  for (const amountField of ["donation_amount_jpy", "sponsorship_amount_jpy"]) {
    const amount = Number(payload[amountField] || 0);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
      errors[amountField] = "invalid";
    }
  }
  if (payload.companions && !Array.isArray(payload.companions)) {
    errors.companions = "must_be_array";
  } else if (Array.isArray(payload.companions)) {
    const requestedCompanionCount = Number(payload.companion_count || 0);
    if (requestedCompanionCount !== payload.companions.length) {
      errors.companion_count = "must_match_companions_length";
    }
    payload.companions.forEach((companion, index) => {
      const key = `companions.${index}`;
      if (!companion.full_name || String(companion.full_name).trim() === "") errors[`${key}.full_name`] = "required";
      if (!companion.relationship || String(companion.relationship).trim() === "") errors[`${key}.relationship`] = "required";
      if (!["adult", "child"].includes(companion.attendee_type)) errors[`${key}.attendee_type`] = "invalid";
      if (companion.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companion.email)) {
        errors[`${key}.email`] = "invalid";
      }
    });
  } else if (Number(payload.companion_count || 0) > 0) {
    errors.companions = "required";
  }

  if (["obog", "obog_6_10", "obog_5_under", "obog_staff"].includes(payload.ticket_type)) {
    const graduationYear = Number(payload.graduation_year);
    if (!Number.isInteger(graduationYear)) {
      errors.graduation_year = "required";
    } else if (
      payload.ticket_type === "obog_6_10" &&
      (graduationYear < OBOG_6_10_GRADUATION_YEAR_FROM || graduationYear > OBOG_6_10_GRADUATION_YEAR_TO)
    ) {
      errors.ticket_type = `obog_6_10_requires_graduation_year_${OBOG_6_10_GRADUATION_YEAR_FROM}_${OBOG_6_10_GRADUATION_YEAR_TO}`;
    } else if (payload.ticket_type === "obog_5_under" && graduationYear < OBOG_5_UNDER_GRADUATION_YEAR_FROM) {
      errors.ticket_type = `obog_5_under_requires_graduation_year_${OBOG_5_UNDER_GRADUATION_YEAR_FROM}_or_later`;
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

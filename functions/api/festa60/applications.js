import { badRequest, getClientMeta, json, methodNotAllowed, readJson, serverError } from "./_lib/http.js";
import { applicationCode } from "./_lib/ids.js";
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
  ticketAmount,
} from "./_lib/db.js";
import { createCheckoutSession } from "./_lib/stripe.js";

export async function onRequestPost({ request, env }) {
  try {
    const payload = await readJson(request);
    if (!payload) return badRequest("Invalid JSON payload.");

    const validation = validateApplication(payload);
    if (!validation.ok) return badRequest("入力内容を確認してください。", validation.errors);

    const turnstile = await verifyTurnstile(payload.turnstile_token, env, request);
    if (!turnstile.ok) return badRequest("Turnstile verification failed.", turnstile.result || turnstile.message);

    const db = requireDb(env);
    payload.ticket_type = normalizeTicketType(payload.ticket_type);
    const companions = Array.isArray(payload.companions) ? payload.companions : [];
    const amountTotal = ticketAmount(payload.ticket_type || "obog", companions, payload.fee_period, payload.reception_attendance);
    if (amountTotal > 0 && payload.pay_now !== false && !String(env.STRIPE_SECRET_KEY || "").startsWith("sk_test_")) {
      return badRequest("Stripe test secret is not configured. Set sk_test_... or submit with pay_now=false.");
    }

    const application = await insertApplication(
      db,
      {
        ...payload,
        application_code: applicationCode(),
        ticket_type: payload.ticket_type || "obog",
      },
      getClientMeta(request),
    );

    let checkout = null;
    if (application.amount_total > 0 && payload.pay_now !== false) {
      const checkoutResult = await createCheckoutSession({
        env,
        request,
        application: {
          ...application,
          email: payload.email,
          ticket_type: payload.ticket_type || "obog",
        },
        baseUrl: publicBaseUrl(env, request),
      });
      await createPayment(db, { ...application, ticket_type: payload.ticket_type || "obog" }, checkoutResult.session, checkoutResult.metadata);
      checkout = {
        id: checkoutResult.session.id,
        url: checkoutResult.session.url,
      };
    }

    return json({
      ok: true,
      application,
      checkout,
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

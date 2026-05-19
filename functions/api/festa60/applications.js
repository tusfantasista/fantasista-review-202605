import { badRequest, getClientMeta, json, methodNotAllowed, readJson, serverError } from "./_lib/http.js";
import { applicationCode } from "./_lib/ids.js";
import { isProduction, publicBaseUrl, requireDb } from "./_lib/env.js";
import { verifyTurnstile } from "./_lib/turnstile.js";
import { createPayment, insertApplication, ticketAmount, YOUNG_OBOG_GRADUATION_YEAR_FROM } from "./_lib/db.js";
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
    const companionCount = Array.isArray(payload.companions) ? payload.companions.length : 0;
    const amountTotal = ticketAmount(payload.ticket_type || "obog", companionCount);
    const stripeKeyPrefix = isProduction(env) ? "sk_live_" : "sk_test_";
    if (amountTotal > 0 && payload.pay_now !== false && !String(env.STRIPE_SECRET_KEY || "").startsWith(stripeKeyPrefix)) {
      return badRequest(`Stripe secret is not configured for this environment. Set ${stripeKeyPrefix}... or submit with pay_now=false.`);
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
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.email = "invalid";
  }
  if (!payload.privacy_consent) {
    errors.privacy_consent = "required";
  }
  if (payload.companions && !Array.isArray(payload.companions)) {
    errors.companions = "must_be_array";
  } else if (Array.isArray(payload.companions)) {
    payload.companions.forEach((companion, index) => {
      const key = `companions.${index}`;
      if (!companion.full_name || String(companion.full_name).trim() === "") errors[`${key}.full_name`] = "required";
      if (!companion.relationship || String(companion.relationship).trim() === "") errors[`${key}.relationship`] = "required";
      if (!companion.attendee_type || String(companion.attendee_type).trim() === "") errors[`${key}.attendee_type`] = "required";
      if (companion.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companion.email)) {
        errors[`${key}.email`] = "invalid";
      }
    });
  }

  if (["obog", "young_obog"].includes(payload.ticket_type)) {
    const graduationYear = Number(payload.graduation_year);
    if (!Number.isInteger(graduationYear)) {
      errors.graduation_year = "required";
    } else if (payload.ticket_type === "young_obog" && graduationYear < YOUNG_OBOG_GRADUATION_YEAR_FROM) {
      errors.ticket_type = `young_obog_requires_graduation_year_${YOUNG_OBOG_GRADUATION_YEAR_FROM}_or_later`;
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

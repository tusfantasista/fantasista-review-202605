import { badRequest, getClientMeta, json, methodNotAllowed, readJson, serverError } from "./_lib/http.js";
import { applicationCode } from "./_lib/ids.js";
import { publicBaseUrl, requireDb } from "./_lib/env.js";
import { verifyTurnstile } from "./_lib/turnstile.js";
import { createPayment, insertApplication } from "./_lib/db.js";
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
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

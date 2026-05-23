import { assertAdmin } from "../../_lib/auth.js";
import { requireDb } from "../../_lib/env.js";
import { badRequest, getClientMeta, json, methodNotAllowed, readJson, serverError } from "../../_lib/http.js";
import { updateApplicationPaymentStatus } from "../../_lib/db.js";
import { maybeSendEmail, renderPaymentConfirmedEmail } from "../../_lib/email.js";

export async function onRequestPatch({ request, env, params }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const payload = await readJson(request);
    if (!payload) return badRequest("Invalid JSON payload.");

    const paymentStatus = payload.paymentStatus || payload.payment_status;
    if (!["unpaid", "paid", "cancelled", "refunded"].includes(paymentStatus)) {
      return badRequest("paymentStatus must be unpaid, paid, cancelled, or refunded.");
    }

    const application = await updateApplicationPaymentStatus(
      requireDb(env),
      params.id,
      {
        ...payload,
        payment_status: paymentStatus,
        actor: auth.actor,
      },
      getClientMeta(request),
    );
    if (!application) return json({ ok: false, error: "not_found" }, { status: 404 });

    let confirmationEmail = null;
    let emailDelivery = null;
    if (paymentStatus === "paid") {
      confirmationEmail = renderPaymentConfirmedEmail(application);
      if (payload.sendEmail === true) {
        emailDelivery = await maybeSendEmail(env, confirmationEmail);
      }
    }

    return json({
      ok: true,
      application,
      confirmation_email: confirmationEmail
        ? {
            sent: Boolean(emailDelivery?.sent),
            skipped: emailDelivery ? emailDelivery.skipped : true,
            reason: emailDelivery?.reason || null,
            subject: confirmationEmail.subject,
            body: confirmationEmail.body,
          }
        : null,
    });
  } catch (error) {
    if (String(error?.message || "").startsWith("Invalid payment status")) {
      return badRequest("Invalid payment status.");
    }
    return serverError(error);
  }
}

export async function onRequestPost(context) {
  return onRequestPatch(context);
}

export async function onRequestGet() {
  return methodNotAllowed();
}

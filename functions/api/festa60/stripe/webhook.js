import { json, methodNotAllowed, serverError } from "../_lib/http.js";
import { requireDb } from "../_lib/env.js";
import {
  markCheckoutCompleted,
  markCheckoutExpired,
  markStripeEventFailed,
  markStripeEventProcessed,
  recordStripeEvent,
} from "../_lib/db.js";
import { verifyStripeSignature } from "../_lib/stripe.js";

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return json({ ok: false, error: "invalid_signature", message: "Missing Stripe-Signature header." }, { status: 400 });
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured for the Festa 60 staging webhook.");
    return json({ ok: false, error: "webhook_secret_not_configured" }, { status: 503 });
  }

  try {
    const valid = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return json({ ok: false, error: "invalid_signature" }, { status: 400 });
    }

    const event = JSON.parse(payload);
    const db = requireDb(env);
    const shouldProcess = await recordStripeEvent(db, event, payload);
    if (!shouldProcess) {
      return json({ ok: true, received: true, duplicate: true });
    }

    try {
      if (event.type === "checkout.session.completed") {
        await markCheckoutCompleted(db, event.data.object, event.id);
      } else if (event.type === "checkout.session.expired") {
        await markCheckoutExpired(db, event.data.object, event.id);
      }
      await markStripeEventProcessed(db, event.id);
    } catch (error) {
      await markStripeEventFailed(db, event.id, error);
      throw error;
    }

    return json({ ok: true, received: true });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestGet() {
  return methodNotAllowed();
}

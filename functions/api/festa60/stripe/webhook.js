import { json, methodNotAllowed, serverError } from "../_lib/http.js";
import { requireDb } from "../_lib/env.js";
import { requireStripeWebhookSecret } from "../_lib/env.js";
import { markCheckoutCompleted } from "../_lib/db.js";
import { verifyStripeSignature } from "../_lib/stripe.js";

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");
    const valid = await verifyStripeSignature(payload, signature, requireStripeWebhookSecret(env));
    if (!valid) {
      return json({ ok: false, error: "invalid_signature" }, { status: 400 });
    }

    const event = JSON.parse(payload);
    const db = requireDb(env);

    if (event.type === "checkout.session.completed") {
      await markCheckoutCompleted(db, event.data.object);
    }

    return json({ ok: true, received: true });
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestGet() {
  return methodNotAllowed();
}

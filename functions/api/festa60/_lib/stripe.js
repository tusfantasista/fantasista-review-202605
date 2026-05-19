import { requireStripeSecret } from "./env.js";

export async function createCheckoutSession({ env, application, request, baseUrl }) {
  const stripeSecret = requireStripeSecret(env);
  const metadata = {
    application_id: application.id,
    member_id: application.member_id || "",
    ticket_type: application.ticket_type,
  };

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${baseUrl}/festa60-register/?status=success&application=${application.application_code}`);
  params.set("cancel_url", `${baseUrl}/festa60-register/?status=cancelled&application=${application.application_code}`);
  params.set("client_reference_id", application.id);
  params.set("customer_email", application.email);
  params.set("metadata[application_id]", metadata.application_id);
  params.set("metadata[member_id]", metadata.member_id);
  params.set("metadata[ticket_type]", metadata.ticket_type);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "jpy");
  params.set("line_items[0][price_data][product_data][name]", ticketLabel(application.ticket_type));
  params.set("line_items[0][price_data][unit_amount]", String(application.amount_total));

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeSecret}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": `festa60-${application.id}`,
    },
    body: params,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe Checkout session failed: ${result.error?.message || response.status}`);
  }

  return { session: result, metadata };
}

export async function verifyStripeSignature(payload, signatureHeader, webhookSecret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${payload}`;
  const expected = await hmacSha256Hex(webhookSecret, signedPayload);
  return constantTimeEqual(expected, parts.v1);
}

function ticketLabel(ticketType) {
  const labels = {
    obog: "60周年記念FESTA 参加費",
    young_obog: "60周年記念FESTA 若手OBOG参加費",
    current_student: "60周年記念FESTA 現役生",
    donation_only: "60周年記念FESTA 寄付",
  };
  return labels[ticketType] || labels.obog;
}

async function hmacSha256Hex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

import assert from "node:assert/strict";
import { handleContactRequest } from "../public/contact-api.js";

const originalFetch = globalThis.fetch;
const deliveries = [];
globalThis.fetch = async (_url, init) => {
  deliveries.push(JSON.parse(init.body));
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

const validPayload = {
  submission_id: "12345678-1234-1234-1234-123456789abc",
  website: "",
  form_started_at: Date.now() - 5000,
  full_name: "山田 太郎",
  maiden_name: "",
  graduation_year: "2010",
  email: "taro@example.com",
  phone: "",
  inquiry_type: "general",
  message: "問い合わせ内容です。",
  contact_permission: "yes",
  privacy_consent: "agree",
};

try {
  const request = new Request("https://example.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.com" },
    body: JSON.stringify(validPayload),
  });
  const response = await handleContactRequest(request, {
    CONTACT_EMAIL: "tus.festa.office@gmail.com",
    EMAIL_WEBHOOK_URL: "https://mail.example.test/send",
    EMAIL_API_TOKEN: "test-token",
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.receipt_email_sent, true);
  assert.match(result.receipt_id, /^CONTACT-\d{8}-[A-F0-9]{8}$/);
  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].to, "tus.festa.office@gmail.com");
  assert.equal(deliveries[0].reply_to, "taro@example.com");
  assert.equal(deliveries[1].to, "taro@example.com");

  const invalidRequest = new Request("https://example.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.com" },
    body: JSON.stringify({ ...validPayload, email: "invalid" }),
  });
  const invalidResponse = await handleContactRequest(invalidRequest, {
    CONTACT_EMAIL: "tus.festa.office@gmail.com",
    EMAIL_WEBHOOK_URL: "https://mail.example.test/send",
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal(deliveries.length, 2);

  const foreignRequest = new Request("https://example.com/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify(validPayload),
  });
  const foreignResponse = await handleContactRequest(foreignRequest, {
    CONTACT_EMAIL: "tus.festa.office@gmail.com",
    EMAIL_WEBHOOK_URL: "https://mail.example.test/send",
  });
  assert.equal(foreignResponse.status, 403);
  assert.equal(deliveries.length, 2);

  console.log("Contact API tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}

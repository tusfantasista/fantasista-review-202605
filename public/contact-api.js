const CONTACT_TYPES = {
  festa60: "60周年記念FESTA",
  general: "一般の問い合わせ",
};

const OFFICE_EMAIL = "tus.festa.office@gmail.com";
const MAX_REQUEST_BYTES = 24 * 1024;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}

function singleLine(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function multiLine(value, maxLength) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function normalizePayload(input) {
  return {
    submission_id: singleLine(input?.submission_id, 80),
    website: singleLine(input?.website, 200),
    form_started_at: Number(input?.form_started_at || 0),
    full_name: singleLine(input?.full_name, 120),
    maiden_name: singleLine(input?.maiden_name, 120),
    graduation_year: singleLine(input?.graduation_year, 4),
    email: singleLine(input?.email, 254).toLowerCase(),
    phone: singleLine(input?.phone, 40),
    inquiry_type: singleLine(input?.inquiry_type, 32),
    message: multiLine(input?.message, 5000),
    contact_permission: singleLine(input?.contact_permission, 8),
    privacy_consent: singleLine(input?.privacy_consent, 16),
  };
}

function validatePayload(payload) {
  const errors = {};
  if (!payload.full_name) errors.full_name = "required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.email = "invalid";
  if (payload.graduation_year && !/^(19|20)\d{2}$/.test(payload.graduation_year)) {
    errors.graduation_year = "invalid";
  }
  if (!CONTACT_TYPES[payload.inquiry_type]) errors.inquiry_type = "invalid";
  if (!payload.message) errors.message = "required";
  if (!['yes', 'no'].includes(payload.contact_permission)) errors.contact_permission = "invalid";
  if (payload.privacy_consent !== "agree") errors.privacy_consent = "required";
  return errors;
}

function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function receiptId() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `CONTACT-${date}-${suffix}`;
}

function messageId(payload, kind) {
  const safeId = /^[A-Za-z0-9_-]{16,80}$/.test(payload.submission_id)
    ? payload.submission_id
    : crypto.randomUUID();
  return `fantasista-contact-${kind}-${safeId}`;
}

function inquiryBody(payload, id) {
  return `FANTASISTA会 事務局 御中

Webサイトからお問い合わせを受け付けました。

受付番号：${id}
問い合わせ種別：${CONTACT_TYPES[payload.inquiry_type]}
氏名：${payload.full_name}
旧姓・現姓：${payload.maiden_name || "未入力"}
卒部年度：${payload.graduation_year ? `${payload.graduation_year}年度` : "未入力"}
メールアドレス：${payload.email}
電話番号：${payload.phone || "未入力"}
事務局からの連絡：${payload.contact_permission === "yes" ? "可" : "不可"}

---- お問い合わせ内容 ----
${payload.message}`;
}

function receiptBody(payload, id) {
  return `${payload.full_name} 様

FANTASISTA会へお問い合わせいただき、ありがとうございます。
以下の内容で受け付けました。

受付番号：${id}
問い合わせ種別：${CONTACT_TYPES[payload.inquiry_type]}

---- お問い合わせ内容 ----
${payload.message}

${payload.contact_permission === "yes"
    ? "内容を確認のうえ、必要に応じて事務局よりご連絡します。返信は原則1〜2週間程度を目安としています。"
    : "事務局からの連絡は「不可」として受け付けました。"}

このメールはお問い合わせ受付時に自動送信しています。
お心当たりがない場合は、${OFFICE_EMAIL} までお知らせください。`;
}

async function readEmailResult(location) {
  for (const delay of [0, 400, 1000, 2000]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const response = await fetch(location, { headers: { accept: "application/json" } });
    if (!response.ok) continue;
    const result = await response.json().catch(() => null);
    if (result) return result;
  }
  return null;
}

async function sendEmail(env, message) {
  if (!env.EMAIL_WEBHOOK_URL) {
    return { sent: false, error: "email_not_configured" };
  }

  const headers = { "content-type": "application/json" };
  if (env.EMAIL_API_TOKEN) headers.authorization = `Bearer ${env.EMAIL_API_TOKEN}`;
  const response = await fetch(env.EMAIL_WEBHOOK_URL, {
    method: "POST",
    redirect: "manual",
    headers,
    body: JSON.stringify({
      ...message,
      api_token: env.EMAIL_API_TOKEN || "",
      sender_name: env.CONTACT_EMAIL_SENDER_NAME || "東京理科大学舞研OBOG会 FANTASISTA",
    }),
  });
  const location = response.headers.get("location");
  if (!location && !response.ok) return { sent: false, error: `email_http_${response.status}` };
  const result = location ? await readEmailResult(location) : await response.json().catch(() => null);
  return result?.ok === true
    ? { sent: true }
    : { sent: false, error: result?.error || "email_rejected" };
}

export async function handleContactRequest(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: { allow: "POST" } });
  }
  if (!isSameOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, error: "request_too_large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, error: "request_too_large" }, { status: 413 });
  }
  const input = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();
  if (!input || typeof input !== "object") {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const payload = normalizePayload(input);

  // Bots commonly fill hidden fields or submit immediately after page load.
  if (payload.website || !Number.isFinite(payload.form_started_at) || Date.now() - payload.form_started_at < 1500) {
    return json({ ok: true, receipt_id: "CONTACT-RECEIVED", receipt_email_sent: false });
  }

  const errors = validatePayload(payload);
  if (Object.keys(errors).length) {
    return json({ ok: false, error: "validation_failed", fields: errors }, { status: 400 });
  }

  const id = receiptId();
  const officeEmail = env.CONTACT_EMAIL || OFFICE_EMAIL;
  try {
    const officeResult = await sendEmail(env, {
      to: officeEmail,
      reply_to: payload.email,
      subject: `【FANTASISTA会お問い合わせ・${CONTACT_TYPES[payload.inquiry_type]}】${payload.full_name}様 ${id}`,
      body: inquiryBody(payload, id),
      message_id: messageId(payload, "office"),
    });
    if (!officeResult.sent) {
      console.error("Contact office notification failed.", officeResult.error);
      return json({ ok: false, error: "delivery_failed" }, { status: 503 });
    }

    const receiptResult = await sendEmail(env, {
      to: payload.email,
      reply_to: officeEmail,
      subject: `【FANTASISTA会】お問い合わせを受け付けました ${id}`,
      body: receiptBody(payload, id),
      message_id: messageId(payload, "receipt"),
    });
    if (!receiptResult.sent) console.error("Contact receipt email failed.", receiptResult.error);

    return json({ ok: true, receipt_id: id, receipt_email_sent: receiptResult.sent });
  } catch (error) {
    console.error("Contact delivery failed.", error instanceof Error ? error.message : "unknown_error");
    return json({ ok: false, error: "delivery_failed" }, { status: 503 });
  }
}

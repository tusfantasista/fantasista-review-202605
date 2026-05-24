import { json, methodNotAllowed, serverError } from "./_lib/http.js";
import { requireDb } from "./_lib/env.js";
import { verifyTurnstile } from "./_lib/turnstile.js";
import {
  INTEREST_ATTENDANCE_INTENTS,
  INTEREST_PARTICIPANT_CATEGORIES,
  insertInterestRegistration,
  recentInterestByEmail,
} from "./_lib/db.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GRADUATION_REQUIRED_CATEGORIES = new Set(["tus_obog", "gakushuin_oyu"]);
const COMPANION_CATEGORIES = new Set(["tus_obog_companion", "gakushuin_oyu_companion"]);

export async function onRequestPost({ request, env }) {
  try {
    const payload = await readPayload(request);
    if (!payload) return errorJson(request, "送信内容を読み取れませんでした。");

    const validation = validateInterest(payload);
    if (!validation.ok) return errorJson(request, "入力内容を確認してください。", validation.errors);

    const turnstile = await verifyTurnstile(payload.turnstile_token, env, request);
    if (!turnstile.ok) return errorJson(request, "Turnstile verification failed.", turnstile.result || turnstile.message);

    const db = requireDb(env);
    const recent = await recentInterestByEmail(db, payload.email);
    if (recent && isLikelyRepeatSubmit(recent.created_at)) {
      return json(
        {
          ok: false,
          error: "too_many_requests",
          message: "同じメールアドレスで短時間に複数回送信されています。少し時間をおいて再度お試しください。",
        },
        { status: 429, headers: corsHeaders(request) },
      );
    }

    const interest = await insertInterestRegistration(db, normalizeInterest(payload), await getInterestMeta(request, payload));

    return json(
      {
        ok: true,
        interest: {
          id: interest.id,
          interest_code: interest.interest_code,
          interestCode: interest.interest_code,
          status: interest.status,
          created_at: interest.created_at,
        },
        message:
          "参加・寄付意向を受け付けました。これは正式な参加確定ではありません。正式参加登録は2026年8月1日開始予定です。",
        duplicate_candidate: Boolean(recent),
        turnstile_skipped: Boolean(turnstile.skipped),
      },
      { headers: corsHeaders(request) },
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function onRequestGet() {
  return methodNotAllowed();
}

function errorJson(request, message, details = undefined) {
  return json({ ok: false, error: "bad_request", message, details }, { status: 400, headers: corsHeaders(request) });
}

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowed = [
    "https://tusfantasista.github.io",
    "https://fantasista-review-202605.tus-fantasista.workers.dev",
  ];
  const isPreview = /\.pages\.dev$/.test(new URL(request.url).hostname);
  const allowOrigin = allowed.includes(origin) || (isPreview && origin.endsWith(".pages.dev")) ? origin : "";
  return {
    ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

async function readPayload(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }
  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const data = await request.formData();
    return Object.fromEntries(data.entries());
  }
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validateInterest(payload) {
  const errors = {};
  for (const field of ["last_name", "first_name", "last_kana", "first_kana", "email", "email_confirm", "participant_category", "attendance_intent"]) {
    if (!present(payload[field])) errors[field] = "required";
  }

  if (!INTEREST_PARTICIPANT_CATEGORIES.includes(payload.participant_category)) {
    errors.participant_category = "invalid";
  }
  if (!INTEREST_ATTENDANCE_INTENTS.includes(payload.attendance_intent)) {
    errors.attendance_intent = "invalid";
  }
  if (payload.email && !EMAIL_PATTERN.test(String(payload.email).trim())) {
    errors.email = "invalid";
  }
  if (payload.email_confirm && String(payload.email).trim().toLowerCase() !== String(payload.email_confirm).trim().toLowerCase()) {
    errors.email_confirm = "mismatch";
  }
  if (!isTruthy(payload.privacy_consent)) {
    errors.privacy_consent = "required";
  }

  const graduationUnknown = isTruthy(payload.graduation_year_unknown);
  if (GRADUATION_REQUIRED_CATEGORIES.has(payload.participant_category)) {
    if (!graduationUnknown && !present(payload.graduation_year)) {
      errors.graduation_year = "required_or_unknown";
    }
  }
  if (present(payload.graduation_year) && !validGraduationYear(payload.graduation_year)) {
    errors.graduation_year = "must_be_4_digit_year";
  }
  if (present(payload.companion_host_graduation_year) && !validGraduationYear(payload.companion_host_graduation_year)) {
    errors.companion_host_graduation_year = "must_be_4_digit_year";
  }
  if (COMPANION_CATEGORIES.has(payload.participant_category) && !hasCompanionHostHint(payload)) {
    errors.companion_host = "recommended";
  }
  if (payload.participant_category === "eligibility_consultation" && !present(payload.message)) {
    errors.message = "required_for_eligibility_consultation";
  }

  return { ok: Object.keys(errors).filter((key) => errors[key] !== "recommended").length === 0, errors };
}

function normalizeInterest(payload) {
  const trim = (value) => String(value || "").trim();
  return {
    ...payload,
    last_name: trim(payload.last_name),
    first_name: trim(payload.first_name),
    last_kana: trim(payload.last_kana),
    first_kana: trim(payload.first_kana),
    maiden_name: trim(payload.maiden_name),
    email: trim(payload.email).toLowerCase(),
    phone: trim(payload.phone),
    graduation_year_unknown: isTruthy(payload.graduation_year_unknown),
    graduation_year: trim(payload.graduation_year),
    companion_status: payload.companion_status || "unanswered",
    companion_count: payload.companion_count || null,
    companion_host_category: payload.companion_host_category || null,
    companion_host_last_name: trim(payload.companion_host_last_name),
    companion_host_first_name: trim(payload.companion_host_first_name),
    companion_host_graduation_year: trim(payload.companion_host_graduation_year),
    companion_host_note: trim(payload.companion_host_note),
    dance_time_intent: payload.dance_time_intent || "unanswered",
    photo_consent: payload.photo_consent || "unanswered",
    volunteer_interest: payload.volunteer_interest || "unanswered",
    donation_interest: payload.donation_interest || "unanswered",
    sponsorship_interest: payload.sponsorship_interest || "unanswered",
    archive_material_interest: payload.archive_material_interest || "unanswered",
    message: trim(payload.message),
  };
}

function present(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isTruthy(value) {
  return value === true || value === "true" || value === "on" || value === "agree" || value === "1";
}

function validGraduationYear(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}$/.test(text)) return false;
  const year = Number(text);
  return year >= 1900 && year <= 2026;
}

function hasCompanionHostHint(payload) {
  return Boolean(
    present(payload.companion_host_last_name) ||
      present(payload.companion_host_first_name) ||
      present(payload.companion_host_graduation_year) ||
      present(payload.companion_host_note),
  );
}

function isLikelyRepeatSubmit(createdAt) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return Date.now() - created < 60 * 1000;
}

async function getInterestMeta(request, payload = {}) {
  const url = new URL(request.url);
  return {
    user_agent: request.headers.get("user-agent") || "",
    source_path: payload.source_path || url.pathname,
    ip_hash: await hashIp(request.headers.get("cf-connecting-ip") || ""),
  };
}

async function hashIp(ip) {
  if (!ip || !globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

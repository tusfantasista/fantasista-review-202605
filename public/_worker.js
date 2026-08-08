var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/festa60/_lib/http.js
function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json, "json");
function text(data, init = {}) {
  return new Response(data, {
    ...init,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(text, "text");
function methodNotAllowed() {
  return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
__name(methodNotAllowed, "methodNotAllowed");
function badRequest(message, details = void 0) {
  return json({ ok: false, error: "bad_request", message, details }, { status: 400 });
}
__name(badRequest, "badRequest");
function serverError(error) {
  console.error(error);
  return json({ ok: false, error: "server_error" }, { status: 500 });
}
__name(serverError, "serverError");
async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
__name(readJson, "readJson");
function getClientMeta(request) {
  return {
    ip_address: request.headers.get("cf-connecting-ip") || "",
    user_agent: request.headers.get("user-agent") || ""
  };
}
__name(getClientMeta, "getClientMeta");

// api/festa60/_lib/auth.js
function assertAdmin(request, env) {
  const accessEmail = request.headers.get("cf-access-authenticated-user-email");
  if (accessEmail) return { ok: true, actor: accessEmail };
  if (request.headers.get("cf-access-jwt-assertion")) return { ok: true, actor: "cloudflare-access" };
  if (!isPreviewBypassEnabled(env)) {
    return {
      ok: false,
      response: json(
        {
          ok: false,
          error: "cloudflare_access_required",
          message: "Cloudflare Access is required for admin APIs."
        },
        { status: 401 }
      )
    };
  }
  const expected = env.ADMIN_API_TOKEN;
  if (!expected) {
    return {
      ok: false,
      response: json(
        {
          ok: false,
          error: "admin_auth_not_configured",
          message: "Configure Cloudflare Access or ADMIN_API_TOKEN for admin APIs."
        },
        { status: 401 }
      )
    };
  }
  const token = request.headers.get("x-admin-token") || bearerToken(request);
  if (token && constantTimeEqual(token, expected)) {
    return { ok: true, actor: "admin-token" };
  }
  return {
    ok: false,
    response: json({ ok: false, error: "unauthorized" }, { status: 401 })
  };
}
__name(assertAdmin, "assertAdmin");
function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}
__name(bearerToken, "bearerToken");
function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
function isPreviewBypassEnabled(env) {
  const environment = String(env.ENVIRONMENT || "preview").toLowerCase();
  const branch = String(env.CF_PAGES_BRANCH || "").toLowerCase();
  const disabled = env.ADMIN_TOKEN_BYPASS_ENABLED === "false" || env.ACCESS_BYPASS_ENABLED === "false" || env.ACCESS_BYPASS_TOKEN_ENABLED === "false";
  if (disabled) return false;
  if (environment === "production" || branch === "main") return false;
  return true;
}
__name(isPreviewBypassEnabled, "isPreviewBypassEnabled");

// api/festa60/_lib/env.js
function environmentName(env) {
  return env.ENVIRONMENT || env.CF_PAGES_BRANCH || "preview";
}
__name(environmentName, "environmentName");
function isProduction(env) {
  return environmentName(env) === "production";
}
__name(isProduction, "isProduction");
function requireDb(env) {
  if (!env.DB) {
    throw new Error("D1 binding DB is not configured.");
  }
  return env.DB;
}
__name(requireDb, "requireDb");
function requireStripeSecret(env) {
  const key = String(env.STRIPE_SECRET_KEY || "");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  const expectedMode = isProduction(env) ? "live" : "test";
  if (!new RegExp(`^(sk|rk)_${expectedMode}_`).test(key)) {
    throw new Error(`Stripe ${expectedMode} secret key is required in this environment.`);
  }
  return key;
}
__name(requireStripeSecret, "requireStripeSecret");
function publicBaseUrl(env, request) {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
__name(publicBaseUrl, "publicBaseUrl");
function adminActor(request, env) {
  return request.headers.get("cf-access-authenticated-user-email") || request.headers.get("x-admin-actor") || env.ADMIN_DEFAULT_ACTOR || "admin";
}
__name(adminActor, "adminActor");

// api/festa60/_lib/ids.js
function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}
__name(newId, "newId");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");

// api/festa60/_lib/db.js
var FEE_PERIODS = ["early", "year_end", "regular"];
var RECEPTION_ATTENDANCE = ["attending", "without_reception"];
var PAYMENT_STATUSES = ["unpaid", "pending", "paid", "cancelled", "refunded"];
var OBOG_6_10_GRADUATION_YEAR_FROM = 2016;
var OBOG_6_10_GRADUATION_YEAR_TO = 2020;
var OBOG_5_UNDER_GRADUATION_YEAR_FROM = 2021;
var OBOG_5_UNDER_GRADUATION_YEAR_TO = 2025;
var OBOG_11_OVER_GRADUATION_YEAR_TO = 2015;
var APPLICATION_DEADLINE_ISO = "2027-01-31T23:59:59+09:00";
function isApplicationOpen(date = /* @__PURE__ */ new Date()) {
  const instant = date instanceof Date ? date : new Date(date);
  return !Number.isNaN(instant.getTime()) && instant.getTime() <= new Date(APPLICATION_DEADLINE_ISO).getTime();
}
__name(isApplicationOpen, "isApplicationOpen");
function feePeriodForDate(date = /* @__PURE__ */ new Date()) {
  const instant = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instant.getTime())) return "regular";
  const jstDate = new Date(instant.getTime() + 9 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  if (jstDate <= "2026-09-30") return "early";
  if (jstDate <= "2026-12-31") return "year_end";
  return "regular";
}
__name(feePeriodForDate, "feePeriodForDate");
var BASE_FEES = {
  obog: { early: 13e3, year_end: 14e3, regular: 15e3 },
  obog_6_10: { early: 11e3, year_end: 12e3, regular: 13e3 },
  obog_5_under: { early: 9e3, year_end: 1e4, regular: 11e3 },
  current_student: { early: 4e3, year_end: 4e3, regular: 4e3 }
};
var ATTENDING_PLAN_TOTALS = {
  platinum: 1e5,
  gold: 5e4,
  silver: 3e4,
  bronze: 2e4
};
var STAFF_TICKET_TYPES = ["obog_staff", "obog_staff_6_10", "obog_staff_5_under"];
var ABSENT_DONATION_TOTALS = {
  absent_donation_30000: 3e4,
  absent_donation_10000: 1e4,
  absent_donation_5000: 5e3
};
var SUPPORT_TIER_BENEFITS = {
  platinum: { count: 25, unit_amount_jpy: 600 },
  gold: { count: 20, unit_amount_jpy: 500 },
  silver: { count: 12, unit_amount_jpy: 400 },
  bronze: { count: 5, unit_amount_jpy: 300 }
};
var STANDARD_DANCE_TICKET_BENEFITS = {
  obog: { count: 3, unit_amount_jpy: 300 },
  obog_6_10: { count: 2, unit_amount_jpy: 300 },
  obog_5_under: { count: 2, unit_amount_jpy: 300 }
};
var COMPANION_FEES = {
  adult: { attending: 8e3, without_reception: 6e3 },
  child: { attending: 3e3, without_reception: 1e3 },
  preschool: { attending: 0, without_reception: 0 }
};
var TICKET_LABELS = {
  obog: "60\u5468\u5E74\u8A18\u5FF5FESTA \u4E00\u822COBOG\u53C2\u52A0\u8CBB",
  obog_6_10: "60\u5468\u5E74\u8A18\u5FF5FESTA OBOG 6\u301C10\u5E74\u76EE\u53C2\u52A0\u8CBB",
  obog_5_under: "60\u5468\u5E74\u8A18\u5FF5FESTA OBOG 1\u301C5\u5E74\u76EE\u53C2\u52A0\u8CBB",
  obog_staff: "60\u5468\u5E74\u8A18\u5FF5FESTA OBOG\u5F79\u54E1\u30FB\u5F53\u65E5\u624B\u4F1D\u3044\u53C2\u52A0\u8CBB",
  obog_staff_6_10: "60\u5468\u5E74\u8A18\u5FF5FESTA OBOG\u5F79\u54E1\u30FB\u5F53\u65E5\u624B\u4F1D\u3044 6\u301C10\u5E74\u76EE\u53C2\u52A0\u8CBB",
  obog_staff_5_under: "60\u5468\u5E74\u8A18\u5FF5FESTA OBOG\u5F79\u54E1\u30FB\u5F53\u65E5\u624B\u4F1D\u3044 5\u5E74\u76EE\u4EE5\u4E0B\u53C2\u52A0\u8CBB",
  current_student: "60\u5468\u5E74\u8A18\u5FF5FESTA \u73FE\u5F79\u90E8\u54E1\u53C2\u52A0\u8CBB",
  absent_donation_30000: "60\u5468\u5E74\u8A18\u5FF5FESTA \u6B20\u5E2D\u8005\u5BC4\u4ED8 \u30D7\u30EC\u30DF\u30A2\u30E0\uFF0830,000\u5186\uFF09",
  absent_donation_10000: "60\u5468\u5E74\u8A18\u5FF5FESTA \u6B20\u5E2D\u8005\u5BC4\u4ED8 \u30A2\u30C9\u30D0\u30F3\u30B9\uFF0810,000\u5186\uFF09",
  absent_donation_5000: "60\u5468\u5E74\u8A18\u5FF5FESTA \u6B20\u5E2D\u8005\u5BC4\u4ED8 \u30B9\u30BF\u30F3\u30C0\u30FC\u30C9\uFF085,000\u5186\uFF09"
};
var DONATION_PLAN_DETAILS = {
  platinum: {
    name: "\u30D7\u30E9\u30C1\u30CA",
    description: "600\u5186\u5238\xD725\u679A\u3001\u5F53\u65E5\u306E\u96C6\u5408\u5199\u771F\u3001\u73FE\u5F79\u304B\u3089\u306E\u304A\u793C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3001\u8A18\u5FF5\u30B9\u30C6\u30C3\u30AB\u30FC\uFF08\u4E88\u5B9A\uFF09"
  },
  bronze: {
    name: "\u30D6\u30ED\u30F3\u30BA",
    description: "300\u5186\u5238\xD75\u679A\u3001\u5F53\u65E5\u306E\u96C6\u5408\u5199\u771F\u3001\u73FE\u5F79\u304B\u3089\u306E\u304A\u793C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3001\u8A18\u5FF5\u30B9\u30C6\u30C3\u30AB\u30FC\uFF08\u4E88\u5B9A\uFF09"
  },
  silver: {
    name: "\u30B7\u30EB\u30D0\u30FC",
    description: "400\u5186\u5238\xD712\u679A\u3001\u5F53\u65E5\u306E\u96C6\u5408\u5199\u771F\u3001\u73FE\u5F79\u304B\u3089\u306E\u304A\u793C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3001\u8A18\u5FF5\u30B9\u30C6\u30C3\u30AB\u30FC\uFF08\u4E88\u5B9A\uFF09"
  },
  gold: {
    name: "\u30B4\u30FC\u30EB\u30C9",
    description: "500\u5186\u5238\xD720\u679A\u3001\u5F53\u65E5\u306E\u96C6\u5408\u5199\u771F\u3001\u73FE\u5F79\u304B\u3089\u306E\u304A\u793C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3001\u8A18\u5FF5\u30B9\u30C6\u30C3\u30AB\u30FC\uFF08\u4E88\u5B9A\uFF09"
  },
  absent_donation_5000: {
    name: "\u30B9\u30BF\u30F3\u30C0\u30FC\u30C9",
    description: "\u5F53\u65E5\u306E\u96C6\u5408\u5199\u771F\u3001\u73FE\u5F79\u304B\u3089\u306E\u304A\u793C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3001\u8A18\u5FF5\u30B9\u30C6\u30C3\u30AB\u30FC\u3001\u5B9A\u5F62\u90F5\u4FBF\u7B49"
  },
  absent_donation_10000: {
    name: "\u30A2\u30C9\u30D0\u30F3\u30B9",
    description: "\u5F53\u65E5\u306E\u96C6\u5408\u5199\u771F\u3001\u73FE\u5F79\u304B\u3089\u306E\u304A\u793C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3001\u8A18\u5FF5\u30B9\u30C6\u30C3\u30AB\u30FC\u3001\u5199\u771F\u30B9\u30BF\u30F3\u30C9\u3001\u30EC\u30BF\u30FC\u30D1\u30C3\u30AF"
  },
  absent_donation_30000: {
    name: "\u30D7\u30EC\u30DF\u30A2\u30E0",
    description: "\u5F53\u65E5\u306E\u96C6\u5408\u5199\u771F\u3001\u73FE\u5F79\u304B\u3089\u306E\u304A\u793C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3001\u8A18\u5FF5\u30B9\u30C6\u30C3\u30AB\u30FC\u3001\u5199\u771F\u76FE\u3001\u8A18\u5FF5\u54C1\u3001\u5B85\u6025\u4FBF\u30B3\u30F3\u30D1\u30AF\u30C8"
  }
};
function danceTicketBenefit(ticketType) {
  const { base_ticket_type: baseTicketType, support_tier: supportTier } = splitTicketType(ticketType);
  const benefit = SUPPORT_TIER_BENEFITS[supportTier] || STANDARD_DANCE_TICKET_BENEFITS[publicBaseTicketType(baseTicketType)] || { count: 0, unit_amount_jpy: 0 };
  return {
    count: benefit.count,
    unit_amount_jpy: benefit.unit_amount_jpy,
    total_amount_jpy: benefit.count * benefit.unit_amount_jpy
  };
}
__name(danceTicketBenefit, "danceTicketBenefit");
function companionDanceTicketBenefit(ticketType, companions = []) {
  const adultCount = Array.isArray(companions)
    ? companions.filter((companion) => companion.attendee_type === "adult").length
    : Math.max(0, Number(companions || 0));
  const unitAmount = adultCount ? danceTicketBenefit(ticketType).unit_amount_jpy || 300 : 0;
  return {
    count: adultCount,
    unit_amount_jpy: unitAmount,
    total_amount_jpy: adultCount * unitAmount
  };
}
__name(companionDanceTicketBenefit, "companionDanceTicketBenefit");
function splitTicketType(ticketType) {
  const legacy = {
    premium: "obog__gold",
    donation_only: "obog__gold",
    premium_gold: "obog__gold",
    premium_silver: "obog__silver",
    premium_bronze: "obog__bronze"
  };
  const value = legacy[ticketType] || String(ticketType || "obog");
  const [rawBase, rawSupport = "none"] = value.split("__");
  const baseTicketType = rawBase === "young_obog" ? "obog_6_10" : rawBase;
  const supportTier = Object.hasOwn(ATTENDING_PLAN_TOTALS, rawSupport) ? rawSupport : "none";
  return { base_ticket_type: baseTicketType || "obog", support_tier: supportTier };
}
__name(splitTicketType, "splitTicketType");
function normalizeTicketType(ticketType, supportTier = "none") {
  const parsed = splitTicketType(ticketType);
  const normalizedSupport = Object.hasOwn(ATTENDING_PLAN_TOTALS, supportTier) ? supportTier : parsed.support_tier;
  return normalizedSupport === "none" ? parsed.base_ticket_type : `${parsed.base_ticket_type}__${normalizedSupport}`;
}
__name(normalizeTicketType, "normalizeTicketType");
function ticketLabel(ticketType) {
  const { base_ticket_type: baseTicketType, support_tier: supportTier } = splitTicketType(ticketType);
  const baseLabel = TICKET_LABELS[baseTicketType] || TICKET_LABELS.obog;
  if (supportTier === "none") return baseLabel;
  const tierLabel = supportTier === "platinum" ? "\u30D7\u30E9\u30C1\u30CA" : supportTier === "gold" ? "\u30B4\u30FC\u30EB\u30C9" : supportTier === "silver" ? "\u30B7\u30EB\u30D0\u30FC" : "\u30D6\u30ED\u30F3\u30BA";
  const staffLabel = isStaffTicketType(baseTicketType) ? " OBOG\u5F79\u54E1\u30FB\u5F53\u65E5\u624B\u4F1D\u3044" : "";
  return `60\u5468\u5E74\u8A18\u5FF5FESTA${staffLabel} \u53C2\u52A0\u30D7\u30E9\u30F3 ${tierLabel}`;
}
__name(ticketLabel, "ticketLabel");
function donationPlanDetails(ticketType) {
  const { base_ticket_type: baseTicketType, support_tier: supportTier } = splitTicketType(ticketType);
  const key = supportTier !== "none" ? supportTier : baseTicketType;
  return DONATION_PLAN_DETAILS[key] || null;
}
__name(donationPlanDetails, "donationPlanDetails");
function ticketAmount(ticketType, companions = 0, feePeriod = "regular", receptionAttendance = "attending") {
  const companionRows = Array.isArray(companions) ? companions : Array.from({ length: Number(companions || 0) }, () => ({ attendee_type: "adult" }));
  return lineItemsTotal(buildPaymentLineItems({ ticket_type: ticketType, fee_period: feePeriod, reception_attendance: receptionAttendance }, companionRows));
}
__name(ticketAmount, "ticketAmount");
function buildPaymentLineItems(payload, companions = []) {
  const normalizedTicket = normalizeTicketType(payload.ticket_type);
  const normalizedPeriod = FEE_PERIODS.includes(payload.fee_period) ? payload.fee_period : "regular";
  const normalizedReception = RECEPTION_ATTENDANCE.includes(payload.reception_attendance) ? payload.reception_attendance : "attending";
  const items = [];
  const { base_ticket_type: baseTicketType, support_tier: supportTier } = splitTicketType(normalizedTicket);
  const isAbsentDonation = Object.hasOwn(ABSENT_DONATION_TOTALS, baseTicketType);
  const companionTicketUnitAmount = danceTicketBenefit(normalizedTicket).unit_amount_jpy || 300;
  const ticketAmountJpy = !isAbsentDonation && supportTier !== "none" ? attendingPlanAmount(supportTier, baseTicketType, normalizedPeriod, normalizedReception) : ticketLineAmount(baseTicketType, normalizedPeriod, normalizedReception);
  if (ticketAmountJpy > 0) {
    const danceTicket = danceTicketBenefit(normalizedTicket);
    const plan = donationPlanDetails(normalizedTicket);
    items.push({
      item_type: isAbsentDonation ? "donation" : "ticket",
      label: ticketLabel(normalizedTicket),
      quantity: 1,
      unit_amount_jpy: ticketAmountJpy,
      amount_jpy: ticketAmountJpy,
      metadata: {
        ticket_type: normalizedTicket,
        fee_period: normalizedPeriod,
        reception_attendance: normalizedReception,
        dance_ticket_count: danceTicket.count,
        dance_ticket_unit_amount_jpy: danceTicket.unit_amount_jpy,
        dance_ticket_total_amount_jpy: danceTicket.total_amount_jpy,
        plan_name: plan?.name || "",
        benefits_summary: plan?.description || ""
      }
    });
  }
  if (!isAbsentDonation) companions.forEach((companion, index) => {
    const type = ["adult", "child", "preschool"].includes(companion.attendee_type) ? companion.attendee_type : "adult";
    const companionReception = RECEPTION_ATTENDANCE.includes(companion.reception_attendance) ? companion.reception_attendance : normalizedReception;
    const amount = COMPANION_FEES[type][companionReception];
    const danceTicketCount = type === "adult" ? 1 : 0;
    if (amount <= 0) return;
    items.push({
      item_type: "companion",
      label: `\u540C\u4F34\u8005${index + 1} ${type === "adult" ? "\u5927\u4EBA\uFF08\u4E2D\u5B66\u751F\u4EE5\u4E0A\uFF09" : type === "child" ? "\u5B50\u4F9B\uFF08\u5C0F\u5B66\u751F\uFF09" : "\u672A\u5C31\u5B66\u5150\uFF08\u7121\u6599\uFF09"}`,
      quantity: 1,
      unit_amount_jpy: amount,
      amount_jpy: amount,
      metadata: {
        attendee_type: type,
        relationship: companion.relationship || "",
        reception_attendance: companionReception,
        dance_ticket_count: danceTicketCount,
        dance_ticket_unit_amount_jpy: danceTicketCount ? companionTicketUnitAmount : 0,
        dance_ticket_total_amount_jpy: danceTicketCount * companionTicketUnitAmount
      }
    });
  });
  return items;
}
__name(buildPaymentLineItems, "buildPaymentLineItems");
function lineItemsTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.amount_jpy || 0), 0);
}
__name(lineItemsTotal, "lineItemsTotal");
function ticketLineAmount(ticketType, feePeriod, receptionAttendance) {
  const { base_ticket_type: baseTicketType } = splitTicketType(ticketType);
  if (Object.hasOwn(ABSENT_DONATION_TOTALS, baseTicketType)) {
    return ABSENT_DONATION_TOTALS[baseTicketType];
  }
  let base = BASE_FEES[baseTicketType]?.[feePeriod] ?? BASE_FEES.obog[feePeriod];
  if (isStaffTicketType(baseTicketType)) {
    return staffParticipationAmount(baseTicketType, feePeriod, receptionAttendance);
  }
  if (baseTicketType === "current_student") {
    return receptionAttendance === "attending" ? BASE_FEES.current_student[feePeriod] : 0;
  }
  return Math.max(0, base - noReceptionDiscount(receptionAttendance));
}
__name(ticketLineAmount, "ticketLineAmount");
function attendingPlanAmount(supportTier, baseTicketType, feePeriod, receptionAttendance = "attending") {
  const planBase = ATTENDING_PLAN_TOTALS[supportTier];
  if (!planBase) return ticketLineAmount(baseTicketType, feePeriod, receptionAttendance);
  if (isStaffTicketType(baseTicketType)) {
    const donationAddOn = Math.max(0, planBase - BASE_FEES.obog.regular);
    return donationAddOn + staffParticipationAmount(baseTicketType, feePeriod, receptionAttendance);
  }
  const discountedStandardFee = BASE_FEES[baseTicketType]?.[feePeriod] ?? BASE_FEES.obog[feePeriod];
  const combinedDiscount = Math.max(0, BASE_FEES.obog.regular - discountedStandardFee);
  return Math.max(0, planBase - combinedDiscount - noReceptionDiscount(receptionAttendance));
}
__name(attendingPlanAmount, "attendingPlanAmount");
function publicBaseTicketType(baseTicketType) {
  if (baseTicketType === "obog_staff_6_10") return "obog_6_10";
  if (baseTicketType === "obog_staff_5_under") return "obog_5_under";
  if (baseTicketType === "obog_staff") return "obog";
  return baseTicketType;
}
__name(publicBaseTicketType, "publicBaseTicketType");
function isStaffTicketType(baseTicketType) {
  return STAFF_TICKET_TYPES.includes(baseTicketType);
}
__name(isStaffTicketType, "isStaffTicketType");
function staffApplicationPeriodDiscount(feePeriod) {
  if (feePeriod === "early") return 2e3;
  if (feePeriod === "year_end") return 1e3;
  return 0;
}
__name(staffApplicationPeriodDiscount, "staffApplicationPeriodDiscount");
function staffGraduationDiscount(baseTicketType) {
  const publicType = publicBaseTicketType(baseTicketType);
  if (publicType === "obog_6_10") return 2e3;
  if (publicType === "obog_5_under") return 4e3;
  return 0;
}
__name(staffGraduationDiscount, "staffGraduationDiscount");
function staffParticipationAmount(baseTicketType, feePeriod, receptionAttendance) {
  const discountedBase = Math.round((BASE_FEES.obog.regular - noReceptionDiscount(receptionAttendance)) * 0.5);
  return Math.max(0, discountedBase - staffApplicationPeriodDiscount(feePeriod) - staffGraduationDiscount(baseTicketType));
}
__name(staffParticipationAmount, "staffParticipationAmount");
function noReceptionDiscount(receptionAttendance) {
  return receptionAttendance === "without_reception" ? 2e3 : 0;
}
__name(noReceptionDiscount, "noReceptionDiscount");
function transferNameFor(applicationCode, fullNameKana) {
  const normalizedName = String(fullNameKana || "").replace(/[ぁ-ゖ]/g, (character) => String.fromCharCode(character.charCodeAt(0) + 96)).replace(/[ 　]/g, "").trim();
  return `${applicationCode} ${normalizedName}`.trim();
}
__name(transferNameFor, "transferNameFor");
async function findMemberMatch(db, payload) {
  const email = (payload.email || "").trim().toLowerCase();
  if (email) {
    const byEmail = await db.prepare("SELECT * FROM members WHERE lower(email) = ? LIMIT 1").bind(email).first();
    if (byEmail) return { member: byEmail, status: "exact_match", confidence: 0.98 };
  }
  const fullName = (payload.full_name || "").trim();
  const kana = (payload.full_name_kana || "").trim();
  if (fullName) {
    const byName = await db.prepare(
      "SELECT * FROM members WHERE full_name = ? OR (full_name_kana IS NOT NULL AND full_name_kana = ?) LIMIT 1"
    ).bind(fullName, kana).first();
    if (byName) return { member: byName, status: "possible_match", confidence: 0.72 };
  }
  return { member: null, status: "new_record", confidence: 0 };
}
__name(findMemberMatch, "findMemberMatch");
async function insertApplication(db, payload, requestMeta = {}) {
  const match2 = await findMemberMatch(db, payload);
  const id = newId("app");
  const applicationCode = payload.application_code || await nextApplicationCode(db);
  const companions = Array.isArray(payload.companions) ? payload.companions.filter((item) => item.full_name) : [];
  const lineItems = buildPaymentLineItems(payload, companions);
  const totalAmountJpy = lineItemsTotal(lineItems);
  const quantity = 1 + companions.length;
  const paymentStatus = totalAmountJpy > 0 ? "unpaid" : "paid";
  const paymentMethod = totalAmountJpy > 0 ? "stripe_checkout" : "not_required";
  const paymentProvider = totalAmountJpy > 0 ? "stripe" : "none";
  const paidAt = paymentStatus === "paid" ? nowIso() : null;
  const now = nowIso();
  const expectedTransferName = null;
  await db.prepare(
    `INSERT INTO applications (
        id, application_code, member_id, match_status, match_confidence, status, ticket_type, fee_period, reception_attendance,
        attendance_status, payment_status, payment_method, payment_provider, external_payment_id, total_amount_jpy, quantity,
        full_name, full_name_kana, family_name, given_name, family_name_kana, given_name_kana, maiden_name,
        email, phone, graduation_year, generation, school_lineage, dance_role,
        postal_code, address, prefecture, city, street_address, building,
        companion_count, expected_transfer_name, actual_transfer_name, message, source, client_submission_id,
        paid_at, cancelled_at, refunded_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    applicationCode,
    match2.member?.id || null,
    match2.status,
    match2.confidence,
    totalAmountJpy > 0 ? "pending" : "confirmed",
    normalizeTicketType(payload.ticket_type),
    payload.fee_period || "regular",
    payload.reception_attendance || "attending",
    totalAmountJpy > 0 ? "pending" : "confirmed",
    paymentStatus,
    paymentMethod,
    paymentProvider,
    payload.external_payment_id || null,
    totalAmountJpy,
    quantity,
    payload.full_name,
    payload.full_name_kana || null,
    payload.family_name,
    payload.given_name,
    payload.family_name_kana,
    payload.given_name_kana,
    payload.maiden_name || null,
    payload.email,
    payload.phone || null,
    numberOrNull(payload.graduation_year),
    payload.generation || null,
    payload.school_lineage || null,
    payload.dance_role || null,
    payload.postal_code || null,
    payload.address || null,
    payload.prefecture || null,
    payload.city || null,
    payload.street_address || null,
    payload.building || null,
    companions.length,
    expectedTransferName,
    payload.actual_transfer_name || null,
    payload.message || null,
    payload.source || "public_form",
    payload.client_submission_id || null,
    paidAt,
    null,
    null,
    now,
    now
  ).run();
  for (const item of lineItems) {
    await db.prepare(
      `INSERT INTO payment_line_items (
          id, application_id, item_type, label, quantity, unit_amount_jpy, amount_jpy, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId("pli"),
      id,
      item.item_type,
      item.label,
      item.quantity || 1,
      item.unit_amount_jpy || 0,
      item.amount_jpy || 0,
      JSON.stringify(item.metadata || {}),
      now
    ).run();
  }
  for (const companion of companions) {
    await db.prepare(
      `INSERT INTO companions (
          id, application_id, full_name, relationship, attendee_type, reception_attendance, email, note, ticket_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId("cmp"),
      id,
      companion.full_name,
      companion.relationship || null,
      companion.attendee_type || null,
      companion.reception_attendance || payload.reception_attendance || "attending",
      companion.email || null,
      companion.note || null,
      "companion",
      now
    ).run();
  }
  const consentRows = [
    ["privacy", payload.privacy_consent === true || payload.privacy_consent === "on", "\u500B\u4EBA\u60C5\u5831\u306E\u53D6\u308A\u6271\u3044\u306B\u540C\u610F"],
    ["contact", payload.contact_consent === true || payload.contact_consent === "on", "\u4E8B\u52D9\u5C40\u304B\u3089\u306E\u9023\u7D61\u306B\u540C\u610F"],
    [
      "photo",
      payload.photo_consent === true || payload.photo_consent === "on",
      "\u5F53\u65E5\u306E\u64AE\u5F71\u3001YouTube\u9650\u5B9A\u516C\u958B\u7B49\u306B\u3088\u308B\u914D\u4FE1\u30FB\u5171\u6709\u304A\u3088\u3073\u6620\u308A\u8FBC\u307F\u3092\u4E86\u627F"
    ],
    [
      "cancellation_policy",
      payload.cancellation_policy_consent === true || payload.cancellation_policy_consent === "on",
      "\u652F\u6255\u3044\u5F8C\u306E\u30AD\u30E3\u30F3\u30BB\u30EB\u306B\u4F34\u3046\u8FD4\u91D1\u306F\u539F\u5247\u306A\u3057"
    ]
  ];
  for (const [type, value, text2] of consentRows) {
    await db.prepare(
      `INSERT INTO consents (id, application_id, consent_type, consent_value, consent_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(newId("cns"), id, type, value ? 1 : 0, text2, now).run();
  }
  await db.prepare(
    `INSERT INTO attendance (id, application_id, member_id, reception_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(newId("att"), id, match2.member?.id || null, "not_checked_in", now, now).run();
  await audit(db, {
    actor: "public_form",
    action: "application.created",
    target_type: "application",
    target_id: id,
    details_json: JSON.stringify({ match_status: match2.status, ticket_type: normalizeTicketType(payload.ticket_type), fee_period: payload.fee_period, reception_attendance: payload.reception_attendance }),
    ...requestMeta
  });
  const paymentId = null;
  return {
    id,
    application_code: applicationCode,
    applicationId: applicationCode,
    full_name: payload.full_name,
    full_name_kana: payload.full_name_kana || null,
    email: payload.email,
    ticket_type: normalizeTicketType(payload.ticket_type),
    member_id: match2.member?.id || null,
    match_status: match2.status,
    match_confidence: match2.confidence,
    quantity,
    amount_total: totalAmountJpy,
    total_amount_jpy: totalAmountJpy,
    amount: totalAmountJpy,
    payment_method: paymentMethod,
    payment_provider: paymentProvider,
    payment_status: paymentStatus,
    paymentMethod,
    paymentProvider,
    paymentStatus,
    expected_transfer_name: expectedTransferName,
    expectedTransferName,
    paid_at: paidAt,
    payment_id: paymentId,
    line_items: lineItems,
    dance_ticket_benefit: danceTicketBenefit(payload.ticket_type),
    companion_dance_ticket_benefit: companionDanceTicketBenefit(payload.ticket_type, companions)
  };
}
__name(insertApplication, "insertApplication");
async function nextApplicationCode(db) {
  await db.prepare("INSERT OR IGNORE INTO application_sequences (name, last_value, updated_at) VALUES (?, ?, ?)").bind("festa60", 0, nowIso()).run();
  const row = await db.prepare("UPDATE application_sequences SET last_value = last_value + 1, updated_at = ? WHERE name = ? RETURNING last_value").bind(nowIso(), "festa60").first();
  if (!row?.last_value) throw new Error("Failed to issue Festa 60 application number.");
  return `FESTA-${String(row.last_value).padStart(6, "0")}`;
}
__name(nextApplicationCode, "nextApplicationCode");
async function createPayment(db, application, session, metadata) {
  const now = nowIso();
  const paymentId = newId("pay");
  await db.prepare(
    `INSERT INTO payments (
        id, application_id, member_id, stripe_checkout_session_id, stripe_payment_intent_id,
        stripe_customer_id, amount_total, currency, status, payment_method, payment_provider,
        external_payment_id, ticket_type, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    paymentId,
    application.id,
    application.member_id || null,
    session.id,
    session.payment_intent || null,
    session.customer || null,
    session.amount_total || application.amount_total || 0,
    session.currency || "jpy",
    session.payment_status || "created",
    "stripe_checkout",
    "stripe",
    session.id,
    application.ticket_type,
    JSON.stringify(metadata),
    now,
    now
  ).run();
  await db.prepare("UPDATE payment_line_items SET payment_id = ? WHERE application_id = ?").bind(paymentId, application.id).run();
  await db.prepare(
    `UPDATE applications
       SET payment_method = 'stripe_checkout', payment_provider = 'stripe', external_payment_id = ?, updated_at = ?
       WHERE id = ?`
  ).bind(session.id, now, application.id).run();
  return paymentId;
}
__name(createPayment, "createPayment");
async function createBankTransferPayment(db, application, paymentIntent, customerId) {
  const now = nowIso();
  const paymentId = newId("pay");
  await db.prepare(
    `INSERT INTO payments (
        id, application_id, member_id, stripe_checkout_session_id, stripe_payment_intent_id,
        stripe_customer_id, amount_total, currency, status, payment_method, payment_provider,
        external_payment_id, ticket_type, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    paymentId,
    application.id,
    application.member_id || null,
    null,
    paymentIntent.id,
    customerId || paymentIntent.customer || null,
    paymentIntent.amount || application.amount_total || 0,
    paymentIntent.currency || "jpy",
    paymentIntent.status || "requires_action",
    "bank_transfer",
    "stripe",
    paymentIntent.id,
    application.ticket_type,
    JSON.stringify({ application_id: application.id, ticket_type: application.ticket_type }),
    now,
    now
  ).run();
  await db.prepare("UPDATE payment_line_items SET payment_id = ? WHERE application_id = ?").bind(paymentId, application.id).run();
  await db.prepare(
    `UPDATE applications
       SET status = 'payment_pending', payment_status = 'unpaid', payment_method = 'bank_transfer',
           payment_provider = 'stripe', external_payment_id = ?, updated_at = ?
       WHERE id = ?`
  ).bind(paymentIntent.id, now, application.id).run();
  return paymentId;
}
__name(createBankTransferPayment, "createBankTransferPayment");
async function recordStripeEvent(db, event, payloadJson) {
  const now = nowIso();
  const existing = await db.prepare("SELECT status FROM stripe_events WHERE id = ?").bind(event.id).first();
  if (existing?.status === "processed" || existing?.status === "processing") return false;
  if (existing?.status === "failed") {
    await db.prepare("UPDATE stripe_events SET status = ?, payload_json = ?, processed_at = NULL WHERE id = ?").bind("processing", payloadJson, event.id).run();
    return true;
  }
  const result = await db.prepare(
    `INSERT OR IGNORE INTO stripe_events (id, event_type, status, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`
  ).bind(event.id, event.type, "processing", payloadJson, now).run();
  return (result.meta?.changes || 0) > 0;
}
__name(recordStripeEvent, "recordStripeEvent");
async function markStripeEventProcessed(db, eventId) {
  await db.prepare("UPDATE stripe_events SET status = ?, processed_at = ? WHERE id = ?").bind("processed", nowIso(), eventId).run();
}
__name(markStripeEventProcessed, "markStripeEventProcessed");
async function markStripeEventFailed(db, eventId, error) {
  await db.prepare("UPDATE stripe_events SET status = ?, payload_json = COALESCE(payload_json, '') || ? WHERE id = ?").bind("failed", `
/* processing_error: ${String(error?.message || error).slice(0, 500)} */`, eventId).run();
}
__name(markStripeEventFailed, "markStripeEventFailed");
async function markCheckoutCompleted(db, session, stripeEventId) {
  const now = nowIso();
  const applicationId = session.metadata?.application_id;
  const memberId = session.metadata?.member_id || null;
  const status = session.payment_status === "paid" ? "paid" : "pending";
  const expectedPayment = await db.prepare(
    `SELECT application_id, amount_total, currency
       FROM payments
       WHERE stripe_checkout_session_id = ? AND payment_provider = 'stripe'
       LIMIT 1`
  ).bind(session.id).first();
  if (!expectedPayment) throw new Error("Stripe Checkout session is not linked to a Festa 60 payment.");
  if (applicationId !== expectedPayment.application_id) throw new Error("Stripe application metadata mismatch.");
  if (Number(session.amount_total || 0) !== Number(expectedPayment.amount_total || 0)) {
    throw new Error("Stripe payment amount mismatch.");
  }
  if (String(session.currency || "").toLowerCase() !== String(expectedPayment.currency || "").toLowerCase()) {
    throw new Error("Stripe payment currency mismatch.");
  }
  await db.prepare(
    `UPDATE payments
       SET status = ?, stripe_payment_intent_id = ?, stripe_customer_id = ?, amount_total = ?,
           currency = ?, stripe_event_id = ?, paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END, updated_at = ?
       WHERE stripe_checkout_session_id = ?`
  ).bind(
    status,
    session.payment_intent || null,
    session.customer || null,
    session.amount_total || 0,
    session.currency || "jpy",
    stripeEventId || null,
    status,
    now,
    now,
    session.id
  ).run();
  if (applicationId) {
    await db.prepare("UPDATE applications SET payment_status = ?, status = ?, attendance_status = ?, member_id = COALESCE(member_id, ?), paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END, updated_at = ? WHERE id = ?").bind(status, status === "paid" ? "confirmed" : "payment_pending", status === "paid" ? "confirmed" : "pending", memberId, status, now, now, applicationId).run();
  }
  await audit(db, {
    actor: "stripe",
    action: "payment.checkout_completed",
    target_type: "application",
    target_id: applicationId || session.id,
    details_json: JSON.stringify({ checkout_session_id: session.id, payment_status: status })
  });
}
__name(markCheckoutCompleted, "markCheckoutCompleted");
async function markCheckoutExpired(db, session, stripeEventId) {
  const now = nowIso();
  const applicationId = session.metadata?.application_id;
  await db.prepare(
    `UPDATE payments
       SET status = ?, stripe_event_id = ?, updated_at = ?
       WHERE stripe_checkout_session_id = ?`
  ).bind("cancelled", stripeEventId || null, now, session.id).run();
  if (applicationId) {
    await db.prepare("UPDATE applications SET payment_status = ?, status = ?, attendance_status = ?, updated_at = ? WHERE id = ?").bind("cancelled", "cancelled", "pending", now, applicationId).run();
  }
  await audit(db, {
    actor: "stripe",
    action: "payment.checkout_expired",
    target_type: "application",
    target_id: applicationId || session.id,
    details_json: JSON.stringify({ checkout_session_id: session.id, payment_status: "cancelled" })
  });
}
__name(markCheckoutExpired, "markCheckoutExpired");
async function markCheckoutFailed(db, session, stripeEventId) {
  const now = nowIso();
  const applicationId = session.metadata?.application_id;
  await db.prepare(
    `UPDATE payments
       SET status = ?, stripe_event_id = ?, updated_at = ?
       WHERE stripe_checkout_session_id = ?`
  ).bind("failed", stripeEventId || null, now, session.id).run();
  if (applicationId) {
    await db.prepare(
      "UPDATE applications SET payment_status = ?, status = ?, attendance_status = ?, updated_at = ? WHERE id = ?"
    ).bind("unpaid", "payment_pending", "pending", now, applicationId).run();
  }
  await audit(db, {
    actor: "stripe",
    action: "payment.checkout_failed",
    target_type: "application",
    target_id: applicationId || session.id,
    details_json: JSON.stringify({ checkout_session_id: session.id, payment_status: "failed" })
  });
}
__name(markCheckoutFailed, "markCheckoutFailed");
async function markPaymentPartiallyFunded(db, paymentIntent, stripeEventId) {
  const now = nowIso();
  const amountTotal = Number(paymentIntent.amount || 0);
  const amountRemaining = bankTransferAmountRemaining(paymentIntent);
  const amountReceived = Math.max(0, amountTotal - amountRemaining);
  const payment = await db.prepare(
    `SELECT application_id
       FROM payments
       WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe'
       LIMIT 1`
  ).bind(paymentIntent.id).first();
  if (!payment?.application_id) {
    const preview = await db.prepare(
      `SELECT id, applicant_email, applicant_name
         FROM bank_transfer_previews
         WHERE stripe_payment_intent_id = ?
         LIMIT 1`
    ).bind(paymentIntent.id).first();
    if (!preview) throw new Error("Stripe partially funded PaymentIntent is not linked to a Festa 60 payment or preview.");
    await db.prepare(
      `UPDATE bank_transfer_previews
          SET status = 'funds_received_before_confirmation', amount_received_jpy = ?,
              amount_remaining_jpy = ?, updated_at = ?
        WHERE id = ?`
    ).bind(amountReceived, amountRemaining, now, preview.id).run();
    await audit(db, {
      actor: "stripe",
      action: "bank_preview.partially_funded_before_confirmation",
      target_type: "bank_transfer_preview",
      target_id: preview.id,
      details_json: JSON.stringify({ payment_intent_id: paymentIntent.id, amount_received_jpy: amountReceived, amount_remaining_jpy: amountRemaining })
    });
    return {
      application_id: null,
      preview_id: preview.id,
      applicant_email: preview.applicant_email,
      applicant_name: preview.applicant_name,
      amount_total_jpy: amountTotal,
      amount_received_jpy: amountReceived,
      amount_remaining_jpy: amountRemaining,
      hosted_instructions_url: bankTransferInstructionsUrl(paymentIntent)
    };
  }
  await db.prepare(
    `UPDATE payments
       SET status = 'partially_funded', amount_received_jpy = ?, amount_remaining_jpy = ?,
           partial_payment_at = ?, stripe_event_id = ?, updated_at = ?
       WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe'`
  ).bind(amountReceived, amountRemaining, now, stripeEventId || null, now, paymentIntent.id).run();
  await db.prepare(
    `UPDATE applications
       SET payment_status = 'pending', status = 'payment_pending', attendance_status = 'pending', updated_at = ?
       WHERE id = ?`
  ).bind(now, payment.application_id).run();
  await audit(db, {
    actor: "stripe",
    action: "payment.partially_funded",
    target_type: "application",
    target_id: payment.application_id,
    details_json: JSON.stringify({
      payment_intent_id: paymentIntent.id,
      amount_received_jpy: amountReceived,
      amount_remaining_jpy: amountRemaining
    })
  });
  return {
    application_id: payment.application_id,
    amount_total_jpy: amountTotal,
    amount_received_jpy: amountReceived,
    amount_remaining_jpy: amountRemaining,
    hosted_instructions_url: bankTransferInstructionsUrl(paymentIntent)
  };
}
__name(markPaymentPartiallyFunded, "markPaymentPartiallyFunded");
async function markBankTransferPaymentSucceeded(db, paymentIntent, stripeEventId) {
  const now = nowIso();
  const payment = await db.prepare(
    `SELECT application_id, amount_total, currency
       FROM payments
       WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe'
       LIMIT 1`
  ).bind(paymentIntent.id).first();
  if (!payment?.application_id) {
    const preview = await db.prepare(
      `SELECT id, applicant_email, applicant_name
         FROM bank_transfer_previews
         WHERE stripe_payment_intent_id = ?
         LIMIT 1`
    ).bind(paymentIntent.id).first();
    if (!preview) throw new Error("Stripe bank transfer PaymentIntent is not linked to a Festa 60 payment or preview.");
    await db.prepare(
      `UPDATE bank_transfer_previews
          SET status = 'paid_before_confirmation', amount_received_jpy = ?,
              amount_remaining_jpy = 0, updated_at = ?
        WHERE id = ?`
    ).bind(Number(paymentIntent.amount_received || paymentIntent.amount || 0), now, preview.id).run();
    await audit(db, {
      actor: "stripe",
      action: "bank_preview.paid_before_confirmation",
      target_type: "bank_transfer_preview",
      target_id: preview.id,
      details_json: JSON.stringify({ payment_intent_id: paymentIntent.id, amount_received_jpy: Number(paymentIntent.amount_received || paymentIntent.amount || 0) })
    });
    return {
      application_id: null,
      preview_id: preview.id,
      applicant_email: preview.applicant_email,
      applicant_name: preview.applicant_name,
      amount_total_jpy: Number(paymentIntent.amount || 0),
      amount_received_jpy: Number(paymentIntent.amount_received || paymentIntent.amount || 0)
    };
  }
  if (Number(paymentIntent.amount || 0) !== Number(payment.amount_total || 0)) throw new Error("Stripe bank transfer amount mismatch.");
  if (String(paymentIntent.currency || "").toLowerCase() !== String(payment.currency || "").toLowerCase()) {
    throw new Error("Stripe bank transfer currency mismatch.");
  }
  await db.prepare(
    `UPDATE payments
       SET status = 'paid', amount_received_jpy = ?, amount_remaining_jpy = 0,
           stripe_event_id = ?, paid_at = COALESCE(paid_at, ?), updated_at = ?
       WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe'`
  ).bind(Number(paymentIntent.amount_received || paymentIntent.amount || 0), stripeEventId || null, now, now, paymentIntent.id).run();
  await db.prepare(
    `UPDATE applications
       SET payment_status = 'paid', status = 'confirmed', attendance_status = 'confirmed',
           paid_at = COALESCE(paid_at, ?), updated_at = ?
       WHERE id = ?`
  ).bind(now, now, payment.application_id).run();
  await audit(db, {
    actor: "stripe",
    action: "payment.bank_transfer_succeeded",
    target_type: "application",
    target_id: payment.application_id,
    details_json: JSON.stringify({ payment_intent_id: paymentIntent.id })
  });
  return { application_id: payment.application_id };
}
__name(markBankTransferPaymentSucceeded, "markBankTransferPaymentSucceeded");
async function markPartialPaymentEmailSent(db, paymentIntentId) {
  const now = nowIso();
  await db.prepare(
    `UPDATE payments
       SET partial_payment_email_sent_at = ?, updated_at = ?
       WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe'`
  ).bind(now, now, paymentIntentId).run();
}
__name(markPartialPaymentEmailSent, "markPartialPaymentEmailSent");
async function getApplicationById(db, applicationId) {
  const application = await db.prepare(
    `SELECT
        a.id, a.application_code, a.member_id, a.full_name, a.full_name_kana, a.email, a.phone,
        a.quantity, a.companion_count, a.ticket_type, a.fee_period, a.reception_attendance,
        a.payment_status, a.payment_method, a.payment_provider, a.external_payment_id,
        a.expected_transfer_name, a.actual_transfer_name, a.admin_note, a.total_amount_jpy,
        a.status, a.attendance_status, a.created_at, a.updated_at, a.paid_at, a.cancelled_at, a.refunded_at,
        a.application_received_email_sent_at,
        (SELECT COUNT(*) FROM companions c WHERE c.application_id = a.id AND c.attendee_type = 'adult') AS adult_companion_count
       FROM applications a
       WHERE a.id = ? OR a.application_code = ?
       LIMIT 1`
  ).bind(applicationId, applicationId).first();
  if (!application) return null;
  application.dance_ticket_benefit = danceTicketBenefit(application.ticket_type);
  application.companion_dance_ticket_benefit = companionDanceTicketBenefit(application.ticket_type, application.adult_companion_count);
  return application;
}
__name(getApplicationById, "getApplicationById");
async function hydrateApplicationLineItems(db, application) {
  if (!application) return null;
  const result = await db.prepare(
    `SELECT item_type, label, quantity, unit_amount_jpy, amount_jpy, metadata_json
       FROM payment_line_items
       WHERE application_id = ?
       ORDER BY created_at, id`
  ).bind(application.id).all();
  application.line_items = (result.results || []).map((item) => ({
    ...item,
    metadata: item.metadata_json ? JSON.parse(item.metadata_json) : {}
  }));
  application.amount_total = application.total_amount_jpy;
  return application;
}
__name(hydrateApplicationLineItems, "hydrateApplicationLineItems");
async function updateApplicationPaymentStatus(db, applicationId, update, requestMeta = {}) {
  const nextStatus = normalizePaymentStatus(update.payment_status || update.paymentStatus);
  const now = nowIso();
  const current = await getApplicationById(db, applicationId);
  if (!current) return null;
  const paidAt = nextStatus === "paid" ? now : current.paid_at || null;
  const cancelledAt = nextStatus === "cancelled" ? now : current.cancelled_at || null;
  const refundedAt = nextStatus === "refunded" ? now : current.refunded_at || null;
  const applicationStatus = applicationStatusForPayment(nextStatus);
  const attendanceStatus = nextStatus === "paid" ? "confirmed" : current.attendance_status || "pending";
  const actualTransferName = update.actual_transfer_name || update.actualTransferName || current.actual_transfer_name || null;
  const externalPaymentId = update.external_payment_id || update.externalPaymentId || current.external_payment_id || null;
  const adminNote = update.admin_note || update.adminNote || current.admin_note || null;
  await db.prepare(
    `UPDATE applications
       SET payment_status = ?, status = ?, attendance_status = ?, actual_transfer_name = ?,
           external_payment_id = ?, admin_note = ?, paid_at = ?, cancelled_at = ?, refunded_at = ?, updated_at = ?
       WHERE id = ?`
  ).bind(
    nextStatus,
    applicationStatus,
    attendanceStatus,
    actualTransferName,
    externalPaymentId,
    adminNote,
    paidAt,
    cancelledAt,
    refundedAt,
    now,
    current.id
  ).run();
  await db.prepare(
    `UPDATE payments
       SET status = ?, actual_transfer_name = ?, external_payment_id = ?, paid_at = ?, cancelled_at = ?, refunded_at = ?, updated_at = ?
       WHERE application_id = ? AND payment_provider = 'manual'`
  ).bind(nextStatus, actualTransferName, externalPaymentId, paidAt, cancelledAt, refundedAt, now, current.id).run();
  await audit(db, {
    actor: update.actor || "admin",
    action: `payment.${nextStatus}`,
    target_type: "application",
    target_id: current.id,
    details_json: JSON.stringify({
      application_code: current.application_code,
      payment_status: nextStatus,
      external_payment_id: externalPaymentId ? "set" : "empty"
    }),
    ...requestMeta
  });
  return getApplicationById(db, current.id);
}
__name(updateApplicationPaymentStatus, "updateApplicationPaymentStatus");
function normalizePaymentStatus(status) {
  if (!PAYMENT_STATUSES.includes(status)) throw new Error("Invalid payment status.");
  return status;
}
__name(normalizePaymentStatus, "normalizePaymentStatus");
function applicationStatusForPayment(paymentStatus) {
  if (paymentStatus === "paid") return "confirmed";
  if (paymentStatus === "cancelled") return "cancelled";
  if (paymentStatus === "refunded") return "refunded";
  return "pending";
}
__name(applicationStatusForPayment, "applicationStatusForPayment");
async function listApplications(db) {
  const result = await db.prepare(
    `SELECT
        a.id, a.application_code, a.full_name, a.full_name_kana, a.email, a.phone,
        a.family_name, a.given_name, a.family_name_kana, a.given_name_kana,
        a.graduation_year, a.school_lineage, a.postal_code, a.address,
        a.prefecture, a.city, a.street_address, a.building,
        a.ticket_type, a.fee_period, a.reception_attendance, a.companion_count, a.match_status,
        a.quantity, a.expected_transfer_name, a.actual_transfer_name,
        a.match_confidence, a.status, a.payment_status, a.payment_method, a.payment_provider, a.external_payment_id,
        a.admin_note, a.attendance_status, a.total_amount_jpy, a.created_at, a.updated_at, a.paid_at, a.cancelled_at, a.refunded_at,
        a.application_received_email_sent_at,
        m.member_code, m.full_name AS matched_member_name,
        p.stripe_checkout_session_id, p.stripe_payment_intent_id, p.stripe_customer_id, p.stripe_event_id,
        p.status AS latest_payment_status, p.amount_total,
        p.amount_received_jpy, p.amount_remaining_jpy, p.partial_payment_at, p.partial_payment_email_sent_at,
        p.instructions_email_sent_at, p.payment_confirmed_email_sent_at,
        p.unreconciled_amount_jpy, p.cash_balance_attention_at, p.cash_balance_alert_email_sent_at,
        p.payment_method AS latest_payment_method, p.payment_provider AS latest_payment_provider,
        (
          SELECT COALESCE(SUM(
            CASE
              WHEN c.attendee_type = 'preschool' THEN 0
              WHEN c.attendee_type = 'child' THEN
                CASE WHEN COALESCE(c.reception_attendance, a.reception_attendance) = 'without_reception' THEN 1000 ELSE 3000 END
              ELSE
                CASE WHEN COALESCE(c.reception_attendance, a.reception_attendance) = 'without_reception' THEN 6000 ELSE 8000 END
            END
          ), 0)
          FROM companions c
          WHERE c.application_id = a.id
        ) AS companion_fee_total,
        (
          SELECT GROUP_CONCAT(
            c.full_name || '（' || CASE WHEN COALESCE(c.reception_attendance, a.reception_attendance) = 'attending' THEN '懇親会参加' ELSE '懇親会不参加' END || '）',
            ' / '
          )
          FROM companions c
          WHERE c.application_id = a.id
        ) AS companion_summary
       FROM applications a
       LEFT JOIN members m ON m.id = a.member_id
       LEFT JOIN payments p ON p.id = (
        SELECT id FROM payments
        WHERE application_id = a.id
        ORDER BY created_at DESC
        LIMIT 1
       )
       ORDER BY a.created_at DESC
       LIMIT 500`
  ).all();
  return (result.results || []).map((row) => ({
    ...row,
    applicationId: row.application_code,
    name: row.full_name,
    quantity: row.quantity || 1 + Number(row.companion_count || 0),
    amount: row.total_amount_jpy ?? row.amount_total ?? expectedApplicationAmount(row),
    paymentMethod: row.payment_method || row.latest_payment_method || "stripe_checkout",
    paymentProvider: row.payment_provider || row.latest_payment_provider || "stripe",
    paymentStatus: row.payment_status,
    externalPaymentId: row.external_payment_id || "",
    expectedTransferName: row.expected_transfer_name || "",
    actualTransferName: row.actual_transfer_name || "",
    adminNote: row.admin_note || "",
    paidAt: row.paid_at || "",
    amount_total: row.amount_total ?? row.total_amount_jpy ?? expectedApplicationAmount(row)
  }));
}
__name(listApplications, "listApplications");
async function listBankTransferAlerts(db) {
  const result = await db.prepare(
    `SELECT id, stripe_payment_intent_id, stripe_customer_id, amount_total_jpy,
            amount_received_jpy, amount_remaining_jpy, status, application_id,
            applicant_email, applicant_name, hosted_instructions_url, expires_at, created_at, updated_at
       FROM bank_transfer_previews
       WHERE status IN ('funds_received_before_confirmation', 'paid_before_confirmation', 'unreconciled_funds_received')
          OR (status IN ('confirming', 'application_created') AND expires_at < ?)
       ORDER BY updated_at DESC
       LIMIT 100`
  ).bind(nowIso()).all();
  return result.results || [];
}
__name(listBankTransferAlerts, "listBankTransferAlerts");
async function getAdminParticipationSummary(db) {
  const row = await db.prepare(
    `WITH attendee_applications AS (
       SELECT
         id, ticket_type, school_lineage, graduation_year, reception_attendance, payment_status
       FROM applications
       WHERE COALESCE(payment_status, 'unpaid') NOT IN ('cancelled', 'refunded')
         AND ticket_type NOT LIKE 'absent_donation_%'
     ),
     companion_counts AS (
       SELECT
         c.application_id,
         COUNT(*) AS companion_count,
         SUM(CASE WHEN c.attendee_type = 'adult' THEN 1 ELSE 0 END) AS adult_companion_count,
         SUM(CASE WHEN c.attendee_type IN ('child', 'preschool') THEN 1 ELSE 0 END) AS child_companion_count,
         SUM(CASE WHEN c.reception_attendance = 'attending' THEN 1 ELSE 0 END) AS companion_reception_count,
         SUM(CASE WHEN c.attendee_type = 'adult' AND c.reception_attendance = 'attending' THEN 1 ELSE 0 END) AS adult_companion_reception_count,
         SUM(CASE WHEN c.attendee_type IN ('child', 'preschool') AND c.reception_attendance = 'attending' THEN 1 ELSE 0 END) AS child_companion_reception_count
       FROM companions c
       INNER JOIN attendee_applications a ON a.id = c.application_id
       GROUP BY c.application_id
     ),
     participation AS (
       SELECT
         a.*,
         COALESCE(c.companion_count, 0) AS companion_count,
         COALESCE(c.adult_companion_count, 0) AS adult_companion_count,
         COALESCE(c.child_companion_count, 0) AS child_companion_count,
         COALESCE(c.companion_reception_count, 0) AS companion_reception_count,
         COALESCE(c.adult_companion_reception_count, 0) AS adult_companion_reception_count,
         COALESCE(c.child_companion_reception_count, 0) AS child_companion_reception_count
       FROM attendee_applications a
       LEFT JOIN companion_counts c ON c.application_id = a.id
     )
     SELECT
       COUNT(*) AS application_count,
       COALESCE(SUM(1 + companion_count), 0) AS festa_attendee_count,
       COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 + companion_count ELSE 0 END), 0) AS confirmed_festa_attendee_count,
       COALESCE(SUM(companion_count), 0) AS companion_count,
       COALESCE(SUM(CASE WHEN reception_attendance = 'attending' THEN 1 ELSE 0 END + companion_reception_count), 0) AS reception_attendee_count,
       COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN CASE WHEN reception_attendance = 'attending' THEN 1 ELSE 0 END + companion_reception_count ELSE 0 END), 0) AS confirmed_reception_attendee_count,
       COALESCE(SUM(CASE WHEN reception_attendance = 'without_reception' THEN 1 ELSE 0 END + companion_count - companion_reception_count), 0) AS reception_non_attendee_count,
       COALESCE(SUM(CASE WHEN ticket_type = 'current_student' THEN 0 ELSE 1 END), 0) AS obog_applicant_count,
       COALESCE(SUM(CASE WHEN ticket_type = 'current_student' THEN 1 ELSE 0 END), 0) AS current_student_applicant_count,
       COALESCE(SUM(adult_companion_count), 0) AS adult_companion_count,
       COALESCE(SUM(child_companion_count), 0) AS child_companion_count,
       COALESCE(SUM(CASE WHEN reception_attendance = 'attending' AND ticket_type <> 'current_student' THEN 1 ELSE 0 END), 0) AS obog_reception_count,
       COALESCE(SUM(CASE WHEN reception_attendance = 'attending' AND ticket_type = 'current_student' THEN 1 ELSE 0 END), 0) AS current_student_reception_count,
       COALESCE(SUM(adult_companion_reception_count), 0) AS adult_companion_reception_count,
       COALESCE(SUM(child_companion_reception_count), 0) AS child_companion_reception_count,
       COALESCE(SUM(CASE WHEN ticket_type <> 'current_student' AND school_lineage <> 'gakushuin_ouyukai' AND graduation_year <= ${OBOG_11_OVER_GRADUATION_YEAR_TO} THEN 1 ELSE 0 END), 0) AS cohort_eleven_over_count,
       COALESCE(SUM(CASE WHEN ticket_type <> 'current_student' AND school_lineage <> 'gakushuin_ouyukai' AND graduation_year BETWEEN ${OBOG_6_10_GRADUATION_YEAR_FROM} AND ${OBOG_6_10_GRADUATION_YEAR_TO} THEN 1 ELSE 0 END), 0) AS cohort_six_ten_count,
       COALESCE(SUM(CASE WHEN ticket_type <> 'current_student' AND school_lineage <> 'gakushuin_ouyukai' AND graduation_year BETWEEN ${OBOG_5_UNDER_GRADUATION_YEAR_FROM} AND ${OBOG_5_UNDER_GRADUATION_YEAR_TO} THEN 1 ELSE 0 END), 0) AS cohort_five_under_count,
       COALESCE(SUM(CASE WHEN ticket_type <> 'current_student' AND school_lineage = 'gakushuin_ouyukai' THEN 1 ELSE 0 END), 0) AS cohort_gakushuin_count,
       COALESCE(SUM(CASE WHEN ticket_type = 'current_student' THEN 1 ELSE 0 END), 0) AS cohort_current_student_count,
       COALESCE(SUM(CASE WHEN ticket_type <> 'current_student' AND (school_lineage IS NULL OR (school_lineage <> 'gakushuin_ouyukai' AND graduation_year IS NULL)) THEN 1 ELSE 0 END), 0) AS cohort_unknown_count
     FROM participation`
  ).first();
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, Number(value || 0)]));
}
__name(getAdminParticipationSummary, "getAdminParticipationSummary");
function expectedApplicationAmount(row) {
  if (row.companion_fee_total > 0 || row.companion_count === 0) {
    return ticketAmount(row.ticket_type, [], row.fee_period, row.reception_attendance) + Number(row.companion_fee_total || 0);
  }
  return ticketAmount(row.ticket_type, row.companion_count, row.fee_period, row.reception_attendance);
}
__name(expectedApplicationAmount, "expectedApplicationAmount");
async function audit(db, item) {
  await db.prepare(
    `INSERT INTO audit_logs (
        id, actor, action, target_type, target_id, details_json, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    newId("aud"),
    item.actor || null,
    item.action,
    item.target_type || null,
    item.target_id || null,
    item.details_json || null,
    item.ip_address || null,
    item.user_agent || null,
    nowIso()
  ).run();
}
__name(audit, "audit");
function numberOrNull(value) {
  if (value === void 0 || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
__name(numberOrNull, "numberOrNull");

// api/festa60/_lib/email.js
function renderBankTransferInstructionsEmail(application, hostedInstructionsUrl) {
  const name = application.full_name || application.name || "";
  return {
    to: application.email,
    subject: "【60周年FESTA】銀行振込先・お支払い手順のご案内",
    body: `${name} 様

60周年FESTAのお支払い方法として銀行振込を受け付けました。
現時点では未入金のため、参加はまだ確定していません。

受付番号：${application.application_code || application.applicationId}
お支払い予定額：${formatYen(application.amount_total || application.total_amount_jpy)}

振込先口座と支払期限は、次の案内ページでご確認ください。
${hostedInstructionsUrl}

FESTAの受付番号を振込名義へ付ける必要はありません。案内ページの内容に従ってお振り込みください。
入金確認後に、FESTA事務局から参加確定メールをお送りします。`
  };
}
__name(renderBankTransferInstructionsEmail, "renderBankTransferInstructionsEmail");
function renderPartialPaymentEmail(application, partialPayment) {
  const name = application.full_name || application.name || "";
  return {
    to: application.email,
    subject: "【60周年FESTA】銀行振込額が不足しています",
    body: `${name} 様

60周年FESTAのお支払いについて、銀行振込を確認しましたが、お支払い予定額に達していません。

受付番号：${application.application_code || application.applicationId}
お支払い予定額：${formatYen(partialPayment.amount_total_jpy)}
確認済み入金額：${formatYen(partialPayment.amount_received_jpy)}
不足額：${formatYen(partialPayment.amount_remaining_jpy)}

不足額を、前回と同じ指定口座へお振り込みください。
振込先と現在のお支払い状況は、次の案内ページでご確認いただけます。
${partialPayment.hosted_instructions_url}

FESTAの受付番号を振込名義へ付ける必要はありません。案内ページの内容に従ってお振り込みください。
全額の入金確認後に、FESTA事務局から参加確定メールをお送りします。`
  };
}
__name(renderPartialPaymentEmail, "renderPartialPaymentEmail");
function renderBankFundsBeforeConfirmationEmail(preview, fullyPaid = false) {
  return {
    to: preview.applicant_email,
    subject: fullyPaid
      ? "【60周年FESTA】銀行振込を確認しました（申込確定が必要です）"
      : "【60周年FESTA】銀行振込の一部入金を確認しました（申込確定が必要です）",
    body: `${preview.applicant_name || "お申込者"} 様

60周年FESTAのお支払い用口座への${fullyPaid ? "入金" : "一部入金"}を確認しましたが、申込の最終確定が完了していません。

お支払い予定額：${formatYen(preview.amount_total_jpy)}
確認済み入金額：${formatYen(preview.amount_received_jpy)}${fullyPaid ? "" : `
不足額：${formatYen(preview.amount_remaining_jpy)}`}

振込先を表示した申込画面が開いている場合は、「この銀行振込で申込を確定する」を押してください。
画面を閉じた場合や確定できない場合は、このメールへ返信し、お名前と振込日をFESTA事務局へお知らせください。

申込が確定して受付番号が発行されるまでは、参加確定とはなりません。`
  };
}
__name(renderBankFundsBeforeConfirmationEmail, "renderBankFundsBeforeConfirmationEmail");
function renderPaymentConfirmedEmail(application) {
  const name = application.full_name || application.name || "";
  const quantity = application.quantity || 1;
  const paidAt = application.paid_at || application.paidAt || "\u5165\u91D1\u78BA\u8A8D\u65E5\u672A\u8A2D\u5B9A";
  const isAbsentDonation = String(application.ticket_type || "").startsWith("absent_donation_");
  const donationPlan = donationPlanDetails(application.ticket_type);
  if (isAbsentDonation) {
    return {
      to: application.email,
      subject: "\u301060\u5468\u5E74FESTA\u3011\u3054\u5165\u91D1\u78BA\u8A8D\u30FB\u5BC4\u4ED8\u53D7\u4ED8\u5B8C\u4E86\u306E\u304A\u77E5\u3089\u305B",
      body: `${name} \u69D8

60\u5468\u5E74FESTA\u3078\u306E\u5BC4\u4ED8\u306E\u3054\u5165\u91D1\u3092\u78BA\u8A8D\u3044\u305F\u3057\u307E\u3057\u305F\u3002

\u53D7\u4ED8\u756A\u53F7\uFF1A${application.application_code || application.applicationId}
\u304A\u7533\u8FBC\u8005\u540D\uFF1A${name}
\u5BC4\u4ED8\u30D7\u30E9\u30F3\uFF1A${donationPlan?.name || ""}
\u8FD4\u793C\u5185\u5BB9\uFF1A${donationPlan?.description || ""}
\u5165\u91D1\u78BA\u8A8D\u65E5\uFF1A${paidAt}

\u304A\u652F\u6255\u3044\u5F8C\u306E\u30AD\u30E3\u30F3\u30BB\u30EB\u306B\u4F34\u3046\u8FD4\u91D1\u306F\u3001\u539F\u5247\u3068\u3057\u3066\u884C\u3044\u307E\u305B\u3093\u3002

\u6E29\u304B\u3044\u3054\u652F\u63F4\u3092\u3044\u305F\u3060\u304D\u3001\u8AA0\u306B\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002`
    };
  }
  return {
    to: application.email,
    subject: "\u301060\u5468\u5E74FESTA\u3011\u3054\u5165\u91D1\u78BA\u8A8D\u30FB\u53C2\u52A0\u78BA\u5B9A\u306E\u304A\u77E5\u3089\u305B",
    body: `${name} \u69D8

60\u5468\u5E74FESTA\u3078\u306E\u3054\u5165\u91D1\u3092\u78BA\u8A8D\u3044\u305F\u3057\u307E\u3057\u305F\u3002
\u4EE5\u4E0B\u306E\u5185\u5BB9\u3067\u53C2\u52A0\u78BA\u5B9A\u3068\u306A\u308A\u307E\u3059\u3002

\u53D7\u4ED8\u756A\u53F7\uFF1A${application.application_code || application.applicationId}
\u304A\u7533\u8FBC\u8005\u540D\uFF1A${name}
\u53C2\u52A0\u4EBA\u6570\uFF1A${quantity}\u540D
\u5165\u91D1\u78BA\u8A8D\u65E5\uFF1A${paidAt}
\u30C0\u30F3\u30B9\u30BF\u30A4\u30E0\u30C1\u30B1\u30C3\u30C8\uFF1A${danceTicketDescription(application.ticket_type)}
\u540C\u4F34\u8005\u5411\u3051\u30C1\u30B1\u30C3\u30C8\uFF1A${companionDanceTicketDescription(application)}
${donationPlan ? `\u5BC4\u4ED8\u30D7\u30E9\u30F3\uFF1A${donationPlan.name}
\u8FD4\u793C\u5185\u5BB9\uFF1A${donationPlan.description}` : ""}

\u5F53\u65E5\u306F\u53D7\u4ED8\u306B\u3066\u3001\u53D7\u4ED8\u756A\u53F7\u307E\u305F\u306F\u304A\u540D\u524D\u3092\u304A\u4F1D\u3048\u304F\u3060\u3055\u3044\u3002

\u304A\u652F\u6255\u3044\u5F8C\u306E\u30AD\u30E3\u30F3\u30BB\u30EB\u306B\u4F34\u3046\u8FD4\u91D1\u306F\u3001\u539F\u5247\u3068\u3057\u3066\u884C\u3044\u307E\u305B\u3093\u3002
\u4E3B\u50AC\u8005\u90FD\u5408\u306B\u3088\u308B\u958B\u50AC\u4E2D\u6B62\u306A\u3069\u3001\u4E8B\u52D9\u5C40\u304C\u5FC5\u8981\u3068\u5224\u65AD\u3057\u305F\u5834\u5408\u306F\u500B\u5225\u306B\u3054\u6848\u5185\u3057\u307E\u3059\u3002

\u3054\u53C2\u52A0\u3092\u5FC3\u3088\u308A\u304A\u5F85\u3061\u3057\u3066\u304A\u308A\u307E\u3059\u3002`
  };
}
__name(renderPaymentConfirmedEmail, "renderPaymentConfirmedEmail");
async function paymentEmailSentAt(db, applicationId, kind) {
  const column = kind === "instructions" ? "instructions_email_sent_at" : kind === "partial" ? "partial_payment_email_sent_at" : "payment_confirmed_email_sent_at";
  const payment = await db.prepare(`SELECT ${column} AS sent_at FROM payments WHERE application_id = ? ORDER BY created_at DESC LIMIT 1`).bind(applicationId).first();
  return payment?.sent_at || null;
}
__name(paymentEmailSentAt, "paymentEmailSentAt");
async function markPaymentEmailSent(db, applicationId, kind) {
  const column = kind === "instructions" ? "instructions_email_sent_at" : kind === "partial" ? "partial_payment_email_sent_at" : "payment_confirmed_email_sent_at";
  await db.prepare(`UPDATE payments SET ${column} = COALESCE(${column}, ?), updated_at = ? WHERE application_id = ?`).bind(nowIso(), nowIso(), applicationId).run();
}
__name(markPaymentEmailSent, "markPaymentEmailSent");
async function sendPaymentEmailOnce(env, db, application, kind, message) {
  if (await paymentEmailSentAt(db, application.id, kind)) return { sent: false, skipped: true, reason: "already_sent" };
  const result = await maybeSendEmail(env, {
    ...message,
    message_id: `festa60-${kind}-${application.id}`
  });
  if (!result.sent) throw new Error(`${kind} email was not sent: ${result.error || result.reason || "unknown error"}`);
  await markPaymentEmailSent(db, application.id, kind);
  return result;
}
__name(sendPaymentEmailOnce, "sendPaymentEmailOnce");
async function maybeSendEmail(env, message) {
  if (!env.EMAIL_WEBHOOK_URL) {
    return { sent: false, skipped: true, reason: "EMAIL_WEBHOOK_URL is not configured." };
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
      sender_name: env.EMAIL_SENDER_NAME || "FANTASISTA 60\u5468\u5E74FESTA\u4E8B\u52D9\u5C40",
      reply_to: env.CONTACT_EMAIL || ""
    })
  });
  const location = response.headers.get("location");
  if (!location && !response.ok) {
    return { sent: false, skipped: false, error: `Email provider returned HTTP ${response.status}` };
  }
  const result = location ? await readAppsScriptEmailResult(location) : await response.json().catch(() => null);
  if (!result || result.ok !== true) {
    return { sent: false, skipped: false, error: result?.error || "Email provider rejected the request." };
  }
  return { sent: true, skipped: false };
}
__name(maybeSendEmail, "maybeSendEmail");
async function readAppsScriptEmailResult(location) {
  const retryDelays = [0, 400, 1e3, 2e3];
  for (const delay of retryDelays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const response = await fetch(location, { headers: { accept: "application/json" } });
    if (!response.ok) continue;
    const result = await response.json().catch(() => null);
    if (result) return result;
  }
  return null;
}
__name(readAppsScriptEmailResult, "readAppsScriptEmailResult");
function formatYen(value) {
  return `${Number(value || 0).toLocaleString("ja-JP")}\u5186`;
}
__name(formatYen, "formatYen");
function danceTicketDescription(ticketType) {
  const benefit = danceTicketBenefit(ticketType);
  if (!benefit.count) return "\u914D\u5E03\u306A\u3057";
  return `${benefit.unit_amount_jpy.toLocaleString("ja-JP")}\u5186\u5238\xD7${benefit.count}\u679A\uFF08${benefit.total_amount_jpy.toLocaleString("ja-JP")}\u5186\u76F8\u5F53\uFF09`;
}
__name(danceTicketDescription, "danceTicketDescription");
function companionDanceTicketDescription(application) {
  const benefit = application.companion_dance_ticket_benefit || { count: 0, unit_amount_jpy: 0, total_amount_jpy: 0 };
  if (!benefit.count) return "配布なし";
  return `${Number(benefit.unit_amount_jpy).toLocaleString("ja-JP")}円券×${benefit.count}枚（${Number(benefit.total_amount_jpy).toLocaleString("ja-JP")}円相当）`;
}
__name(companionDanceTicketDescription, "companionDanceTicketDescription");
// api/festa60/admin/applications/[id].js
async function onRequestPatch({ request, env, params }) {
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
        actor: auth.actor
      },
      getClientMeta(request)
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
      confirmation_email: confirmationEmail ? {
        sent: Boolean(emailDelivery?.sent),
        skipped: emailDelivery ? emailDelivery.skipped : true,
        reason: emailDelivery?.reason || null,
        subject: confirmationEmail.subject,
        body: confirmationEmail.body
      } : null
    });
  } catch (error) {
    if (String(error?.message || "").startsWith("Invalid payment status")) {
      return badRequest("Invalid payment status.");
    }
    return serverError(error);
  }
}
__name(onRequestPatch, "onRequestPatch");
async function onRequestPost(context) {
  return onRequestPatch(context);
}
__name(onRequestPost, "onRequestPost");
async function onRequestGet() {
  return methodNotAllowed();
}
__name(onRequestGet, "onRequestGet");

// api/festa60/admin/applications.js
async function onRequestGet2({ request, env }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;
  try {
    const db = requireDb(env);
    const [rows, summary, bankTransferAlerts] = await Promise.all([
      listApplications(db),
      getAdminParticipationSummary(db),
      listBankTransferAlerts(db)
    ]);
    return json({ ok: true, actor: auth.actor, applications: rows, participation_summary: summary, bank_transfer_alerts: bankTransferAlerts });
  } catch (error) {
    return serverError(error);
  }
}
__name(onRequestGet2, "onRequestGet");
async function onRequestPost2() {
  return methodNotAllowed();
}
__name(onRequestPost2, "onRequestPost");

// api/festa60/_lib/csv.js
function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }
    value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((cells) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (cells[index] || "").trim();
    });
    return item;
  });
}
__name(parseCsv, "parseCsv");
function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}
__name(toCsv, "toCsv");
function escapeCsv(value) {
  const stringValue = String(value);
  if (!/[",\n\r]/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
}
__name(escapeCsv, "escapeCsv");
function normalizeHeader(header) {
  const map = {
    "\u6C0F\u540D": "full_name",
    "\u3075\u308A\u304C\u306A": "full_name_kana",
    "\u65E7\u59D3": "maiden_name",
    "\u30E1\u30FC\u30EB": "email",
    "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9": "email",
    "\u96FB\u8A71": "phone",
    "\u96FB\u8A71\u756A\u53F7": "phone",
    "\u5352\u90E8\u5E74\u5EA6": "graduation_year",
    "\u671F": "generation",
    "\u6240\u5C5E": "school_lineage",
    "\u6240\u5C5E\u6821": "school_lineage",
    "\u5F79\u5272": "dance_role"
  };
  const trimmed = header.trim();
  return map[trimmed] || trimmed.replace(/^\uFEFF/, "").trim();
}
__name(normalizeHeader, "normalizeHeader");

// api/festa60/admin/export.js
async function onRequestGet3({ request, env }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;
  try {
    const rows = await listApplications(requireDb(env));
    return text(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="festa60-applications.csv"`
      }
    });
  } catch (error) {
    return serverError(error);
  }
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost3() {
  return methodNotAllowed();
}
__name(onRequestPost3, "onRequestPost");

// api/festa60/admin/import.js
async function onRequestPost4({ request, env }) {
  const auth = assertAdmin(request, env);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (!body.csv) return badRequest("csv is required.");
    const rows = parseCsv(body.csv);
    const db = requireDb(env);
    const batchId = newId("imp");
    const now = nowIso();
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    await db.prepare(
      `INSERT INTO import_batches (
          id, file_name, imported_by, environment, row_count, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(batchId, body.file_name || "uploaded-members.csv", adminActor(request, env), environmentName(env), rows.length, "running", now).run();
    for (const row of rows) {
      try {
        if (!row.full_name) {
          errors += 1;
          continue;
        }
        const memberId = row.id || newId("mem");
        const existing = row.email ? await db.prepare("SELECT id FROM members WHERE lower(email) = lower(?) LIMIT 1").bind(row.email).first() : null;
        if (existing) {
          await db.prepare(
            `UPDATE members
               SET full_name = ?, full_name_kana = ?, maiden_name = ?, phone = ?,
                   graduation_year = ?, generation = ?, school_lineage = ?, dance_role = ?,
                   source_batch_id = ?, updated_at = ?
               WHERE id = ?`
          ).bind(
            row.full_name,
            row.full_name_kana || null,
            row.maiden_name || null,
            row.phone || null,
            numberOrNull2(row.graduation_year),
            row.generation || null,
            row.school_lineage || null,
            row.dance_role || null,
            batchId,
            nowIso(),
            existing.id
          ).run();
          updated += 1;
        } else {
          await db.prepare(
            `INSERT INTO members (
                id, member_code, full_name, full_name_kana, maiden_name, email, phone,
                graduation_year, generation, school_lineage, dance_role, source_batch_id,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            memberId,
            row.member_code || null,
            row.full_name,
            row.full_name_kana || null,
            row.maiden_name || null,
            row.email || null,
            row.phone || null,
            numberOrNull2(row.graduation_year),
            row.generation || null,
            row.school_lineage || null,
            row.dance_role || null,
            batchId,
            nowIso(),
            nowIso()
          ).run();
          inserted += 1;
        }
      } catch (error) {
        console.error(error);
        errors += 1;
      }
    }
    await db.prepare(
      `UPDATE import_batches
         SET inserted_count = ?, updated_count = ?, error_count = ?, status = ?, completed_at = ?
         WHERE id = ?`
    ).bind(inserted, updated, errors, errors ? "completed_with_errors" : "completed", nowIso(), batchId).run();
    await audit(db, {
      actor: auth.actor,
      action: "members.imported",
      target_type: "import_batch",
      target_id: batchId,
      details_json: JSON.stringify({ row_count: rows.length, inserted, updated, errors }),
      ...getClientMeta(request)
    });
    return json({ ok: true, batch_id: batchId, row_count: rows.length, inserted, updated, errors });
  } catch (error) {
    return serverError(error);
  }
}
__name(onRequestPost4, "onRequestPost");
async function onRequestGet4() {
  return methodNotAllowed();
}
__name(onRequestGet4, "onRequestGet");
function numberOrNull2(value) {
  if (value === void 0 || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
__name(numberOrNull2, "numberOrNull");

// api/festa60/_lib/stripe.js
async function createStripeCustomer(stripeSecret, application) {
  const params = new URLSearchParams();
  params.set("email", application.email);
  params.set("name", application.full_name || "");
  params.set("metadata[application_id]", application.id);
  params.set("metadata[application_code]", application.application_code);
  const response = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeSecret}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": `festa60-customer-${application.id}`
    },
    body: params
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe Customer creation failed: ${result.error?.message || response.status}`);
  }
  return result;
}
__name(createStripeCustomer, "createStripeCustomer");
async function createCheckoutSession({ env, application, request, baseUrl }) {
  const stripeSecret = requireStripeSecret(env);
  const customer = await createStripeCustomer(stripeSecret, application);
  const metadata = {
    application_id: application.id,
    member_id: application.member_id || "",
    ticket_type: application.ticket_type
  };
  const params = new URLSearchParams();
  params.set("mode", "payment");
  // Bank transfer is handled by the site's two-step confirmation flow.
  // Other enabled and eligible methods are presented by Checkout.
  params.set("excluded_payment_method_types[0]", "customer_balance");
  params.set("locale", "ja");
  params.set("submit_type", "pay");
  const staffQuery = isStaffTicketType(splitTicketType(application.ticket_type).base_ticket_type) ? "staff=1&" : "";
  params.set("success_url", `${baseUrl}/festa60-register/?${staffQuery}checkout=success&application=${application.application_code}`);
  params.set("cancel_url", `${baseUrl}/festa60-register/?${staffQuery}checkout=cancelled&application=${application.application_code}`);
  params.set("client_reference_id", application.id);
  params.set("customer", customer.id);
  params.set("metadata[application_id]", metadata.application_id);
  params.set("metadata[member_id]", metadata.member_id);
  params.set("metadata[ticket_type]", metadata.ticket_type);
  params.set("payment_intent_data[metadata][application_id]", metadata.application_id);
  params.set("payment_intent_data[metadata][application_code]", application.application_code);
  params.set("payment_intent_data[receipt_email]", application.email);
  const lineItems = (application.line_items || []).filter((item) => Number(item.amount_jpy || 0) > 0).slice(0, 20);
  if (!lineItems.length) {
    throw new Error("Stripe Checkout requires at least one positive payment line item.");
  }
  lineItems.forEach((item, index) => {
    params.set(`line_items[${index}][quantity]`, String(item.quantity || 1));
    params.set(`line_items[${index}][price_data][currency]`, "jpy");
    params.set(`line_items[${index}][price_data][product_data][name]`, item.label || ticketLabel(application.ticket_type));
    if (item.metadata?.benefits_summary) {
      params.set(`line_items[${index}][price_data][product_data][description]`, String(item.metadata.benefits_summary).slice(0, 500));
    }
    params.set(`line_items[${index}][price_data][unit_amount]`, String(item.unit_amount_jpy || item.amount_jpy));
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeSecret}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": `festa60-${application.id}`
    },
    body: params
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe Checkout session failed: ${result.error?.message || response.status}`);
  }
  return { session: result, metadata };
}
__name(createCheckoutSession, "createCheckoutSession");
async function retrieveStripeCheckoutSession(stripeSecret, sessionId) {
  if (!sessionId) return null;
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { authorization: `Bearer ${stripeSecret}` }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Stripe Checkout session retrieval failed: ${result.error?.message || response.status}`);
  return result;
}
__name(retrieveStripeCheckoutSession, "retrieveStripeCheckoutSession");
async function createBankTransferPreviewCustomer(stripeSecret, payload, previewId) {
  const params = new URLSearchParams();
  params.set("email", payload.email);
  params.set("name", payload.full_name || "");
  params.set("metadata[festa60_bank_preview_id]", previewId);
  const response = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeSecret}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": `festa60-bank-preview-customer-${previewId}`
    },
    body: params
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe bank transfer customer creation failed: ${result.error?.message || response.status}`);
  }
  return result;
}
__name(createBankTransferPreviewCustomer, "createBankTransferPreviewCustomer");
async function createBankTransferPreview({ env, payload, amount }) {
  const stripeSecret = requireStripeSecret(env);
  const previewId = crypto.randomUUID();
  const customer = await createBankTransferPreviewCustomer(stripeSecret, payload, previewId);
  const params = new URLSearchParams();
  params.set("amount", String(amount));
  params.set("currency", "jpy");
  params.set("customer", customer.id);
  params.set("confirm", "true");
  params.set("payment_method_types[0]", "customer_balance");
  params.set("payment_method_options[customer_balance][funding_type]", "bank_transfer");
  params.set("payment_method_options[customer_balance][bank_transfer][type]", "jp_bank_transfer");
  params.set("payment_method_options[customer_balance][bank_transfer][requested_address_types][0]", "zengin");
  params.set("receipt_email", payload.email);
  params.set("description", "FANTASISTA 60周年記念FESTA");
  params.set("metadata[festa60_bank_preview_id]", previewId);
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeSecret}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": `festa60-bank-preview-intent-${previewId}`
    },
    body: params
  });
  const paymentIntent = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe bank transfer preview failed: ${paymentIntent.error?.message || response.status}`);
  }
  return { previewId, customer, paymentIntent };
}
__name(createBankTransferPreview, "createBankTransferPreview");
async function persistBankTransferPreview(db, payload, preview, amount, payloadHash, expiresAt) {
  const now = nowIso();
  const details = bankTransferDetails(preview.paymentIntent);
  await db.prepare(
    `INSERT INTO bank_transfer_previews (
        id, stripe_payment_intent_id, stripe_customer_id, amount_total_jpy,
        amount_received_jpy, amount_remaining_jpy, currency, payload_hash, status,
        applicant_email, applicant_name, hosted_instructions_url, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, 'jpy', ?, 'previewed', ?, ?, ?, ?, ?, ?)`
  ).bind(
    preview.previewId,
    preview.paymentIntent.id,
    preview.customer.id,
    amount,
    details.amount,
    payloadHash,
    payload.email,
    payload.full_name || "",
    details.hosted_instructions_url || null,
    new Date(expiresAt).toISOString(),
    now,
    now
  ).run();
  return details;
}
__name(persistBankTransferPreview, "persistBankTransferPreview");
async function getBankTransferPreview(db, previewId) {
  if (!previewId) return null;
  return db.prepare(
    `SELECT id, stripe_payment_intent_id, stripe_customer_id, amount_total_jpy,
            amount_received_jpy, amount_remaining_jpy, currency, payload_hash, status,
            application_id, applicant_email, applicant_name, hosted_instructions_url, expires_at
       FROM bank_transfer_previews
       WHERE id = ?
       LIMIT 1`
  ).bind(previewId).first();
}
__name(getBankTransferPreview, "getBankTransferPreview");
async function updateBankTransferPreview(db, previewId, update) {
  await db.prepare(
    `UPDATE bank_transfer_previews
        SET status = COALESCE(?, status), application_id = COALESCE(?, application_id),
            amount_received_jpy = COALESCE(?, amount_received_jpy),
            amount_remaining_jpy = COALESCE(?, amount_remaining_jpy), updated_at = ?
      WHERE id = ?`
  ).bind(
    update.status || null,
    update.application_id || null,
    numberOrNull(update.amount_received_jpy),
    numberOrNull(update.amount_remaining_jpy),
    nowIso(),
    previewId
  ).run();
}
__name(updateBankTransferPreview, "updateBankTransferPreview");
function bankTransferDetails(paymentIntent) {
  const instructions = paymentIntent?.next_action?.display_bank_transfer_instructions;
  const financialAddress = (instructions?.financial_addresses || []).find((item) => item.type === "zengin");
  const zengin = financialAddress?.zengin;
  if (!zengin) throw new Error("Stripe bank transfer details are unavailable.");
  return {
    amount: bankTransferAmountRemaining(paymentIntent),
    bank_name: zengin.bank_name || "",
    bank_code: zengin.bank_code || "",
    branch_name: zengin.branch_name || "",
    branch_code: zengin.branch_code || "",
    account_type: zengin.account_type || "",
    account_number: zengin.account_number || "",
    account_holder_name: zengin.account_holder_name || "",
    hosted_instructions_url: instructions.hosted_instructions_url || ""
  };
}
__name(bankTransferDetails, "bankTransferDetails");
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
__name(stableStringify, "stableStringify");
function bankDecisionPayload(payload) {
  const ignored = new Set(["action", "bank_preview_token", "turnstile_token", "pay_now", "payment_method"]);
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !ignored.has(key)));
}
__name(bankDecisionPayload, "bankDecisionPayload");
function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(bytesToBase64Url, "bytesToBase64Url");
function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
__name(base64UrlToBytes, "base64UrlToBytes");
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
async function bankPreviewPayloadHash(payload) {
  return sha256Hex(stableStringify(bankDecisionPayload(payload)));
}
__name(bankPreviewPayloadHash, "bankPreviewPayloadHash");
async function bankPreviewSigningKey(env) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requireStripeSecret(env)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(bankPreviewSigningKey, "bankPreviewSigningKey");
async function createBankPreviewToken(env, data) {
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(data)));
  const key = await bankPreviewSigningKey(env);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}
__name(createBankPreviewToken, "createBankPreviewToken");
async function verifyBankPreviewToken(env, token, payload) {
  const [encodedPayload, encodedSignature, extra] = String(token || "").split(".");
  if (!encodedPayload || !encodedSignature || extra) throw new Error("銀行振込の確認情報が無効です。振込先をもう一度確認してください。");
  const key = await bankPreviewSigningKey(env);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(encodedPayload)
  );
  if (!valid) throw new Error("銀行振込の確認情報が無効です。振込先をもう一度確認してください。");
  const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)));
  if (!data.expires_at || Date.now() > data.expires_at) throw new Error("振込先の確認期限が切れました。振込先をもう一度確認してください。");
  if (data.payload_hash !== await bankPreviewPayloadHash(payload)) throw new Error("申込内容が変更されています。振込先をもう一度確認してください。");
  return data;
}
__name(verifyBankPreviewToken, "verifyBankPreviewToken");
async function updateStripePaymentIntentForApplication(stripeSecret, paymentIntentId, application) {
  const params = new URLSearchParams();
  params.set("metadata[application_id]", application.id);
  params.set("metadata[application_code]", application.application_code);
  params.set("metadata[ticket_type]", application.ticket_type);
  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeSecret}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: params
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Stripe PaymentIntent update failed: ${result.error?.message || response.status}`);
  return result;
}
__name(updateStripePaymentIntentForApplication, "updateStripePaymentIntentForApplication");
async function cancelStripePaymentIntent(stripeSecret, paymentIntentId) {
  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`, {
    method: "POST",
    headers: { authorization: `Bearer ${stripeSecret}` }
  });
  const result = await response.json();
  if (!response.ok && result.error?.code !== "payment_intent_unexpected_state") {
    throw new Error(`Stripe PaymentIntent cancellation failed: ${result.error?.message || response.status}`);
  }
  return result;
}
__name(cancelStripePaymentIntent, "cancelStripePaymentIntent");
async function retrieveStripePaymentIntent(stripeSecret, paymentIntent) {
  const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  if (!paymentIntentId) return null;
  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
    headers: { authorization: `Bearer ${stripeSecret}` }
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe PaymentIntent retrieval failed: ${result.error?.message || response.status}`);
  }
  return result;
}
__name(retrieveStripePaymentIntent, "retrieveStripePaymentIntent");
function bankTransferInstructionsUrl(paymentIntent) {
  return paymentIntent?.next_action?.display_bank_transfer_instructions?.hosted_instructions_url || "";
}
__name(bankTransferInstructionsUrl, "bankTransferInstructionsUrl");
function bankTransferAmountRemaining(paymentIntent) {
  if (paymentIntent?.status === "succeeded") return 0;
  const amountRemaining = Number(paymentIntent?.next_action?.display_bank_transfer_instructions?.amount_remaining);
  if (!Number.isFinite(amountRemaining) || amountRemaining < 0) {
    throw new Error("Stripe bank transfer amount remaining is unavailable.");
  }
  return amountRemaining;
}
__name(bankTransferAmountRemaining, "bankTransferAmountRemaining");
function bankTransferAmountReceived(paymentIntent) {
  const amount = Number(paymentIntent?.amount || 0);
  const remaining = bankTransferAmountRemaining(paymentIntent);
  return Math.max(0, amount - remaining);
}
__name(bankTransferAmountReceived, "bankTransferAmountReceived");
async function markUnreconciledCashBalance(db, cashBalance, stripeEventId) {
  const customerId = cashBalance?.customer;
  const amount = Number(cashBalance?.available?.jpy || 0);
  if (!customerId || amount <= 0) return null;
  const now = nowIso();
  const payment = await db.prepare(
    `SELECT id, application_id
       FROM payments
       WHERE stripe_customer_id = ? AND payment_provider = 'stripe'
       ORDER BY created_at DESC
       LIMIT 1`
  ).bind(customerId).first();
  if (payment) {
    await db.prepare(
      `UPDATE payments
          SET unreconciled_amount_jpy = ?, cash_balance_attention_at = ?, stripe_event_id = ?, updated_at = ?
        WHERE id = ?`
    ).bind(amount, now, stripeEventId || null, now, payment.id).run();
    await audit(db, {
      actor: "stripe",
      action: "payment.unreconciled_cash_balance",
      target_type: "application",
      target_id: payment.application_id,
      details_json: JSON.stringify({ stripe_customer_id: customerId, amount_jpy: amount })
    });
    return { application_id: payment.application_id, stripe_customer_id: customerId, amount_jpy: amount };
  }
  const preview = await db.prepare(
    `SELECT id, applicant_email, applicant_name
       FROM bank_transfer_previews
       WHERE stripe_customer_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
  ).bind(customerId).first();
  if (preview) {
    await updateBankTransferPreview(db, preview.id, { status: "unreconciled_funds_received", amount_received_jpy: amount });
    await audit(db, {
      actor: "stripe",
      action: "bank_preview.unreconciled_cash_balance",
      target_type: "bank_transfer_preview",
      target_id: preview.id,
      details_json: JSON.stringify({ stripe_customer_id: customerId, amount_jpy: amount })
    });
    return { preview_id: preview.id, applicant_email: preview.applicant_email, applicant_name: preview.applicant_name, stripe_customer_id: customerId, amount_jpy: amount };
  }
  await audit(db, {
    actor: "stripe",
    action: "payment.unmatched_cash_balance",
    target_type: "stripe_customer",
    target_id: customerId,
    details_json: JSON.stringify({ amount_jpy: amount })
  });
  return { stripe_customer_id: customerId, amount_jpy: amount };
}
__name(markUnreconciledCashBalance, "markUnreconciledCashBalance");
async function verifyStripeSignature(payload, signatureHeader, webhookSecret) {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(",").reduce((result, part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return result;
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (!result[key]) result[key] = [];
    result[key].push(value);
    return result;
  }, {});
  const timestamp = Number(parts.t?.[0]);
  if (!Number.isInteger(timestamp) || !parts.v1?.length) return false;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1e3) - timestamp);
  if (ageSeconds > 300) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = await hmacSha256Hex(webhookSecret, signedPayload);
  return parts.v1.some((signature) => constantTimeEqual2(expected, signature));
}
__name(verifyStripeSignature, "verifyStripeSignature");
async function hmacSha256Hex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256Hex, "hmacSha256Hex");
function constantTimeEqual2(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(constantTimeEqual2, "constantTimeEqual");

// api/festa60/stripe/webhook.js
async function onRequestPost5({ request, env }) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return json({ ok: false, error: "invalid_signature", message: "Missing Stripe-Signature header." }, { status: 400 });
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured for the Festa 60 webhook.");
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
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        await markCheckoutCompleted(db, event.data.object, event.id);
        if (event.data.object.payment_status === "paid" && event.data.object.metadata?.application_id) {
          const application = await getApplicationById(db, event.data.object.metadata.application_id);
          if (application) await sendPaymentEmailOnce(env, db, application, "confirmed", renderPaymentConfirmedEmail(application));
        } else if (event.type === "checkout.session.completed" && event.data.object.metadata?.application_id) {
          const paymentIntent = await retrieveStripePaymentIntent(requireStripeSecret(env), event.data.object.payment_intent);
          const instructionsUrl = bankTransferInstructionsUrl(paymentIntent);
          if (instructionsUrl) {
            const application = await getApplicationById(db, event.data.object.metadata.application_id);
            if (application) await sendPaymentEmailOnce(env, db, application, "instructions", renderBankTransferInstructionsEmail(application, instructionsUrl));
          }
        }
      } else if (event.type === "payment_intent.succeeded" && event.data.object.payment_method_types?.includes("customer_balance")) {
        const paidPayment = await markBankTransferPaymentSucceeded(db, event.data.object, event.id);
        if (paidPayment.application_id) {
          const application = await getApplicationById(db, paidPayment.application_id);
          if (application) await sendPaymentEmailOnce(env, db, application, "confirmed", renderPaymentConfirmedEmail(application));
        } else {
          const emailResult = await maybeSendEmail(env, {
            ...renderBankFundsBeforeConfirmationEmail(paidPayment, true),
            message_id: `festa60-bank-paid-before-confirmation-${paidPayment.preview_id}`
          });
          if (!emailResult.sent) throw new Error(`Pre-confirmation payment email was not sent: ${emailResult.error || emailResult.reason || "unknown error"}`);
        }
      } else if (event.type === "payment_intent.partially_funded") {
        const partialPayment = await markPaymentPartiallyFunded(db, event.data.object, event.id);
        if (!partialPayment.hosted_instructions_url) {
          throw new Error("Stripe bank transfer instructions URL is unavailable for a partially funded payment.");
        }
        if (partialPayment.application_id) {
          const application = await getApplicationById(db, partialPayment.application_id);
          if (!application) throw new Error("Festa 60 application was not found for a partially funded payment.");
          const emailResult = await maybeSendEmail(env, {
            ...renderPartialPaymentEmail(application, partialPayment),
            message_id: `festa60-partial-${application.id}-${event.id}`
          });
          if (!emailResult.sent) throw new Error(`Partial payment email was not sent: ${emailResult.error || emailResult.reason || "unknown error"}`);
          await markPartialPaymentEmailSent(db, event.data.object.id);
        } else {
          const emailResult = await maybeSendEmail(env, {
            ...renderBankFundsBeforeConfirmationEmail(partialPayment, false),
            message_id: `festa60-bank-partial-before-confirmation-${partialPayment.preview_id}`
          });
          if (!emailResult.sent) throw new Error(`Pre-confirmation partial payment email was not sent: ${emailResult.error || emailResult.reason || "unknown error"}`);
        }
      } else if (event.type === "cash_balance.funds_available") {
        const attention = await markUnreconciledCashBalance(db, event.data.object, event.id);
        if (attention && env.CONTACT_EMAIL) {
          const emailResult = await maybeSendEmail(env, {
            to: env.CONTACT_EMAIL,
            subject: "【60周年FESTA・要確認】銀行振込の未消込残高があります",
            body: `銀行振込の自動消込後に未割当残高が残っています。\n\n金額：${formatYen(attention.amount_jpy)}\nStripe顧客ID：${attention.stripe_customer_id}\n受付番号または申込ID：${attention.application_id || attention.preview_id || "照合なし"}\n\n決済管理画面とFESTA管理画面で内容を確認し、返金または手動対応を判断してください。`,
            message_id: `festa60-cash-balance-${event.id}`
          });
          if (!emailResult.sent) throw new Error(`Cash balance alert email was not sent: ${emailResult.error || emailResult.reason || "unknown error"}`);
          if (attention.application_id) {
            const now = nowIso();
            await db.prepare(
              `UPDATE payments
                  SET cash_balance_alert_email_sent_at = COALESCE(cash_balance_alert_email_sent_at, ?), updated_at = ?
                WHERE application_id = ? AND payment_provider = 'stripe'`
            ).bind(now, now, attention.application_id).run();
          }
        }
      } else if (event.type === "checkout.session.async_payment_failed") {
        await markCheckoutFailed(db, event.data.object, event.id);
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
__name(onRequestPost5, "onRequestPost");
async function onRequestGet5() {
  return methodNotAllowed();
}
__name(onRequestGet5, "onRequestGet");

// api/festa60/_lib/turnstile.js
async function verifyTurnstile(token, env, request) {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: true, skipped: true };
  if (!token) return { ok: false, message: "Turnstile token is missing." };
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  form.append("remoteip", request.headers.get("cf-connecting-ip") || "");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  const result = await response.json();
  return { ok: Boolean(result.success), result };
}
__name(verifyTurnstile, "verifyTurnstile");

// api/festa60/applications.js
var PUBLIC_OBOG_TICKET_TYPES = ["obog", "obog_6_10", "obog_5_under"];
var ABSENT_DONATION_TICKET_TYPES = ["absent_donation_30000", "absent_donation_10000", "absent_donation_5000"];
var SCHOOL_LINEAGES = ["tus_obog", "gakushuin_ouyukai"];
async function onRequestPost6({ request, env }) {
  try {
    const payload = await readJson(request);
    if (!payload) return badRequest("Invalid JSON payload.");
    const action = payload.action || "submit_online";
    const allowedActions = ["submit_online", "preview_bank_transfer", "confirm_bank_transfer", "switch_to_online", "cancel_bank_preview"];
    if (!allowedActions.includes(action)) return badRequest("Invalid application action.");
    if (action !== "cancel_bank_preview" && !isApplicationOpen()) {
      return json({ ok: false, error: "application_closed", message: "参加申込は2027年1月31日をもって締め切りました。変更や確認はFESTA事務局へお問い合わせください。" }, { status: 410 });
    }
    payload.full_name = [payload.family_name, payload.given_name].filter(Boolean).join(" ").trim();
    payload.full_name_kana = [payload.family_name_kana, payload.given_name_kana].filter(Boolean).join(" ").trim();
    payload.address = [payload.prefecture, payload.city, payload.street_address, payload.building].filter((value) => String(value || "").trim()).join(" ");
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(payload.client_submission_id || ""))) {
      payload.client_submission_id = crypto.randomUUID();
    }
    payload.fee_period = feePeriodForDate();
    payload.ticket_type = normalizeTicketType(payload.ticket_type, payload.support_tier);
    const validation = validateApplication(payload, env, action);
    if (!validation.ok) return badRequest("\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", validation.errors);
    const isStaffApplication = STAFF_TICKET_TYPES.includes(splitTicketType(payload.ticket_type).base_ticket_type);
    payload.source = isStaffApplication ? "staff_invite" : "public_form";
    delete payload.staff_access_code;
    const db = requireDb(env);
    payload.ticket_type = normalizeTicketType(payload.ticket_type);
    const companions = Array.isArray(payload.companions) ? payload.companions.filter((item) => item.full_name) : [];
    const amount = lineItemsTotal(buildPaymentLineItems(payload, companions));

    if (action === "preview_bank_transfer") {
      if (amount <= 0) return badRequest("銀行振込が必要なお支払い金額ではありません。");
      const turnstile = await verifyTurnstile(payload.turnstile_token, env, request);
      if (!turnstile.ok) return badRequest("Turnstile verification failed.", turnstile.result || turnstile.message);
      const preview = await createBankTransferPreview({ env, payload, amount });
      const payloadHash = await bankPreviewPayloadHash(payload);
      const expiresAt = Date.now() + 30 * 60 * 1e3;
      let previewDetails;
      try {
        previewDetails = await persistBankTransferPreview(db, payload, preview, amount, payloadHash, expiresAt);
      } catch (error) {
        await cancelStripePaymentIntent(requireStripeSecret(env), preview.paymentIntent.id).catch(() => null);
        throw error;
      }
      const token = await createBankPreviewToken(env, {
        preview_id: preview.previewId,
        payment_intent_id: preview.paymentIntent.id,
        customer_id: preview.customer.id,
        amount,
        payload_hash: payloadHash,
        expires_at: expiresAt
      });
      return json({
        ok: true,
        bank_transfer_preview: previewDetails,
        bank_preview_token: token,
        expires_at: new Date(expiresAt).toISOString(),
        turnstile_skipped: Boolean(turnstile.skipped)
      });
    }

    let bankPreview = null;
    let bankPaymentIntent = null;
    if (action === "confirm_bank_transfer" || action === "switch_to_online" || action === "cancel_bank_preview") {
      try {
        bankPreview = await verifyBankPreviewToken(env, payload.bank_preview_token, payload);
      } catch (error) {
        return badRequest(error.message);
      }
      const previewRecord = await getBankTransferPreview(db, bankPreview.preview_id);
      if (!previewRecord || previewRecord.stripe_payment_intent_id !== bankPreview.payment_intent_id || previewRecord.stripe_customer_id !== bankPreview.customer_id) {
        return badRequest("銀行振込の確認記録が見つかりません。振込先をもう一度確認してください。");
      }
      if (previewRecord.payload_hash !== bankPreview.payload_hash || Number(previewRecord.amount_total_jpy) !== amount) {
        return badRequest("申込内容が変更されています。振込先をもう一度確認してください。");
      }
      bankPreview.record = previewRecord;
      if (Number(bankPreview.amount) !== amount) return badRequest("お支払い金額が変更されています。振込先をもう一度確認してください。");
      bankPaymentIntent = await retrieveStripePaymentIntent(requireStripeSecret(env), bankPreview.payment_intent_id);
      if (bankPaymentIntent.customer !== bankPreview.customer_id || Number(bankPaymentIntent.amount) !== amount || bankPaymentIntent.currency !== "jpy") {
        return badRequest("銀行振込の確認情報とお支払い内容が一致しません。振込先をもう一度確認してください。");
      }
    } else {
      const turnstile = await verifyTurnstile(payload.turnstile_token, env, request);
      if (!turnstile.ok) return badRequest("Turnstile verification failed.", turnstile.result || turnstile.message);
    }

    if (action === "cancel_bank_preview") {
      const linkedPayment = await db.prepare(
        "SELECT application_id FROM payments WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe' LIMIT 1"
      ).bind(bankPreview.payment_intent_id).first();
      if (linkedPayment?.application_id || bankPreview.record.application_id) return badRequest("この銀行振込はすでに申込へ確定されています。");
      const amountReceived = bankTransferAmountReceived(bankPaymentIntent);
      if (amountReceived > 0 || bankPaymentIntent.status === "succeeded") {
        await updateBankTransferPreview(db, bankPreview.preview_id, {
          status: "funds_received_before_confirmation",
          amount_received_jpy: amountReceived || bankPaymentIntent.amount,
          amount_remaining_jpy: bankTransferAmountRemaining(bankPaymentIntent)
        });
        return json({ ok: false, error: "bank_transfer_already_funded", message: "すでに入金が確認されているため、この振込先を取り消せません。FESTA事務局へご連絡ください。" }, { status: 409 });
      }
      if (bankPaymentIntent.status === "canceled") return json({ ok: true, cancelled: true });
      await cancelStripePaymentIntent(requireStripeSecret(env), bankPreview.payment_intent_id);
      await updateBankTransferPreview(db, bankPreview.preview_id, { status: "cancelled" });
      return json({ ok: true, cancelled: true });
    }

    if (action === "confirm_bank_transfer") {
      const existingPayment = await db.prepare(
        "SELECT application_id FROM payments WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe' LIMIT 1"
      ).bind(bankPreview.payment_intent_id).first();
      if (existingPayment?.application_id) {
        const existingApplication = await getApplicationById(db, existingPayment.application_id);
        return json({
          ok: true,
          application: existingApplication,
          payment: {
            paymentMethod: "bank_transfer",
            paymentProvider: "stripe",
            paymentStatus: existingApplication?.payment_status || "unpaid"
          },
          duplicate_confirmation: true
        });
      }
      const stripeSecret = requireStripeSecret(env);
      const paymentIntent = bankPaymentIntent;
      if (paymentIntent.status === "canceled") return badRequest("この振込先は使用できません。振込先をもう一度確認してください。");
      let application = bankPreview.record.application_id
        ? await getApplicationById(db, bankPreview.record.application_id)
        : null;
      if (!application) {
        const claim = await db.prepare(
          `UPDATE bank_transfer_previews
              SET status = 'confirming', updated_at = ?
            WHERE id = ? AND status IN ('previewed', 'funds_received_before_confirmation', 'paid_before_confirmation', 'unreconciled_funds_received')
            RETURNING id`
        ).bind(nowIso(), bankPreview.preview_id).first();
        if (!claim) {
          const currentPreview = await getBankTransferPreview(db, bankPreview.preview_id);
          if (currentPreview?.application_id) application = await getApplicationById(db, currentPreview.application_id);
          if (!application) {
            return json({ ok: false, error: "bank_transfer_confirmation_in_progress", message: "銀行振込の申込確定処理を実行中です。少し待ってからもう一度お試しください。" }, { status: 409 });
          }
        }
      }
      if (!application) {
        try {
          application = await insertApplication(db, { ...payload, ticket_type: payload.ticket_type || "obog" }, getClientMeta(request));
          await updateBankTransferPreview(db, bankPreview.preview_id, { status: "application_created", application_id: application.id });
        } catch (error) {
          await updateBankTransferPreview(db, bankPreview.preview_id, { status: "previewed" });
          throw error;
        }
      }
      const linkedPaymentIntent = await updateStripePaymentIntentForApplication(stripeSecret, paymentIntent.id, application);
      const recoveredPayment = await db.prepare(
        "SELECT id FROM payments WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe' LIMIT 1"
      ).bind(linkedPaymentIntent.id).first();
      application.payment_id = recoveredPayment?.id || await createBankTransferPayment(db, application, linkedPaymentIntent, bankPreview.customer_id);
      application.external_payment_id = linkedPaymentIntent.id;
      application.payment_method = "bank_transfer";
      application.paymentMethod = "bank_transfer";
      application.payment_status = linkedPaymentIntent.status === "succeeded" ? "paid" : "unpaid";
      application.paymentStatus = application.payment_status;
      if (linkedPaymentIntent.status === "succeeded") {
        await markBankTransferPaymentSucceeded(db, linkedPaymentIntent, null);
      }
      const instructionsUrl = bankTransferInstructionsUrl(linkedPaymentIntent);
      if (!instructionsUrl) throw new Error("Stripe bank transfer instructions URL is unavailable.");
      await updateBankTransferPreview(db, bankPreview.preview_id, {
        status: linkedPaymentIntent.status === "succeeded" ? "paid" : "linked",
        application_id: application.id,
        amount_received_jpy: bankTransferAmountReceived(linkedPaymentIntent),
        amount_remaining_jpy: bankTransferAmountRemaining(linkedPaymentIntent)
      });
      let applicationEmail;
      try {
        if (linkedPaymentIntent.status === "succeeded") {
          const confirmedApplication = await getApplicationById(db, application.id);
          applicationEmail = await sendPaymentEmailOnce(env, db, confirmedApplication, "confirmed", renderPaymentConfirmedEmail(confirmedApplication));
        } else {
          applicationEmail = await sendPaymentEmailOnce(env, db, application, "instructions", renderBankTransferInstructionsEmail(application, instructionsUrl));
        }
      } catch (emailError) {
        console.error("Bank transfer application email failed.", emailError);
        applicationEmail = { sent: false, skipped: false, error: emailError.message || "Email delivery failed." };
      }
      return json({
        ok: true,
        application,
        payment: {
          paymentMethod: "bank_transfer",
          paymentProvider: "stripe",
          paymentStatus: application.payment_status,
          hostedInstructionsUrl: instructionsUrl
        },
        application_email: applicationEmail,
        receipt_email: { sent: false, skipped: true, reason: "Sent after payment confirmation." }
      });
    }

    if (action === "switch_to_online" && bankPreview?.payment_intent_id) {
      const linkedPayment = await db.prepare(
        "SELECT application_id FROM payments WHERE stripe_payment_intent_id = ? AND payment_provider = 'stripe' LIMIT 1"
      ).bind(bankPreview.payment_intent_id).first();
      if (linkedPayment?.application_id || bankPreview.record.application_id) return badRequest("この銀行振込はすでに申込へ確定されています。");
      if (bankPaymentIntent.status === "canceled") return badRequest("この確認情報はすでに使用されています。入力画面からやり直してください。");
      const amountReceived = bankTransferAmountReceived(bankPaymentIntent);
      if (amountReceived > 0 || bankPaymentIntent.status === "succeeded") {
        await updateBankTransferPreview(db, bankPreview.preview_id, {
          status: "funds_received_before_confirmation",
          amount_received_jpy: amountReceived || bankPaymentIntent.amount,
          amount_remaining_jpy: bankTransferAmountRemaining(bankPaymentIntent)
        });
        return json({ ok: false, error: "bank_transfer_already_funded", message: "すでに入金が確認されているため、カード等へ変更できません。銀行振込で申込を確定するか、FESTA事務局へご連絡ください。" }, { status: 409 });
      }
      await cancelStripePaymentIntent(requireStripeSecret(env), bankPreview.payment_intent_id);
      await updateBankTransferPreview(db, bankPreview.preview_id, { status: "switched_to_online" });
    }
    let application = null;
    if (payload.client_submission_id) {
      const existingApplication = await db.prepare(
        "SELECT id FROM applications WHERE client_submission_id = ? LIMIT 1"
      ).bind(payload.client_submission_id).first();
      if (existingApplication?.id) {
        application = await hydrateApplicationLineItems(db, await getApplicationById(db, existingApplication.id));
        const existingCheckoutPayment = await db.prepare(
          `SELECT stripe_checkout_session_id
             FROM payments
             WHERE application_id = ? AND stripe_checkout_session_id IS NOT NULL
             ORDER BY created_at DESC
             LIMIT 1`
        ).bind(application.id).first();
        if (existingCheckoutPayment?.stripe_checkout_session_id) {
          const existingSession = await retrieveStripeCheckoutSession(requireStripeSecret(env), existingCheckoutPayment.stripe_checkout_session_id);
          return json({
            ok: true,
            application,
            payment: {
              paymentMethod: "stripe_checkout",
              paymentProvider: "stripe",
              paymentStatus: application.payment_status || "unpaid",
              checkoutUrl: existingSession.url,
              checkoutSessionId: existingSession.id
            },
            application_email: { sent: false, skipped: true, reason: "Sent only after payment confirmation." },
            duplicate_submission: true
          });
        }
      }
    }
    if (!application) {
      application = await insertApplication(
        db,
        {
          ...payload,
          ticket_type: payload.ticket_type || "obog"
        },
        getClientMeta(request)
      );
    }
    if (application.payment_provider === "stripe") {
      try {
        const { session, metadata } = await createCheckoutSession({
          env,
          application,
          request,
          baseUrl: publicBaseUrl(env, request)
        });
        application.payment_id = await createPayment(db, application, session, metadata);
        application.external_payment_id = session.id;
        return json({
          ok: true,
          application,
          payment: {
            paymentMethod: "stripe_checkout",
            paymentProvider: "stripe",
            paymentStatus: "unpaid",
            checkoutUrl: session.url,
            checkoutSessionId: session.id
          },
          application_email: { sent: false, skipped: true, reason: "Sent only after payment confirmation." },
          receipt_email: { sent: false, skipped: true, reason: "Sent by Stripe after payment confirmation." },
          turnstile_skipped: action === "switch_to_online" ? false : !env.TURNSTILE_SECRET_KEY
        });
      } catch (stripeError) {
        console.error("Stripe Checkout setup failed after application creation.", stripeError);
        return json(
          {
            ok: false,
            error: "stripe_checkout_unavailable",
            message: "\u6C7A\u6E08\u753B\u9762\u3092\u958B\u3051\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u7533\u8FBC\u306F\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093\u3002\u518D\u5EA6\u304A\u8A66\u3057\u3044\u305F\u3060\u304F\u304B\u3001\u8868\u793A\u3055\u308C\u305F\u624B\u7D9A\u756A\u53F7\u3092\u6DFB\u3048\u3066FESTA\u4E8B\u52D9\u5C40\u3078\u3054\u9023\u7D61\u304F\u3060\u3055\u3044\u3002",
            application
          },
          { status: 502 }
        );
      }
    }
    return json({
      ok: true,
      application,
      payment: { paymentMethod: "not_required", paymentProvider: "none", paymentStatus: "paid" },
      receipt_email: { sent: false, skipped: true, reason: "No payment required." },
      turnstile_skipped: action === "switch_to_online" ? false : !env.TURNSTILE_SECRET_KEY
    });
  } catch (error) {
    return serverError(error);
  }
}
__name(onRequestPost6, "onRequestPost");
async function onRequestGet6() {
  return methodNotAllowed();
}
__name(onRequestGet6, "onRequestGet");
function validateApplication(payload, env, action = "submit_online") {
  const errors = {};
  const { base_ticket_type: baseTicketType, support_tier: supportTier } = splitTicketType(payload.ticket_type);
  for (const field of ["family_name", "given_name", "family_name_kana", "given_name_kana", "full_name", "full_name_kana", "email", "ticket_type"]) {
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
  if (!ABSENT_DONATION_TICKET_TYPES.includes(baseTicketType) && !payload.photo_consent) {
    errors.photo_consent = "required";
  }
  if (!payload.cancellation_policy_consent) {
    errors.cancellation_policy_consent = "required";
  }
  const bankTransferActions = ["preview_bank_transfer", "confirm_bank_transfer", "cancel_bank_preview"];
  const expectedPaymentMethod = bankTransferActions.includes(action) ? "bank_transfer" : "stripe";
  if (payload.payment_method !== expectedPaymentMethod) {
    errors.payment_method = "invalid";
  }
  const isStaffApplication = STAFF_TICKET_TYPES.includes(baseTicketType);
  if (![...PUBLIC_OBOG_TICKET_TYPES, ...ABSENT_DONATION_TICKET_TYPES, ...STAFF_TICKET_TYPES].includes(baseTicketType)) {
    errors.ticket_type = "invalid_public_ticket_type";
  }
  if (isStaffApplication) {
    const expectedStaffCode = String(env.STAFF_PAYMENT_ACCESS_CODE || "");
    const submittedStaffCode = String(payload.staff_access_code || "");
    if (!expectedStaffCode || !constantTimeEqual(submittedStaffCode, expectedStaffCode)) {
      errors.staff_access_code = "invalid";
    }
  }
  if (!SCHOOL_LINEAGES.includes(payload.school_lineage)) {
    errors.school_lineage = "required";
  }
  if (supportTier !== "none" && ![...PUBLIC_OBOG_TICKET_TYPES, ...STAFF_TICKET_TYPES].includes(baseTicketType)) {
    errors.support_tier = "premium_support_requires_obog_ticket";
  }
  if (payload.expected_transfer_name && String(payload.expected_transfer_name).length > 120) {
    errors.expected_transfer_name = "too_long";
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
      if (!["adult", "child", "preschool"].includes(companion.attendee_type)) errors[`${key}.attendee_type`] = "invalid";
      if (!RECEPTION_ATTENDANCE.includes(companion.reception_attendance)) errors[`${key}.reception_attendance`] = "invalid";
      if (payload.reception_attendance === "without_reception" && companion.reception_attendance === "attending") {
        errors[`${key}.reception_attendance`] = "companion_cannot_attend_without_applicant";
      }
      if (companion.non_obog_confirmed !== true) errors[`${key}.non_obog_confirmed`] = "required";
      if (companion.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companion.email)) {
        errors[`${key}.email`] = "invalid";
      }
    });
  } else if (Number(payload.companion_count || 0) > 0) {
    errors.companions = "required";
  }
  if (ABSENT_DONATION_TICKET_TYPES.includes(baseTicketType) && Number(payload.companion_count || 0) > 0) {
    errors.companion_count = "absent_donation_does_not_allow_companions";
  }
  const isGakushuin = payload.school_lineage === "gakushuin_ouyukai";
  const graduationYear = Number(payload.graduation_year);
  const identityTicketType = publicBaseTicketType(baseTicketType);
  if (!isGakushuin || payload.graduation_year) {
    if (!Number.isInteger(graduationYear) || graduationYear < 1900 || graduationYear > 2026) {
      errors.graduation_year = "required";
    } else if (!isGakushuin && identityTicketType === "obog" && graduationYear > OBOG_11_OVER_GRADUATION_YEAR_TO) {
      errors.ticket_type = `obog_requires_graduation_year_${OBOG_11_OVER_GRADUATION_YEAR_TO}_or_earlier`;
    } else if (!isGakushuin && identityTicketType === "obog_6_10" && (graduationYear < OBOG_6_10_GRADUATION_YEAR_FROM || graduationYear > OBOG_6_10_GRADUATION_YEAR_TO)) {
      errors.ticket_type = `obog_6_10_requires_graduation_year_${OBOG_6_10_GRADUATION_YEAR_FROM}_${OBOG_6_10_GRADUATION_YEAR_TO}`;
    } else if (!isGakushuin && identityTicketType === "obog_5_under" && (graduationYear < OBOG_5_UNDER_GRADUATION_YEAR_FROM || graduationYear > OBOG_5_UNDER_GRADUATION_YEAR_TO)) {
      errors.ticket_type = `obog_5_under_requires_graduation_year_${OBOG_5_UNDER_GRADUATION_YEAR_FROM}_${OBOG_5_UNDER_GRADUATION_YEAR_TO}`;
    }
  }
  const isDonor = ABSENT_DONATION_TICKET_TYPES.includes(baseTicketType) || supportTier !== "none";
  if (isDonor && String(payload.postal_code || "").replace(/\D/g, "").length !== 7) {
    errors.postal_code = "required_for_donor_returns";
  }
  for (const field of ["prefecture", "city", "street_address"]) {
    if (isDonor && !String(payload[field] || "").trim()) {
      errors[field] = "required_for_donor_returns";
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
__name(validateApplication, "validateApplication");

// api/festa60/config.js
async function onRequestGet7({ env }) {
  return json({
    ok: true,
    environment: environmentName(env),
    is_production: isProduction(env),
    turnstile_site_key: env.TURNSTILE_SITE_KEY || "",
    payment_mode: "stripe_checkout",
    payment_provider: "stripe",
    stripe_mode: stripeMode(env),
    application_open: isApplicationOpen(),
    application_deadline: APPLICATION_DEADLINE_ISO,
    fee_period: feePeriodForDate(),
    fee_periods: {
      early: "2026\u5E749\u670830\u65E5\u307E\u3067\u306E\u7533\u8FBC",
      year_end: "2026\u5E7410\u67081\u65E5\u301C12\u670831\u65E5\u306E\u7533\u8FBC",
      regular: "2027\u5E741\u67081\u65E5\u301C1\u670831\u65E5\u306E\u7533\u8FBC"
    }
  });
}
__name(onRequestGet7, "onRequestGet");
function stripeMode(env) {
  const key = String(env.STRIPE_SECRET_KEY || "");
  if (!key || !env.STRIPE_WEBHOOK_SECRET) return "not_configured";
  if (/^(sk|rk)_live_/.test(key)) return isProduction(env) ? "live" : "invalid_configuration";
  if (/^(sk|rk)_test_/.test(key)) return isProduction(env) ? "invalid_configuration" : "sandbox";
  return "invalid_configuration";
}
__name(stripeMode, "stripeMode");
async function onRequestPost7() {
  return methodNotAllowed();
}
__name(onRequestPost7, "onRequestPost");

// _middleware.js
var PROTECTED_PREFIXES = [
  "/apply",
  "/admin",
  "/festa60-admin",
  "/api/festa60/admin"
];
async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!requiresAccess(url.pathname)) return next();
  if (hasAccessIdentity(request) || hasBypassToken(request, env)) return next();
  return new Response("Cloudflare Access authentication is required for the Festa 60 staging environment.", {
    status: 401,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
__name(onRequest, "onRequest");
function requiresAccess(pathname) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
__name(requiresAccess, "requiresAccess");
function hasAccessIdentity(request) {
  return Boolean(
    request.headers.get("cf-access-authenticated-user-email") || request.headers.get("cf-access-jwt-assertion")
  );
}
__name(hasAccessIdentity, "hasAccessIdentity");
function hasBypassToken(request, env) {
  if (!isPreviewBypassEnabled2(env)) return false;
  const expected = env.ACCESS_BYPASS_TOKEN || env.ADMIN_API_TOKEN;
  const actual = request.headers.get("x-access-bypass-token") || request.headers.get("x-admin-token");
  return Boolean(expected && actual && constantTimeEqual3(actual, expected));
}
__name(hasBypassToken, "hasBypassToken");
function isPreviewBypassEnabled2(env) {
  const environment = String(env.ENVIRONMENT || "preview").toLowerCase();
  const branch = String(env.CF_PAGES_BRANCH || "").toLowerCase();
  const disabled = env.ADMIN_TOKEN_BYPASS_ENABLED === "false" || env.ACCESS_BYPASS_ENABLED === "false" || env.ACCESS_BYPASS_TOKEN_ENABLED === "false";
  if (disabled) return false;
  if (environment === "production" || branch === "main") return false;
  return true;
}
__name(isPreviewBypassEnabled2, "isPreviewBypassEnabled");
function constantTimeEqual3(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
__name(constantTimeEqual3, "constantTimeEqual");

// ../../../../Users/nakatsu/Documents/Codex/2026-05-18/github-pages-https-tusfantasista-github-io/.wrangler/tmp/pages-RPGt9O/functionsRoutes-0.22154614749156643.mjs
var routes = [
  {
    routePath: "/api/festa60/admin/applications/:id",
    mountPath: "/api/festa60/admin/applications",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/festa60/admin/applications/:id",
    mountPath: "/api/festa60/admin/applications",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/festa60/admin/applications/:id",
    mountPath: "/api/festa60/admin/applications",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/festa60/admin/applications",
    mountPath: "/api/festa60/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/festa60/admin/applications",
    mountPath: "/api/festa60/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/festa60/admin/export",
    mountPath: "/api/festa60/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/festa60/admin/export",
    mountPath: "/api/festa60/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/festa60/admin/import",
    mountPath: "/api/festa60/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/festa60/admin/import",
    mountPath: "/api/festa60/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/festa60/stripe/webhook",
    mountPath: "/api/festa60/stripe",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/festa60/stripe/webhook",
    mountPath: "/api/festa60/stripe",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/festa60/applications",
    mountPath: "/api/festa60",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/festa60/applications",
    mountPath: "/api/festa60",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/festa60/config",
    mountPath: "/api/festa60",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/festa60/config",
    mountPath: "/api/festa60",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/stripe/webhook",
    mountPath: "/api/stripe",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/stripe/webhook",
    mountPath: "/api/stripe",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];

// ../../../var/folders/fb/k4p374s957v4svdxz6wry5t00000gp/T/festa60-npm-cache/_npx/d77349f55c2be1c0/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../var/folders/fb/k4p374s957v4svdxz6wry5t00000gp/T/festa60-npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};

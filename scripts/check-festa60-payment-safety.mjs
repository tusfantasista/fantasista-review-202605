import { readFile } from "node:fs/promises";

const files = {
  worker: await readFile(new URL("../public/_worker.js", import.meta.url), "utf8"),
  register: await readFile(new URL("../public/festa60-register/index.html", import.meta.url), "utf8"),
  registerScript: await readFile(new URL("../public/assets/js/festa60-register.js", import.meta.url), "utf8"),
  migration: await readFile(new URL("../migrations/20260808_harden_bank_transfer_flow.sql", import.meta.url), "utf8"),
  design: await readFile(new URL("../docs/FESTA60_REGISTRATION_PAYMENT_DESIGN.md", import.meta.url), "utf8")
};

const checks = [
  ["preview mapping table", files.migration.includes("CREATE TABLE IF NOT EXISTS bank_transfer_previews")],
  ["PaymentIntent uniqueness", files.migration.includes("idx_payments_stripe_payment_intent_unique")],
  ["submission idempotency", files.migration.includes("idx_applications_client_submission_unique") && files.registerScript.includes("crypto.randomUUID()")],
  ["preview persisted before response", files.worker.includes("persistBankTransferPreview(db, payload, preview")],
  ["bank preview confirms with customer balance method", files.worker.includes('params.set("payment_method_data[type]", "customer_balance")')],
  ["failed bank preview cleans up customer", files.worker.includes("deleteBankTransferPreviewCustomer(stripeSecret, customer.id)")],
  ["bank preview failure is user friendly", files.worker.includes('error: "bank_transfer_unavailable"')],
  ["funded preview cannot switch", files.worker.includes("bank_transfer_already_funded")],
  ["pre-confirmation funding tracked", files.worker.includes("paid_before_confirmation") && files.worker.includes("funds_received_before_confirmation")],
  ["partial funding handled", files.worker.includes('event.type === "payment_intent.partially_funded"')],
  ["unreconciled cash handled", files.worker.includes('event.type === "cash_balance.funds_available"')],
  ["confirmation email retryable", files.worker.includes("sendPaymentEmailOnce(env, db, application, \"confirmed\"")],
  ["confirmation email explains separate receipt", files.worker.match(/\\u9818\\u53CE\\u66F8\\u30E1\\u30FC\\u30EB\\u306F/g)?.length === 2 && files.worker.includes("\\u6C7A\\u6E08\\u4EE3\\u884C\\u30B5\\u30FC\\u30D3\\u30B9\\u304B\\u3089\\u5225\\u9014")],
  ["bank instructions tracked", files.worker.includes("renderBankTransferInstructionsEmail") && files.worker.includes('kind === "instructions"')],
  ["online application completes after payment", files.registerScript.includes("お支払いが完了し、申込が完了しました") && files.registerScript.includes("申込は完了していません")],
  ["no pre-payment online email", files.worker.includes('reason: "Sent only after payment confirmation."') && !files.worker.includes("renderApplicationReceivedEmail")],
  ["preview transfer warning", files.register.includes("この画面の口座へは、まだ振り込まないでください")],
  ["bank actions pass payment validation", files.worker.includes('const bankTransferActions = ["preview_bank_transfer", "confirm_bank_transfer", "cancel_bank_preview"]') && files.worker.includes('validateApplication(payload, env, action)')],
  ["validation errors identify fields", files.registerScript.includes("formatApplicationError(result)") && files.registerScript.includes("確認が必要な項目")],
  ["cohort baseline is fixed", files.worker.includes("OBOG_5_UNDER_GRADUATION_YEAR_TO = 2025") && files.register.includes("2026年4月1日時点で固定")],
  ["staff discounts applied before half", files.worker.includes("BASE_FEES.obog.regular - staffApplicationPeriodDiscount(feePeriod) - staffGraduationDiscount(baseTicketType)") && files.registerScript.includes("baseFees.obog.regular - applicationPeriodDiscount(period) - graduationDiscount(attendeeType)")],
  ["staff no-reception deduction applied after half", files.worker.includes("staffParticipationFee - noReceptionDiscount(receptionAttendance)") && files.registerScript.includes("staffParticipationFee - noReceptionDiscount(reception)")],
  ["bank amount correction requires staff application", files.worker.includes("Only staff applications can use this amount correction.")],
  ["bank amount correction rejects received funds", files.worker.includes("Only an unpaid bank transfer with no received funds can be adjusted.") && files.worker.includes("Stripe has already received funds for this PaymentIntent.")],
  ["bank amount correction confirms application code", files.worker.includes("Application code confirmation does not match.")],
  ["bank amount correction recalculates stored application", files.worker.includes("requestedAmount !== calculatedAmount") && files.worker.includes("payment.bank_transfer_amount_adjusted")],
  ["bank amount correction rolls back Stripe on D1 failure", files.worker.includes("festa60-bank-adjust-rollback-")],
  ["bank amount correction reconfirms PaymentIntent", files.worker.includes("festa60-bank-adjust-confirm-") && files.worker.includes("confirmStripePaymentIntent")],
  ["bank instructions URL refreshed in D1", files.worker.includes("hosted_instructions_url = ?, updated_at = ?")],
  ["admin can refresh bank instructions", files.worker.includes('payload.action === "refresh_bank_transfer_instructions"') && files.worker.includes("payment.bank_transfer_instructions_refreshed")],
  ["refreshed bank instructions can be resent", files.worker.includes("renderBankTransferInstructionsRefreshedEmail") && files.worker.includes("銀行振込先・お支払い手順（再発行）")],
  ["preview omits actionable hosted link", !files.register.includes('id="bank-preview-instructions"')],
  ["design covers five issues", [1, 2, 3, 4, 5].every((number) => files.design.includes(`| ${number} |`))]
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failed.length) process.exitCode = 1;

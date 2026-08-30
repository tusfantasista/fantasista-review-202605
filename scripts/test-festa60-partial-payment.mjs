import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function extract(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `Could not extract ${startMarker}`);
  return source.slice(start, end);
}

const adminSource = fs.readFileSync(new URL("../public/assets/js/festa60-admin.js", import.meta.url), "utf8");
const adminContext = vm.createContext({});
vm.runInContext(
  `${extract(adminSource, "function effectivePaymentStatus", "function receivedAmount")}; this.effectivePaymentStatus = effectivePaymentStatus;`,
  adminContext
);

assert.equal(adminContext.effectivePaymentStatus({
  payment_status: "unpaid",
  latest_payment_status: "requires_action",
  amount_received_jpy: 2500,
  amount_remaining_jpy: 4000
}), "partially_funded");
assert.equal(adminContext.effectivePaymentStatus({
  payment_status: "paid",
  latest_payment_status: "requires_action",
  amount_received_jpy: 6500,
  amount_remaining_jpy: 0
}), "paid");
assert.equal(adminContext.effectivePaymentStatus({
  payment_status: "cancelled",
  latest_payment_status: "requires_action",
  amount_received_jpy: 2500,
  amount_remaining_jpy: 4000
}), "cancelled");
assert.equal(adminContext.effectivePaymentStatus({
  payment_status: "unpaid",
  payment_method: "stripe_checkout",
  stripe_checkout_session_id: "cs_live_incomplete",
  application_received_email_sent_at: null,
  payment_confirmed_email_sent_at: null,
  amount_received_jpy: 0,
  amount_remaining_jpy: 13000
}), "checkout_incomplete");
assert.equal(adminContext.effectivePaymentStatus({
  payment_status: "paid",
  payment_method: "stripe_checkout",
  stripe_checkout_session_id: "cs_live_paid",
  application_received_email_sent_at: "2026-08-30T00:00:00.000Z",
  payment_confirmed_email_sent_at: "2026-08-30T00:00:00.000Z",
  amount_received_jpy: 13000,
  amount_remaining_jpy: 0
}), "paid");

const workerSource = fs.readFileSync(new URL("../public/_worker.js", import.meta.url), "utf8");
const workerContext = vm.createContext({ __name: (value) => value });
vm.runInContext(`
  function bankTransferAmountRemaining(paymentIntent) {
    if (paymentIntent?.status === "succeeded") return 0;
    const remaining = Number(paymentIntent?.next_action?.display_bank_transfer_instructions?.amount_remaining);
    if (!Number.isFinite(remaining) || remaining < 0) throw new Error("missing amount remaining");
    return remaining;
  }
  ${extract(workerSource, "function bankTransferProgress", "async function findLinkedBankTransferByCustomer")}
  this.bankTransferProgress = bankTransferProgress;
`, workerContext);

assert.deepEqual(
  JSON.parse(JSON.stringify(workerContext.bankTransferProgress({
    status: "requires_action",
    amount: 6500,
    next_action: { display_bank_transfer_instructions: { amount_remaining: 4000 } }
  }))),
  {
    status: "partially_funded",
    amount_total_jpy: 6500,
    amount_received_jpy: 2500,
    amount_remaining_jpy: 4000
  }
);
assert.equal(workerContext.bankTransferProgress({
  status: "requires_action",
  amount: 6500,
  next_action: { display_bank_transfer_instructions: { amount_remaining: 6500 } }
}).status, "pending");
assert.equal(workerContext.bankTransferProgress({
  status: "succeeded",
  amount: 6500,
  amount_received: 6500
}).status, "paid");

assert.match(workerSource, /event\.type === "cash_balance\.funds_available"[\s\S]*retrieveLinkedBankTransferWithProgress/);
assert.match(workerSource, /refresh_bank_transfer_instructions[\s\S]*renderPartialPaymentEmail/);
assert.match(workerSource, /payment_method = 'stripe_checkout'[\s\S]*application_received_email_sent_at IS NULL/);

console.log("FESTA 60 partial-payment status tests passed.");

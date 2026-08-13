import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function extract(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `Could not extract ${startMarker}`);
  return source.slice(start, end);
}

const workerSource = fs.readFileSync(new URL("../public/_worker.js", import.meta.url), "utf8");
const context = vm.createContext({ __name: (value) => value });
vm.runInContext(
  `${extract(workerSource, "function isStripeChargeFullyRefunded", "async function markStripeChargeRefunded")}; this.isStripeChargeFullyRefunded = isStripeChargeFullyRefunded;`,
  context
);

assert.equal(context.isStripeChargeFullyRefunded({ amount: 6500, amount_refunded: 6500, refunded: true }), true);
assert.equal(context.isStripeChargeFullyRefunded({ amount: 6500, amount_refunded: 2500, refunded: false }), false);
assert.equal(context.isStripeChargeFullyRefunded({ amount: 6500, amount_refunded: 6500, refunded: false }), false);
assert.equal(context.isStripeChargeFullyRefunded({ amount: 0, amount_refunded: 0, refunded: true }), false);

assert.match(workerSource, /event\.type === "charge\.refunded"[\s\S]*markStripeChargeRefunded/);
assert.match(workerSource, /SET payment_status = 'refunded', status = 'refunded', attendance_status = 'refunded'/);
assert.match(workerSource, /SET status = 'refunded', refunded_at = COALESCE\(refunded_at, \?\)/);
assert.match(workerSource, /action: "payment\.partial_refund_observed"/);
assert.match(workerSource, /expectedPayment\.status === "refunded"[\s\S]*payment\.checkout_completed_after_refund_ignored/);

async function runRefund(charge) {
  const statements = [];
  const audits = [];
  const db = {
    prepare(sql) {
      const statement = { sql, values: [] };
      statements.push(statement);
      return {
        bind(...values) {
          statement.values = values;
          return this;
        },
        async first() {
          if (sql.includes("FROM payments")) {
            return { id: "pay_1", application_id: "app_1", amount_total: 6500, status: "paid" };
          }
          return null;
        },
        async run() {
          return { meta: { changes: 1 } };
        }
      };
    }
  };
  const integrationContext = vm.createContext({
    __name: (value) => value,
    isStripeChargeFullyRefunded: context.isStripeChargeFullyRefunded,
    nowIso: () => "2026-08-12T12:02:00.000Z",
    getApplicationById: async () => ({
      id: "app_1",
      application_code: "FESTA-000003",
      payment_status: "paid"
    }),
    audit: async (_db, item) => audits.push(item)
  });
  vm.runInContext(
    `${extract(workerSource, "async function markStripeChargeRefunded", "async function markPaymentPartiallyFunded")}; this.markStripeChargeRefunded = markStripeChargeRefunded;`,
    integrationContext
  );
  const result = await integrationContext.markStripeChargeRefunded(db, charge, "evt_refund_1");
  return { result: JSON.parse(JSON.stringify(result)), statements, audits };
}

const fullRefund = await runRefund({
  id: "ch_1",
  payment_intent: "pi_1",
  amount: 6500,
  amount_refunded: 6500,
  refunded: true
});
assert.deepEqual(fullRefund.result, { application_id: "app_1", fully_refunded: true });
assert.equal(fullRefund.statements.some(({ sql }) => sql.includes("UPDATE payments") && sql.includes("status = 'refunded'")), true);
assert.equal(fullRefund.statements.some(({ sql }) => sql.includes("UPDATE applications") && sql.includes("attendance_status = 'refunded'")), true);
assert.equal(fullRefund.audits.at(-1)?.action, "payment.refunded");

const partialRefund = await runRefund({
  id: "ch_1",
  payment_intent: "pi_1",
  amount: 6500,
  amount_refunded: 2500,
  refunded: false
});
assert.deepEqual(partialRefund.result, { application_id: "app_1", fully_refunded: false });
assert.equal(partialRefund.statements.some(({ sql }) => sql.includes("UPDATE applications")), false);
assert.equal(partialRefund.audits.at(-1)?.action, "payment.partial_refund_observed");

console.log("FESTA 60 Stripe refund webhook tests passed.");

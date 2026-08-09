# FESTA 60 Production Deployment

## Cloudflare resources

- Pages project: `tus-fantasista-festa60`
- D1 database: `festa60_production`
- Configuration: `wrangler.toml`
- Public payment methods: Stripe Checkout (cards, Apple Pay, and Google Pay) plus JPY bank transfer

The production D1 database is intentionally separate from `festa60_staging`.

## Required production secrets

Set these as encrypted Pages secrets. Never commit their values.

- `STRIPE_SECRET_KEY`: Stripe live secret key (`sk_live_...`)
- `STRIPE_WEBHOOK_SECRET`: signing secret for the production webhook (`whsec_...`)
- `STAFF_PAYMENT_ACCESS_CODE`: private code for the officers/helper payment menu
- `ADMIN_API_TOKEN`: random token for administrator APIs
- `EMAIL_WEBHOOK_URL`: mail delivery endpoint
- `EMAIL_API_TOKEN`: token used by the mail delivery endpoint

The `tus-fantasista` Pages project also requires `EMAIL_WEBHOOK_URL` and
`EMAIL_API_TOKEN` so `/api/contact` can deliver website inquiries directly to
`tus.festa.office@gmail.com`. Use the same approved FESTA office delivery
endpoint; do not commit either value to Git.

The Stripe production webhook URL is:

`https://tus-fantasista-festa60.pages.dev/api/festa60/stripe/webhook`

Subscribe it to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.partially_funded`
- `cash_balance.funds_available`

In Stripe Dashboard, enable cards and bank transfer for the account. Apple Pay and Google Pay are displayed by Stripe Checkout only when the device, browser, wallet, and card are eligible. The staff menu is available only at `/festa60-register/?staff=1`; never add a public navigation link or commit its access code.

Before deploying code that enables the hardened bank-transfer flow, apply `migrations/20260808_harden_bank_transfer_flow.sql` to the production D1 database. Confirm the same migration and flow in staging first. See `docs/FESTA60_REGISTRATION_PAYMENT_DESIGN.md` for the state model, email timing, and incident handling.

Create a Cloudflare Access application that protects both `/festa60-admin/*` and `/api/festa60/admin/*`. Allow only approved FESTA office members. Verify that an unauthenticated request cannot retrieve the dashboard HTML, JSON API, or CSV export before accepting production applications.

## Deploy

```bash
./scripts/build-festa60-production.sh
npx wrangler pages deploy festa60-public \
  --project-name tus-fantasista-festa60
```

Before accepting applications, verify that `/api/festa60/config` reports
`"stripe_mode": "live"` and complete one low-value live end-to-end test.

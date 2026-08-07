# FESTA 60 Production Deployment

## Cloudflare resources

- Pages project: `tus-fantasista-festa60`
- D1 database: `festa60_production`
- Configuration: `wrangler.toml`
- Public payment methods: Stripe card payment and bank transfer

The production D1 database is intentionally separate from `festa60_staging`.

## Required production secrets

Set these as encrypted Pages secrets. Never commit their values.

- `STRIPE_SECRET_KEY`: Stripe live secret key (`sk_live_...`)
- `STRIPE_WEBHOOK_SECRET`: signing secret for the production webhook (`whsec_...`)
- `ADMIN_API_TOKEN`: random token for administrator APIs
- `EMAIL_WEBHOOK_URL`: mail delivery endpoint
- `EMAIL_API_TOKEN`: token used by the mail delivery endpoint

The Stripe production webhook URL is:

`https://tus-fantasista-festa60.pages.dev/api/stripe/webhook`

Subscribe it to `checkout.session.completed` and `checkout.session.expired`.

## Deploy

```bash
./scripts/build-festa60-production.sh
npx wrangler pages deploy festa60-public \
  --project-name tus-fantasista-festa60
```

Before accepting applications, verify that `/api/festa60/config` reports
`"stripe_mode": "live"` and complete one low-value live end-to-end test.

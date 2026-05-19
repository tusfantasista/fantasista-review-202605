# FANTASISTA Review 202605

静的HTML/CSS/Vanilla JSを `public/` から配信する構成です。Cloudflare Pages / Workers Static Assets の公開対象は `public/` のみです。

## 60周年記念FESTA staging CRM

このブランチでは、60周年記念FESTAの参加申込・CRM検証用に Cloudflare Pages Functions + D1 + Stripe Checkout のstaging実装を追加しています。

重要な運用ルール:

- `main` へ直接pushしない
- 本番サイトへ直接デプロイしない
- 本番名簿CSV、`.env`、Stripe秘密鍵、Webhook Secretをコミットしない
- 本番D1とpreview/staging D1を共用しない
- 本番StripeキーとテストStripeキーを共用しない

想定フロー:

1. `feature/festa60-staging-crm` で実装する
2. `staging` ブランチ向けにPRを作る
3. Cloudflare Pages Preview Deploymentで確認する
4. Preview環境はCloudflare Accessなどで非公開にする
5. 動作確認後に本番切替用の環境変数・D1・Stripeキーを別途設定する

## 追加された画面

- 参加申込フォーム: `/festa60-register/`
- 管理画面: `/festa60-admin/`

管理画面はCloudflare Access配下での利用を前提にしています。ローカル/PreviewでAccessを使わない場合は、Cloudflare Secret `ADMIN_API_TOKEN` と同じ値を画面に入力してAPIへ送ります。

## 申込フォームの入力方針

- `期` は申込フォームと管理画面の表示項目には出しません。名簿CSVの互換性のためDB列は残します。
- OBOG / 若手OBOGは `卒部年度` を必須にします。
- 若手OBOGは、staging実装では「卒部10年以内」、具体的には `2017年度以降` の卒部生として扱います。この定義は参加費に影響するため、本番前に委員会側で最終確定してください。
- 同伴者がいる場合は、同伴者ごとに `氏名`、`続柄・関係`、`同伴者属性` を必須にします。
- 同伴者属性は `家族`、`OBOG`、`現役生`、`一般同伴者`、`子ども` から選択します。
- 同伴者メールアドレスと補足欄は任意です。

## Pages Functions API

- `POST /api/festa60/applications`
  - 参加申込をD1へ保存
  - Turnstile Secret設定時は検証
  - 有料チケットの場合はStripe Checkout Sessionを作成
  - Stripe metadataに `application_id`, `member_id`, `ticket_type` を設定
- `POST /api/festa60/stripe/webhook`
  - Stripe Webhook署名を検証
  - `checkout.session.completed` で `payments` と `applications` を更新
- `GET /api/festa60/admin/applications`
  - 申込一覧、決済状況、名簿照合状況を返す
- `GET /api/festa60/admin/export`
  - 申込一覧をCSVで出力
- `POST /api/festa60/admin/import`
  - OBOG名簿CSVをD1 `members` へ取込

## D1

Schema:

```bash
db/schema.sql
```

Preview seed:

```bash
db/seed-preview.sql
```

作成するテーブル:

- `members`
- `applications`
- `payments`
- `companions`
- `consents`
- `attendance`
- `import_batches`
- `audit_logs`

DB作成例:

```bash
npx wrangler d1 create fantasista-review-202605-staging
npx wrangler d1 execute fantasista-review-202605-staging --file db/schema.sql --remote
npx wrangler d1 execute fantasista-review-202605-staging --file db/seed-preview.sql --remote
```

本番DBは別名で作成してください。

```bash
npx wrangler d1 create fantasista-review-202605-production
npx wrangler d1 execute fantasista-review-202605-production --file db/schema.sql --remote
```

`wrangler.jsonc` の `database_id` はゼロ埋めのプレースホルダーです。CloudflareでD1を作成した後、preview/productionそれぞれの実IDへ置き換えてください。Cloudflare Pagesの設定ファイルで使えるnamed environmentは `preview` と `production` のみなので、`staging` ブランチの検証はPages Preview環境として扱います。

## 環境変数とSecrets

Preview / staging:

```bash
npx wrangler pages secret put STRIPE_SECRET_KEY
npx wrangler pages secret put STRIPE_WEBHOOK_SECRET
npx wrangler pages secret put TURNSTILE_SECRET_KEY
npx wrangler pages secret put ADMIN_API_TOKEN
```

Preview / stagingでは `STRIPE_SECRET_KEY` が `sk_test_` で始まらない場合、Checkout作成を拒否します。

Production:

```bash
npx wrangler pages secret put STRIPE_SECRET_KEY
npx wrangler pages secret put STRIPE_WEBHOOK_SECRET
npx wrangler pages secret put TURNSTILE_SECRET_KEY
npx wrangler pages secret put ADMIN_API_TOKEN
```

Productionでは `STRIPE_SECRET_KEY` が `sk_live_` で始まらない場合、Checkout作成を拒否します。

公開してよい変数:

- `ENVIRONMENT`
- `PUBLIC_BASE_URL`
- `TURNSTILE_SITE_KEY`

Secretsにする変数:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TURNSTILE_SECRET_KEY`
- `ADMIN_API_TOKEN`

## Stripeテスト

1. Stripe Dashboardでテストモードを有効にする
2. `STRIPE_SECRET_KEY` に `sk_test_...` を設定
3. Webhook endpointをPreview URLの `/api/festa60/stripe/webhook` に向ける
4. `checkout.session.completed` を購読する
5. Webhook signing secretを `STRIPE_WEBHOOK_SECRET` に設定する
6. `/festa60-register/` からテスト申込を送る
7. StripeテストカードでCheckoutを完了する
8. 管理画面で `payment_status = paid` と `attendance_status = confirmed` を確認する

## 本番切替

本番切替時に行うこと:

1. production D1を作成し、`db/schema.sql` を適用する
2. 本番名簿CSVを管理画面から取り込む
3. productionのD1 bindingがstagingと別DBを向いていることを確認する
4. productionの `STRIPE_SECRET_KEY` に `sk_live_...` を設定する
5. productionのWebhook endpointと `STRIPE_WEBHOOK_SECRET` を設定する
6. Turnstile production site/secret keyを設定する
7. Cloudflare Accessまたは同等の認証で管理画面を保護する
8. Previewで最終確認後、stagingからmainへレビュー付きで反映する

## 旧フォーム運用メモ

以前は静的フォームでメール本文を生成する運用でした。今後はCRM APIへ移行する想定です。管理項目（`member_id`、`payment_status`、`match_status` など）はユーザー入力フォームには出さず、D1側で管理します。

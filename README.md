# FANTASISTA Review 202605

静的HTML/CSS/Vanilla JSを `public/` から配信する構成です。Cloudflare Pages / Workers Static Assets の公開対象は `public/` のみです。

## 60周年記念FESTA staging CRM

このブランチでは、60周年記念FESTAの参加申込・CRM検証用に Cloudflare Pages Functions + D1 + Stripe Checkout のstaging実装を追加しています。

重要な運用ルール:

- `main` へ直接pushしない
- 本番サイトへ直接デプロイしない
- 本番名簿CSV、`.env`、Stripe秘密鍵、Webhook Secretをコミットしない
- 本番D1とpreview/staging D1を共用しない
- staging検収ではStripeテストキーのみを使い、本番Stripeキーは使わない

想定フロー:

1. `feature/festa60-staging-crm` で実装する
2. `staging` ブランチ向けにPRを作る
3. Cloudflare Pages Preview Deploymentで確認する
4. Preview環境はCloudflare Accessなどで非公開にする
5. 動作確認後に本番切替用の環境変数・D1・Stripeキーを別途設定する

## 追加された画面

- 参加申込フォーム: `/festa60-register/`
- 管理画面: `/festa60-admin/`

管理画面はCloudflare Access配下での利用を前提にしています。ローカル/PreviewでAccessを使わない場合は、Cloudflare Secret `ADMIN_API_TOKEN` と同じ値を画面に入力してAPIへ送ります。staging検収中の画面上部には `TEST環境` バナーを常時表示します。

## 申込フォームの入力方針

- `期` は申込フォームと管理画面の表示項目には出しません。名簿CSVの互換性のためDB列は残します。
- OBOG系の会費区分は `一般OBOG`、`OBOG 6〜10年目`、`OBOG 5年目以下`、`OBOG役員・当日手伝い` に分けます。
- OBOG 6〜10年目は `2016〜2020年度卒`、OBOG 5年目以下は `2021〜2025年度卒` を想定しています。この年度定義は参加費に影響するため、本番前に委員会側で最終確定してください。
- 申込者の会費は `会費区分`、`入金時期`、`懇親会参加有無` で計算します。
- 懇親会なしの場合は、一般OBOG/OBOG 6〜10年目/OBOG 5年目以下から `2,000円` を差し引きます。
- 現役部員は本体無料、懇親会参加時のみ `4,000円` として扱います。
- 同伴者がいる場合は、同伴者ごとに `氏名`、`続柄・関係`、`同伴者属性` を必須にします。
- 同伴者属性は `同伴者（大人）`、`同伴者（子供）` から選択します。大人は懇親会参加 `8,000円` / 懇親会なし `6,000円`、子供は懇親会参加 `3,000円` / 懇親会なし `1,000円` として計算します。
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

Fresh migration:

```bash
db/migrations/0000_create_festa60_tables.sql
```

Schema reference:

```bash
db/schema.sql
```

Dummy seed CSV:

```bash
db/seeds/dummy-members-staging.csv
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

staging検収用D1は `festa60_staging` のみを使います。このfeatureブランチの `wrangler.jsonc` はPreview/Production named environmentを含めて `festa60_staging` に向けています。本番DBはこのブランチでは使いません。

DB作成・migration例:

```bash
npx wrangler d1 create festa60_staging
npx wrangler d1 execute festa60_staging --file db/migrations/0000_create_festa60_tables.sql --remote
```

ダミー名簿CSVは管理画面またはAPIから取り込みます。本物の名簿CSVはGitに入れません。

```bash
curl -X POST "$PREVIEW_URL/api/festa60/admin/import" \
  -H "content-type: application/json" \
  -H "x-admin-token: $ADMIN_API_TOKEN" \
  --data-binary @- <<'JSON'
{
  "file_name": "dummy-members-staging.csv",
  "csv": "氏名,ふりがな,メールアドレス,卒部年度,所属校\nテスト 一郎,てすと いちろう,staging.member1@example.test,2022,東京理科大学"
}
JSON
```

Cloudflare Pagesの設定ファイルで使えるnamed environmentは `preview` と `production` のみなので、`feature/festa60-staging-crm` や `staging` ブランチの検証はPages Preview環境として扱います。

## 環境変数とSecrets

Preview / staging:

```bash
npx wrangler pages secret put STRIPE_SECRET_KEY
npx wrangler pages secret put STRIPE_WEBHOOK_SECRET
npx wrangler pages secret put TURNSTILE_SECRET_KEY
npx wrangler pages secret put ADMIN_API_TOKEN
```

Preview / stagingでは `STRIPE_SECRET_KEY` が `sk_test_` で始まらない場合、Checkout作成を拒否します。このfeatureブランチではStripe本番キーを受け付けません。
Webhook secretも `STRIPE_WEBHOOK_SECRET` 環境変数から読みます。検収メモ上は `whsec_test_...` として管理し、コードには書きません。

Production:

```bash
# このfeatureブランチではproduction運用しません。
# 本番化時は別PRでproduction D1とStripe本番キーの設計に切り替えてください。
```

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

## staging検収手順

1. `git branch --show-current` が `main` ではないことを確認する
2. `wrangler.jsonc` のD1 bindingが `festa60_staging` を向いていることを確認する
3. `npx wrangler d1 execute festa60_staging --file db/migrations/0000_create_festa60_tables.sql --remote` を実行する
4. `npx wrangler pages deploy public --project-name fantasista-review-202605-staging --branch feature/festa60-staging-crm --commit-dirty=true` でPreview Deploymentする
5. Cloudflare AccessでPreview URLを非公開にする
6. `STRIPE_SECRET_KEY=sk_test_...` と `STRIPE_WEBHOOK_SECRET=whsec_test_...` をPages Preview secretに設定する
7. `/festa60-register/` で `TEST環境` バナーが見えることを確認する
8. 有料申込でStripe Checkoutへ遷移し、テストカードで決済する
9. Stripe webhookで `checkout.session.completed` を受け、管理画面で `paid` になることを確認する
10. 管理画面で申込一覧、決済状況、名簿照合、CSVエクスポート、ダミーCSV取込を確認する
11. `git grep` で `.env`、秘密鍵、本物CSV、個人情報がGitに入っていないことを確認する

## 本番切替

本番切替時に行うこと:

1. production D1を作成し、`db/schema.sql` を適用する
2. 本番名簿CSVを管理画面から取り込む
3. productionのD1 bindingがstagingと別DBを向いていることを確認する
4. productionのStripe本番キー、Webhook endpoint、`STRIPE_WEBHOOK_SECRET` を別PRで設定する
5. Turnstile production site/secret keyを設定する
6. Cloudflare Accessまたは同等の認証で管理画面を保護する
7. Previewで最終確認後、stagingからmainへレビュー付きで反映する

## 旧フォーム運用メモ

以前は静的フォームでメール本文を生成する運用でした。今後はCRM APIへ移行する想定です。管理項目（`member_id`、`payment_status`、`match_status` など）はユーザー入力フォームには出さず、D1側で管理します。

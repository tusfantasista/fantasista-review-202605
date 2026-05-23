# FANTASISTA Review 202605

静的HTML/CSS/Vanilla JSを `public/` から配信する構成です。Cloudflare Pages / Workers Static Assets の公開対象は `public/` のみです。

## 60周年記念FESTA staging CRM

このブランチでは、60周年記念FESTAの参加申込・CRM検証用に Cloudflare Pages Functions + D1 のstaging実装を追加しています。現時点の支払いは銀行振込のみで、将来のStripe / PAY.JP / KOMOJU等のオンライン決済連携に備えて支払方法・支払プロバイダ・外部決済IDを分離しています。

重要な運用ルール:

- `main` へ直接pushしない
- 本番サイトへ直接デプロイしない
- 本番名簿CSV、`.env`、銀行口座の実情報、決済/メール送信の秘密鍵をコミットしない
- 本番D1とpreview/staging D1を共用しない
- 現時点では本番Stripe/PAY.JP/KOMOJUキーを使わない

想定フロー:

1. `feature/festa60-staging-crm` で実装する
2. `staging` ブランチ向けにPRを作る
3. Cloudflare Pages Preview Deploymentで確認する
4. Preview環境はCloudflare Accessなどで非公開にする
5. 動作確認後に本番切替用の環境変数・D1・銀行口座情報・メール送信設定を別途設定する

## 追加された画面

- 参加申込フォーム: `/festa60-register/`
- 管理画面: `/festa60-admin/`

管理画面はCloudflare Access配下での利用を前提にしています。ローカル/PreviewでAccessを使わない場合は、Cloudflare Secret `ADMIN_API_TOKEN` と同じ値を画面に入力してAPIへ送ります。staging検収中の画面上部には `TEST環境` バナーを常時表示します。

## Access保護

stagingのフォームと管理画面はCloudflare Accessで非公開にします。未認証のcurlで `/apply` と `/admin` が HTTP 200 になってはいけません。このブランチではPages Functions middlewareでもAccessヘッダーの有無を確認し、未認証の場合は401を返します。
CLI検収だけはPreview Secretの `ACCESS_BYPASS_TOKEN`、未設定時は `ADMIN_API_TOKEN` を `x-access-bypass-token` または `x-admin-token` で送ることで通せます。この値もGitには入れません。検収バイパスはPreview/staging専用で、`main` / `production` では無効です。本物名簿投入前は `ADMIN_TOKEN_BYPASS_ENABLED=false` か `ACCESS_BYPASS_ENABLED=false` を設定、またはトークンSecretを削除して無効化します。

Access対象:

- `/apply`
- `/admin`
- `/festa60-register/`
- `/festa60-admin/`
- `/api/festa60/applications`
- `/api/festa60/admin/*`

オンライン決済を将来再開する場合、WebhookだけはAccessで塞がず、決済プロバイダ側の署名検証で保護してください。既存のStripe webhook routeは署名なしPOSTでHTTP 400を返します。

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
- 振込名義予定は任意入力です。申込者名と異なる名義で振り込む場合、管理画面で確認できます。

## Pages Functions API

- `POST /api/festa60/applications`
  - 参加申込をD1へ保存
  - Turnstile Secret設定時は検証
  - `FESTA-000001` 形式の受付番号を発行
  - `payment_method = bank_transfer`、`payment_provider = manual`、`payment_status = unpaid` で手動入金管理用のpaymentを作成
  - 申込完了メール本文を生成し、`EMAIL_WEBHOOK_URL` 設定時のみ送信
- `PATCH /api/festa60/admin/applications/:id`
  - `paymentStatus` を `unpaid` / `paid` / `cancelled` / `refunded` に更新
  - `paidAt` / `cancelledAt` / `refundedAt` に相当する日時を保存
  - 入金済み更新時は参加確定メール本文を生成
- `POST /api/festa60/stripe/webhook`
  - 将来のオンライン決済再開用。Stripe Webhook署名を検証
  - `checkout.session.completed` で `payments` と `applications` を更新
  - `checkout.session.expired` でキャンセル扱いへ更新
  - `stripe_events` へイベントIDを保存し、同一イベントの二重処理を防止
- `POST /api/stripe/webhook`
  - Stripe側に設定しやすい短縮alias。処理内容は `/api/festa60/stripe/webhook` と同じ
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
- `payment_line_items`
- `companions`
- `consents`
- `attendance`
- `import_batches`
- `audit_logs`
- `stripe_events`

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
npx wrangler pages secret put TURNSTILE_SECRET_KEY
npx wrangler pages secret put ADMIN_API_TOKEN
npx wrangler pages secret put BANK_NAME
npx wrangler pages secret put BANK_BRANCH_NAME
npx wrangler pages secret put BANK_BRANCH_CODE
npx wrangler pages secret put BANK_ACCOUNT_TYPE
npx wrangler pages secret put BANK_ACCOUNT_NUMBER
npx wrangler pages secret put BANK_ACCOUNT_HOLDER
npx wrangler pages secret put BANK_ACCOUNT_HOLDER_KANA
npx wrangler pages secret put BANK_TRANSFER_NOTE
npx wrangler pages secret put BANK_TRANSFER_DEADLINE_DAYS
npx wrangler pages secret put CONTACT_EMAIL
```

現時点の申込受付は銀行振込のみです。申込時は `payment_method = bank_transfer`、`payment_provider = manual`、`payment_status = unpaid` で保存し、管理画面で入金済み・キャンセル・返金済みに更新します。
メール送信プロバイダを接続する場合は、必要に応じて `EMAIL_WEBHOOK_URL` と `EMAIL_API_TOKEN` をSecretに設定します。未設定の場合は送信をskipし、管理画面でメール本文を生成して手動送信できます。

Production:

```bash
# このfeatureブランチではproduction運用しません。
# 本番化時は別PRでproduction D1、銀行口座情報、本番メール送信設定を切り替えてください。
```

公開してよい変数:

- `ENVIRONMENT`
- `PUBLIC_BASE_URL`
- `TURNSTILE_SITE_KEY`

Secretsにする変数:

- `TURNSTILE_SECRET_KEY`
- `ADMIN_API_TOKEN`
- `BANK_NAME`
- `BANK_BRANCH_NAME`
- `BANK_BRANCH_CODE`
- `BANK_ACCOUNT_TYPE`
- `BANK_ACCOUNT_NUMBER`
- `BANK_ACCOUNT_HOLDER`
- `BANK_ACCOUNT_HOLDER_KANA`
- `BANK_TRANSFER_NOTE`
- `BANK_TRANSFER_DEADLINE_DAYS`
- `CONTACT_EMAIL`
- `EMAIL_WEBHOOK_URL`
- `EMAIL_API_TOKEN`

Preview/staging検収用:

- `ACCESS_BYPASS_TOKEN` または `ADMIN_API_TOKEN`
- `ADMIN_TOKEN_BYPASS_ENABLED` / `ACCESS_BYPASS_ENABLED`

## 銀行振込運用

1. `/festa60-register/` から申込を送る
2. `FESTA-000001` 形式の受付番号が発行されることを確認する
3. 申込完了画面に受付番号、金額、銀行振込、振込名義例が表示されることを確認する
4. 管理画面で `payment_status = unpaid` の申込を確認する
5. 入金確認後、管理画面の「入金済みにする」で `payment_status = paid`、`paid_at` を保存する
6. 生成された参加確定メール本文を送信する
7. キャンセル時は `cancelled`、返金後は `refunded` に更新する

将来オンライン決済を追加する場合は、申込ID `application_code` を中心にし、外部決済IDを `external_payment_id` に保存します。`payment_method` は `card`、`convenience_store`、`paypay` など、`payment_provider` は `stripe`、`payjp`、`komoju` などに拡張できます。

## staging検収手順

1. `git branch --show-current` が `main` ではないことを確認する
2. `wrangler.jsonc` のD1 bindingが `festa60_staging` を向いていることを確認する
3. `npx wrangler d1 execute festa60_staging --file db/migrations/0000_create_festa60_tables.sql --remote` を実行する
4. `npx wrangler pages deploy public --project-name fantasista-review-202605-staging --branch feature/festa60-staging-crm --commit-dirty=true` でPreview Deploymentする
5. Cloudflare AccessでPreview URLを非公開にする
   - `/apply` と `/admin` は未認証curlでHTTP 200にならないこと
   - `/api/stripe/webhook` はAccess対象外にし、署名なしPOSTでHTTP 400になること
6. 銀行口座情報と `CONTACT_EMAIL` をPages Preview secretに設定する
7. `/festa60-register/` で `TEST環境` バナーが見えることを確認する
8. 有料申込で受付番号が発行され、`payment_method = bank_transfer`、`payment_provider = manual`、`payment_status = unpaid` になることを確認する
9. 同伴者費、寄付、協賛が `payment_line_items` に保存されることを確認する
10. 管理画面で入金済み・キャンセル・返金済みへ更新できることを確認する
11. 入金済み更新時に `paid_at` が保存され、参加確定メール本文が生成されることを確認する
12. 管理画面で申込一覧、支払状況、名簿照合、CSVエクスポート、ダミーCSV取込を確認する
13. `git grep` で `.env`、秘密鍵、本物CSV、個人情報がGitに入っていないことを確認する

## 本番切替

本番切替時に行うこと:

1. production D1を作成し、`db/schema.sql` を適用する
2. 本番名簿CSVを管理画面から取り込む
3. productionのD1 bindingがstagingと別DBを向いていることを確認する
4. productionの銀行口座情報、問い合わせ先、メール送信設定を別PRで設定する
5. Turnstile production site/secret keyを設定する
6. Cloudflare Accessまたは同等の認証で管理画面を保護する
7. Previewで最終確認後、stagingからmainへレビュー付きで反映する

## 旧フォーム運用メモ

以前は静的フォームでメール本文を生成する運用でした。今後はCRM APIへ移行する想定です。管理項目（`member_id`、`payment_status`、`match_status` など）はユーザー入力フォームには出さず、D1側で管理します。

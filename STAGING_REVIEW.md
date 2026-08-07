# FANTASISTA レビュー環境

## 目的

レビュー環境は、管理者が本番公開前に実際のURLで変更内容を確認するためのCloudflare Pagesテスト環境です。

- GitHub: `https://github.com/tusfantasista/fantasista-review-202605`
- Cloudflare Pagesプロジェクト: `fantasista-review-202605-staging`
- レビューURL: `https://fantasista-review-202605-staging.pages.dev/`
- D1: `festa60_staging`
- Stripe: サンドボックス
- 専用設定: `wrangler.staging.jsonc`

ローカルプレビューとGitHubのPRは事前検査・履歴確認に使いますが、この運用でいう「レビュー」は上記Cloudflareテスト環境での確認を指します。

## 反映前の確認

1. 作業ブランチへ変更をコミットし、GitHubへプッシュする。
2. `git status --short` で意図しない未コミット変更がないことを確認する。
3. `RELEASE_WORKFLOW.md` の標準検査をすべて通す。
4. 個人情報、秘密情報、内部資料が公開対象に含まれていないことを確認する。
5. `wrangler.staging.jsonc` が `festa60_staging` を参照していることを確認する。
6. レビュー環境に `STAFF_PAYMENT_ACCESS_CODE` が暗号化シークレットとして設定されていることを確認する。

## レビュー環境への反映

本番用の `wrangler.toml` は使用しません。必ずレビュー専用設定を明示します。

```bash
npx wrangler pages deploy public \
  --project-name fantasista-review-202605-staging \
  --config wrangler.staging.jsonc
```

## 反映後の確認

- トップ、60周年特設、申込、FAQ、問い合わせの対象ページが表示できる。
- 画面にテスト環境の表示がある。
- `/api/festa60/config` がliveモードを返さない。
- 申込データは `festa60_staging` にのみ保存される。
- 一般申込はStripeサンドボックスへ遷移し、カード、対象端末のApple Pay・Google Pay、PayPay、銀行振込の有効な方法が表示される。
- StripeサンドボックスのWebhook送信先は `/api/festa60/stripe/webhook` とし、`checkout.session.completed`、`checkout.session.async_payment_succeeded`、`checkout.session.async_payment_failed`、`checkout.session.expired`、`payment_intent.partially_funded` の5イベントを購読する。
- 銀行振込の不足入金テストでは、D1の支払状態が `partially_funded`、申込状態が未確定のままとなり、確認済み入金額・不足額・メール送信時刻が記録されることを確認する。
- `/festa60-register/?staff=1` だけに役員・当日お手伝い専用申込が表示され、一般申込には専用料金へのリンクがない。
- 専用申込は正しいアクセスコードでのみ受け付け、コードはD1やGitHubに保存されない。
- レビュー対象コミットとレビューURLを管理者へ提示する。

レビュー完了後も、管理者から明示的な本番許可が出るまで、`main`へのマージ、本番Pagesへのデプロイ、Stripe live設定、本番D1や本番メール設定の変更は行いません。

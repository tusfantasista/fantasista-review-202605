# FANTASISTA Git・公開運用

## 基本原則

GitHubでソースと変更履歴を管理し、Cloudflare Pagesのテスト環境で画面レビューを行ってから本番配信します。本番公開は自動化せず、管理者の明示的な許可を必須とします。

## 用語と管理場所

- GitHub管理先: `https://github.com/tusfantasista/tus-fantasista`
- レビュー: Cloudflareのテスト環境へ反映し、実際のURLで確認する工程
- レビュー環境: `https://fantasista-review-202605-staging.pages.dev/`
- 本番環境: `tus-fantasista.pages.dev` と `tus-fantasista-festa60.pages.dev`

この文書で「レビュー」と記載した場合、ローカルプレビューやGitHub PRの閲覧だけではなく、上記テスト環境での確認を指します。

## 正本

- 共通ソース: `public/`
- 本番用固定ファイル: `production/`
- ビルド・検査: `scripts/`
- 60周年特設Cloudflare設定: `wrangler.toml`
- FANTASISTA本体Cloudflare設定: `fantasista-site/wrangler.toml`

`festa60-public/` と `fantasista-site/public/` は生成物です。直接編集せず、Gitにも登録しません。

## 変更フロー

1. `main` の最新状態から `agent/<内容>` または `feature/<内容>` ブランチを作成する。
2. `public/` などの正本だけを編集する。
3. ビルド、リンク検査、JavaScript構文検査を行う。
4. ローカルHTTPサーバーで主要ページとモバイル表示を事前確認する。
5. 変更をGitHubの作業ブランチへコミット・プッシュして履歴を残す。
6. 同じコミットをCloudflareのレビュー環境へ反映する。
7. レビュー環境のURL、変更ファイル、検査結果、未確定事項を管理者へ提示する。
8. 管理者のレビュー中は、本番デプロイ、`main` へのマージ、Stripe・Cloudflare本番設定の変更を行わない。
9. 管理者がレビュー環境を確認し、明示的に「デプロイして」「本番反映して」などと許可した後だけ本番反映する。
10. 許可後に内容が変わった場合は、レビュー環境を更新し、再レビューと再許可を受ける。

## 標準検査

```bash
./scripts/build-festa60-production.sh
./scripts/build-fantasista-production.sh
node scripts/check-local-links.mjs public
node scripts/check-local-links.mjs festa60-public
node scripts/check-local-links.mjs fantasista-site/public
node --check public/_worker.js
node --check public/assets/js/festa60-register.js
node --check public/assets/js/site.js
```

## GitHubへ保存しないもの

- Stripe、Cloudflare、メール送信のAPIキーとWebhook署名シークレット
- `.env*`、`.dev.vars*`、秘密鍵
- OBOG名簿、住所、メールアドレス、電話番号、フォーム回答
- D1本番・ステージングDBとそのエクスポート
- `private-imports/`、未公開写真、管理者用CSV
- `festa60-public/`、`fantasista-site/public/` などの生成物

秘密情報はCloudflareの暗号化シークレット、個人情報はD1や承認済み管理システムで管理します。公開サイトには集計済み・公開承認済みのデータだけを置きます。

## レビュー環境の安全条件

- Cloudflare Pagesプロジェクトは `fantasista-review-202605-staging` を使用する。
- D1は `festa60_staging` だけを使用し、本番DBへ接続しない。
- Stripeはサンドボックスだけを使用し、liveキーや本番Webhookを設定しない。
- レビュー環境のデプロイでは `wrangler.staging.jsonc` を明示し、本番用の `wrangler.toml` を使用しない。
- 画面上のテスト環境表示を消さない。
- レビュー環境への反映は本番公開の許可を意味しない。

具体的なレビュー環境への反映と確認は [`STAGING_REVIEW.md`](./STAGING_REVIEW.md) に従います。

## 本番反映

レビュー環境を確認した管理者から明示的な承認を得た後、具体的なコマンドと確認項目は [`PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md) に従います。Stripeを有効化する場合は、デプロイ前後に `/api/festa60/config` が意図した環境を返すことを確認し、低額の実決済テストは管理者立会いで行います。

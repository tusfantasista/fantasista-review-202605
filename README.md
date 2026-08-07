# FANTASISTA サイト構成メモ

## 現在の正本と公開手順

- 編集の正本は `public/` です。ルート直下に残る旧ページを直接編集しません。
- 60周年特設の本番成果物は `scripts/build-festa60-production.sh` で `festa60-public/` に生成します。
- FANTASISTA本体の本番成果物は `scripts/build-fantasista-production.sh` で `fantasista-site/public/` に生成します。
- 生成物、秘密情報、フォーム回答、名簿、管理用CSVはGitHubへ保存しません。
- 本番反映は、ローカルプレビューと差分レビューの後、サイト管理者が明示的に許可した場合だけ実施します。

詳細は [`RELEASE_WORKFLOW.md`](./RELEASE_WORKFLOW.md) を参照してください。

このリポジトリは、FANTASISTA会の仮公式サイトと、60周年記念FESTA関連ページを管理します。

## 公式ページ

以下の2つを、外部共有用の仮公式ページとして扱います。

- GitHub Pages: `https://tusfantasista.github.io/fantasista-review-202605/`
- Cloudflare Workers: `https://fantasista-review-202605.tus-fantasista.workers.dev/`

どちらも同じ静的サイトを表示する想定です。公開対象は `public/` 配下のみです。

## ページの役割

| パス | 役割 | 公開方針 |
|---|---|---|
| `/` | FANTASISTA会の仮公式トップ | 外部共有可 |
| `/festa-60th/` | 60周年記念FESTA特設サイト | 外部共有前提の仮公式ページ |
| `/festa-60th/#entry` | 60周年FESTAの参加意向登録 | 現時点では正式申込ではない |
| `/festa/` | 通常FESTAページ | 既存ページとして維持 |
| `/contact/` | 問い合わせ・写真提供導線 | 外部共有可 |

## 60周年記念FESTA特設サイト

`/festa-60th/` は、OBOG・現役生・先生・関係者に向けた公開前の仮公式ページです。

- 開催日、会場、対象者、参加意向受付中であることを明記します。
- 正式申込、会費、入金方法、タイムテーブルは未確定として扱い、決定後に案内します。
- ページ内フォームは参加意向確認であり、決済や会費徴収は行いません。
- 内部メモや、会場が未確定に見える表現は公開ページに出しません。

## Cloudflareフォーム・CRM

Cloudflare上で動かす申込フォーム、D1保存、管理画面、CSV取込、入金管理は、静的なGitHub Pagesとは分けて扱います。

- Cloudflare Pages/Workers Functions + D1 を使う場合は、GitHub Pages側では動きません。
- 管理画面や申込管理APIは Cloudflare Access 配下で運用します。
- 本番DB、staging DB、秘密鍵、口座情報、本物名簿CSVはリポジトリに入れません。
- 公開前の検収用CRMは、staging/featureブランチとPreview環境で確認します。

想定パスは以下です。

| パス | 役割 | 公開方針 |
|---|---|---|
| `/festa60-register/` | Cloudflareフォームページ | Accessまたは限定公開で検収 |
| `/festa60-admin/` | 管理画面 | Access必須 |
| `/api/festa60/*` | 申込・管理API | Access/署名/権限確認を前提 |

## デプロイ方針

1. 通常の静的ページ修正はfeatureブランチで作業します。
2. レビュー後、`main` に反映するとGitHub Pagesの公式仮ページに出ます。
3. Cloudflare Workers公式ページへ反映する場合は、`public/` を公開対象として手動デプロイします。
4. Cloudflareフォーム・CRMは、staging/Previewで検収してから本番向けに切り替えます。

## 静的フォームの現在の扱い

`/festa-60th/#entry` のフォームは、現時点では参加意向の確認用です。

- フォーム名: `festa60-obog-crm-entry`
- 送信処理: `assets/js/site.js` の `data-mailto-form` でメール本文を生成
- 保存先: ブラウザ上でメール本文を作るだけで、リポジトリや静的サイト内には保存しません
- 将来移行: Cloudflare D1、Google Forms、Airtable、CRM APIなどに送信先を差し替える想定

正式申込、入金管理、CSV取込、管理者操作が必要になった段階では、Cloudflareフォーム・CRM側へ移行します。

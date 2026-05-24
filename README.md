# FANTASISTA サイト構成メモ

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
| `/festa-60th/#entry` | 60周年FESTAの参加・寄付意向登録 | 現時点では正式申込ではない |
| `/festa/` | 通常FESTAページ | 既存ページとして維持 |
| `/contact/` | 問い合わせ・写真提供導線 | 外部共有可 |

## 60周年記念FESTA特設サイト

`/festa-60th/` は、OBOG・現役生・先生・関係者に向けた公開前の仮公式ページです。

- 開催日、会場、対象者、参加意向受付中であることを明記します。
- 正式参加登録は2026年8月1日開始予定、第1期早期登録・振込期限は2026年9月30日です。
- 正式申込、会費、入金方法、タイムテーブルは未確定として扱い、決定後に案内します。
- ページ内フォームは参加・寄付意向確認であり、決済や会費徴収は行いません。
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
| `/admin/festa60/interests/` | 参加・寄付意向管理画面 | Access必須 |
| `/api/festa60/*` | 申込・管理API | Access/署名/権限確認を前提 |

## デプロイ方針

1. 通常の静的ページ修正はfeatureブランチで作業します。
2. レビュー後、`main` に反映するとGitHub Pagesの公式仮ページに出ます。
3. Cloudflare Pages stagingは `wrangler.jsonc` を使い、`pages_build_output_dir = ./public` とD1 bindingを前提にします。
4. Cloudflare Workers公式ページへ反映する場合は、`wrangler.worker.jsonc` を使い、`public/` を静的assetsとして手動デプロイします。
5. Cloudflareフォーム・CRMは、staging/Previewで検収してから本番向けに切り替えます。

## 静的フォームの現在の扱い

`/festa-60th/#entry` のフォームは、2026年7月末までの参加・寄付意向確認用です。

- フォーム名: `festa60-interest-registration`
- 送信処理: `assets/js/festa60-interest.js` から `POST /api/festa60/interest` へ送信
- 保存先: Cloudflare D1 `festa60_interest_registrations`
- 登録番号: `INT-000001` 形式の意向登録番号
- 送信後: 会費請求、決済、銀行振込案内は表示しません

正式申込、入金管理、CSV取込、管理者操作が必要になった段階では、Cloudflareフォーム・CRM側へ移行します。

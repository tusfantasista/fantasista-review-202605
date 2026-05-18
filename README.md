# FANTASISTA 60周年FESTA フォーム運用メモ

## 現在の静的フォーム運用

- GitHub Pages公開時は、`assets/js/site.js` の `data-mailto-form` 処理で入力内容からメール件名・本文を生成します。
- 入力内容はブラウザ上でメール本文に変換するだけで、GitHubリポジトリや公開サイト内には保存しません。
- メールソフトが開けない場合に備え、確認欄から本文をコピーできるようにしています。
- 将来Netlify Forms、Google Forms、Supabase、Airtable、CRM APIへ移行する場合は、HTMLの `name` 属性を取り込み項目として使い、送信処理だけを差し替えます。
- 管理項目（`obog_master_id`、`payment_status` など）はユーザー入力フォームには出さず、CSV出力後またはCRM側で付与します。

## Netlify Forms

- フォーム名: `festa60-obog-crm-entry`
- 設置場所: `festa-60th/index.html`
- 送信後遷移先: `/thanks.html`
- フォーム回答は、OBOGマスタ情報、連絡先情報、FESTA60周年イベント参加情報の3系統に分けて扱う想定です。

## CSV出力後に追加する管理列

Netlify FormsからCSVを出力した後、管理用スプレッドシート側で以下の列を追加してください。これらは管理者が後から付与する情報であり、フォーム入力項目には含めません。

- `obog_master_id`
- `match_status`
- `match_confidence`
- `master_update_required`
- `attendance_status`
- `payment_status`
- `payment_date`
- `reception_status`
- `last_contact_date`
- `admin_note`

## `match_status` 候補

- `matched`
- `possible_match`
- `new_contact`
- `duplicate_check_needed`
- `unmatched`

## `attendance_status` 候補

- `intent_yes`
- `considering`
- `intent_no`
- `confirmed`
- `cancelled`

## `payment_status` 候補

- `not_required_yet`
- `unpaid`
- `paid`
- `exempted`
- `refund_needed`

## OBOGマスタ突合の運用イメージ

1. Netlify Formsから `festa60-obog-crm-entry` のCSVを出力します。
2. OBOGマスタの氏名、旧姓、ふりがな、メールアドレス、卒部年度または期、当時の役割、所属団体と照合します。
3. 一致度に応じて `match_status` と `match_confidence` を管理者が付与します。
4. 連絡先や所属情報に差分があれば `master_update_required` を更新します。
5. 正式参加登録開始後に `attendance_status`、入金確認後に `payment_status` と `payment_date`、当日は `reception_status` を更新します。

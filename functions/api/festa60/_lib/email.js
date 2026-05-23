export function bankInfo(env) {
  const accountHolder = env.BANK_ACCOUNT_HOLDER || env.BANK_ACCOUNT_NAME || "口座名義未設定";
  return {
    bankName: env.BANK_NAME || "銀行名未設定",
    branchName: env.BANK_BRANCH_NAME || "支店名未設定",
    branchCode: env.BANK_BRANCH_CODE || "支店コード未設定",
    accountType: env.BANK_ACCOUNT_TYPE || "口座種別未設定",
    accountNumber: env.BANK_ACCOUNT_NUMBER || "口座番号未設定",
    accountHolder,
    accountName: accountHolder,
    accountHolderKana: env.BANK_ACCOUNT_HOLDER_KANA || "口座名義カナ未設定",
    transferNote: env.BANK_TRANSFER_NOTE || "振込手数料は参加者様のご負担となります。",
    contactEmail: env.CONTACT_EMAIL || "CONTACT_EMAIL未設定",
  };
}

export function bankTransferGuide(application, env) {
  const info = bankInfo(env);
  const days = bankTransferDeadlineDays(env);
  return {
    paymentMethod: "bank_transfer",
    paymentProvider: "manual",
    paymentStatus: application.payment_status || "unpaid",
    applicationId: application.application_code,
    amount: application.total_amount_jpy || application.amount_total || 0,
    transferNameExample: `${application.application_code} ${application.full_name || application.name || ""}`.trim(),
    dueDateText: `お申し込み日から${days}日以内`,
    bankInfo: info,
  };
}

export function renderApplicationReceiptEmail(application, env) {
  const guide = bankTransferGuide(application, env);
  const name = application.full_name || application.name || "";
  const quantity = application.quantity || 1;
  const amount = formatYen(guide.amount);
  return {
    to: application.email,
    subject: "【60周年FESTA】お申込み受付・お振込のご案内",
    body: `${name} 様

このたびは、60周年FESTAにお申し込みいただきありがとうございます。
以下の内容で受付いたしました。

受付番号：${guide.applicationId}
お申込者名：${name}
参加人数：${quantity}名
お支払金額：${amount}

お支払いは、以下の銀行口座へお振込みをお願いいたします。

【振込先】
銀行名：${guide.bankInfo.bankName}
支店名：${guide.bankInfo.branchName}
支店コード：${guide.bankInfo.branchCode}
口座種別：${guide.bankInfo.accountType}
口座番号：${guide.bankInfo.accountNumber}
口座名義：${guide.bankInfo.accountHolder}
口座名義カナ：${guide.bankInfo.accountHolderKana}

お振込みの際は、確認のため、振込名義を以下の形式でご入力ください。

${guide.transferNameExample}

お振込み期限：${guide.dueDateText}

入金確認後、参加確定メールをお送りします。
${guide.bankInfo.transferNote}

キャンセルをご希望の場合は、問い合わせ先までご連絡ください。
開催7日前までのキャンセルは返金対応いたします。
それ以降のキャンセルについては、原則として返金いたしかねます。
返金時の振込手数料は参加者様のご負担となります。

ご不明点がございましたら、以下までお問い合わせください。
${guide.bankInfo.contactEmail}`,
  };
}

export function renderPaymentConfirmedEmail(application) {
  const name = application.full_name || application.name || "";
  const quantity = application.quantity || 1;
  const paidAt = application.paid_at || application.paidAt || "入金確認日未設定";
  return {
    to: application.email,
    subject: "【60周年FESTA】ご入金確認・参加確定のお知らせ",
    body: `${name} 様

60周年FESTAへのご入金を確認いたしました。
以下の内容で参加確定となります。

受付番号：${application.application_code || application.applicationId}
お申込者名：${name}
参加人数：${quantity}名
入金確認日：${paidAt}

当日は受付にて、受付番号またはお名前をお伝えください。

ご参加を心よりお待ちしております。`,
  };
}

export async function maybeSendEmail(env, message) {
  if (!env.EMAIL_WEBHOOK_URL) {
    return { sent: false, skipped: true, reason: "EMAIL_WEBHOOK_URL is not configured." };
  }

  const headers = { "content-type": "application/json" };
  if (env.EMAIL_API_TOKEN) headers.authorization = `Bearer ${env.EMAIL_API_TOKEN}`;
  const response = await fetch(env.EMAIL_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    return { sent: false, skipped: false, error: `Email provider returned HTTP ${response.status}` };
  }
  return { sent: true, skipped: false };
}

function formatYen(value) {
  return `${Number(value || 0).toLocaleString("ja-JP")}円`;
}

function bankTransferDeadlineDays(env) {
  const days = Number(env.BANK_TRANSFER_DEADLINE_DAYS || 7);
  if (!Number.isInteger(days) || days <= 0 || days > 90) return 7;
  return days;
}

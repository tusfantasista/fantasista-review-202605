import { FUNDRAISING_CONFIG } from "./festa60-pricing.js";

const roots = document.querySelectorAll("[data-festa60-public-summary]");

roots.forEach((root) => renderMilestones(root, FUNDRAISING_CONFIG.goals));
document.querySelectorAll("[data-fundraising-goals]").forEach((list) => renderGoalList(list, FUNDRAISING_CONFIG));
document.querySelectorAll("[data-fundraising-final-target]").forEach((element) => {
  element.textContent = `最終目標 ${formatCompactCurrency(FUNDRAISING_CONFIG.final_target_jpy)}`;
});

if (roots.length) {
  loadPublicSummary();
}

async function loadPublicSummary() {
  try {
    const response = await fetch("/api/festa60/public-summary", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`summary_${response.status}`);
    const payload = await response.json();
    const summary = payload.summary || payload;
    roots.forEach((root) => renderSummary(root, summary));
  } catch (error) {
    roots.forEach((root) => {
      setText(root, "[data-summary-updated]", "集計情報を取得できませんでした");
      root.dataset.summaryState = "error";
    });
  }
}

function renderSummary(root, summary) {
  const participantText = summary.participant_count_visible
    ? `${formatNumber(summary.obog_participant_count)}名`
    : "参加申込受付中";
  const planCounts = summary.plan_counts || {};
  const participantPlans = [
    ["プラチナ", planCounts.platinum],
    ["ゴールド", planCounts.gold],
    ["シルバー", planCounts.silver],
    ["ブロンズ", planCounts.bronze],
  ];
  const absentPlans = [
    ["プレミアム", planCounts.absent_donation_30000],
    ["アドバンス", planCounts.absent_donation_10000],
    ["スタンダード", planCounts.absent_donation_5000],
  ];
  const parts = [];
  if (participantPlans.some(([, value]) => Number(value) > 0)) {
    parts.push(participantPlans.map(([label, value]) => `${label}${formatNumber(value)}名`).join("・"));
  }
  if (absentPlans.some(([, value]) => Number(value) > 0)) {
    parts.push(`欠席者向け ${absentPlans.map(([label, value]) => `${label}${formatNumber(value)}名`).join("・")}`);
  }

  setText(root, "[data-summary-participants]", participantText);
  setText(root, "[data-summary-companions]", summary.participant_count_visible ? `${formatNumber(summary.companion_count)}名` : "集計中");
  setText(root, "[data-summary-supporters]", `${formatNumber(summary.supporter_count)}名`);
  setText(root, "[data-summary-donation]", formatCurrency(summary.donation_equivalent_jpy));
  setText(root, "[data-summary-plan-counts]", parts.length ? parts.join(" / ") : "寄付プランのお申し込みを受付中です。");
  setText(root, "[data-summary-updated]", summary.last_updated_at ? `${formatDate(summary.last_updated_at)}更新` : "受付開始");
  renderSupporterList(root, summary.supporters || []);

  const current = Math.max(0, Number(summary.donation_equivalent_jpy || 0));
  const primary = Number(summary.primary_target_jpy || FUNDRAISING_CONFIG.primary_target_jpy);
  const goals = summary.goals?.length ? summary.goals : FUNDRAISING_CONFIG.goals;
  const scaleMax = Number(goals.at(-1)?.amount_jpy || FUNDRAISING_CONFIG.goals.at(-1).amount_jpy);
  const remaining = Math.max(0, primary - current);
  const progressBar = root.querySelector("[data-summary-progress-bar]");
  if (progressBar) progressBar.style.width = `${Math.min(100, current / scaleMax * 100)}%`;
  renderMilestones(root, goals);
  setText(root, "[data-summary-next-goal]", current < primary
    ? `まずは${goals[0]?.label || "第1目標"}${formatCompactCurrency(primary)}まで、あと${formatCurrency(remaining)}`
    : nextGoalText(current, goals));
  root.dataset.summaryState = "ready";
}

function renderMilestones(root, goals) {
  const milestones = root.querySelector("[data-summary-milestones]");
  if (!milestones || !goals.length) return;
  const scaleMax = Number(goals.at(-1).amount_jpy || 1);
  milestones.innerHTML = goals
    .filter((goal) => goal.key !== "stretch")
    .map((goal) => `<span style="--position:${Math.min(100, Number(goal.amount_jpy) / scaleMax * 100)}%">${escapeHtml(formatCompactCurrency(goal.amount_jpy))}</span>`)
    .join("");
}

function renderGoalList(list, config) {
  list.innerHTML = config.goals.map((goal) => `
    <li>
      <strong>${escapeHtml(goal.label)} ${escapeHtml(formatCompactCurrency(goal.amount_jpy))}</strong>
      <span>現役支援 約${escapeHtml(formatCompactCurrency(goal.active_support_jpy))}｜FESTA充実 約${escapeHtml(formatCompactCurrency(goal.festa_enhancement_jpy))}</span>
      ${goal.note ? `<small>${escapeHtml(goal.note)}</small>` : ""}
    </li>`).join("");
}

function renderSupporterList(root, supporters) {
  const list = root.closest("main")?.querySelector("[data-summary-supporter-list]") || root.querySelector("[data-summary-supporter-list]");
  if (!list || !supporters.length) return;
  const planLabels = {
    platinum: "プラチナ",
    gold: "ゴールド",
    silver: "シルバー",
    bronze: "ブロンズ",
    absent_donation_30000: "プレミアム（欠席者向け）",
    absent_donation_10000: "アドバンス（欠席者向け）",
    absent_donation_5000: "スタンダード（欠席者向け）"
  };
  list.innerHTML = Object.keys(planLabels).map((plan) => {
    const entries = supporters.filter((supporter) => supporter.plan === plan);
    if (!entries.length) return "";
    return `<section><h4>${escapeHtml(planLabels[plan])}</h4><ul>${entries.map((supporter) => `<li><strong>${escapeHtml(supporter.display_name)}</strong>${supporter.message ? `<span>${escapeHtml(supporter.message)}</span>` : ""}</li>`).join("")}</ul></section>`;
  }).join("");
  list.hidden = false;
}

function nextGoalText(current, goals) {
  const next = goals.find((goal) => current < Number(goal.amount_jpy));
  if (!next) return "ストレッチ目標を達成しました。ありがとうございます。";
  return `${next.label} ${formatCurrency(next.amount_jpy)}まで、あと${formatCurrency(Number(next.amount_jpy) - current)}`;
}

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP").format(Number(value || 0));
}

function formatCurrency(value) {
  return `${formatNumber(value)}円`;
}

function formatCompactCurrency(value) {
  const amount = Number(value || 0);
  return amount >= 10000 && amount % 10000 === 0 ? `${formatNumber(amount / 10000)}万円` : formatCurrency(amount);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

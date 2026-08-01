/**
 * src/lib/emails/templates/TransactionNotificationEmails.ts
 *
 * HTML + plain-text email templates for the TransactionNotificationService.
 * Each function returns { subject, html, text }.
 *
 * Design:
 *   - Responsive single-column layout (600 px max-width)
 *   - Dark-mode via @media (prefers-color-scheme: dark)
 *   - PaperWorking brand header + manage-preferences footer
 *   - No external image dependencies — emoji-only icons
 */

import { FinancialTransactionCategory } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
const BRAND_COLOR = '#7C5CFC'; // PaperWorking purple
const FROM_NAME = 'PaperWorking';
const PREFS_URL = `${APP_URL}/dashboard/settings/profile#notifications`;

// ─── Shared layout helpers ────────────────────────────────────────────────────

function fmt(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function delta(n: number, decimals = 2): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

const css = `
  body { margin:0; padding:0; background:#F4F4F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  .wrapper { background:#F4F4F7; padding:32px 16px; }
  .card { background:#FFFFFF; border-radius:12px; max-width:600px; margin:0 auto; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
  .header { background:${BRAND_COLOR}; padding:24px 32px; text-align:center; }
  .header h1 { color:#FFFFFF; font-size:20px; font-weight:700; margin:0; letter-spacing:-0.3px; }
  .header p { color:rgba(255,255,255,0.8); font-size:13px; margin:4px 0 0; }
  .body { padding:28px 32px; }
  .lead { font-size:15px; color:#374151; line-height:1.6; margin:0 0 20px; }
  .kv-table { width:100%; border-collapse:collapse; margin:16px 0; }
  .kv-table td { padding:10px 14px; font-size:14px; border-bottom:1px solid #F0F0F0; }
  .kv-table td:first-child { color:#6B7280; font-weight:500; width:40%; }
  .kv-table td:last-child { color:#111827; font-weight:600; text-align:right; }
  .kpi-box { background:#F9F7FF; border:1px solid #E8E3FF; border-radius:8px; padding:16px 20px; margin:20px 0; }
  .kpi-box h3 { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:${BRAND_COLOR}; margin:0 0 12px; }
  .kpi-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; font-size:13px; border-bottom:1px solid #EDE9FF; }
  .kpi-row:last-child { border-bottom:none; }
  .kpi-label { color:#6B7280; }
  .kpi-value { font-weight:700; color:#111827; }
  .kpi-delta { font-size:12px; font-weight:600; margin-left:6px; }
  .kpi-delta.pos { color:#059669; }
  .kpi-delta.neg { color:#DC2626; }
  .cta { display:block; background:${BRAND_COLOR}; color:#FFFFFF !important; text-decoration:none; font-weight:700; font-size:15px; text-align:center; padding:14px 28px; border-radius:8px; margin:24px 0 0; }
  .footer { padding:20px 32px; border-top:1px solid #F0F0F0; text-align:center; font-size:12px; color:#9CA3AF; line-height:1.6; }
  .footer a { color:${BRAND_COLOR}; text-decoration:none; }
  .badge { display:inline-block; background:#EEF2FF; color:${BRAND_COLOR}; border-radius:4px; padding:2px 8px; font-size:12px; font-weight:700; }
  @media (prefers-color-scheme: dark) {
    body, .wrapper { background:#18171E !important; }
    .card { background:#24222E !important; box-shadow:0 2px 8px rgba(0,0,0,0.4) !important; }
    .lead { color:#D1D5DB !important; }
    .kv-table td { border-color:#38354A !important; }
    .kv-table td:first-child { color:#9CA3AF !important; }
    .kv-table td:last-child { color:#F3F4F6 !important; }
    .kpi-box { background:#2D2A3A !important; border-color:#4C4669 !important; }
    .kpi-row { border-color:#3D3950 !important; }
    .kpi-label { color:#9CA3AF !important; }
    .kpi-value { color:#F3F4F6 !important; }
    .footer { border-color:#38354A !important; color:#6B7280 !important; }
    .badge { background:#2D2A3A !important; }
  }
  @media (max-width:600px) {
    .body, .footer { padding:20px 18px !important; }
    .header { padding:20px 18px !important; }
  }
`;

function layout(emoji: string, title: string, subtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>${emoji} ${FROM_NAME}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      You're receiving this because you enabled transaction alerts in ${FROM_NAME}.<br>
      <a href="${PREFS_URL}">Manage notification preferences</a> &middot;
      <a href="${APP_URL}/dashboard">Open ${FROM_NAME}</a>
    </div>
  </div>
</div>
</body>
</html>`;
}

function kv(rows: [string, string][]): string {
  return `<table class="kv-table">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
}

function kpiBox(title: string, items: { label: string; value: string; delta?: number }[]): string {
  const rows = items
    .map(
      ({ label, value, delta: d }) =>
        `<div class="kpi-row">
          <span class="kpi-label">${label}</span>
          <span class="kpi-value">${value}${
          d !== undefined
            ? `<span class="kpi-delta ${d >= 0 ? 'pos' : 'neg'}">${delta(d)}%</span>`
            : ''
        }</span>
        </div>`,
    )
    .join('');
  return `<div class="kpi-box"><h3>${title}</h3>${rows}</div>`;
}

// ─── Context Types ────────────────────────────────────────────────────────────

export interface RentPaymentCtx {
  amount: number;
  payee: string;
  tenantName?: string | null;
  unitNumber?: string | null;
  transactionDate: Date | string;
  projectName: string;
  projectId: string;
  // KPI impacts
  cashOnCashPct?: number | null;
  cashOnCashDelta?: number | null;
  monthlyCashFlow?: number | null;
  grossRentYtd?: number | null;
}

export interface ExpensePaidCtx {
  amount: number;
  payee: string;
  category: string;
  subCategory?: string | null;
  transactionDate: Date | string;
  projectName: string;
  projectId: string;
  operatingExpensesMtd?: number | null;
  noi?: number | null;
  noiDelta?: number | null;
  cashFlow?: number | null;
  cashFlowDelta?: number | null;
}

export interface MortgagePaymentCtx {
  totalAmount: number;
  principal?: number | null;
  interest?: number | null;
  escrow?: number | null;
  newLoanBalance?: number | null;
  nextPaymentDate?: Date | string | null;
  transactionDate: Date | string;
  projectName: string;
  projectId: string;
  dscr?: number | null;
  ytdInterestPaid?: number | null;
}

export interface CapExCtx {
  amount: number;
  description?: string | null;
  payee: string;
  transactionDate: Date | string;
  projectName: string;
  projectId: string;
}

export interface AutoApprovedCtx {
  amount: number;
  payee: string;
  category: string;
  transactionDate: Date | string;
  projectName: string;
  projectId: string;
  ruleName: string;
  ruleId: string;
  transactionId: string;
}

export interface DailyDigestCtx {
  userId: string;
  projectName?: string | null;
  projectId?: string | null;
  date: Date | string;
  individualAlertsToday: number;
  transactions: Array<{
    amount: number;
    payee: string;
    category: string;
    status: string;
  }>;
  totalIn: number;
  totalOut: number;
  netCashFlow: number;
}

export interface WeeklySummaryCtx {
  projectName: string;
  projectId: string;
  weekStart: Date | string;
  weekEnd: Date | string;
  rentCollected: number;
  rentExpected: number;
  expensesPaid: number;
  mortgagePaid: number;
  netCashFlow: number;
  topExpenseCategory?: string | null;
  topExpenseAmount?: number | null;
  cashOnCashPct?: number | null;
  dscr?: number | null;
  capRatePct?: number | null;
  occupancyPct?: number | null;
}

// ─── 1. RENT_PAYMENT_RECEIVED ─────────────────────────────────────────────────

export function generateRentPaymentEmail(ctx: RentPaymentCtx): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `🏠 Rent Received — ${fmt(ctx.amount)} from ${ctx.payee} — ${ctx.projectName}`;

  const fromLine = ctx.tenantName
    ? `${ctx.payee} / ${ctx.tenantName}${ctx.unitNumber ? ` (Unit ${ctx.unitNumber})` : ''}`
    : ctx.payee;

  const kvRows: [string, string][] = [
    ['Amount', fmt(ctx.amount)],
    ['From', fromLine],
    ['Date', fmtDate(ctx.transactionDate)],
    ['Project', ctx.projectName],
  ];

  const kpiItems: { label: string; value: string; delta?: number }[] = [];
  if (ctx.cashOnCashPct != null) {
    kpiItems.push({ label: 'Cash-on-Cash Return', value: `${ctx.cashOnCashPct.toFixed(2)}%`, delta: ctx.cashOnCashDelta ?? undefined });
  }
  if (ctx.monthlyCashFlow != null) {
    kpiItems.push({ label: 'Monthly Cash Flow', value: fmt(ctx.monthlyCashFlow) });
  }
  if (ctx.grossRentYtd != null) {
    kpiItems.push({ label: 'Gross Rent YTD', value: fmt(ctx.grossRentYtd) });
  }

  const bodyHtml = `
    <p class="lead">PaperWorking detected a rent payment for your investment. Your KPIs have been updated automatically.</p>
    ${kv(kvRows)}
    ${kpiItems.length > 0 ? kpiBox('KPI Impact', kpiItems) : ''}
    <a href="${APP_URL}/dashboard/projects/${ctx.projectId}?tab=transactions" class="cta">View in PaperWorking →</a>
  `;

  const text = [
    subject,
    '',
    'PaperWorking detected a rent payment for your investment.',
    `Amount: ${fmt(ctx.amount)}`,
    `From: ${fromLine}`,
    `Date: ${fmtDate(ctx.transactionDate)}`,
    `Project: ${ctx.projectName}`,
    '',
    `View: ${APP_URL}/dashboard/projects/${ctx.projectId}?tab=transactions`,
    '',
    `Manage preferences: ${PREFS_URL}`,
  ].join('\n');

  return { subject, html: layout('🏠', subject, 'Rent Payment Received', bodyHtml), text };
}

// ─── 2. EXPENSE_PAID ──────────────────────────────────────────────────────────

export function generateExpensePaidEmail(ctx: ExpensePaidCtx): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `💸 Expense Paid — ${fmt(ctx.amount)} to ${ctx.payee} — ${ctx.projectName}`;

  const categoryLabel = ctx.subCategory
    ? `${ctx.category} (${ctx.subCategory})`
    : ctx.category;

  const kvRows: [string, string][] = [
    ['Amount', fmt(ctx.amount)],
    ['To', ctx.payee],
    ['Category', categoryLabel],
    ['Date', fmtDate(ctx.transactionDate)],
    ['Project', ctx.projectName],
  ];

  const kpiItems: { label: string; value: string; delta?: number }[] = [];
  if (ctx.operatingExpensesMtd != null) {
    kpiItems.push({ label: 'Operating Expenses MTD', value: fmt(ctx.operatingExpensesMtd) });
  }
  if (ctx.noi != null) {
    kpiItems.push({ label: 'NOI', value: fmt(ctx.noi), delta: ctx.noiDelta ?? undefined });
  }
  if (ctx.cashFlow != null) {
    kpiItems.push({ label: 'Cash Flow', value: fmt(ctx.cashFlow), delta: ctx.cashFlowDelta ?? undefined });
  }

  const bodyHtml = `
    <p class="lead">PaperWorking recorded an expense payment for your investment. Your KPIs have been updated.</p>
    ${kv(kvRows)}
    ${kpiItems.length > 0 ? kpiBox('KPI Impact', kpiItems) : ''}
    <a href="${APP_URL}/dashboard/projects/${ctx.projectId}?tab=transactions" class="cta">View in PaperWorking →</a>
  `;

  const text = [
    subject,
    '',
    'PaperWorking recorded an expense payment for your investment.',
    `Amount: ${fmt(ctx.amount)}`,
    `To: ${ctx.payee}`,
    `Category: ${categoryLabel}`,
    `Date: ${fmtDate(ctx.transactionDate)}`,
    `Project: ${ctx.projectName}`,
    '',
    `View: ${APP_URL}/dashboard/projects/${ctx.projectId}?tab=transactions`,
    `Manage preferences: ${PREFS_URL}`,
  ].join('\n');

  return { subject, html: layout('💸', subject, 'Expense Recorded', bodyHtml), text };
}

// ─── 3. MORTGAGE_PAYMENT_PROCESSED ───────────────────────────────────────────

export function generateMortgagePaymentEmail(ctx: MortgagePaymentCtx): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `🏦 Mortgage Payment — ${fmt(ctx.totalAmount)} — ${ctx.projectName}`;

  const kvRows: [string, string][] = [
    ['Total Payment', fmt(ctx.totalAmount)],
    ...(ctx.principal != null ? [['Principal', fmt(ctx.principal)] as [string, string]] : []),
    ...(ctx.interest != null ? [['Interest', `${fmt(ctx.interest)} <span class="badge" style="font-size:11px">tax deductible</span>`] as [string, string]] : []),
    ...(ctx.escrow != null ? [['Escrow', fmt(ctx.escrow)] as [string, string]] : []),
    ...(ctx.newLoanBalance != null ? [['New Loan Balance', fmt(ctx.newLoanBalance)] as [string, string]] : []),
    ...(ctx.nextPaymentDate != null ? [['Next Payment Due', fmtDate(ctx.nextPaymentDate)] as [string, string]] : []),
    ['Date', fmtDate(ctx.transactionDate)],
    ['Project', ctx.projectName],
  ];

  const kpiItems: { label: string; value: string }[] = [];
  if (ctx.dscr != null) {
    kpiItems.push({ label: 'DSCR', value: ctx.dscr.toFixed(2) });
  }
  if (ctx.ytdInterestPaid != null) {
    kpiItems.push({ label: 'YTD Interest Paid (tax deduction)', value: fmt(ctx.ytdInterestPaid) });
  }

  const bodyHtml = `
    <p class="lead">Your mortgage payment was recorded and your loan balance has been updated.</p>
    ${kv(kvRows)}
    ${kpiItems.length > 0 ? kpiBox('KPI Impact', kpiItems) : ''}
    <a href="${APP_URL}/dashboard/projects/${ctx.projectId}?tab=financing" class="cta">View Amortization →</a>
  `;

  const text = [
    subject,
    '',
    'Your mortgage payment was recorded.',
    `Total: ${fmt(ctx.totalAmount)}`,
    ctx.principal != null ? `Principal: ${fmt(ctx.principal)}` : null,
    ctx.interest != null ? `Interest: ${fmt(ctx.interest)} (tax deductible)` : null,
    ctx.escrow != null ? `Escrow: ${fmt(ctx.escrow)}` : null,
    ctx.newLoanBalance != null ? `New Loan Balance: ${fmt(ctx.newLoanBalance)}` : null,
    `Project: ${ctx.projectName}`,
    `Date: ${fmtDate(ctx.transactionDate)}`,
    '',
    `View: ${APP_URL}/dashboard/projects/${ctx.projectId}?tab=financing`,
    `Manage preferences: ${PREFS_URL}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html: layout('🏦', subject, 'Mortgage Payment Recorded', bodyHtml), text };
}

// ─── 4. CAPITAL_EXPENDITURE_RECORDED ─────────────────────────────────────────

export function generateCapExEmail(ctx: CapExCtx): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `🔨 CapEx Recorded — ${fmt(ctx.amount)} — ${ctx.projectName}`;

  const kvRows: [string, string][] = [
    ['Amount', fmt(ctx.amount)],
    ['To', ctx.payee],
    ...(ctx.description ? [['Description', ctx.description] as [string, string]] : []),
    ['Date', fmtDate(ctx.transactionDate)],
    ['Project', ctx.projectName],
  ];

  const bodyHtml = `
    <p class="lead">A capital expenditure was recorded for your investment.</p>
    ${kv(kvRows)}
    <div class="kpi-box">
      <h3>What this means</h3>
      <div class="kpi-row">
        <span class="kpi-label">CapEx Reserve Impact</span>
        <span class="kpi-value" style="color:#DC2626;">${fmt(-ctx.amount)}</span>
      </div>
      <div class="kpi-row" style="border-bottom:none;">
        <span class="kpi-label">NOI / Cash Flow Impact</span>
        <span class="kpi-value" style="color:#059669;">None</span>
      </div>
    </div>
    <p style="font-size:13px;color:#6B7280;margin:0 0 20px;">Capital expenditures affect your CapEx Reserve and equity, but are <strong>not</strong> counted as operating expenses — so they don't reduce your NOI or monthly cash flow.</p>
    <a href="${APP_URL}/dashboard/projects/${ctx.projectId}?tab=capex" class="cta">View CapEx Ledger →</a>
  `;

  const text = [
    subject,
    '',
    'A capital expenditure was recorded.',
    `Amount: ${fmt(ctx.amount)}`,
    `To: ${ctx.payee}`,
    ctx.description ? `Description: ${ctx.description}` : null,
    `Project: ${ctx.projectName}`,
    `Date: ${fmtDate(ctx.transactionDate)}`,
    '',
    'Note: CapEx affects your CapEx Reserve but does NOT impact NOI or Cash Flow.',
    '',
    `View: ${APP_URL}/dashboard/projects/${ctx.projectId}?tab=capex`,
    `Manage preferences: ${PREFS_URL}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html: layout('🔨', subject, 'Capital Expenditure Recorded', bodyHtml), text };
}

// ─── 5. AUTO_APPROVED_BY_RULE ─────────────────────────────────────────────────

export function generateAutoApprovedEmail(ctx: AutoApprovedCtx): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `⚡ Auto-Approved — ${fmt(ctx.amount)} ${ctx.category} — ${ctx.projectName}`;

  const kvRows: [string, string][] = [
    ['Amount', fmt(ctx.amount)],
    ['Payee', ctx.payee],
    ['Category', ctx.category],
    ['Date', fmtDate(ctx.transactionDate)],
    ['Project', ctx.projectName],
    ['Rule Applied', ctx.ruleName],
  ];

  const bodyHtml = `
    <p class="lead">PaperWorking auto-approved this transaction based on your rule: <strong>${ctx.ruleName}</strong>. No action is needed — your KPIs are up to date.</p>
    ${kv(kvRows)}
    <div style="display:flex;gap:12px;margin-top:24px;">
      <a href="${APP_URL}/api/rules/${ctx.ruleId}" class="cta" style="flex:1;margin:0;font-size:13px;padding:12px;">Review Rule</a>
      <a href="${APP_URL}/dashboard/projects/${ctx.projectId}?tab=transactions&id=${ctx.transactionId}" class="cta" style="flex:1;margin:0;font-size:13px;padding:12px;background:#F3F4F6;color:#374151 !important;">View Transaction</a>
    </div>
  `;

  const text = [
    subject,
    '',
    `PaperWorking auto-approved this transaction based on your rule: ${ctx.ruleName}`,
    'No action needed — your KPIs are up to date.',
    '',
    `Amount: ${fmt(ctx.amount)}`,
    `Payee: ${ctx.payee}`,
    `Category: ${ctx.category}`,
    `Project: ${ctx.projectName}`,
    `Date: ${fmtDate(ctx.transactionDate)}`,
    '',
    `Review Rule: ${APP_URL}/api/rules/${ctx.ruleId}`,
    `View Transaction: ${APP_URL}/dashboard/projects/${ctx.projectId}?tab=transactions&id=${ctx.transactionId}`,
    `Manage preferences: ${PREFS_URL}`,
  ].join('\n');

  return { subject, html: layout('⚡', subject, 'Transaction Auto-Approved', bodyHtml), text };
}

// ─── 6. TRANSACTION_DAILY_DIGEST ─────────────────────────────────────────────

export function generateDailyDigestEmail(ctx: DailyDigestCtx): {
  subject: string;
  html: string;
  text: string;
} {
  const dateStr = fmtDate(ctx.date);
  const subject = `📊 Daily Transaction Summary — ${dateStr}${ctx.projectName ? ` — ${ctx.projectName}` : ''}`;

  const rows = ctx.transactions
    .map(
      (t) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #F0F0F0;">${t.payee}</td>
          <td style="padding:8px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F0F0F0;">${t.category}</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid #F0F0F0;text-align:right;color:${t.amount >= 0 ? '#059669' : '#DC2626'};">${fmt(Math.abs(t.amount))}</td>
          <td style="padding:8px 12px;font-size:12px;color:#9CA3AF;border-bottom:1px solid #F0F0F0;">${t.status}</td>
        </tr>`,
    )
    .join('');

  const tableHtml =
    ctx.transactions.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead><tr>
            <th style="text-align:left;padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600;border-bottom:2px solid #E5E7EB;">Payee</th>
            <th style="text-align:left;padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600;border-bottom:2px solid #E5E7EB;">Category</th>
            <th style="text-align:right;padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600;border-bottom:2px solid #E5E7EB;">Amount</th>
            <th style="text-align:left;padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600;border-bottom:2px solid #E5E7EB;">Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`
      : '<p style="color:#9CA3AF;font-size:14px;text-align:center;padding:20px 0;">No transactions today.</p>';

  const alertNote =
    ctx.individualAlertsToday > 0
      ? `<p style="font-size:13px;color:#6B7280;background:#F9F7FF;border-radius:6px;padding:10px 14px;margin:0 0 16px;">You received <strong>${ctx.individualAlertsToday} individual alert${ctx.individualAlertsToday > 1 ? 's' : ''}</strong> today. Here's your full summary.</p>`
      : '';

  const bodyHtml = `
    ${alertNote}
    <p class="lead">Here's a summary of your investment activity on ${dateStr}.</p>
    ${tableHtml}
    ${kpiBox('Net Summary', [
      { label: 'Total In', value: fmt(ctx.totalIn) },
      { label: 'Total Out', value: fmt(ctx.totalOut) },
      { label: 'Net Cash Flow', value: fmt(ctx.netCashFlow) },
    ])}
    <a href="${APP_URL}/dashboard${ctx.projectId ? `/projects/${ctx.projectId}?tab=transactions` : ''}" class="cta">View Full Dashboard →</a>
  `;

  const text = [
    subject,
    '',
    ctx.individualAlertsToday > 0
      ? `You received ${ctx.individualAlertsToday} individual alert(s) today. Here's your full summary.`
      : '',
    '',
    ...ctx.transactions.map((t) => `• ${t.payee} — ${t.category} — ${fmt(Math.abs(t.amount))} (${t.status})`),
    '',
    `Total In:  ${fmt(ctx.totalIn)}`,
    `Total Out: ${fmt(ctx.totalOut)}`,
    `Net:       ${fmt(ctx.netCashFlow)}`,
    '',
    `View: ${APP_URL}/dashboard`,
    `Manage preferences: ${PREFS_URL}`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return { subject, html: layout('📊', subject, `Daily Summary — ${dateStr}`, bodyHtml), text };
}

// ─── 7. TRANSACTION_WEEKLY_SUMMARY ───────────────────────────────────────────

export function generateWeeklySummaryEmail(ctx: WeeklySummaryCtx): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `📊 Your Weekly Investment Report — ${ctx.projectName}`;
  const rentPct =
    ctx.rentExpected > 0
      ? ((ctx.rentCollected / ctx.rentExpected) * 100).toFixed(0)
      : null;

  const kvRows: [string, string][] = [
    ['Period', `${fmtDate(ctx.weekStart)} – ${fmtDate(ctx.weekEnd)}`],
    ['Rent Collected', `${fmt(ctx.rentCollected)}${rentPct ? ` (${rentPct}% of expected)` : ''}`],
    ['Expenses Paid', fmt(ctx.expensesPaid)],
    ['Mortgage Paid', fmt(ctx.mortgagePaid)],
    ['Net Cash Flow', fmt(ctx.netCashFlow)],
    ...(ctx.topExpenseCategory && ctx.topExpenseAmount
      ? [['Top Expense', `${ctx.topExpenseCategory} (${fmt(ctx.topExpenseAmount)})`] as [string, string]]
      : []),
  ];

  const kpiItems: { label: string; value: string }[] = [];
  if (ctx.cashOnCashPct != null) kpiItems.push({ label: 'Cash-on-Cash Return', value: `${ctx.cashOnCashPct.toFixed(2)}%` });
  if (ctx.dscr != null) kpiItems.push({ label: 'DSCR', value: ctx.dscr.toFixed(2) });
  if (ctx.capRatePct != null) kpiItems.push({ label: 'Cap Rate', value: `${ctx.capRatePct.toFixed(2)}%` });
  if (ctx.occupancyPct != null) kpiItems.push({ label: 'Occupancy', value: `${ctx.occupancyPct.toFixed(0)}%` });

  const bodyHtml = `
    <p class="lead">Here's your weekly investment performance report for <strong>${ctx.projectName}</strong>.</p>
    ${kv(kvRows)}
    ${kpiItems.length > 0 ? kpiBox('KPI Snapshot', kpiItems) : ''}
    <a href="${APP_URL}/dashboard/projects/${ctx.projectId}" class="cta">View Full Dashboard →</a>
  `;

  const text = [
    subject,
    '',
    `Project: ${ctx.projectName}`,
    `Period: ${fmtDate(ctx.weekStart)} – ${fmtDate(ctx.weekEnd)}`,
    '',
    `Rent Collected: ${fmt(ctx.rentCollected)}${rentPct ? ` (${rentPct}% of expected)` : ''}`,
    `Expenses Paid: ${fmt(ctx.expensesPaid)}`,
    `Mortgage Paid: ${fmt(ctx.mortgagePaid)}`,
    `Net Cash Flow: ${fmt(ctx.netCashFlow)}`,
    ctx.topExpenseCategory ? `Top Expense: ${ctx.topExpenseCategory} (${fmt(ctx.topExpenseAmount ?? 0)})` : null,
    '',
    ctx.cashOnCashPct != null ? `Cash-on-Cash: ${ctx.cashOnCashPct.toFixed(2)}%` : null,
    ctx.dscr != null ? `DSCR: ${ctx.dscr.toFixed(2)}` : null,
    ctx.capRatePct != null ? `Cap Rate: ${ctx.capRatePct.toFixed(2)}%` : null,
    ctx.occupancyPct != null ? `Occupancy: ${ctx.occupancyPct.toFixed(0)}%` : null,
    '',
    `View: ${APP_URL}/dashboard/projects/${ctx.projectId}`,
    `Manage preferences: ${PREFS_URL}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html: layout('📊', subject, 'Weekly Investment Report', bodyHtml), text };
}

// ─── Category → Template type mapping ────────────────────────────────────────

export type TransactionEmailTemplate =
  | 'RENT_PAYMENT_RECEIVED'
  | 'EXPENSE_PAID'
  | 'MORTGAGE_PAYMENT_PROCESSED'
  | 'CAPITAL_EXPENDITURE_RECORDED'
  | 'AUTO_APPROVED_BY_RULE'
  | 'TRANSACTION_DAILY_DIGEST'
  | 'TRANSACTION_WEEKLY_SUMMARY';

export const CATEGORY_TO_TEMPLATE: Record<FinancialTransactionCategory, TransactionEmailTemplate> = {
  // Revenue → rent template
  RENT_INCOME: 'RENT_PAYMENT_RECEIVED',
  LATE_FEE_INCOME: 'RENT_PAYMENT_RECEIVED',
  PET_RENT_INCOME: 'RENT_PAYMENT_RECEIVED',
  SECURITY_DEPOSIT_RECEIVED: 'RENT_PAYMENT_RECEIVED',
  PARKING_INCOME: 'RENT_PAYMENT_RECEIVED',
  LAUNDRY_VENDING_INCOME: 'RENT_PAYMENT_RECEIVED',
  APPLICATION_FEE_INCOME: 'RENT_PAYMENT_RECEIVED',
  LEASE_TERMINATION_FEE: 'RENT_PAYMENT_RECEIVED',
  UTILITY_REIMBURSEMENT: 'RENT_PAYMENT_RECEIVED',
  INSURANCE_CLAIM_INCOME: 'RENT_PAYMENT_RECEIVED',
  INTEREST_INCOME: 'RENT_PAYMENT_RECEIVED',
  MISC_INCOME: 'RENT_PAYMENT_RECEIVED',

  // Operating expenses → expense template
  PROPERTY_TAX: 'EXPENSE_PAID',
  PROPERTY_INSURANCE: 'EXPENSE_PAID',
  HOA_FEES: 'EXPENSE_PAID',
  MANAGEMENT_FEES: 'EXPENSE_PAID',
  LEASING_FEES: 'EXPENSE_PAID',
  MAINTENANCE_REPAIR: 'EXPENSE_PAID',
  UTILITIES: 'EXPENSE_PAID',
  LANDSCAPING_SNOW: 'EXPENSE_PAID',
  PEST_CONTROL: 'EXPENSE_PAID',
  CLEANING_TURNOVER: 'EXPENSE_PAID',
  MARKETING_ADVERTISING: 'EXPENSE_PAID',
  LEGAL_PROFESSIONAL: 'EXPENSE_PAID',
  ACCOUNTING_BOOKKEEPING: 'EXPENSE_PAID',
  TRAVEL_MILEAGE: 'EXPENSE_PAID',
  BANK_CREDIT_CARD_FEES: 'EXPENSE_PAID',
  SOFTWARE_TECHNOLOGY: 'EXPENSE_PAID',
  LICENSES_PERMITS: 'EXPENSE_PAID',
  TURNOVER_COSTS: 'EXPENSE_PAID',
  SUPPLIES: 'EXPENSE_PAID',
  MISC_EXPENSE: 'EXPENSE_PAID',
  OWNER_DISTRIBUTION: 'EXPENSE_PAID',

  // Mortgage
  MORTGAGE_PRINCIPAL: 'MORTGAGE_PAYMENT_PROCESSED',
  MORTGAGE_INTEREST: 'MORTGAGE_PAYMENT_PROCESSED',
  MORTGAGE_ESCROW_PAYMENT: 'MORTGAGE_PAYMENT_PROCESSED',

  // CapEx
  CAPITAL_EXPENDITURE: 'CAPITAL_EXPENDITURE_RECORDED',

  // Transfers / non-P&L
  SECURITY_DEPOSIT_RETURNED: 'EXPENSE_PAID',
  CAPITAL_CONTRIBUTION: 'RENT_PAYMENT_RECEIVED',
  RESERVE_TRANSFER: 'EXPENSE_PAID',
  INTER_ACCOUNT_TRANSFER: 'EXPENSE_PAID',

  // Uncertain — default to expense
  UNCATEGORIZED: 'EXPENSE_PAID',
  NEEDS_REVIEW: 'EXPENSE_PAID',
};

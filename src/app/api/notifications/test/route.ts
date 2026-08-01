/**
 * POST /api/notifications/test
 *
 * Sends a test email for a specific notification template to the authenticated user.
 * Uses realistic fixture data so the email looks like a real transaction.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 *
 * Body: { template: TransactionEmailTemplate }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { TransactionNotificationService } from '@/lib/notifications/transactionNotifications';
import {
  generateRentPaymentEmail,
  generateExpensePaidEmail,
  generateMortgagePaymentEmail,
  generateCapExEmail,
  generateAutoApprovedEmail,
  generateDailyDigestEmail,
  generateWeeklySummaryEmail,
  type TransactionEmailTemplate,
} from '@/lib/emails/templates/TransactionNotificationEmails';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VALID_TEMPLATES: TransactionEmailTemplate[] = [
  'RENT_PAYMENT_RECEIVED',
  'EXPENSE_PAID',
  'MORTGAGE_PAYMENT_PROCESSED',
  'CAPITAL_EXPENDITURE_RECORDED',
  'AUTO_APPROVED_BY_RULE',
  'TRANSACTION_DAILY_DIGEST',
  'TRANSACTION_WEEKLY_SUMMARY',
];

const bodySchema = z.object({
  template: z.enum([
    'RENT_PAYMENT_RECEIVED',
    'EXPENSE_PAID',
    'MORTGAGE_PAYMENT_PROCESSED',
    'CAPITAL_EXPENDITURE_RECORDED',
    'AUTO_APPROVED_BY_RULE',
    'TRANSACTION_DAILY_DIGEST',
    'TRANSACTION_WEEKLY_SUMMARY',
  ] as [TransactionEmailTemplate, ...TransactionEmailTemplate[]]),
});

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const NOW = new Date();
const PROJECT_NAME = 'Maple Avenue Duplex';
const PROJECT_ID = 'demo-project-001';

function buildFixture(template: TransactionEmailTemplate): {
  subject: string;
  html: string;
  text: string;
} {
  switch (template) {
    case 'RENT_PAYMENT_RECEIVED':
      return generateRentPaymentEmail({
        amount: 1850.0,
        payee: 'John Doe',
        tenantName: 'John & Sarah Doe',
        unitNumber: '2B',
        transactionDate: NOW,
        projectName: PROJECT_NAME,
        projectId: PROJECT_ID,
        cashOnCashPct: 7.24,
        cashOnCashDelta: 0.3,
        monthlyCashFlow: 412.5,
        grossRentYtd: 14800,
      });

    case 'EXPENSE_PAID':
      return generateExpensePaidEmail({
        amount: 485.0,
        payee: 'Maple HVAC Services',
        category: 'MAINTENANCE_REPAIR',
        transactionDate: NOW,
        projectName: PROJECT_NAME,
        projectId: PROJECT_ID,
        operatingExpensesMtd: 2840,
        noi: 9600,
        noiDelta: -0.5,
        cashFlow: 4800,
        cashFlowDelta: -1.2,
      });

    case 'MORTGAGE_PAYMENT_PROCESSED':
      return generateMortgagePaymentEmail({
        totalAmount: 1428.64,
        principal: 372.1,
        interest: 876.54,
        escrow: 180.0,
        newLoanBalance: 187_500.0,
        nextPaymentDate: new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1),
        transactionDate: NOW,
        projectName: PROJECT_NAME,
        projectId: PROJECT_ID,
        dscr: 1.32,
        ytdInterestPaid: 6132.78,
      });

    case 'CAPITAL_EXPENDITURE_RECORDED':
      return generateCapExEmail({
        amount: 6200.0,
        description: 'New HVAC system replacement — Carrier 3-ton unit',
        payee: 'ComfortAir Solutions LLC',
        transactionDate: NOW,
        projectName: PROJECT_NAME,
        projectId: PROJECT_ID,
      });

    case 'AUTO_APPROVED_BY_RULE':
      return generateAutoApprovedEmail({
        amount: 180.0,
        payee: 'City Water Department',
        category: 'UTILITIES',
        transactionDate: NOW,
        projectName: PROJECT_NAME,
        projectId: PROJECT_ID,
        ruleName: 'City Water — Recurring Utility',
        ruleId: 'rule-demo-001',
        transactionId: 'txn-demo-001',
      });

    case 'TRANSACTION_DAILY_DIGEST':
      return generateDailyDigestEmail({
        userId: 'demo-user',
        projectName: PROJECT_NAME,
        projectId: PROJECT_ID,
        date: NOW,
        individualAlertsToday: 3,
        transactions: [
          { amount: 1850, payee: 'John Doe', category: 'RENT_INCOME', status: 'MANUALLY_APPROVED' },
          { amount: -485, payee: 'Maple HVAC Services', category: 'MAINTENANCE_REPAIR', status: 'AUTO_APPROVED' },
          { amount: -180, payee: 'City Water Department', category: 'UTILITIES', status: 'AUTO_APPROVED' },
          { amount: -1428.64, payee: 'First National Bank', category: 'MORTGAGE_PRINCIPAL', status: 'AUTO_APPROVED' },
        ],
        totalIn: 1850,
        totalOut: 2093.64,
        netCashFlow: -243.64,
      });

    case 'TRANSACTION_WEEKLY_SUMMARY':
      return generateWeeklySummaryEmail({
        projectName: PROJECT_NAME,
        projectId: PROJECT_ID,
        weekStart: new Date(NOW.getTime() - 7 * 86_400_000),
        weekEnd: NOW,
        rentCollected: 3700,
        rentExpected: 3700,
        expensesPaid: 1240,
        mortgagePaid: 1428.64,
        netCashFlow: 1031.36,
        topExpenseCategory: 'MAINTENANCE_REPAIR',
        topExpenseAmount: 760,
        cashOnCashPct: 7.24,
        dscr: 1.32,
        capRatePct: 5.8,
        occupancyPct: 100,
      });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const userId = auth.uid;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid template. Valid options: ' + VALID_TEMPLATES.join(', '),
        details: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }

  const { template } = parsed.data;

  // Resolve user email
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    return NextResponse.json({ success: false, error: 'User email not found' }, { status: 404 });
  }

  try {
    const { subject, html, text } = buildFixture(template);

    await TransactionNotificationService.sendEmail({
      userId,
      to: user.email,
      subject: `[TEST] ${subject}`,
      html,
      text: `[TEST EMAIL]\n\n${text}`,
      templateType: template,
      // No transactionId — test emails are not idempotency-keyed
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent for template "${template}" to ${user.email}`,
      template,
      to: user.email,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/notifications/test] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

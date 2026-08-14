/**
 * src/lib/notifications/transactionNotifications.ts
 *
 * TransactionNotificationService — per-transaction email alerts.
 *
 * Entry points:
 *   onTransactionApproved(transactionId)  — call after any FinancialTransaction approval
 *   sendDailyDigest(userId)               — call from daily cron
 *   sendWeeklySummary(userId)             — call from weekly cron (Monday 9 AM)
 *   flushHourlyBatches()                  — call from hourly cron for HOURLY_BATCH users
 *
 * Email delivery via CommunicationEngine (Resend). Mocked in dev when RESEND_API_KEY absent.
 * Idempotency via SentEmailLog unique constraint (transactionId, templateType).
 * Batching via Firestore queued_emails collection (same pattern as the rest of the app).
 */

import { Prisma, FinancialTransactionCategory, FinancialTransactionStatus, EmailDigestMode, EmailAlertThreshold } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { adminDb } from '@/lib/firebase/admin';
import { getEmailProvider } from '@/lib/email/getEmailProvider';
import {
  CATEGORY_TO_TEMPLATE,
  type TransactionEmailTemplate,
  generateRentPaymentEmail,
  generateExpensePaidEmail,
  generateMortgagePaymentEmail,
  generateCapExEmail,
  generateAutoApprovedEmail,
  generateDailyDigestEmail,
  generateWeeklySummaryEmail,
} from '@/lib/emails/templates/TransactionNotificationEmails';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.co';

/**
 * All 12 categories from the spec that are enabled by default.
 * Stored as string[] in Prisma (Postgres text[]).
 */
export const DEFAULT_ALERT_CATEGORIES: FinancialTransactionCategory[] = [
  'RENT_INCOME',
  'LATE_FEE_INCOME',
  'PET_RENT_INCOME',
  'PROPERTY_TAX',
  'PROPERTY_INSURANCE',
  'MAINTENANCE_REPAIR',
  'UTILITIES',
  'MORTGAGE_PRINCIPAL',
  'MORTGAGE_INTEREST',
  'CAPITAL_EXPENDITURE',
  'SECURITY_DEPOSIT_RECEIVED',
  'OWNER_DISTRIBUTION',
];

const HIGH_CONFIDENCE_THRESHOLD = 0.85;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Resolves user email from Prisma AppUser table.
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email ?? null;
}

/**
 * Sends an email via configured system email provider (SendGrid, Resend, or Mock).
 */
async function dispatchEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ messageId: string; mock: boolean }> {
  const provider = getEmailProvider();
  const res = await provider.sendEmail({
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (!res.success) {
    throw new Error(`[TransactionNotifications] Email dispatch error (${res.provider}): ${res.error || 'Failed to send'}`);
  }

  return { messageId: res.messageId, mock: res.mock };
}

// ─── Main Service ─────────────────────────────────────────────────────────────

export class TransactionNotificationService {
  // ── Preferences helper ──────────────────────────────────────────────────────

  /**
   * Loads user notification preferences, creating defaults on first access.
   */
  static async getOrCreatePreferences(userId: string) {
    const existing = await prisma.userNotificationPreferences.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return prisma.userNotificationPreferences.create({
      data: {
        userId,
        emailTransactionAlerts: true,
        emailAlertCategories: DEFAULT_ALERT_CATEGORIES as string[],
        emailAlertMinAmount: new Prisma.Decimal(0),
        emailDigestMode: 'IMMEDIATE',
        emailAlertThreshold: 'ALL',
      },
    });
  }

  // ── Idempotent send ─────────────────────────────────────────────────────────

  /**
   * Idempotency-checked send. Writes SentEmailLog before dispatch.
   * Skips silently if (transactionId, templateType) already exists.
   */
  static async sendEmail(opts: {
    userId: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    templateType: TransactionEmailTemplate;
    transactionId?: string;
  }): Promise<void> {
    // Governance Guard: Exclude synthetic investor crew accounts from outbound email dispatch
    if (opts.to && (opts.to.includes('+crew') || opts.to.endsWith('@paperworking.co'))) {
      console.info(`[TransactionNotifications] Skipped outbound email for synthetic test account: ${opts.to}`);
      return;
    }

    // Idempotency check — unique constraint on (transactionId, templateType)
    if (opts.transactionId) {
      try {
        await prisma.sentEmailLog.create({
          data: {
            userId: opts.userId,
            transactionId: opts.transactionId,
            templateType: opts.templateType,
            status: 'pending',
          },
        });
      } catch (err: unknown) {
        // Unique constraint violation = already sent
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          console.info(
            `[TransactionNotifications] Duplicate blocked: ${opts.templateType} / ${opts.transactionId}`,
          );
          return;
        }
        throw err;
      }
    }

    let messageId = '';
    let status: 'sent' | 'failed' | 'mocked' = 'sent';

    try {
      const result = await dispatchEmail({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      messageId = result.messageId;
      status = result.mock ? 'mocked' : 'sent';
    } catch (err) {
      status = 'failed';
      console.error('[TransactionNotifications] Dispatch failed:', err);
      // Update status in SentEmailLog if it was created
      if (opts.transactionId) {
        await prisma.sentEmailLog
          .update({
            where: {
              transactionId_templateType: {
                transactionId: opts.transactionId,
                templateType: opts.templateType,
              },
            },
            data: { status: 'failed' },
          })
          .catch(() => {/* swallow — SentEmailLog row may not exist for digest sends */});
      }
      return; // Don't throw — notification failures are non-fatal
    }

    // Update SentEmailLog with final messageId + status
    if (opts.transactionId) {
      await prisma.sentEmailLog
        .update({
          where: {
            transactionId_templateType: {
              transactionId: opts.transactionId,
              templateType: opts.templateType,
            },
          },
          data: { status, messageId },
        })
        .catch(() => {/* swallow */});
    }
  }

  // ── Hourly batch queue ──────────────────────────────────────────────────────

  /**
   * Enqueues a transaction for hourly batch delivery to the user's Firestore queue.
   * Uses the existing `queued_emails` collection pattern.
   */
  static async queueForBatch(userId: string, transactionId: string): Promise<void> {
    const docId = `txn_batch_${userId}_${transactionId}_${Date.now()}`;
    await adminDb.collection('queued_emails').doc(docId).set({
      id: docId,
      type: 'transaction_notification_batch',
      userId,
      transactionId,
      status: 'pending',
      queuedAt: new Date(),
      flushAt: null, // filled by flushHourlyBatches
    });
  }

  /**
   * Flushes all pending HOURLY_BATCH emails for all users.
   * Called by the hourly cron job.
   * Sends one email per user grouping all queued transactionIds.
   */
  static async flushHourlyBatches(): Promise<void> {
    const snap = await adminDb
      .collection('queued_emails')
      .where('type', '==', 'transaction_notification_batch')
      .where('status', '==', 'pending')
      .get();

    if (snap.empty) return;

    // Group by userId
    const byUser = new Map<string, string[]>();
    for (const doc of snap.docs) {
      const d = doc.data();
      const existing = byUser.get(d.userId) ?? [];
      existing.push(d.transactionId as string);
      byUser.set(d.userId, existing);
    }

    const batch = adminDb.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { status: 'flushing', flushAt: new Date() });
    }
    await batch.commit();

    // Send a batched digest email per user
    for (const [userId, txnIds] of byUser.entries()) {
      try {
        const userEmail = await getUserEmail(userId);
        if (!userEmail) continue;

        const txns = await prisma.financialTransaction.findMany({
          where: { id: { in: txnIds }, userId },
          include: { project: { select: { displayName: true, addressLine: true, id: true } } },
          orderBy: { transactionDate: 'desc' },
        });

        const totalIn = txns
          .filter((t) => t.direction === 'CREDIT')
          .reduce((s, t) => s + Number(t.amount), 0);
        const totalOut = txns
          .filter((t) => t.direction === 'DEBIT')
          .reduce((s, t) => s + Number(t.amount), 0);

        const { subject, html, text } = generateDailyDigestEmail({
          userId,
          date: new Date(),
          individualAlertsToday: 0,
          transactions: txns.map((t) => ({
            amount: t.direction === 'DEBIT' ? -Number(t.amount) : Number(t.amount),
            payee: t.payee,
            category: t.category,
            status: t.status,
          })),
          totalIn,
          totalOut,
          netCashFlow: totalIn - totalOut,
        });

        await TransactionNotificationService.sendEmail({
          userId,
          to: userEmail,
          subject,
          html,
          text,
          templateType: 'TRANSACTION_DAILY_DIGEST',
          // No transactionId — batch digest is not idempotency-keyed per transaction
        });
      } catch (err) {
        console.error(`[TransactionNotifications] Batch flush failed for user ${userId}:`, err);
      }
    }

    // Mark all as done
    const doneBatch = adminDb.batch();
    for (const doc of snap.docs) {
      doneBatch.update(doc.ref, { status: 'done' });
    }
    await doneBatch.commit();
  }

  // ── Primary entry point ─────────────────────────────────────────────────────

  /**
   * Called after any FinancialTransaction is approved.
   * Applies all preference gates, selects the correct template, and dispatches.
   */
  static async onTransactionApproved(transactionId: string): Promise<void> {
    // 1. Load transaction with all needed relations
    // NOTE: We fetch user email separately to avoid Prisma deep-include type inference
    // narrowing that loses the nested relation types under certain tsconfig strictness.
    const txn = await prisma.financialTransaction.findUnique({
      where: { id: transactionId },
      include: {
        project: {
          select: { id: true, displayName: true, addressLine: true },
        },
        plaidLiability: {
          select: {
            lastStatementBalance: true,
            nextPaymentAmount: true,
            nextPaymentDueDate: true,
            lastPaymentAmount: true,
          },
        },
        recurringRule: {
          select: { id: true, name: true },
        },
      },
    });

    if (!txn) {
      console.warn(`[TransactionNotifications] Transaction ${transactionId} not found`);
      return;
    }

    const userId = txn.userId;
    // Fetch user email via the dedicated helper (avoids deep include type narrowing)
    const userEmail = await getUserEmail(userId);
    if (!userEmail) {
      console.warn(`[TransactionNotifications] No email for user ${userId}, skipping`);
      return;
    }

    // 2. Load/create preferences
    const prefs = await TransactionNotificationService.getOrCreatePreferences(userId);

    // 3. Gate: master switch
    if (!prefs.emailTransactionAlerts) return;

    // 4. Gate: category filter
    if (!prefs.emailAlertCategories.includes(txn.category)) return;

    // 5. Gate: amount threshold
    const amount = Number(txn.amount);
    const minAmount = Number(prefs.emailAlertMinAmount);
    if (amount < minAmount) return;

    // 6. Gate: confidence threshold
    if (
      prefs.emailAlertThreshold === 'HIGH_CONFIDENCE_ONLY' &&
      (txn.confidenceScore == null || txn.confidenceScore < HIGH_CONFIDENCE_THRESHOLD)
    ) {
      return;
    }

    // 7. Gate: manual approval only
    if (
      prefs.emailAlertThreshold === 'MANUAL_APPROVAL_ONLY' &&
      txn.status === 'AUTO_APPROVED'
    ) {
      return;
    }

    // 8. Select template
    // Auto-approved by rule takes precedence over category template
    const templateType: TransactionEmailTemplate =
      txn.status === ('AUTO_APPROVED' as FinancialTransactionStatus) && txn.recurringRule
        ? 'AUTO_APPROVED_BY_RULE'
        : CATEGORY_TO_TEMPLATE[txn.category] ?? 'EXPENSE_PAID';

    const projectName =
      txn.project.displayName || txn.project.addressLine || 'Your Property';
    const projectId = txn.project.id;

    // 9. Build template context and generate email content
    let subject: string;
    let html: string;
    let text: string;

    if (templateType === 'AUTO_APPROVED_BY_RULE' && txn.recurringRule) {
      ({ subject, html, text } = generateAutoApprovedEmail({
        amount,
        payee: txn.payee,
        category: txn.category,
        transactionDate: txn.transactionDate,
        projectName,
        projectId,
        ruleName: txn.recurringRule.name,
        ruleId: txn.recurringRule.id,
        transactionId: txn.id,
      }));
    } else if (templateType === 'RENT_PAYMENT_RECEIVED') {
      ({ subject, html, text } = generateRentPaymentEmail({
        amount,
        payee: txn.payee,
        tenantName: null,
        unitNumber: null,
        transactionDate: txn.transactionDate,
        projectName,
        projectId,
        cashOnCashPct: (txn.kpiImpactSnapshot as Record<string, number> | null)
          ?.cashOnCashReturnPct ?? null,
        monthlyCashFlow: (txn.kpiImpactSnapshot as Record<string, number> | null)
          ?.monthlyCashFlow ?? null,
        grossRentYtd: (txn.kpiImpactSnapshot as Record<string, number> | null)
          ?.grossRentYtd ?? null,
      }));
    } else if (templateType === 'MORTGAGE_PAYMENT_PROCESSED') {
      const liability = txn.plaidLiability;
      ({ subject, html, text } = generateMortgagePaymentEmail({
        totalAmount: amount,
        principal: null,
        interest: null,
        escrow: null,
        newLoanBalance: liability?.lastStatementBalance != null ? Number(liability.lastStatementBalance) : null,
        nextPaymentDate: liability?.nextPaymentDueDate ?? null,
        transactionDate: txn.transactionDate,
        projectName,
        projectId,
        dscr: (txn.kpiImpactSnapshot as Record<string, number> | null)?.dscr ?? null,
        ytdInterestPaid: null,
      }));
    } else if (templateType === 'CAPITAL_EXPENDITURE_RECORDED') {
      ({ subject, html, text } = generateCapExEmail({
        amount,
        description: txn.description,
        payee: txn.payee,
        transactionDate: txn.transactionDate,
        projectName,
        projectId,
      }));
    } else {
      // EXPENSE_PAID (default)
      ({ subject, html, text } = generateExpensePaidEmail({
        amount,
        payee: txn.payee,
        category: txn.category,
        subCategory: txn.subCategory,
        transactionDate: txn.transactionDate,
        projectName,
        projectId,
        operatingExpensesMtd: null,
        noi: (txn.kpiImpactSnapshot as Record<string, number> | null)?.noi ?? null,
        cashFlow: (txn.kpiImpactSnapshot as Record<string, number> | null)?.annualCashFlow ?? null,
      }));
    }

    // 10. Dispatch or queue
    if (prefs.emailDigestMode === 'IMMEDIATE') {
      await TransactionNotificationService.sendEmail({
        userId,
        to: userEmail,
        subject,
        html,
        text,
        templateType,
        transactionId: txn.id,
      });
    } else if (prefs.emailDigestMode === 'HOURLY_BATCH') {
      await TransactionNotificationService.queueForBatch(userId, txn.id);
    } else {
      // DAILY_DIGEST — enqueue with a day-level flush key
      const docId = `txn_daily_${userId}_${txn.id}`;
      await adminDb.collection('queued_emails').doc(docId).set({
        id: docId,
        type: 'transaction_notification_daily',
        userId,
        transactionId: txn.id,
        status: 'pending',
        queuedAt: new Date(),
      });
    }
  }

  // ── Daily digest ────────────────────────────────────────────────────────────

  /**
   * Sends a daily digest email for the given user.
   * Summarises all transactions approved today.
   */
  static async sendDailyDigest(userId: string): Promise<void> {
    const userEmail = await getUserEmail(userId);
    if (!userEmail) return;

    const prefs = await TransactionNotificationService.getOrCreatePreferences(userId);
    if (!prefs.emailTransactionAlerts) return;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

    const txns = await prisma.financialTransaction.findMany({
      where: {
        userId,
        status: { in: ['AUTO_APPROVED', 'MANUALLY_APPROVED'] },
        reviewedAt: { gte: startOfDay, lt: endOfDay },
      },
      include: { project: { select: { id: true, displayName: true, addressLine: true } } },
      orderBy: { transactionDate: 'desc' },
    });

    // Count individual alerts sent today
    const alertsToday = await prisma.sentEmailLog.count({
      where: {
        userId,
        sentAt: { gte: startOfDay, lt: endOfDay },
        templateType: { not: 'TRANSACTION_DAILY_DIGEST' },
      },
    });

    const totalIn = txns
      .filter((t) => t.direction === 'CREDIT')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = txns
      .filter((t) => t.direction === 'DEBIT')
      .reduce((s, t) => s + Number(t.amount), 0);

    const { subject, html, text } = generateDailyDigestEmail({
      userId,
      date: today,
      individualAlertsToday: alertsToday,
      transactions: txns.map((t) => ({
        amount: t.direction === 'DEBIT' ? -Number(t.amount) : Number(t.amount),
        payee: t.payee,
        category: t.category,
        status: t.status,
      })),
      totalIn,
      totalOut,
      netCashFlow: totalIn - totalOut,
    });

    await TransactionNotificationService.sendEmail({
      userId,
      to: userEmail,
      subject,
      html,
      text,
      templateType: 'TRANSACTION_DAILY_DIGEST',
      // No transactionId — digest is not per-transaction idempotency-keyed
    });
  }

  // ── Weekly summary ──────────────────────────────────────────────────────────

  /**
   * Sends the Monday 9 AM weekly investment summary for all projects of a user.
   * For multi-project portfolios, sends one combined email.
   */
  static async sendWeeklySummary(userId: string): Promise<void> {
    const userEmail = await getUserEmail(userId);
    if (!userEmail) return;

    const prefs = await TransactionNotificationService.getOrCreatePreferences(userId);
    if (!prefs.emailTransactionAlerts) return;

    const now = new Date();
    // Week: last 7 days
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);

    // Get all projects for the user
    const projects = await prisma.reilProject.findMany({
      where: { createdById: userId },
      select: { id: true, displayName: true, addressLine: true },
      take: 10,
    });

    if (projects.length === 0) return;

    // For simplicity, send one email per user for their primary (first) project
    // or an aggregate if multi-project
    const project = projects[0];
    const projectName = project.displayName || project.addressLine || 'Your Property';

    const txns = await prisma.financialTransaction.findMany({
      where: {
        userId,
        projectId: project.id,
        transactionDate: { gte: weekStart, lt: weekEnd },
        status: { in: ['AUTO_APPROVED', 'MANUALLY_APPROVED'] },
      },
    });

    const rentCollected = txns
      .filter((t) => t.direction === 'CREDIT' && ['RENT_INCOME', 'LATE_FEE_INCOME', 'PET_RENT_INCOME'].includes(t.category))
      .reduce((s, t) => s + Number(t.amount), 0);

    const expensesPaid = txns
      .filter((t) => t.direction === 'DEBIT' && !['MORTGAGE_PRINCIPAL', 'MORTGAGE_INTEREST', 'MORTGAGE_ESCROW_PAYMENT', 'CAPITAL_EXPENDITURE'].includes(t.category))
      .reduce((s, t) => s + Number(t.amount), 0);

    const mortgagePaid = txns
      .filter((t) => ['MORTGAGE_PRINCIPAL', 'MORTGAGE_INTEREST', 'MORTGAGE_ESCROW_PAYMENT'].includes(t.category))
      .reduce((s, t) => s + Number(t.amount), 0);

    const netCashFlow = rentCollected - expensesPaid - mortgagePaid;

    // Top expense category
    const expenseByCat: Record<string, number> = {};
    for (const t of txns.filter((t) => t.direction === 'DEBIT')) {
      expenseByCat[t.category] = (expenseByCat[t.category] ?? 0) + Number(t.amount);
    }
    const topEntry = Object.entries(expenseByCat).sort(([, a], [, b]) => b - a)[0];

    const { subject, html, text } = generateWeeklySummaryEmail({
      projectName,
      projectId: project.id,
      weekStart,
      weekEnd,
      rentCollected,
      rentExpected: 0, // TODO: pull from Lease model when available
      expensesPaid,
      mortgagePaid,
      netCashFlow,
      topExpenseCategory: topEntry?.[0] ?? null,
      topExpenseAmount: topEntry?.[1] ?? null,
    });

    await TransactionNotificationService.sendEmail({
      userId,
      to: userEmail,
      subject,
      html,
      text,
      templateType: 'TRANSACTION_WEEKLY_SUMMARY',
    });
  }
}

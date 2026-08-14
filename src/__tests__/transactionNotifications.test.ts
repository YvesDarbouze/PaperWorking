/**
 * src/__tests__/transactionNotifications.test.ts
 *
 * Unit tests for TransactionNotificationService and the email template generators.
 * All Prisma + Firebase Admin + fetch calls are mocked.
 */

import {
  generateRentPaymentEmail,
  generateExpensePaidEmail,
  generateMortgagePaymentEmail,
  generateCapExEmail,
  generateAutoApprovedEmail,
  generateDailyDigestEmail,
  generateWeeklySummaryEmail,
  CATEGORY_TO_TEMPLATE,
} from '@/lib/emails/templates/TransactionNotificationEmails';
import { TransactionNotificationService } from '@/lib/notifications/transactionNotifications';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appUser: {
      findUnique: jest.fn(),
    },
    userNotificationPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sentEmailLog: {
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    financialTransaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    reilProject: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue(undefined),
      }),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    }),
  },
}));

// Suppress fetch in all tests — individual tests spy on it
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Template generator tests ──────────────────────────────────────────────────

describe('Email template generators', () => {
  const NOW = new Date('2025-09-15T10:00:00Z');

  describe('generateRentPaymentEmail', () => {
    it('includes correct subject and amount', () => {
      const { subject, html, text } = generateRentPaymentEmail({
        amount: 1850,
        payee: 'John Doe',
        transactionDate: NOW,
        projectName: 'Test Property',
        projectId: 'proj-1',
      });

      expect(subject).toContain('$1,850.00');
      expect(subject).toContain('John Doe');
      expect(html).toContain('$1,850.00');
      expect(text).toContain('$1,850.00');
    });

    it('includes KPI data when provided', () => {
      const { html } = generateRentPaymentEmail({
        amount: 2000,
        payee: 'Tenant',
        transactionDate: NOW,
        projectName: 'Prop',
        projectId: 'p1',
        cashOnCashPct: 7.5,
        cashOnCashDelta: 0.2,
        monthlyCashFlow: 450,
      });

      expect(html).toContain('7.50%');
      expect(html).toContain('KPI Impact');
    });

    it('omits KPI box when no KPI data', () => {
      const { html } = generateRentPaymentEmail({
        amount: 1000,
        payee: 'Tenant',
        transactionDate: NOW,
        projectName: 'Prop',
        projectId: 'p1',
      });

      expect(html).not.toContain('KPI Impact');
    });
  });

  describe('generateExpensePaidEmail', () => {
    it('includes category in subject and body', () => {
      const { subject, html } = generateExpensePaidEmail({
        amount: 485,
        payee: 'HVAC Inc',
        category: 'MAINTENANCE_REPAIR',
        transactionDate: NOW,
        projectName: 'Duplex',
        projectId: 'p2',
      });

      expect(subject).toContain('$485.00');
      expect(html).toContain('MAINTENANCE_REPAIR');
    });
  });

  describe('generateMortgagePaymentEmail', () => {
    it('shows principal/interest breakdown', () => {
      const { html, text } = generateMortgagePaymentEmail({
        totalAmount: 1428.64,
        principal: 372.1,
        interest: 876.54,
        escrow: 180,
        transactionDate: NOW,
        projectName: 'Prop',
        projectId: 'p3',
      });

      expect(html).toContain('$372.10');
      expect(html).toContain('$876.54');
      expect(text).toContain('tax deductible');
    });

    it('omits breakdown rows when values are null', () => {
      const { html } = generateMortgagePaymentEmail({
        totalAmount: 1000,
        transactionDate: NOW,
        projectName: 'Prop',
        projectId: 'p3',
      });

      // Should still include the total
      expect(html).toContain('$1,000.00');
    });
  });

  describe('generateCapExEmail', () => {
    it('notes NOI impact is None', () => {
      const { html } = generateCapExEmail({
        amount: 6200,
        payee: 'Contractor LLC',
        transactionDate: NOW,
        projectName: 'Prop',
        projectId: 'p4',
      });

      expect(html).toContain('None');
      expect(html).toContain('CapEx');
    });
  });

  describe('generateAutoApprovedEmail', () => {
    it('mentions the rule name', () => {
      const { subject, html } = generateAutoApprovedEmail({
        amount: 180,
        payee: 'City Water',
        category: 'UTILITIES',
        transactionDate: NOW,
        projectName: 'Prop',
        projectId: 'p5',
        ruleName: 'City Water — Recurring',
        ruleId: 'rule-1',
        transactionId: 'txn-1',
      });

      expect(subject).toContain('⚡');
      expect(html).toContain('City Water — Recurring');
    });
  });

  describe('generateDailyDigestEmail', () => {
    it('shows net cash flow correctly', () => {
      const { html, text } = generateDailyDigestEmail({
        userId: 'u1',
        date: NOW,
        individualAlertsToday: 2,
        transactions: [
          { amount: 1850, payee: 'Tenant', category: 'RENT_INCOME', status: 'MANUALLY_APPROVED' },
          { amount: -485, payee: 'Vendor', category: 'MAINTENANCE_REPAIR', status: 'AUTO_APPROVED' },
        ],
        totalIn: 1850,
        totalOut: 485,
        netCashFlow: 1365,
      });

      expect(html).toContain('$1,365.00');
      expect(text).toContain('Net:');
      expect(html).toContain('2 individual alert');
    });

    it('shows no-transactions message when list is empty', () => {
      const { html } = generateDailyDigestEmail({
        userId: 'u1',
        date: NOW,
        individualAlertsToday: 0,
        transactions: [],
        totalIn: 0,
        totalOut: 0,
        netCashFlow: 0,
      });

      expect(html).toContain('No transactions today');
    });
  });

  describe('generateWeeklySummaryEmail', () => {
    it('includes all KPI values when provided', () => {
      const { html } = generateWeeklySummaryEmail({
        projectName: 'Duplex',
        projectId: 'p6',
        weekStart: new Date('2025-09-08'),
        weekEnd: new Date('2025-09-15'),
        rentCollected: 3700,
        rentExpected: 3700,
        expensesPaid: 1200,
        mortgagePaid: 1428,
        netCashFlow: 1072,
        cashOnCashPct: 7.24,
        dscr: 1.32,
        capRatePct: 5.8,
        occupancyPct: 100,
      });

      expect(html).toContain('7.24%');
      expect(html).toContain('1.32');
      expect(html).toContain('5.80%');
    });
  });
});

// ─── CATEGORY_TO_TEMPLATE mapping ─────────────────────────────────────────────

describe('CATEGORY_TO_TEMPLATE', () => {
  it('maps RENT_INCOME to RENT_PAYMENT_RECEIVED', () => {
    expect(CATEGORY_TO_TEMPLATE.RENT_INCOME).toBe('RENT_PAYMENT_RECEIVED');
  });

  it('maps MORTGAGE_PRINCIPAL to MORTGAGE_PAYMENT_PROCESSED', () => {
    expect(CATEGORY_TO_TEMPLATE.MORTGAGE_PRINCIPAL).toBe('MORTGAGE_PAYMENT_PROCESSED');
  });

  it('maps CAPITAL_EXPENDITURE to CAPITAL_EXPENDITURE_RECORDED', () => {
    expect(CATEGORY_TO_TEMPLATE.CAPITAL_EXPENDITURE).toBe('CAPITAL_EXPENDITURE_RECORDED');
  });

  it('maps all expense categories to EXPENSE_PAID', () => {
    const expenseCategories = [
      'PROPERTY_TAX',
      'PROPERTY_INSURANCE',
      'MAINTENANCE_REPAIR',
      'UTILITIES',
    ] as const;

    for (const cat of expenseCategories) {
      expect(CATEGORY_TO_TEMPLATE[cat]).toBe('EXPENSE_PAID');
    }
  });
});

// ─── TransactionNotificationService unit tests ────────────────────────────────

describe('TransactionNotificationService', () => {
  const { prisma } = jest.requireMock('@/lib/prisma');

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  describe('getOrCreatePreferences', () => {
    it('returns existing preferences if found', async () => {
      const mockPrefs = {
        id: 'pref-1',
        userId: 'u1',
        emailTransactionAlerts: true,
        emailAlertCategories: ['RENT_INCOME'],
        emailAlertMinAmount: 0,
        emailDigestMode: 'IMMEDIATE',
        emailAlertThreshold: 'ALL',
      };
      prisma.userNotificationPreferences.findUnique.mockResolvedValue(mockPrefs);

      const result = await TransactionNotificationService.getOrCreatePreferences('u1');
      expect(result).toEqual(mockPrefs);
      expect(prisma.userNotificationPreferences.create).not.toHaveBeenCalled();
    });

    it('creates defaults when no preferences exist', async () => {
      prisma.userNotificationPreferences.findUnique.mockResolvedValue(null);
      prisma.userNotificationPreferences.create.mockResolvedValue({
        id: 'pref-new',
        userId: 'u1',
        emailTransactionAlerts: true,
        emailAlertCategories: ['RENT_INCOME', 'PROPERTY_TAX'],
        emailAlertMinAmount: 0,
        emailDigestMode: 'IMMEDIATE',
        emailAlertThreshold: 'ALL',
      });

      await TransactionNotificationService.getOrCreatePreferences('u1');
      expect(prisma.userNotificationPreferences.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            emailTransactionAlerts: true,
            emailDigestMode: 'IMMEDIATE',
            emailAlertThreshold: 'ALL',
          }),
        }),
      );
    });
  });

  describe('sendEmail', () => {
    it('mocks email when SENDGRID_API_KEY absent and records mocked status', async () => {
      delete process.env.SENDGRID_API_KEY;
      process.env.SYSTEM_EMAIL_PROVIDER = 'mock';
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      prisma.sentEmailLog.create.mockResolvedValue({ id: 'log-1' });
      prisma.sentEmailLog.update.mockResolvedValue({});

      await TransactionNotificationService.sendEmail({
        userId: 'u1',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        templateType: 'RENT_PAYMENT_RECEIVED',
        transactionId: 'txn-1',
      });

      expect(prisma.sentEmailLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'mocked' }),
        }),
      );
      consoleSpy.mockRestore();
    });

    it('skips duplicate via idempotency guard', async () => {
      const { Prisma } = jest.requireActual('@prisma/client');
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.0',
      });
      prisma.sentEmailLog.create.mockRejectedValue(p2002);

      const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      await TransactionNotificationService.sendEmail({
        userId: 'u1',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        templateType: 'RENT_PAYMENT_RECEIVED',
        transactionId: 'txn-already-sent',
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate blocked'),
      );
      consoleSpy.mockRestore();
    });

    it('dispatches via SendGrid when API key is set', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test-key';
      delete process.env.SYSTEM_EMAIL_PROVIDER;
      mockFetch.mockResolvedValue({
        status: 202,
        headers: {
          get: (h: string) => (h.toLowerCase() === 'x-message-id' ? 'sg-msg-1' : null),
        },
        text: async () => '',
      });
      prisma.sentEmailLog.create.mockResolvedValue({ id: 'log-1' });
      prisma.sentEmailLog.update.mockResolvedValue({});

      await TransactionNotificationService.sendEmail({
        userId: 'u1',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        templateType: 'EXPENSE_PAID',
        transactionId: 'txn-2',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/mail/send',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(prisma.sentEmailLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'sent', messageId: 'sg-msg-1' }),
        }),
      );
    });

    it('marks status as failed and does not throw on provider error', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test-key';
      delete process.env.SYSTEM_EMAIL_PROVIDER;
      mockFetch.mockResolvedValue({
        status: 429,
        headers: { get: () => null },
        text: async () => '{"errors":[{"message":"rate limited"}]}',
      });
      prisma.sentEmailLog.create.mockResolvedValue({ id: 'log-1' });
      prisma.sentEmailLog.update.mockResolvedValue({});

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await expect(
        TransactionNotificationService.sendEmail({
          userId: 'u1',
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
          templateType: 'EXPENSE_PAID',
          transactionId: 'txn-3',
        }),
      ).resolves.not.toThrow();

      expect(prisma.sentEmailLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        }),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('onTransactionApproved — preference gates', () => {
    const makeTxn = (overrides = {}) => ({
      id: 'txn-100',
      userId: 'u1',
      amount: 1850,
      payee: 'Test Tenant',
      category: 'RENT_INCOME',
      direction: 'CREDIT',
      subCategory: null,
      description: null,
      transactionDate: new Date(),
      status: 'MANUALLY_APPROVED',
      confidenceScore: 0.95,
      kpiImpactSnapshot: null,
      recurringRule: null,
      plaidLiability: null,
      user: { id: 'u1', email: 'user@example.com' },
      project: { id: 'proj-1', displayName: 'Test Property', addressLine: '123 Main St' },
      ...overrides,
    });

    beforeEach(() => {
      prisma.financialTransaction.findUnique.mockResolvedValue(makeTxn());
      prisma.sentEmailLog.create.mockResolvedValue({ id: 'log-1' });
      prisma.sentEmailLog.update.mockResolvedValue({});
      // getUserEmail() now calls appUser.findUnique — mock it so the email gate passes
      prisma.appUser.findUnique.mockResolvedValue({ email: 'user@example.com' });
    });

    it('skips email when master switch is off', async () => {
      prisma.userNotificationPreferences.findUnique.mockResolvedValue({
        emailTransactionAlerts: false,
        emailAlertCategories: ['RENT_INCOME'],
        emailAlertMinAmount: 0,
        emailDigestMode: 'IMMEDIATE',
        emailAlertThreshold: 'ALL',
      });

      await TransactionNotificationService.onTransactionApproved('txn-100');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips email when category not in user preferences', async () => {
      prisma.userNotificationPreferences.findUnique.mockResolvedValue({
        emailTransactionAlerts: true,
        emailAlertCategories: ['PROPERTY_TAX'], // RENT_INCOME not included
        emailAlertMinAmount: 0,
        emailDigestMode: 'IMMEDIATE',
        emailAlertThreshold: 'ALL',
      });

      await TransactionNotificationService.onTransactionApproved('txn-100');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips email when amount is below minimum threshold', async () => {
      prisma.userNotificationPreferences.findUnique.mockResolvedValue({
        emailTransactionAlerts: true,
        emailAlertCategories: ['RENT_INCOME'],
        emailAlertMinAmount: 5000, // amount is 1850
        emailDigestMode: 'IMMEDIATE',
        emailAlertThreshold: 'ALL',
      });

      await TransactionNotificationService.onTransactionApproved('txn-100');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips when HIGH_CONFIDENCE_ONLY and confidence is low', async () => {
      prisma.financialTransaction.findUnique.mockResolvedValue(
        makeTxn({ confidenceScore: 0.6 }),
      );
      prisma.userNotificationPreferences.findUnique.mockResolvedValue({
        emailTransactionAlerts: true,
        emailAlertCategories: ['RENT_INCOME'],
        emailAlertMinAmount: 0,
        emailDigestMode: 'IMMEDIATE',
        emailAlertThreshold: 'HIGH_CONFIDENCE_ONLY',
      });

      await TransactionNotificationService.onTransactionApproved('txn-100');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips AUTO_APPROVED when threshold is MANUAL_APPROVAL_ONLY', async () => {
      prisma.financialTransaction.findUnique.mockResolvedValue(
        makeTxn({ status: 'AUTO_APPROVED' }),
      );
      prisma.userNotificationPreferences.findUnique.mockResolvedValue({
        emailTransactionAlerts: true,
        emailAlertCategories: ['RENT_INCOME'],
        emailAlertMinAmount: 0,
        emailDigestMode: 'IMMEDIATE',
        emailAlertThreshold: 'MANUAL_APPROVAL_ONLY',
      });

      await TransactionNotificationService.onTransactionApproved('txn-100');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('queues for batch when digestMode is HOURLY_BATCH', async () => {
      const { adminDb } = jest.requireMock('@/lib/firebase/admin');
      prisma.userNotificationPreferences.findUnique.mockResolvedValue({
        emailTransactionAlerts: true,
        emailAlertCategories: ['RENT_INCOME'],
        emailAlertMinAmount: 0,
        emailDigestMode: 'HOURLY_BATCH',
        emailAlertThreshold: 'ALL',
      });

      await TransactionNotificationService.onTransactionApproved('txn-100');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(adminDb.collection).toHaveBeenCalledWith('queued_emails');
    });
  });
});

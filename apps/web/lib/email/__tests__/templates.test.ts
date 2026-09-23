/**
 * Template rendering tests.
 *
 * Every email template is rendered with minimal valid props and checked for:
 * - a non-empty subject (where the template returns one)
 * - key copy phrases present in the HTML
 * - the BaseLayout / transaction document shell (`<!DOCTYPE` marker)
 * - a non-empty plain-text extraction via htmlToPlainText
 */

import { describe, expect, it } from '@jest/globals';
import {
  CATEGORY_TO_TEMPLATE,
  generateAutoApprovedEmail,
  generateCapExEmail,
  generateDailyDigestEmail,
  generateDocumentUploadEmail,
  generateExpensePaidEmail,
  generateFirstMetricEmail,
  generateInboxDigestEmail,
  generateInvestorInquiryEmail,
  generateInvestorPledgeEmail,
  generateInvestorResponseEmail,
  generateLifecycleAlertEmail,
  generateMetricAlertEmail,
  generateMortgagePaymentEmail,
  generateNotificationEmailHtml,
  generateNudgeEmail,
  generatePhaseAdvanceEmail,
  generateProjectClosedEmail,
  generateRentPaymentEmail,
  generateSecondProjectEmail,
  generateSystemNotificationEmail,
  generateTrialSummaryEmail,
  generateUserComposedEmail,
  generateWeeklySummaryEmail,
  generateWelcomeEmail,
  htmlToPlainText,
  renderEmailLayout,
} from '@/lib/email/templates';
import type { TransactionEmailTemplate } from '@/lib/email/templates';

interface SubjectHtmlEmail {
  subject: string;
  html: string;
  text?: string;
}

function assertRenderedEmail(rendered: SubjectHtmlEmail, keyPhrase: string): void {
  expect(rendered.subject.trim().length).toBeGreaterThan(0);
  expect(rendered.html).toContain(keyPhrase);
  expect(rendered.html).toContain('<!DOCTYPE');
  expect(htmlToPlainText(rendered.html).trim().length).toBeGreaterThan(0);
  if (rendered.text !== undefined) {
    expect(rendered.text.trim().length).toBeGreaterThan(0);
  }
}

function assertRenderedHtml(html: string, keyPhrase: string): void {
  expect(html).toContain(keyPhrase);
  expect(html).toContain('<!DOCTYPE');
  expect(htmlToPlainText(html).trim().length).toBeGreaterThan(0);
}

describe('BaseLayout', () => {
  it('renderEmailLayout wraps body content in the branded shell', () => {
    const html = renderEmailLayout({ title: 'Test Email', bodyHtml: '<p>Hello world</p>' });
    expect(html).toContain('<!DOCTYPE');
    expect(html).toContain('Test Email');
    expect(html).toContain('Hello world');
  });

  it('htmlToPlainText converts links and paragraphs to readable text', () => {
    const text = htmlToPlainText(
      '<p>Hello <a href="https://paperworking.co">PaperWorking</a></p>',
    );
    expect(text).toBe('Hello PaperWorking (https://paperworking.co)');
  });
});

describe('NotificationTemplate', () => {
  it('renders a new-message notification', () => {
    assertRenderedHtml(
      generateNotificationEmailHtml({
        senderName: 'Ada Lovelace',
        messageSnippet: 'Can we review the numbers?',
        projectId: 'proj-1',
        appUrl: 'https://paperworking.co',
      }),
      'New Message from Ada Lovelace',
    );
  });
});

describe('DocumentUploadEmail', () => {
  it('renders the uploaded document details', () => {
    const rendered = generateDocumentUploadEmail({
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      documentName: 'Inspection Report',
      category: 'Inspection',
      uploaderName: 'Grace Hopper',
    });
    assertRenderedEmail(rendered, 'Document Uploaded');
    expect(rendered.subject).toContain('Inspection Report');
  });
});

describe('FirstMetricEmail', () => {
  it('renders the first-metric milestone', () => {
    const rendered = generateFirstMetricEmail({
      displayName: 'Jane Doe',
      projectName: 'Maple Duplex',
      metricName: 'Cap Rate',
      metricValue: '6.25%',
      projectUrl: '/dashboard/projects/proj-1',
    });
    assertRenderedEmail(rendered, 'Your first metric is live');
    expect(rendered.html).toContain('6.25%');
  });
});

describe('InboxDigestEmail', () => {
  it('renders the unread activity digest', () => {
    const rendered = generateInboxDigestEmail({
      recipientName: 'Jane',
      items: [
        {
          id: 'n-1',
          title: 'New document uploaded',
          body: 'An inspection report was added to your vault.',
          deepLinkUrl: '/dashboard/projects/proj-1?tab=vault',
          createdAt: new Date('2026-01-15T10:00:00Z'),
        },
      ],
    });
    assertRenderedEmail(rendered, 'Unread Activity Digest');
    expect(rendered.subject).toContain('1 unread notification');
  });
});

describe('InvestorInquiryEmail', () => {
  it('renders the investor question', () => {
    const rendered = generateInvestorInquiryEmail({
      investorName: 'Robert Chen',
      investorEmail: 'robert@example.com',
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      message: 'What is the projected hold period?',
    });
    assertRenderedEmail(rendered, 'Investor Question');
    expect(rendered.text).toContain('robert@example.com');
  });
});

describe('InvestorPledgeEmail', () => {
  it('renders the capital pledge and progress', () => {
    const rendered = generateInvestorPledgeEmail({
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      investorName: 'Robert Chen',
      pledgeAmount: 250000,
      totalRaised: 750000,
      targetAmount: 1000000,
    });
    assertRenderedEmail(rendered, 'Capital Pledge Received');
    expect(rendered.html).toContain('$750,000 raised');
    expect(rendered.subject).toContain('$250,000');
  });
});

describe('InvestorResponseEmail', () => {
  it('renders the accepted-invitation response', () => {
    const rendered = generateInvestorResponseEmail({
      action: 'accepted',
      investorName: 'Robert Chen',
      investorEmail: 'robert@example.com',
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      proposedEquityPercent: 10,
      proposedAmount: 250000,
    });
    assertRenderedEmail(rendered, 'Invitation Accepted');
    expect(rendered.html).toContain('Proposed Equity');
    expect(rendered.text).toContain('robert@example.com');
  });
});

describe('LifecycleAlertEmail', () => {
  it('renders the lease-renewal lifecycle alert', () => {
    const rendered = generateLifecycleAlertEmail({
      alertType: 'LEASE_RENEWAL_DUE',
      address: '123 Main St',
      daysUntil: 5,
      title: 'Lease renewal approaching',
      body: 'Please review the renewal terms before the deadline.',
      deepLinkUrl: '/dashboard/properties/prop-1',
    });
    assertRenderedEmail(rendered, 'Days Remaining');
    expect(rendered.html).toContain('URGENT');
  });
});

describe('MetricAlertEmail', () => {
  it('renders the DSCR threshold alert', () => {
    const rendered = generateMetricAlertEmail({
      alertType: 'DSCR_BELOW_THRESHOLD',
      address: '123 Main St',
      currentValue: 1.05,
      threshold: 1.25,
      title: 'DSCR dropped below threshold',
      body: 'Debt service coverage has fallen below your target.',
      deepLinkUrl: '/dashboard/properties/prop-1',
    });
    assertRenderedEmail(rendered, 'Metric Alert');
    expect(rendered.html).toContain('1.05');
  });
});

describe('NudgeEmail', () => {
  it('renders the re-engagement nudge', () => {
    const rendered = generateNudgeEmail({ displayName: 'Jane Doe', daysInactive: 3 });
    assertRenderedEmail(rendered, 'Your workspace is ready, Jane');
  });
});

describe('PhaseAdvanceEmail', () => {
  it('renders the phase transition', () => {
    const rendered = generatePhaseAdvanceEmail({
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      fromPhase: 'phase-1',
      toPhase: 'phase-2',
      advancedBy: 'Sam Rivera',
    });
    assertRenderedEmail(rendered, 'Phase Advance');
    expect(rendered.html).toContain('Phase 1 — Acquisition');
    expect(rendered.html).toContain('Phase 2 — Renovation');
  });
});

describe('ProjectClosedEmail', () => {
  it('renders the closed-won disposition with metrics', () => {
    const rendered = generateProjectClosedEmail({
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      outcome: 'closed_won',
      closedBy: 'Sam Rivera',
      netProfit: 42500,
      roi: 18.5,
      daysHeld: 320,
    });
    assertRenderedEmail(rendered, 'Net Profit');
    expect(rendered.html).toContain('Closed — Won');
    expect(rendered.subject).toContain('Closed — Won');
  });
});

describe('SecondProjectEmail', () => {
  it('renders the portfolio-growth milestone', () => {
    const rendered = generateSecondProjectEmail({
      displayName: 'Jane Doe',
      projectName: 'Oak Street Triplex',
      totalProjects: 2,
    });
    assertRenderedEmail(rendered, 'Portfolio growing — 2 projects');
  });
});

describe('SystemNotificationEmail', () => {
  it('renders the generic fallback notification', () => {
    const rendered = generateSystemNotificationEmail({
      title: 'Your export is ready',
      body: 'The portfolio export you requested is available.',
      deepLinkUrl: '/dashboard/reports',
    });
    assertRenderedEmail(rendered, 'Notification Alert');
  });

  it('renders the vendor-bid notification branch', () => {
    const rendered = generateSystemNotificationEmail({
      title: 'New bid received',
      body: 'A contractor submitted a proposal.',
      deepLinkUrl: '/dashboard/projects/proj-1',
      type: 'VENDOR_BID',
      objectReference: { dealAddress: '123 Main St', amount: '$12,400' },
      actorName: 'Northwind Contractors',
    });
    assertRenderedEmail(rendered, 'New Bid Received');
    expect(rendered.html).toContain('$12,400');
  });
});

describe('TransactionNotificationEmails', () => {
  it('renders the rent payment email', () => {
    const rendered = generateRentPaymentEmail({
      amount: 2450,
      payee: 'Tenant — Unit 2',
      tenantName: 'Dana Whitfield',
      unitNumber: '2',
      transactionDate: new Date('2026-01-15T10:00:00Z'),
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      cashOnCashPct: 7.25,
      cashOnCashDelta: 0.4,
      monthlyCashFlow: 1180,
      grossRentYtd: 4900,
    });
    assertRenderedEmail(rendered, 'detected a rent payment');
    expect(rendered.subject).toContain('Rent Received');
    expect(rendered.html).toContain('$2,450.00');
  });

  it('renders the expense paid email', () => {
    const rendered = generateExpensePaidEmail({
      amount: 320.5,
      payee: 'City Water Department',
      category: 'Utilities',
      transactionDate: new Date('2026-01-15T10:00:00Z'),
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      noi: 18400,
      noiDelta: -1.2,
    });
    assertRenderedEmail(rendered, 'recorded an expense payment');
    expect(rendered.subject).toContain('Expense Paid');
  });

  it('renders the mortgage payment email', () => {
    const rendered = generateMortgagePaymentEmail({
      totalAmount: 1875.33,
      principal: 640.12,
      interest: 985.21,
      escrow: 250,
      newLoanBalance: 214500.44,
      transactionDate: new Date('2026-01-15T10:00:00Z'),
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      dscr: 1.34,
    });
    assertRenderedEmail(rendered, 'mortgage payment was recorded');
    expect(rendered.subject).toContain('Mortgage Payment');
  });

  it('renders the capital expenditure email', () => {
    const rendered = generateCapExEmail({
      amount: 8400,
      description: 'Roof replacement',
      payee: 'Summit Roofing',
      transactionDate: new Date('2026-01-15T10:00:00Z'),
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
    });
    assertRenderedEmail(rendered, 'capital expenditure was recorded');
    expect(rendered.subject).toContain('CapEx Recorded');
  });

  it('renders the auto-approved transaction email', () => {
    const rendered = generateAutoApprovedEmail({
      amount: 145.75,
      payee: 'GreenLawn Services',
      category: 'Landscaping',
      transactionDate: new Date('2026-01-15T10:00:00Z'),
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      ruleName: 'Auto-approve recurring maintenance under $250',
      ruleId: 'rule-1',
      transactionId: 'txn-1',
    });
    assertRenderedEmail(rendered, 'auto-approved this transaction');
    expect(rendered.subject).toContain('Auto-Approved');
  });

  it('renders the daily digest email', () => {
    const rendered = generateDailyDigestEmail({
      userId: 'user-1',
      date: new Date('2026-01-15T10:00:00Z'),
      individualAlertsToday: 2,
      transactions: [
        {
          amount: 2450,
          payee: 'Northwind Property Mgmt',
          category: 'RENT_INCOME',
          status: 'cleared',
        },
      ],
      totalIn: 2450,
      totalOut: 320.5,
      netCashFlow: 2129.5,
    });
    assertRenderedEmail(rendered, 'Northwind Property Mgmt');
    expect(rendered.subject).toContain('Daily Transaction Summary');
  });

  it('renders the daily digest empty state', () => {
    const rendered = generateDailyDigestEmail({
      userId: 'user-1',
      date: new Date('2026-01-15T10:00:00Z'),
      individualAlertsToday: 0,
      transactions: [],
      totalIn: 0,
      totalOut: 0,
      netCashFlow: 0,
    });
    assertRenderedEmail(rendered, 'No transactions today.');
  });

  it('renders the weekly summary email', () => {
    const rendered = generateWeeklySummaryEmail({
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      weekStart: new Date('2026-01-12T00:00:00Z'),
      weekEnd: new Date('2026-01-18T00:00:00Z'),
      rentCollected: 4900,
      rentExpected: 4900,
      expensesPaid: 640,
      mortgagePaid: 1875.33,
      netCashFlow: 2384.67,
      topExpenseCategory: 'Utilities',
      topExpenseAmount: 320.5,
      cashOnCashPct: 7.25,
      dscr: 1.34,
      capRatePct: 6.25,
      occupancyPct: 100,
    });
    assertRenderedEmail(rendered, 'weekly investment performance report');
    expect(rendered.subject).toContain('Weekly Investment Report');
  });

  it('maps every transaction category to a known template', () => {
    const knownTemplates = new Set<TransactionEmailTemplate>([
      'RENT_PAYMENT_RECEIVED',
      'EXPENSE_PAID',
      'MORTGAGE_PAYMENT_PROCESSED',
      'CAPITAL_EXPENDITURE_RECORDED',
      'AUTO_APPROVED_BY_RULE',
      'TRANSACTION_DAILY_DIGEST',
      'TRANSACTION_WEEKLY_SUMMARY',
    ]);
    const entries = Object.entries(CATEGORY_TO_TEMPLATE);
    expect(entries.length).toBeGreaterThanOrEqual(40);
    for (const [category, template] of entries) {
      expect(category.length).toBeGreaterThan(0);
      expect(knownTemplates.has(template)).toBe(true);
    }
  });
});

describe('TrialSummaryEmail', () => {
  it('renders the trial summary and stats', () => {
    const rendered = generateTrialSummaryEmail({
      displayName: 'Jane Doe',
      daysRemaining: 3,
      projectCount: 2,
      metricsTracked: 5,
    });
    assertRenderedEmail(rendered, 'Your trial ends in 3 days');
    expect(rendered.html).toContain('Projects created');
  });
});

describe('UserComposedEmail', () => {
  it('renders the sender-composed message body', () => {
    assertRenderedHtml(
      generateUserComposedEmail({
        senderName: 'Sam Rivera',
        senderOrganization: 'PaperWorking Capital',
        projectName: 'Maple Duplex',
        projectId: 'proj-1',
        messageBody: 'Sharing the updated rent roll for your review.',
      }),
      'Sharing the updated rent roll for your review.',
    );
  });
});

describe('WelcomeEmail', () => {
  it('renders the welcome and trial explanation', () => {
    const rendered = generateWelcomeEmail({ displayName: 'Jane Doe', intent: 'own_properties' });
    assertRenderedEmail(rendered, 'Welcome to PaperWorking, Jane');
    expect(rendered.html).toContain('14 Days Free');
  });
});

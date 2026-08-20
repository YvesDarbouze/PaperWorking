import { describe, expect, it } from '@jest/globals';
import {
  categoriesForTab,
  formatFinancialTransaction,
  REVENUE_CATEGORIES,
} from '../lib/financial-transactions/categories.js';
import { validateSplitAmounts, validateClassifyBody } from '../lib/financial-transactions/classify.js';
import {
  canSendProjectInvitations,
  deduplicateBroadcastRecipients,
  applyInvitationTemplateVariables,
  computeProposedInvestmentTerms,
} from '../lib/invitations/broadcast.js';
import {
  buildGuestPortalResponse,
  validateInvitationTokenFormat,
} from '../lib/invitations/guest-portal.js';
import { canCreateDealInvite, buildInviteDocument } from '../lib/invites/schema.js';
import {
  calculateStorageQuotaBytes,
  isVendorAccount,
  phaseToCurrentPhase,
} from '../lib/projects/create-schema.js';

describe('financial transaction libs', () => {
  it('categoriesForTab maps REVENUE', () => {
    expect(categoriesForTab('REVENUE')).toEqual(REVENUE_CATEGORIES);
    expect(categoriesForTab('ALL')).toBeNull();
  });

  it('formatFinancialTransaction coerces amount and dates', () => {
    const formatted = formatFinancialTransaction({
      id: 't1',
      projectId: 'p1',
      source: 'PLAID',
      plaidTransactionId: null,
      amount: 10050,
      direction: 'OUTFLOW',
      transactionDate: new Date('2026-01-01'),
      payee: 'Vendor',
      description: 'Repair',
      category: 'MAINTENANCE_REPAIR',
      subCategory: null,
      matchedLeaseId: null,
      status: 'PENDING_REVIEW',
      confidenceScore: 0.5,
      isRecurring: false,
      isSplit: false,
      notes: null,
    });
    expect(formatted.amount).toBe(10050);
    expect(formatted.transactionDate).toContain('2026');
  });

  it('validateSplitAmounts enforces sum tolerance', () => {
    expect(
      validateSplitAmounts([{ amount: 50, category: 'MISC', reason: 'a' }], 100).ok,
    ).toBe(false);
    expect(
      validateSplitAmounts(
        [
          { amount: 60, category: 'MISC', reason: 'a' },
          { amount: 40, category: 'MISC', reason: 'b' },
        ],
        100,
      ).ok,
    ).toBe(true);
  });

  it('validateClassifyBody requires category or splits', () => {
    expect(validateClassifyBody({}).ok).toBe(false);
    expect(validateClassifyBody({ category: 'RENT_INCOME' }).ok).toBe(true);
  });
});

describe('invitation broadcast libs', () => {
  it('canSendProjectInvitations checks role and permission', () => {
    expect(
      canSendProjectInvitations({
        isProjectMember: true,
        memberRole: 'Lead Investor',
      }),
    ).toBe(true);
    expect(
      canSendProjectInvitations({
        isProjectMember: true,
        memberRole: 'Viewer',
        projectPermissions: ['team.invite'],
      }),
    ).toBe(true);
    expect(
      canSendProjectInvitations({
        isProjectMember: false,
        callerOrgId: 'org-1',
        projectOrgId: 'org-1',
        callerOrgRole: 'Admin',
      }),
    ).toBe(true);
  });

  it('deduplicateBroadcastRecipients merges contacts and followers', () => {
    const recipients = deduplicateBroadcastRecipients(
      [{ email: 'a@example.com', name: 'A', emailConsent: true, inAppConsent: true }],
      [{ email: 'a@example.com', emailConsent: false, inAppConsent: true }],
    );
    expect(recipients).toHaveLength(1);
    expect(recipients[0].emailConsent).toBe(false);
    expect(recipients[0].inAppConsent).toBe(true);
  });

  it('applyInvitationTemplateVariables replaces placeholders', () => {
    const result = applyInvitationTemplateVariables(
      'Target {{FUNDING_TARGET}} at {{PROPERTY_ADDRESS}}',
      { propertyAddress: '123 Main' },
      { fundingTarget: 500000 },
    );
    expect(result).toContain('$500,000');
    expect(result).toContain('123 Main');
  });

  it('computeProposedInvestmentTerms uses ticket or min', () => {
    const terms = computeProposedInvestmentTerms(
      { email: 'a@b.com', name: 'A', potentialTicket: 25000, emailConsent: true, inAppConsent: true },
      { fundingTarget: 100000, equityOfferedPct: 20, minTicket: 1000 },
    );
    expect(terms.proposedAmount).toBe(250);
    expect(terms.proposedEquityPercent).toBe(0.05);
  });
});

describe('guest portal libs', () => {
  it('validateInvitationTokenFormat enforces minimum length', () => {
    expect(validateInvitationTokenFormat('short')).toBe(false);
    expect(validateInvitationTokenFormat('a'.repeat(16))).toBe(true);
  });

  it('buildGuestPortalResponse shapes allowlisted payload', () => {
    const response = buildGuestPortalResponse({
      invitation: {
        name: 'Investor',
        email: 'inv@example.com',
        projectId: 'proj-1',
        proposedAmount: 50000,
        proposedEquityPercent: 5,
        status: 'pending',
        expiresAt: new Date('2026-12-31'),
      },
      project: {
        propertyName: 'Deal A',
        financials: { purchasePrice: 200000, expectedROI: 12 },
      },
      raiseTarget: 100000,
      raiseProgress: { raiseRaised: 25000, raisePercentage: 25 },
      daysLeft: 10,
      hoursLeft: 5,
      metricHistory: { noiHistory: [], capRateHistory: [], cashFlowHistory: [] },
      commitmentStatus: 'pending',
      commitmentId: null,
      inquiries: [],
    });

    expect(response.investorName).toBe('Investor');
    expect(response.purchasePrice).toBe(200000);
    expect(response.projectId).toBe('proj-1');
  });
});

describe('invites and projects libs', () => {
  it('canCreateDealInvite allows investment team accounts', () => {
    expect(canCreateDealInvite('investment_team')).toBe(true);
    expect(canCreateDealInvite('vendor')).toBe(false);
  });

  it('buildInviteDocument normalizes email', () => {
    const doc = buildInviteDocument('id-1', 'uid-1', {
      email: 'User@Example.com',
      role: 'team_member',
      professionalRole: 'General Specialist',
    });
    expect(doc.email).toBe('user@example.com');
    expect(doc.status).toBe('pending');
  });

  it('project create helpers compute phase and quota', () => {
    expect(phaseToCurrentPhase('hold')).toBe(3);
    expect(calculateStorageQuotaBytes(0)).toBe(Math.floor(536870912 / 1));
    expect(isVendorAccount({ account_type: 'vendor' })).toBe(true);
  });
});

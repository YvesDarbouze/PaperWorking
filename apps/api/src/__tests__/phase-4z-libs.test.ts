import { describe, expect, it } from '@jest/globals';
import { canReadReilProject, canWriteReilProject } from '../lib/reil/access.js';
import {
  validateReilAssignmentBody,
  validateReilInviteBody,
  validateReilStatusBody,
  validateReilTermsBody,
} from '../lib/reil/validation.js';
import {
  buildPhasePatchUpdate,
  filterPurchaseFinancingFields,
  PURCHASE_FINANCING_FIELDS,
} from '../lib/projects/phases.js';
import {
  canAddLoanEstimate,
  validateLoanEstimateCreateBody,
} from '../lib/projects/loan-estimates.js';
import { buildLenderPackageItemPatch } from '../lib/projects/lender-package-item.js';
import {
  mergeHoldRegistryUpdate,
  buildExitRealizedPayload,
  validateExitStatus,
} from '../lib/projects/hold-registry.js';
import {
  generateVerificationCode,
  validateClaimStartBody,
  validateReportSpamBody,
} from '../lib/identity/claim.js';
import {
  buildTaxShareRecord,
  validateTaxShareAccess,
  validateTaxShareCreateBody,
} from '../lib/tax/share.js';

describe('Phase 4z libs', () => {
  it('reil access helpers', () => {
    const project = {
      createdById: 'owner',
      collaborators: [{ userId: 'collab' }],
    };
    expect(canReadReilProject(project, 'owner')).toBe(true);
    expect(canReadReilProject(project, 'collab')).toBe(true);
    expect(canReadReilProject(project, 'other')).toBe(false);
    expect(canWriteReilProject(project, 'owner')).toBe(true);
    expect(canWriteReilProject(project, 'collab')).toBe(false);
  });

  it('reil validation helpers', () => {
    expect(validateReilAssignmentBody({ fieldKey: 'price', assignedToId: 'u1' }).ok).toBe(true);
    expect(validateReilStatusBody({ status: 'OFFER' }).ok).toBe(true);
    expect(validateReilTermsBody({ sellerResponse: 'ACCEPTED' }).ok).toBe(true);
    expect(validateReilTermsBody({ sellerResponse: 'COUNTERED' }).ok).toBe(false);
    expect(validateReilInviteBody({ email: 'a@b.com', role: 'VIEWER' }).ok).toBe(true);
  });

  it('project phase helpers', () => {
    const patch = buildPhasePatchUpdate({
      existingFinancials: { purchasePrice: 100 },
      financials: { loanAmount: 80000 },
    });
    expect((patch.financials as Record<string, unknown>).purchasePrice).toBe(100);
    expect((patch.financials as Record<string, unknown>).loanAmount).toBe(80000);
    expect(PURCHASE_FINANCING_FIELDS.has('loanAmount')).toBe(true);
    expect(filterPurchaseFinancingFields({ loanAmount: 1, foo: 2 })).toEqual({ loanAmount: 1 });
  });

  it('loan estimate and lender package helpers', () => {
    expect(canAddLoanEstimate('Lead Investor').ok).toBe(true);
    expect(canAddLoanEstimate('LP').ok).toBe(false);
    const estimate = validateLoanEstimateCreateBody({
      lenderName: 'Bank',
      amountCents: 100000,
      interestRate: 5,
      termMonths: 360,
    });
    expect(estimate.ok).toBe(true);
    expect(buildLenderPackageItemPatch({ status: 'Uploaded' }).ok).toBe(true);
    expect(buildLenderPackageItemPatch({ status: 'Bad' }).ok).toBe(false);
  });

  it('hold registry and exit helpers', () => {
    const merged = mergeHoldRegistryUpdate(
      { renovationTier: 'light', holdingCosts: { taxes: { amount: 100 } } },
      { renovationTier: 'heavy', holdingCosts: { insurance: { amount: 50 } } },
    );
    expect(merged.renovationTier).toBe('heavy');
    expect((merged.holdingCosts as Record<string, unknown>).taxes).toBeTruthy();

    const realized = buildExitRealizedPayload({
      existingFinancials: { projectedSalePrice: 500000 },
    });
    expect(realized.status).toBe('exit');
    expect(validateExitStatus('exit').ok).toBe(true);
    expect(validateExitStatus('bad').ok).toBe(false);
  });

  it('identity and tax helpers', () => {
    expect(validateClaimStartBody({ claimEmail: 'a@b.com' }).ok).toBe(true);
    expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    expect(validateReportSpamBody({ email: 'a@b.com', token: 't', projectId: 'p1' }).ok).toBe(true);

    const share = buildTaxShareRecord({
      token: 'tok',
      userId: 'u1',
      organizationId: 'org',
      taxYear: 2025,
      projectIds: ['p1'],
    });
    expect(share.revoked).toBe(false);
    expect(validateTaxShareCreateBody({ taxYear: 2025, projectIds: ['p1'] }).ok).toBe(true);
    expect(validateTaxShareAccess({ revoked: false, expiresAt: new Date(Date.now() + 1000).toISOString() }).ok).toBe(
      true,
    );
  });
});

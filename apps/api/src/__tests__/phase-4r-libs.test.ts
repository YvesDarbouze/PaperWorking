import { describe, expect, it } from '@jest/globals';
import { extractClientIp } from '../lib/auth/ip.js';
import { validateSendEmailBody } from '../lib/emails/send.js';
import {
  validateCreateEnvelopeBody,
  mapEnvelopeStatusToDocStatus,
  TERMINAL_ENVELOPE_STATUSES,
} from '../lib/esign/validation.js';
import {
  buildSampleTaxDatapoints,
  parseTaxPackageRequest,
  DEFAULT_TAX_PACKAGE_FORMS,
} from '../lib/tax/schema.js';
import {
  parseCloseDealBody,
  validateSourcesUsesBalance,
} from '../lib/fund/close-deal.js';
import { parseExitCompleteBody, computeExitWaterfall } from '../lib/exit/complete.js';

describe('Phase 4r auth/email/esign libs', () => {
  it('extractClientIp reads x-forwarded-for first hop', () => {
    expect(extractClientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })).toBe('1.2.3.4');
  });

  it('validateSendEmailBody requires core fields', () => {
    expect(validateSendEmailBody({}).ok).toBe(false);
    expect(
      validateSendEmailBody({
        idToken: 'tok',
        projectId: 'p1',
        to: ['a@test.com'],
        subject: 'Hi',
        html: '<p>Hi</p>',
      }).ok,
    ).toBe(true);
  });

  it('validateCreateEnvelopeBody checks required signer fields', () => {
    expect(validateCreateEnvelopeBody({ projectId: 'p1' }).ok).toBe(false);
    expect(
      validateCreateEnvelopeBody({
        projectId: 'p1',
        documentId: 'd1',
        documentName: 'Contract',
        signerRole: 'GC',
        signerEmail: 'gc@test.com',
        signerName: 'GC Co',
        documentUrl: 'https://files/contract.pdf',
      }).ok,
    ).toBe(true);
  });

  it('mapEnvelopeStatusToDocStatus maps terminal states', () => {
    expect(mapEnvelopeStatusToDocStatus('completed')).toBe('Signed');
    expect(TERMINAL_ENVELOPE_STATUSES.has('voided')).toBe(true);
  });
});

describe('Phase 4r tax/fund/exit libs', () => {
  it('parseTaxPackageRequest applies defaults', () => {
    expect(parseTaxPackageRequest({})).toEqual({ projectId: 'proj_demo_123', taxYear: 2025 });
  });

  it('buildSampleTaxDatapoints includes all domains', () => {
    const datapoints = buildSampleTaxDatapoints('proj-1', 2025);
    expect(datapoints.d2_purchase).toBeDefined();
    expect(DEFAULT_TAX_PACKAGE_FORMS).toHaveLength(3);
  });

  it('validateSourcesUsesBalance requires justification on mismatch', () => {
    const parsed = parseCloseDealBody({
      projectId: 'p1',
      sources: [{ source: 'cash', amount: 100 }],
      uses: [{ use: 'price', amount: 90 }],
    });
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(validateSourcesUsesBalance(parsed).ok).toBe(false);
    expect(validateSourcesUsesBalance({ ...parsed, justification: 'rounding' }).ok).toBe(true);
  });

  it('parseExitCompleteBody validates strategy', () => {
    expect(parseExitCompleteBody({ projectId: 'p1', strategy: 'Sell' }).ok).toBe(true);
    expect(parseExitCompleteBody({ projectId: 'p1', strategy: 'Bad' }).ok).toBe(false);
  });

  it('computeExitWaterfall derives promote from financials', () => {
    const waterfall = computeExitWaterfall({ purchasePrice: 20000000, exitListPrice: 300000 });
    expect(waterfall.grossProfit).toBeDefined();
    expect(waterfall.leadInvestorPromote).toBeGreaterThanOrEqual(0);
  });
});

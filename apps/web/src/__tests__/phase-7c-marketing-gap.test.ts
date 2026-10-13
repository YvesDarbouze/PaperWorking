import { PRICING_PLANS } from '../../lib/marketing/pricing-data.js';
import { HOW_IT_WORKS_STEPS } from '../../lib/marketing/how-it-works-data.js';
import { REIL_PHASE_ORDER } from '@paperworking/shared';

describe('phase 7c — marketing gap closure', () => {
  it('defines pricing plans aligned with stripe catalog tiers and lists vendor trades', () => {
    expect(PRICING_PLANS).toHaveLength(3);
    expect(PRICING_PLANS.map((p) => p.id)).toEqual(['individual', 'team', 'vendor']);
    expect(PRICING_PLANS[0]?.monthlyPrice).toBe(59);

    const vendorPlan = PRICING_PLANS.find((p) => p.id === 'vendor');
    expect(vendorPlan).toBeDefined();
    expect(vendorPlan?.tagline).toContain('Vendor Directory');
    const allVendorText = (vendorPlan?.features.join(' ') ?? '') + ' ' + (vendorPlan?.supportedRoles?.join(' ') ?? '');
    expect(allVendorText).toContain('Vendor Directory');
    expect(allVendorText).toContain('Appraiser');
    expect(allVendorText).toContain('Inspector');
    expect(allVendorText).toContain('Loan Originator');
    expect(allVendorText).toContain('Attorney');
    expect(allVendorText).toContain('Accountant');
    expect(allVendorText).toContain('Contractor');
    expect(allVendorText).toContain('Plumber');
    expect(allVendorText).toContain('Electrician');
    expect(allVendorText).toContain('Agent');
  });

  it('maps REIL phases to how-it-works steps', () => {
    expect(HOW_IT_WORKS_STEPS).toHaveLength(REIL_PHASE_ORDER.length);
    expect(HOW_IT_WORKS_STEPS[0]?.title).toBe('Acquisition');
  });

  it('entitles both Investor and Investment Team tiers to list on Deal Marketplace and Vendor Directory', () => {
    const investorPlan = PRICING_PLANS.find((p) => p.id === 'individual');
    const teamPlan = PRICING_PLANS.find((p) => p.id === 'team');

    expect(investorPlan).toBeDefined();
    expect(teamPlan).toBeDefined();

    const investorFeatures = investorPlan?.features.join(' ') ?? '';
    const teamFeatures = teamPlan?.features.join(' ') ?? '';

    // Both tiers must explicitly express ability to list on Deal Marketplace
    expect(investorFeatures).toContain('Deal Marketplace');
    expect(teamFeatures).toContain('Deal Marketplace');

    // Both tiers must explicitly express ability to list on Vendor Directory
    expect(investorFeatures).toContain('Vendor Directory');
    expect(teamFeatures).toContain('Vendor Directory');
  });
});

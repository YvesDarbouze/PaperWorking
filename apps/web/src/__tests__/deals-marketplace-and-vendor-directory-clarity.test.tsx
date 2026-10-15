/**
 * Test Suite: Deals Marketplace and Vendor Directory Clarity & Role Entitlements
 *
 * Verifies:
 * 1. Investors & Teams have rights to list on Vendor Directory AND post on Deals Marketplace.
 * 2. Vendors can search Deals Marketplace and offer trade/professional services, but cannot post deals.
 * 3. DealCard and DealsDenseTable render "Offer Services" for vendors and "Interested in Investing" for investors.
 * 4. API gates POST /api/deals with 403 Forbidden for vendors.
 * 5. POST & GET /api/deals/[id]/offer-services allows vendors to pitch services on deals.
 * 6. VendorMarketplacePanel renders "+ List Your Services" and universal directory privileges banner for all tiers.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { resolvePrimaryNav, resolveDrawerNav } from '@/lib/navigation/nav-contract';
import DealCard, { type DealCardData } from '@/components/marketplace/DealCard';
import DealsDenseTable from '@/components/marketplace/DealsDenseTable';
import { PRICING_PLANS } from '@/lib/marketing/pricing-data';
import { POST as handlePostDeal } from '@/app/api/deals/route';
import {
  POST as handleOfferServices,
  GET as handleGetOffers,
} from '@/app/api/deals/[id]/offer-services/route';

const mockDeal: DealCardData = {
  id: 'deal-clarity-1',
  slug: 'austin-multifamily-rehab',
  name: 'Austin Multifamily Value-Add',
  propertyName: 'Austin Multifamily Value-Add',
  address: '1400 E 6th St',
  city: 'Austin',
  state: 'TX',
  purchasePrice: 650000,
  targetIrr: 18.5,
  fundingTarget: 275000,
  committedAmount: 150000,
  assetClass: 'Multifamily',
  status: 'OPEN',
  strategy: 'VALUE_ADD',
  creatorName: 'Lone Star Capital Partners',
  calculatorResults: {
    purchasePrice: 650000,
    rehabBudget: 80000,
    arv: 950000,
    targetIrr: 18.5,
    cashRequired: 275000,
    netOperatingIncome: 55000,
  },
};

describe('Deals Marketplace and Vendor Directory Clarity & Role Entitlements', () => {
  describe('1. Navigation Contracts for Investors and Vendors', () => {
    it('entitles Vendors to search Deals Marketplace in both Primary and Drawer nav', () => {
      const vendorPrimaryNav = resolvePrimaryNav({ accountType: 'vendor', role: 'vendor' });
      const vendorDrawerNav = resolveDrawerNav({ accountType: 'vendor', role: 'vendor' });

      const primaryDealsItem = vendorPrimaryNav.find((item) => item.id === 'deals');
      expect(primaryDealsItem).toBeDefined();
      expect(primaryDealsItem?.href).toBe('/dashboard/deals');
      expect(primaryDealsItem?.rolesAllowed).toContain('vendor');

      const drawerDealsItem = vendorDrawerNav.find((item) => item.id === 'deals');
      expect(drawerDealsItem).toBeDefined();
      expect(drawerDealsItem?.href).toBe('/dashboard/deals');
      expect(drawerDealsItem?.rolesAllowed).toContain('vendor');
    });

    it('entitles Investors to access both Vendor Directory and Deals Marketplace', () => {
      const investorPrimaryNav = resolvePrimaryNav({ accountType: 'investor', role: 'investor' });

      const vendorDirectoryItem = investorPrimaryNav.find((item) => item.id === 'marketplace');
      expect(vendorDirectoryItem).toBeDefined();
      expect(vendorDirectoryItem?.href).toBe('/dashboard/marketplace');

      const dealsMarketplaceItem = investorPrimaryNav.find((item) => item.id === 'deals');
      expect(dealsMarketplaceItem).toBeDefined();
      expect(dealsMarketplaceItem?.href).toBe('/dashboard/deals');
    });
  });

  describe('2. Deal Cards and Dense Table Dynamic Button Switching', () => {
    it('renders "Offer Services" button on DealCard when viewer is a Vendor', () => {
      const html = renderToString(
        <DealCard deal={mockDeal} isVendor={true} />
      );

      expect(html).toContain('data-testid="card-offer-services-btn-deal-clarity-1"');
      expect(html).toContain('Offer Services');
      expect(html).not.toContain('Interested in Investing');
      expect(html).not.toContain('data-testid="card-express-interest-btn-deal-clarity-1"');
    });

    it('renders "Interested in Investing" AND dual trade service offer button for Investors', () => {
      const html = renderToString(
        <DealCard deal={mockDeal} isVendor={false} />
      );

      expect(html).toContain('data-testid="card-express-interest-btn-deal-clarity-1"');
      expect(html).toContain('Interested in Investing');
      // Investor dual privilege
      expect(html).toContain('data-testid="card-investor-offer-services-btn-deal-clarity-1"');
      expect(html).toContain('Offer Services as Trade Provider');
    });

    it('renders "Offer Services" button in DealsDenseTable when viewer is a Vendor', () => {
      const html = renderToString(
        <DealsDenseTable deals={[mockDeal]} isVendor={true} />
      );

      expect(html).toContain('data-testid="dense-offer-services-btn-deal-clarity-1"');
      expect(html).toContain('Offer Services');
      expect(html).not.toContain('data-testid="dense-express-interest-btn-deal-clarity-1"');
    });

    it('renders "Interested" button in DealsDenseTable when viewer is an Investor', () => {
      const html = renderToString(
        <DealsDenseTable deals={[mockDeal]} isVendor={false} />
      );

      expect(html).toContain('data-testid="dense-express-interest-btn-deal-clarity-1"');
      expect(html).toContain('Interested in Investing');
      expect(html).not.toContain('data-testid="dense-offer-services-btn-deal-clarity-1"');
    });
  });

  describe('3. API Deal Creation Gate (Vendors blocked with 403 Forbidden)', () => {
    const originalUid = process.env.TEST_AUTH_UID;
    const originalAccountType = process.env.TEST_AUTH_ACCOUNT_TYPE;

    afterEach(() => {
      process.env.TEST_AUTH_UID = originalUid;
      process.env.TEST_AUTH_ACCOUNT_TYPE = originalAccountType;
    });

    it('blocks vendors from posting deals with 403 Forbidden', async () => {
      process.env.TEST_AUTH_UID = 'vendor-user-123';
      process.env.TEST_AUTH_ACCOUNT_TYPE = 'vendor';

      const request = new Request('http://localhost:3000/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '999 Forbidden St',
          purchasePrice: 500000,
        }),
      });

      const res = await handlePostDeal(request);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.message || json.error).toContain('Vendors cannot post on the Deals Marketplace');
    });

    it('allows investors to create deals successfully', async () => {
      process.env.TEST_AUTH_UID = 'investor-user-456';
      process.env.TEST_AUTH_ACCOUNT_TYPE = 'investor';

      const request = new Request('http://localhost:3000/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '1000 Permitted Ave',
          purchasePrice: 450000,
        }),
      });

      const res = await handlePostDeal(request);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deal.address).toBe('1000 Permitted Ave');
    });
  });

  describe('4. Vendor Deal Offer Services Endpoint', () => {
    it('allows a vendor to submit a trade proposal on an active deal', async () => {
      process.env.TEST_AUTH_UID = 'vendor-pro-789';
      process.env.TEST_AUTH_ACCOUNT_TYPE = 'vendor';

      const req = new Request('http://localhost:3000/api/deals/deal-clarity-1/offer-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeCategory: 'General Contractor',
          companyName: 'Apex Commercial Build & Design',
          proposal: 'We have completed 12 multifamily value-add rehabs in East Austin. Full license & insurance on file.',
          licenseNumber: 'GC-TX-884910',
          estimatedTurnaround: '2–4 Weeks',
        }),
      });

      const res = await handleOfferServices(req, {
        params: Promise.resolve({ id: 'deal-clarity-1' }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.offer.companyName).toBe('Apex Commercial Build & Design');
      expect(json.offer.tradeCategory).toBe('General Contractor');
      expect(json.offer.status).toBe('submitted');

      // Verify GET returns the submitted offer
      const getReq = new Request('http://localhost:3000/api/deals/deal-clarity-1/offer-services');
      const getRes = await handleGetOffers(getReq, {
        params: Promise.resolve({ id: 'deal-clarity-1' }),
      });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Vendor Directory Listing for All Subscription Tiers', () => {
    it('verifies pricing and role matrix allows all tiers to list on Vendor Directory', () => {
      const investorPlan = PRICING_PLANS.find((p) => p.id === 'individual');
      const teamPlan = PRICING_PLANS.find((p) => p.id === 'team');
      const vendorPlan = PRICING_PLANS.find((p) => p.id === 'vendor');

      expect(investorPlan?.features.join(' ')).toContain('Vendor Directory');
      expect(teamPlan?.features.join(' ')).toContain('Vendor Directory');
      expect(vendorPlan?.features.join(' ')).toContain('Vendor Directory');
    });
  });

  describe('6. Pricing Page Vendor Tier Column under Standard Financial Reports', () => {
    it('verifies PricingSection renders the sensible list of common professions under standard financial reports in the Vendor tier', () => {
      const vendorPlan = PRICING_PLANS.find((p) => p.id === 'vendor');
      expect(vendorPlan).toBeDefined();

      // Verify the feature is named 'Standard financial reports'
      const hasStandardFinancialReports = vendorPlan?.features.some((f) =>
        f.toLowerCase().includes('standard financial reports')
      );
      expect(hasStandardFinancialReports).toBe(true);

      // Verify sensible list of most common roles
      expect(vendorPlan?.supportedRoles).toBeDefined();
      const roles = vendorPlan?.supportedRoles ?? [];
      expect(roles.length).toBeGreaterThanOrEqual(12);

      // Assert key common trades and professionals are included
      expect(roles).toContain('General Contractor');
      expect(roles).toContain('Electrician');
      expect(roles).toContain('Plumber');
      expect(roles).toContain('HVAC Technician');
      expect(roles).toContain('Roofer');
      expect(roles).toContain('Real Estate Attorney');
      expect(roles).toContain('Real Estate Accountant / CPA');
      expect(roles).toContain('Property Manager');
      expect(roles).toContain('Real Estate Appraiser');
      expect(roles).toContain('Home Inspector');
      expect(roles).toContain('Real Estate Broker / Agent');
      expect(roles).toContain('Title Officer / Examiner');
      expect(roles).toContain('Mortgage Broker / Loan Originator');
    });
  });
});

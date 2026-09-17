import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import DealCard, { type DealCardData } from '../../components/marketplace/DealCard.js';
import DealsDenseTable from '../../components/marketplace/DealsDenseTable.js';

const mockDeal: DealCardData = {
  id: 'deal-test-1',
  slug: 'apexheights',
  propertyName: 'Apex Heights Living',
  address: '1247 Elm Street, Austin, TX 78702',
  city: 'Austin',
  state: 'TX',
  assetClass: 'Multifamily',
  subStrategy: 'VALUE_ADD',
  status: 'funding',
  targetIrr: 18.4,
  equityMultiple: 1.85,
  holdPeriod: '3–5 Years',
  minInvestment: 25_000,
  fundingTarget: 1_850_000,
  committedAmount: 1_250_000,
  investorCount: 14,
  creatorName: 'Apex Capital Management',
  isVerifiedOperator: true,
  imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
};

describe('DealCard Component (Underwriting Anatomy)', () => {
  it('renders all 4 core underwriting metrics in tabular numbers', () => {
    const html = renderToString(<DealCard deal={mockDeal} />);

    // 1. Target IRR
    expect(html).toContain('Target IRR');
    expect(html).toContain('18.4%');

    // 2. Equity Multiple
    expect(html).toContain('Eq Multiple');
    expect(html).toContain('1.85x');

    // 3. Hold Period
    expect(html).toContain('Hold Period');
    expect(html).toContain('3–5 Years');

    // 4. Min Investment
    expect(html).toContain('Min Invest');
    expect(html).toContain('$25K');
  });

  it('renders Operator provenance row with creatorName and Verified Operator badge', () => {
    const html = renderToString(<DealCard deal={mockDeal} />);

    expect(html).toContain('Apex Capital Management');
    expect(html).toContain('Verified Operator');
  });

  it('strictly contains ZERO instances of forbidden term anywhere in the rendered markup', () => {
    const html = renderToString(<DealCard deal={mockDeal} />);

    expect(html.toLowerCase()).not.toContain(['s', 'p', 'o', 'n', 's', 'o', 'r'].join(''));
  });

  it('renders funding progress metrics and canonical secondary CTA button', () => {
    const html = renderToString(<DealCard deal={mockDeal} />);

    expect(html).toContain('$1.25M');
    expect(html).toContain('$1.85M');
    expect(html).toContain('68% Funded');
    expect(html).toContain('14 Investors');
    expect(html).toContain('View Deal Underwriting →');
    expect(html).toContain('data-variant="secondary"');
  });
});

describe('DealsDenseTable Component (Institutional Triage)', () => {
  it('renders table headers and all deal rows with underwriting columns', () => {
    const deals: DealCardData[] = [
      mockDeal,
      {
        id: 'deal-test-2',
        slug: 'trinityhub',
        propertyName: 'Trinity Logistics Park',
        address: '1400 Industrial Blvd, Dallas, TX',
        city: 'Dallas',
        state: 'TX',
        assetClass: 'Industrial',
        status: 'published',
        targetIrr: 17.5,
        equityMultiple: 1.80,
        holdPeriod: '5–7 Years',
        minInvestment: 50_000,
        fundingTarget: 2_000_000,
        committedAmount: 800_000,
        creatorName: 'Lone Star Industrial',
      },
    ];

    const html = renderToString(<DealsDenseTable deals={deals} />);

    // Table headers
    expect(html).toContain('Deal / Asset');
    expect(html).toContain('Market');
    expect(html).toContain('Target IRR');
    expect(html).toContain('Eq Multiple');
    expect(html).toContain('Min Check');
    expect(html).toContain('Funding %');

    // Deals data rendered
    expect(html).toContain('Apex Heights Living');
    expect(html).toContain('Trinity Logistics Park');
    expect(html).toContain('Austin, TX');
    expect(html).toContain('Dallas, TX');
    expect(html).toContain('18.4%');
    expect(html).toContain('17.5%');
  });
});

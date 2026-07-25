/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import DealOnePagerView from '@/components/listings/DealOnePagerView';
import { FX_1_PROJECT } from '@/lib/metrics/fixtures';
import type { Project } from '@/types/schema';

// Mock next/link to render standard anchors
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Mock the status badge and action buttons to keep dependencies clean
jest.mock('@/components/listings/ListingStatusBadge', () => {
  return ({ status }: any) => <span data-testid="status-badge">{status}</span>;
});
jest.mock('@/components/listings/FollowDealButton', () => {
  return () => <button>Follow Deal</button>;
});
jest.mock('@/components/listings/FollowInvestorButton', () => {
  return () => <button>Follow Investor</button>;
});
jest.mock('@/components/listings/RespondToTermsButton', () => {
  return () => <button>Respond</button>;
});

describe('DealOnePagerView Component — DM-18 Spec Validation', () => {
  it('renders general property details and headers successfully', () => {
    render(<DealOnePagerView project={FX_1_PROJECT} readOnly={true} />);

    expect(screen.getByText('742 Evergreen Terrace (FX-1)')).toBeDefined();
    expect(screen.getByText('Residential')).toBeDefined();
  });

  it('verifies the five golden calculations match spec values (G-2 Live-derived)', () => {
    render(<DealOnePagerView project={FX_1_PROJECT} readOnly={true} />);

    // Golden values from spec/reilMetricsSpec.test.ts:
    // Net Operating Income (NOI): $12,486
    // Cap Rate: 4.5%
    // Cash Flow: -$4,444/yr (formatted as $-4,444 / yr)
    // Debt Service Coverage Ratio (DSCR): 0.74
    // Cash-on-Cash Return (COC): -7.41%
    
    // We expect formatting helpers:
    // NOI: $12,486
    expect(screen.getByText('$12,486')).toBeDefined();

    // Cap Rate: 4.5%
    expect(screen.getByText('4.5%')).toBeDefined();

    // Annual Cash Flow: $-4,444 / yr
    expect(screen.getByText('$-4,444 / yr')).toBeDefined();

    // DSCR: 0.74
    expect(screen.getByText('0.74')).toBeDefined();

    // Cash-on-Cash: -7.41%
    expect(screen.getByText('-7.41%')).toBeDefined();
  });

  it('renders a balanced Sources and Uses table representing strict equality', () => {
    render(<DealOnePagerView project={FX_1_PROJECT} readOnly={true} />);

    // Total Uses: $282,627 (Purchase $279,000 + Carry $3,627)
    // Senior Debt: $222,627 ($282,627 - $60,000 equity)
    // Required Equity: $60,000
    // Total Sources = Debt $222,627 + Equity $60,000 = $282,627
    // Check that $282,627 is rendered under both Total Uses and Total Sources

    const elements = screen.getAllByText('$282,627');
    expect(elements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders Honesty Rule gap display with deep-links when required inputs are missing', () => {
    // Modify project to omit purchasePrice and monthlyGrossRent
    const projectWithGaps: Project = {
      ...FX_1_PROJECT,
      financials: {
        ...FX_1_PROJECT.financials,
        purchasePrice: 0,
        monthlyGrossRent: 0,
      } as any,
    };

    render(<DealOnePagerView project={projectWithGaps} readOnly={false} />);

    // Gaps should trigger and show named warnings:
    expect(screen.getByText('Lacking Underwriting Inputs (Honesty Rule)')).toBeDefined();
    
    // Match "Purchase Price" (could be multiple elements)
    const purchasePriceGaps = screen.getAllByText('Purchase Price');
    expect(purchasePriceGaps.length).toBeGreaterThanOrEqual(1);

    // Deep-links to collecting cards should exist:
    const propertyFactsLink = screen.getByText(/Property facts card/i);
    expect(propertyFactsLink).toBeDefined();
  });
});

/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import DealOnePagerView from '@/components/listings/DealOnePagerView';
import SubscriberDealCard from '@/components/listings/SubscriberDealCard';
import { getVariableProvenance, calculateDealCompleteness } from '@/lib/identity/provenance';
import { FX_1_PROJECT } from '@/lib/metrics/fixtures';
import type { Project } from '@/types/schema';
import type { SubscriberDealMatch } from '@/types/listing';

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

describe('DM-19: Provenance and Trust Layer Calculations', () => {
  const testProject: Project = {
    ...FX_1_PROJECT,
    financials: {
      ...FX_1_PROJECT.financials,
      purchasePrice: 279000,
      purchasePriceActual: 275000,
      monthlyGrossRent: 1950,
      vacancyRatePercent: 7,
      taxes: 200,
      holdingCostInsurance: 58,
      holdingCostUtilities: 125,
      propertyManagementFeePercent: 10,
      monthlyMaintenanceReserve: 195,
      equityTerms: {
        funding_target: 6000000,
        fundingTarget: 60000,
      },
      sourceTags: {
        purchase_price_projected: 'user_assumption',
        purchase_price_actual: 'user_actual',
        rehab_budget_projected: 'plaid',
        closing_costs_projected: 'document',
        tax: 'document',
        gross_rent_per_unit: 'plaid',
      },
    } as any,
  };

  it('correctly resolves variable provenance with fallback to registry', () => {
    // Explicit projected purchase price
    expect(getVariableProvenance('purchase_price', testProject, 'projected')).toBe('user_assumption');
    
    // Explicit actual purchase price
    expect(getVariableProvenance('purchase_price', testProject, 'actual')).toBe('user_actual');
    
    // Explicit plaid source
    expect(getVariableProvenance('gross_rent_per_unit', testProject)).toBe('plaid');
    
    // Explicit document source
    expect(getVariableProvenance('tax', testProject)).toBe('document');

    // Fallback to registry default for vacancy_pct
    expect(getVariableProvenance('vacancy_pct', testProject)).toBe('user_assumption');
  });

  it('calculates coverage-based completeness score deterministically', () => {
    // Fill all required fields
    const completeProj: Project = {
      ...testProject,
      loans: [], // force all-cash required fields count (9 fields)
    };
    const resComplete = calculateDealCompleteness(completeProj);
    expect(resComplete.score).toBe(100);
    expect(resComplete.missing.length).toBe(0);

    // Omit three required fields: insurance, utilities, property mgmt fee
    const incompleteProj: Project = {
      ...completeProj,
      financials: {
        ...completeProj.financials,
        insurance: undefined,
        holdingCostInsurance: undefined,
        utilities: undefined,
        holdingCostUtilities: undefined,
        management_pct: undefined,
        propertyManagementFeePercent: undefined,
      } as any,
    };
    const resIncomplete = calculateDealCompleteness(incompleteProj);
    // 6 out of 9 fields filled = 67%
    expect(resIncomplete.score).toBe(67);
    expect(resIncomplete.missing).toContain('Insurance');
    expect(resIncomplete.missing).toContain('Utilities');
    expect(resIncomplete.missing).toContain('Property Mgmt Fee');
  });

  it('renders all 5 provenance types with distinguishable labels on One-Pager', () => {
    render(<DealOnePagerView project={testProject} readOnly={true} />);

    // Assumptions, actuals, plaid, document, derived should all exist
    expect(screen.getAllByTestId('provenance-assumption').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('provenance-actual').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('provenance-plaid').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('provenance-document').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('provenance-derived').length).toBeGreaterThanOrEqual(1);
  });

  it('renders side-by-side projected and actual purchase price without conflation', () => {
    render(<DealOnePagerView project={testProject} readOnly={true} />);

    // Projected Purchase Price: $279,000
    // Actual Purchase Price: $275,000
    expect(screen.getAllByText('$279,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$275,000').length).toBeGreaterThanOrEqual(1);
  });

  it('renders completeness indicator beside the deal title', () => {
    render(<DealOnePagerView project={testProject} readOnly={true} />);

    const indicator = screen.getByTestId('completeness-indicator');
    expect(indicator).toBeDefined();
    expect(indicator.textContent).toContain('Completeness: 100%');
  });
});

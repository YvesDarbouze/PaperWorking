/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterPanel, { FilterState } from '@/components/deals/FilterPanel';
import MarketplaceTabs from '@/components/deals/MarketplaceTabs';
import ViewToggle from '@/components/deals/ViewToggle';
import SortControl from '@/components/deals/SortControl';
import DealCard from '@/components/deals/DealCard';
import EmptyState from '@/components/deals/EmptyState';

// Mock Next.js router
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('Deals Marketplace Components Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FilterPanel', () => {
    const initialFilters: FilterState = {
      propertyType: 'All',
      strategy: 'All',
      status: 'All',
      priceRange: 'All',
    };

    it('renders ghost button and toggles open/close on click', () => {
      render(<FilterPanel filters={initialFilters} onFilterChange={jest.fn()} />);

      const toggleBtn = screen.getByTestId('filter-toggle-button');
      expect(toggleBtn).toBeTruthy();

      const content = screen.getByTestId('filter-panel-content');
      expect(content.className).toContain('max-h-0');

      fireEvent.click(toggleBtn);
      expect(content.className).toContain('opacity-100');
    });

    it('triggers onFilterChange when a property type chip is selected', () => {
      const mockOnChange = jest.fn();
      render(<FilterPanel filters={initialFilters} onFilterChange={mockOnChange} />);

      const chip = screen.getByTestId('filter-chip-propertyType-Multi-family');
      fireEvent.click(chip);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...initialFilters,
        propertyType: 'Multi-family',
      });
    });
  });

  describe('MarketplaceTabs', () => {
    it('renders Discover and My Activity tabs', () => {
      const mockTabChange = jest.fn();
      render(<MarketplaceTabs activeTab="discover" onTabChange={mockTabChange} />);

      const discoverTab = screen.getByTestId('tab-discover');
      const activityTab = screen.getByTestId('tab-my-activity');

      expect(discoverTab).toBeTruthy();
      expect(activityTab).toBeTruthy();

      fireEvent.click(activityTab);
      expect(mockTabChange).toHaveBeenCalledWith('my-activity');
    });
  });

  describe('ViewToggle', () => {
    it('switches between List and Map views', () => {
      const mockViewChange = jest.fn();
      render(<ViewToggle view="list" onViewChange={mockViewChange} />);

      const mapBtn = screen.getByTestId('view-toggle-map');
      fireEvent.click(mapBtn);
      expect(mockViewChange).toHaveBeenCalledWith('map');
    });
  });

  describe('SortControl', () => {
    it('updates sort option on dropdown select', () => {
      const mockSortChange = jest.fn();
      render(<SortControl sort="newest" onSortChange={mockSortChange} />);

      const select = screen.getByTestId('sort-control-select') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'price_asc' } });
      expect(mockSortChange).toHaveBeenCalledWith('price_asc');
    });
  });

  describe('DealCard', () => {
    it('renders property title formatted with spaces restored, metrics, and progress bar', () => {
      const sampleDeal = {
        id: 'deal_123',
        slug: '123mainstaustintx78701',
        address: '123 Main St, Austin, TX 78701',
        propertyName: 'Austin Core Multifamily',
        city: 'Austin',
        state: 'TX',
        assetClass: 'Multi-family',
        subStrategy: 'FLIP',
        status: 'published',
        purchasePrice: 350000,
        rehabCost: 50000,
        arv: 480000,
        projectedRoi: 18.5,
        fundingTarget: 200000,
        committedAmount: 130000,
      };

      render(<DealCard deal={sampleDeal} />);

      const title = screen.getByTestId('deal-card-title');
      expect(title.textContent).toBe('Austin Core Multifamily');

      expect(screen.getByText('Multi-family')).toBeTruthy();
      expect(screen.getByText('FLIP')).toBeTruthy();
      expect(screen.getByText('65%')).toBeTruthy(); // (130000 / 200000) * 100
    });
  });

  describe('EmptyState', () => {
    it('renders No deals found title and subtext', () => {
      render(<EmptyState />);

      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeTruthy();
      expect(screen.getByText('No deals found')).toBeTruthy();
      expect(
        screen.getByText('Try adjusting your filters or search for a different address.')
      ).toBeTruthy();
    });
  });
});

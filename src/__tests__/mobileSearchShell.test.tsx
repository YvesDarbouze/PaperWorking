/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DealsPage from '@/app/dashboard/deals/page';
import PublicAddressSearch from '@/components/search/PublicAddressSearch';

// Mock dependency modules to isolate UI tests
jest.mock('@/actions/listings', () => ({
  __esModule: true,
  getPublishedListings: jest.fn().mockResolvedValue([]),
  searchDealsAuthenticated: jest.fn().mockResolvedValue({ mode: 'cold_start', results: [] }),
}));

jest.mock('@/context/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    user: { uid: 'subscriber_123', email: 'sub@paperworking.com' },
    profile: { role: 'Investor', subscriptionPlan: 'Pro', subscriptionStatus: 'active' },
  }),
}));

jest.mock('@/hooks/useBilling', () => ({
  __esModule: true,
  useBilling: () => ({
    isSubscribed: true,
    subscription: { status: 'active' },
  }),
}));

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('DM-14 Mobile Search Shell visual alignment and touch target rules', () => {
  it('renders sticky search container on DealsPage', () => {
    const { container } = render(<DealsPage />);
    const stickyContainer = container.querySelector('.sticky');
    expect(stickyContainer).not.toBeNull();
    expect(stickyContainer?.className).toContain('top-0');
    expect(stickyContainer?.className).toContain('z-40');
  });

  it('renders sticky search container on PublicAddressSearch', () => {
    const { container } = render(<PublicAddressSearch />);
    const stickyContainer = container.querySelector('.sticky');
    expect(stickyContainer).not.toBeNull();
    expect(stickyContainer?.className).toContain('top-0');
    expect(stickyContainer?.className).toContain('z-40');
  });

  it('provides a touch-friendly mobile filter drawer trigger button', () => {
    render(<DealsPage />);
    const mobileFilterBtn = screen.getByRole('button', { name: /filter_list/i });
    expect(mobileFilterBtn).toBeDefined();
    expect(mobileFilterBtn.className).toContain('h-12');
    expect(mobileFilterBtn.className).toContain('w-12');
  });

  it('opens and dismisses the mobile bottom drawer on tap interactions', () => {
    render(<DealsPage />);
    
    // Bottom drawer should not be visible initially
    expect(screen.queryByText('Filter Listings')).toBeNull();

    // Click mobile filter button
    const mobileFilterBtn = screen.getByRole('button', { name: /filter_list/i });
    fireEvent.click(mobileFilterBtn);

    // Filter drawer should now be open
    expect(screen.getByText('Filter Listings')).toBeDefined();

    // Drawer buttons should have thumb-reachable touch targets (h-11 / h-12)
    const assetClassHeader = screen.getByText('Asset Class');
    expect(assetClassHeader).toBeDefined();

    const applyButton = screen.getByRole('button', { name: /apply filters/i });
    expect(applyButton).toBeDefined();
    expect(applyButton.className).toContain('h-12');

    // Click Apply filters to dismiss the bottom drawer
    fireEvent.click(applyButton);
    expect(screen.queryByText('Filter Listings')).toBeNull();
  });
});

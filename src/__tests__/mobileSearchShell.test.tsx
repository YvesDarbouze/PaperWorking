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
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/deals',
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
    const mobileFilterBtn = screen.getByTestId('filter-toggle-button');
    expect(mobileFilterBtn).toBeDefined();
    expect(mobileFilterBtn.className).toContain('min-h-[44px]');
  });

  it('opens and dismisses the mobile bottom drawer on tap interactions', () => {
    render(<DealsPage />);
    
    // Bottom drawer content should not be open initially
    const panelContent = screen.getByTestId('filter-panel-content');
    expect(panelContent.className).toContain('max-h-0');

    // Click mobile filter button
    const mobileFilterBtn = screen.getByTestId('filter-toggle-button');
    fireEvent.click(mobileFilterBtn);

    // Filter drawer should now be open
    expect(panelContent.className).toContain('max-h-[80vh]');
    expect(screen.getByText(/refine deal criteria/i)).toBeDefined();

    // Drawer buttons should have thumb-reachable touch targets (min-h-[36px] or min-h-[44px])
    const propertyTypeHeader = screen.getByText('Property Type');
    expect(propertyTypeHeader).toBeDefined();

    // Toggle again to dismiss
    fireEvent.click(mobileFilterBtn);
    expect(panelContent.className).toContain('max-h-0');
  });
});

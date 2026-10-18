/**
 * @jest-environment jsdom
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

// Tell React that we are in an act-supported environment
// @ts-expect-error global flag for React 18/19
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T,>(val: T): T => JSON.parse(JSON.stringify(val)) as T;
}

const mockPush = jest.fn();
const mockLogout = jest.fn<() => Promise<void>>();

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: () => ({
    authenticated: true,
    loading: false,
    profile: {
      accountType: 'investor',
      name: 'Jordan Principal',
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
    },
    logout: mockLogout,
  }),
}));

const { default: DashboardTopBar, searchDashboardTopBar } = await import(
  '../../components/dashboard/DashboardTopBar.js'
);

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Bug_17 Regression — DashboardTopBar Search Input & Results Popover', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    mockPush.mockReset();
    mockLogout.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('searchDashboardTopBar returns marketplace deals when searching "deals" or specific deal/project queries', () => {
    const dealsResults = searchDashboardTopBar('deals');
    expect(dealsResults.length).toBeGreaterThan(0);
    expect(dealsResults.every((r) => r.category === 'DEAL')).toBe(true);
    expect(dealsResults.some((r) => r.subtitle.includes('1247 Elm Street'))).toBe(true);

    const elmResults = searchDashboardTopBar('Elm');
    expect(elmResults.length).toBeGreaterThan(0);
    expect(elmResults.some((r) => r.subtitle.includes('1247 Elm Street'))).toBe(true);

    const highlandResults = searchDashboardTopBar('Highland');
    expect(highlandResults.length).toBeGreaterThan(0);
    expect(highlandResults.some((r) => r.title.includes('Highland'))).toBe(true);
  });

  it('typing "deals" into the topbar search input updates the input value and opens the results dropdown with Marketplace Deals', async () => {
    await act(async () => {
      root.render(<DashboardTopBar />);
    });

    const searchInput = container.querySelector<HTMLInputElement>(
      'input[data-testid="dashboard-topbar-search-input"]',
    );
    expect(searchInput).not.toBeNull();
    expect(searchInput?.getAttribute('aria-label')).toBe('Search deals');

    // Initially dropdown is hidden
    expect(container.querySelector('[data-testid="dashboard-topbar-search-results"]')).toBeNull();

    await act(async () => {
      setNativeInputValue(searchInput!, 'deals');
    });

    expect(searchInput?.value).toBe('deals');

    const resultsDropdown = container.querySelector(
      '[data-testid="dashboard-topbar-search-results"]',
    );
    expect(resultsDropdown).not.toBeNull();
    expect(resultsDropdown?.textContent).toContain('1247 Elm Street, Austin, TX 78702');
    expect(resultsDropdown?.textContent).toContain('4208 Melrose Ave, Los Angeles, CA 90029');

    const items = container.querySelectorAll('[data-testid="dashboard-search-result-item"]');
    expect(items.length).toBeGreaterThan(0);
  });

  it('typing a specific query ("Elm") filters results and clicking a result navigates to its URL and closes the dropdown', async () => {
    await act(async () => {
      root.render(<DashboardTopBar />);
    });

    const searchInput = container.querySelector<HTMLInputElement>(
      'input[data-testid="dashboard-topbar-search-input"]',
    );
    expect(searchInput).not.toBeNull();

    await act(async () => {
      setNativeInputValue(searchInput!, 'Elm');
    });

    const items = container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="dashboard-search-result-item"]',
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.textContent).toContain('1247 Elm Street');

    await act(async () => {
      items[0]!.click();
    });

    expect(mockPush).toHaveBeenCalledWith('/deals/1247elmst');
    expect(container.querySelector('[data-testid="dashboard-topbar-search-results"]')).toBeNull();
  });

  it('pressing Enter in the search input navigates to /dashboard/deals?search=... and closes the dropdown', async () => {
    await act(async () => {
      root.render(<DashboardTopBar />);
    });

    const searchInput = container.querySelector<HTMLInputElement>(
      'input[data-testid="dashboard-topbar-search-input"]',
    );
    expect(searchInput).not.toBeNull();

    await act(async () => {
      setNativeInputValue(searchInput!, 'Austin');
    });

    expect(container.querySelector('[data-testid="dashboard-topbar-search-results"]')).not.toBeNull();

    await act(async () => {
      searchInput!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard/deals?search=Austin');
    expect(container.querySelector('[data-testid="dashboard-topbar-search-results"]')).toBeNull();
  });

  it('Bug_76: displays exact placeholder "Search deals by name or address" with sufficient container width and conditional right padding so "address" is never clipped to "addres"', async () => {
    await act(async () => {
      root.render(<DashboardTopBar />);
    });

    const searchInput = container.querySelector<HTMLInputElement>(
      'input[data-testid="dashboard-topbar-search-input"]',
    );
    expect(searchInput).not.toBeNull();
    expect(searchInput?.getAttribute('placeholder')).toBe('Search deals by name or address');

    const inputWrapper = searchInput?.parentElement;
    expect(inputWrapper?.className).toContain('pr-3');
    expect(inputWrapper?.className).not.toContain('pr-10');

    await act(async () => {
      setNativeInputValue(searchInput!, 'Austin');
    });

    expect(inputWrapper?.className).toContain('pr-10');
  });
});

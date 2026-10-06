/**
 * Test Suite: Broken Link to /project/new - Singular vs Plural Route Alignment (Item 3.2)
 *
 * Verifies:
 * 1. next.config.ts contains a permanent redirect from singular /project/new to /projects/new.
 * 2. PortfolioReportsPanel empty state renders primary CTA with href="/projects/new".
 * 3. PortfolioReportsPanel output does not contain broken href="/project/new".
 */

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';

// Mock next/navigation
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/reports',
}));

// Mock Auth context
jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    authenticated: true,
    profile: { accountType: 'operator', subscriptionPlan: 'Pro' },
  }),
  useOptionalAuth: () => ({
    loading: false,
    authenticated: true,
  }),
}));

const { default: PortfolioReportsPanel } = await import('../../components/reports/PortfolioReportsPanel.js');
const { default: nextConfig } = await import('../../next.config.js');

describe('Project Route Singular vs Plural Alignment (Item 3.2)', () => {
  describe('1. next.config.ts Redirects', () => {
    it('contains a permanent redirect from /project/new to /projects/new', async () => {
      expect(typeof nextConfig.redirects).toBe('function');
      const redirects = await nextConfig.redirects!();
      const projectNewRedirect = redirects.find((r) => r.source === '/project/new');

      expect(projectNewRedirect).toBeDefined();
      expect(projectNewRedirect?.destination).toBe('/projects/new');
      expect(projectNewRedirect?.permanent).toBe(true);
    });
  });

  describe('2. PortfolioReportsPanel Empty State CTA Link', () => {
    it('renders Create New Project CTA linking to canonical /projects/new', () => {
      const html = renderToString(<PortfolioReportsPanel initialProjects={[]} />);

      expect(html).toContain('data-testid="empty-create-project-btn"');
      expect(html).toContain('href="/projects/new"');
      expect(html).not.toMatch(/href="\/project\/new"/);
    });
  });
});

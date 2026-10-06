/**
 * Test Suite: Broken Links & 404 Routing Errors - Marketplace Route Alignment (Item 3.1)
 *
 * Verifies:
 * 1. next.config.ts contains a permanent redirect from singular /marketplace to canonical /marketplaces.
 * 2. PrivateDealAccessGate links back to canonical /marketplaces (not singular /marketplace).
 * 3. DealCalculatorView links to canonical /marketplaces upon successful deal publish.
 * 4. apps/web/app/sitemap.ts advertises /marketplaces in search engine sitemaps.
 * 5. apps/web/lib/assistant/knowledge.ts links Pepper AI assistant users to /marketplaces.
 * 6. apps/web/app/marketplace/page.tsx redirects incoming requests to /marketplaces.
 */

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

// Mock next/navigation
const mockRedirect = jest.fn();
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/marketplace',
  redirect: mockRedirect,
}));

// Mock Auth context
jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    authenticated: true,
    profile: { accountType: 'operator', subscriptionPlan: 'Pro' },
    navContext: { role: 'operator', accountType: 'operator' },
  }),
  useOptionalAuth: () => ({
    loading: false,
    authenticated: true,
  }),
}));

const { default: PrivateDealAccessGate } = await import('../../components/marketplace/PrivateDealAccessGate.js');
const { default: nextConfig } = await import('../../next.config.js');
const { default: sitemap } = await import('../../app/sitemap.js');
const { AVA_KNOWLEDGE_BASE } = await import('../../lib/assistant/knowledge.js');
const { default: MarketplaceRedirectPage } = await import('../../app/marketplace/page.js');

describe('Marketplace Singular vs Plural Route Alignment (Item 3.1)', () => {
  describe('1. next.config.ts Redirects', () => {
    it('contains a permanent redirect from /marketplace to /marketplaces', async () => {
      expect(typeof nextConfig.redirects).toBe('function');
      const redirects = await nextConfig.redirects!();
      const marketplaceRedirect = redirects.find((r) => r.source === '/marketplace');

      expect(marketplaceRedirect).toBeDefined();
      expect(marketplaceRedirect?.destination).toBe('/marketplaces');
      expect(marketplaceRedirect?.permanent).toBe(true);
    });
  });

  describe('2. PrivateDealAccessGate Component Links', () => {
    it('renders breadcrumb link to /marketplaces and avoids broken /marketplace', () => {
      const html = renderToString(
        <PrivateDealAccessGate
          dealName="Eastside Industrial Portfolio"
          dealAddress="1200 E 7th St, Austin, TX"
          dealSlug="eastside-industrial"
          reason="unsubscribed_gate"
        />
      );

      expect(html).toContain('href="/marketplaces"');
      expect(html).not.toMatch(/href="\/marketplace(?![s\/])/);
    });
  });

  describe('3. DealCalculatorView Marketplace Links', () => {
    it('ensures DealCalculatorView code links to canonical /marketplaces and not singular /marketplace', () => {
      const filePath = path.resolve(process.cwd(), 'components/marketing/DealCalculatorView.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Ensure no standalone href="/marketplace" remains in DealCalculatorView
      expect(content).not.toMatch(/href="\/marketplace"/);
      expect(content).toContain('href="/marketplaces"');
    });
  });

  describe('4. SEO Sitemap Alignment', () => {
    it('includes https://paperworking.co/marketplaces and excludes singular /marketplace', () => {
      const sitemapEntries = sitemap();
      const urls = sitemapEntries.map((e) => e.url);

      expect(urls).toContain('https://paperworking.co/marketplaces');
      expect(urls).not.toContain('https://paperworking.co/marketplace');
    });
  });

  describe('5. Pepper AI Assistant Knowledge Base Alignment', () => {
    it('links assistant knowledge queries to /marketplaces', () => {
      const acqItem = AVA_KNOWLEDGE_BASE.find((k) => k.id === 'deal-marketplace');
      expect(acqItem).toBeDefined();

      const marketplaceLink = acqItem?.links?.find((l) => l.label === 'Deal Marketplace');
      expect(marketplaceLink).toBeDefined();
      expect(marketplaceLink?.href).toBe('/marketplaces');
    });
  });

  describe('6. Fallback Page in app/marketplace', () => {
    it('calls redirect("/marketplaces") when accessed directly', () => {
      MarketplaceRedirectPage();
      expect(mockRedirect).toHaveBeenCalledWith('/marketplaces');
    });
  });
});

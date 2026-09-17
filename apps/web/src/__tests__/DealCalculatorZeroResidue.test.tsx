import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const { default: nextConfig } = await import('../../next.config.js');
const { metadata } = await import('../../app/(marketing)/deal-calculator/page.js');
const { default: sitemap } = await import('../../app/sitemap.js');
const copy = await import('../../lib/marketing/copy.js');
const { default: MarketingHeader } = await import('../../components/marketing/MarketingHeader.js');
const { default: DealCalculatorSection } = await import('../../sections/DealCalculatorSection.js');

describe('Global Rename Verification — Negative assertions and historical redirects for Deal Analyzer to Deal Calculator', () => {
  it('configures permanent HTTP 308 redirects from legacy /deal-analyzer and /dashboard/deal-analyzer (historical redirects)', async () => {
    if (typeof nextConfig.redirects !== 'function') {
      throw new Error('nextConfig.redirects must be a function');
    }
    const redirects = await nextConfig.redirects();

    const legacyAnalyzerRedirect = redirects.find((r: any) => r.source === '/deal-analyzer');
    expect(legacyAnalyzerRedirect).toBeDefined();
    expect(legacyAnalyzerRedirect?.destination).toBe('/deal-calculator');
    expect(legacyAnalyzerRedirect?.permanent).toBe(true);

    const legacyDashboardAnalyzerRedirect = redirects.find(
      (r: any) => r.source === '/dashboard/deal-analyzer'
    );
    expect(legacyDashboardAnalyzerRedirect).toBeDefined();
    expect(legacyDashboardAnalyzerRedirect?.destination).toBe('/deal-calculator');
    expect(legacyDashboardAnalyzerRedirect?.permanent).toBe(true);

    const dashboardCalculatorRedirect = redirects.find(
      (r: any) => r.source === '/dashboard/deal-calculator'
    );
    expect(dashboardCalculatorRedirect).toBeDefined();
    expect(dashboardCalculatorRedirect?.destination).toBe('/deal-calculator');
    expect(dashboardCalculatorRedirect?.permanent).toBe(true);
  });

  it('provides complete SEO and OpenGraph metadata with "Deal Calculator"', () => {
    expect(metadata.title).toBe('Deal Calculator — PaperWorking');
    expect(metadata.description).toContain('Deal Calculator');
    
    // Open Graph
    const og = metadata.openGraph as Record<string, any>;
    expect(og).toBeDefined();
    expect(og.title).toBe('Deal Calculator — PaperWorking');
    expect(og.url).toBe('https://paperworking.co/deal-calculator');

    // Twitter
    const twitter = metadata.twitter as Record<string, any>;
    expect(twitter).toBeDefined();
    expect(twitter.title).toBe('Deal Calculator — PaperWorking');
  });

  it('includes /deal-calculator in the official sitemap', () => {
    const sitemapEntries = sitemap();
    const dealCalcEntry = sitemapEntries.find((entry: any) =>
      entry.url.endsWith('/deal-calculator')
    );
    expect(dealCalcEntry).toBeDefined();
    expect(dealCalcEntry?.priority).toBe(0.9);
  });

  it('ensures zero user-facing marketing copy exports mention "Deal Analyzer"', () => {
    const copyValues = Object.entries(copy);
    for (const [key, value] of copyValues) {
      if (typeof value === 'string') {
        expect(value.toLowerCase()).not.toContain('deal analyzer');
        expect(value.toLowerCase()).not.toContain('dealanalyzer');
      }
    }
  });

  it('renders "Deal Calculator" in MarketingHeader with correct route and zero "Deal Analyzer"', () => {
    const html = renderToString(<MarketingHeader />);

    expect(html).toContain('Deal Calculator');
    expect(html).toContain('href="/deal-calculator"');
    expect(html).not.toContain('Deal Analyzer');
    expect(html).not.toContain('deal-analyzer');
  });

  it('renders "Deal Calculator" in DealCalculatorSection with zero "Deal Analyzer"', () => {
    const html = renderToString(<DealCalculatorSection />);

    expect(html).toContain('DEAL CALCULATOR');
    expect(html).toContain('Deal Calculator');
    expect(html).not.toContain('DEAL ANALYZER');
    expect(html).not.toContain('Deal Analyzer');
    expect(html).not.toContain('deal-analyzer');
  });
});

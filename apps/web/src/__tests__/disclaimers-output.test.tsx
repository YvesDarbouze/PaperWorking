import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import zlib from 'node:zlib';
import { exportReportPdf } from '@paperworking/api';

// Mock next/navigation for ESM
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/deal-calculator',
}));

// Mock auth client
jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  fetchSessionProfile: async () => ({ authenticated: true, subscriptionStatus: 'active' }),
  destroySession: jest.fn(),
  createSession: jest.fn(),
  createDevSession: jest.fn(),
}));

const { default: DealCalculatorSection } = await import('../../sections/DealCalculatorSection.js');
const { default: DealCalculatorView } = await import('../../components/marketing/DealCalculatorView.js');

describe('Statutory Output Disclaimers (Review C3.4)', () => {
  it('renders persistent disclaimer bar on DealCalculatorView outputs', () => {
    const html = renderToString(
      <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />,
    );

    expect(html).toContain('data-testid="calculator-disclaimer-bar"');
    expect(html).toContain(
      'Hypothetical illustration based on user-supplied assumptions; not investment, legal, tax, or financial advice; not a prediction or guarantee.',
    );
  });

  it('renders illustrative demo data badge and label on landing DealCalculatorSection', () => {
    const html = renderToString(<DealCalculatorSection />);

    expect(html).toContain('data-testid="landing-demo-data-badge"');
    expect(html).toContain('ILLUSTRATIVE DEMO DATA');
    expect(html).toContain('data-testid="landing-demo-data-label"');
    expect(html).toContain(
      'Illustrative demo data — not a real deal or performance history.',
    );
  });

  it('embeds statutory legal disclaimer into exportReportPdf output', async () => {
    const dummyReport = {
      type: 'annual',
      dateRange: { start: '2026-01-01', end: '2026-12-31' },
      generatedAt: new Date().toISOString(),
      executiveSummary: 'Annual portfolio performance overview.',
      metrics: {
        scorecard: {
          noi: { value: 120000 },
          capRate: { value: 7.2 },
          cashFlow: { value: 45000 },
          dscr: { value: 1.35 },
          occupancyRate: { value: 95 },
        },
      },
    } as any;

    const pdfBuffer = await exportReportPdf(dummyReport);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    // Decode PDF content streams to check for disclaimer text presence
    let decodedText = '';
    let start = 0;
    while ((start = pdfBuffer.indexOf('stream', start)) !== -1) {
      const nl = pdfBuffer.indexOf(10, start);
      start = nl + 1;
      const end = pdfBuffer.indexOf('endstream', start);
      if (end === -1) break;
      let actualEnd = end;
      while (pdfBuffer[actualEnd - 1] === 10 || pdfBuffer[actualEnd - 1] === 13) actualEnd--;
      const slice = pdfBuffer.slice(start, actualEnd);
      try {
        const decompressed = zlib.inflateSync(slice).toString('utf-8');
        const hexMatches = decompressed.matchAll(/<([0-9a-fA-F]+)>/g);
        for (const m of hexMatches) {
          decodedText += Buffer.from(m[1], 'hex').toString('utf-8');
        }
      } catch {}
    }

    expect(decodedText).toContain(
      'Hypothetical illustration based on user-supplied assumptions; not investment, legal, tax, or financial advice; not a prediction or guarantee.',
    );
  });
});

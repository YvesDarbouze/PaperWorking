/**
 * @jest-environment jsdom
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PricingSection from '@/components/landing/PricingSection';

// Mock framer-motion to avoid animation/prop warnings in unit tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style }: any) => <div className={className} style={style}>{children}</div>,
    h1: ({ children, className, style }: any) => <h1 className={className} style={style}>{children}</h1>,
    p: ({ children, className, style }: any) => <p className={className} style={style}>{children}</p>,
  },
}));

describe('PROMPT 3 — Pricing Page Billing Toggle & Copy Purges Verification', () => {
  const pricingSectionPath = path.resolve(process.cwd(), 'src/components/landing/PricingSection.tsx');

  describe('Static Source & Boundary Audits', () => {
    it('PricingSection renders accessible billing toggle with exact Annual and Monthly labels', () => {
      const content = fs.readFileSync(pricingSectionPath, 'utf8');

      // Radiogroup container
      expect(content).toContain('role="radiogroup"');
      expect(content).toContain('aria-label="Billing cycle options"');

      // Radios
      expect(content).toContain('aria-checked={billingCycle === \'annual\'}');
      expect(content).toContain('aria-checked={billingCycle === \'monthly\'}');
      expect(content).toContain('Annual');
      expect(content).toContain('Monthly');

      // Strict constraint check: no invented discount badges or savings percentage text
      expect(content).not.toContain('Save ~17%');
      expect(content).not.toContain('Save up to');

      // Keyboard navigation handlers
      expect(content).toContain('onKeyDown=');
      expect(content).toContain('focus-visible:ring-2');

      // Default state
      expect(content).toContain("useState<'annual' | 'monthly'>('annual')");
    });

    it('PricingSection dynamically computes per-month equivalents from PLAN_CATALOG (annual / 12 formatted to 2 decimals)', () => {
      const content = fs.readFileSync(pricingSectionPath, 'utf8');

      // Imports single source of truth PLAN_CATALOG
      expect(content).toContain("import { PLAN_CATALOG } from '@/lib/stripe/plans';");

      // Dynamic helper function
      expect(content).toContain('function formatMonthlyEquiv(annualPrice: number): string');
      expect(content).toContain('annualPrice / 12');
      expect(content).toContain('monthly.toFixed(2)');

      // Plan catalog references
      expect(content).toContain('PLAN_CATALOG.individual.annualPrice');
      expect(content).toContain('PLAN_CATALOG.individual.monthlyPrice');
      expect(content).toContain('PLAN_CATALOG.team.annualPrice');
      expect(content).toContain('PLAN_CATALOG.team.monthlyPrice');
      expect(content).toContain('PLAN_CATALOG.vendor.annualPrice');
      expect(content).toContain('PLAN_CATALOG.vendor.monthlyPrice');

      // Period label affordance /mo and billed annually microcopy
      expect(content).toContain('/mo');
      expect(content).toContain('billed annually ($${plan.annualPrice}/year)');
      expect(content).toContain('billed monthly');
    });

    it('PricingSection selects correct Stripe plan identifier (Annual vs Monthly)', () => {
      const content = fs.readFileSync(pricingSectionPath, 'utf8');

      expect(content).toContain("onSelectPlan?.(`${stripeKey} ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`);");
    });

    it('PricingSection purges Block A and Block B copy blocks cleanly', () => {
      const content = fs.readFileSync(pricingSectionPath, 'utf8');

      // Block A purged
      expect(content).not.toContain('Deals go wrong expensively. A date slips, a draw goes untracked');

      // Block B purged
      expect(content).not.toContain('Billed annually. Cancel anytime from Settings, no call required; annual plans include a 30-day refund window.');
    });

    it('PricingSection purges Missed Deadline and FAQ sections per user specification, preserving Final CTA section', () => {
      const content = fs.readFileSync(pricingSectionPath, 'utf8');

      // Missed Deadline section purged
      expect(content).not.toContain('What does one missed deadline cost?');
      expect(content).not.toContain('A blown contingency window can put a five-figure earnest money deposit at risk');

      // FAQ section purged from PricingSection
      expect(content).not.toContain('Frequently Asked Questions');
      expect(content).not.toContain('I only close three or four deals a year. Is this worth it?');

      // Final CTA section preserved
      expect(content).toContain('Start with one deal.');
      expect(content).toContain('Start Free 14-Day Trial');

      // Integrations bar preserved
      expect(content).toContain('Integrates with the tools you already use: Plaid, MLS, DocuSign, Stripe, RentCast.');
    });
  });

  describe('Interactive Component & State Transition Tests', () => {
    it('(a) default toggle state is annual', () => {
      render(<PricingSection />);

      const annualRadio = screen.getByRole('radio', { name: /annual/i });
      const monthlyRadio = screen.getByRole('radio', { name: /monthly/i });

      expect(annualRadio.getAttribute('aria-checked')).toBe('true');
      expect(monthlyRadio.getAttribute('aria-checked')).toBe('false');
    });

    it('(b) annual → monthly and monthly → annual state transitions', () => {
      render(<PricingSection />);

      const annualRadio = screen.getByRole('radio', { name: /annual/i });
      const monthlyRadio = screen.getByRole('radio', { name: /monthly/i });

      // Initial: Annual
      expect(annualRadio.getAttribute('aria-checked')).toBe('true');

      // Switch to Monthly
      fireEvent.click(monthlyRadio);
      expect(monthlyRadio.getAttribute('aria-checked')).toBe('true');
      expect(annualRadio.getAttribute('aria-checked')).toBe('false');

      // Switch back to Annual
      fireEvent.click(annualRadio);
      expect(annualRadio.getAttribute('aria-checked')).toBe('true');
      expect(monthlyRadio.getAttribute('aria-checked')).toBe('false');
    });

    it('(c) price formatting — annual ÷ 12 rounded to cents, USD format with 2 decimals ($41.58, $83.25, $32.50)', () => {
      render(<PricingSection />);

      // Investor: 499 / 12 = 41.5833... -> $41.58
      expect(screen.getByText('$41.58')).toBeDefined();

      // Team: 999 / 12 = 83.25
      expect(screen.getByText('$83.25')).toBeDefined();

      // Vendor: 390 / 12 = 32.5
      expect(screen.getByText('$32.50')).toBeDefined();
    });

    it('(d) "billed annually" microcopy present in annual view and absent in monthly view', () => {
      render(<PricingSection />);

      // In Annual view: "billed annually ($X/year)" present
      expect(screen.getByText('billed annually ($499/year)')).toBeDefined();
      expect(screen.getByText('billed annually ($999/year)')).toBeDefined();
      expect(screen.getByText('billed annually ($390/year)')).toBeDefined();
      expect(screen.queryByText('billed monthly')).toBeNull();

      // Switch to Monthly view
      const monthlyRadio = screen.getByRole('radio', { name: /monthly/i });
      fireEvent.click(monthlyRadio);

      // In Monthly view: "billed monthly" present, "billed annually" absent
      expect(screen.getAllByText('billed monthly').length).toBe(3);
      expect(screen.queryByText('billed annually ($499/year)')).toBeNull();
    });
  });
});

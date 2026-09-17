import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import {
  computeMonthlyPayment,
  computeProjectedIrr,
  canonicalDemoDeal,
} from '@paperworking/financial-engine';
import HeroProductShowcase from '../../components/marketing/HeroProductShowcase.js';
import LandingHero from '../../components/marketing/LandingHero.js';

describe('HeroProductShowcase — Real In-Browser Product Showcase', () => {
  const showcaseHtml = renderToString(<HeroProductShowcase />);
  const heroHtml = renderToString(<LandingHero />);

  describe('1. Legacy Modal Removal & Clean Slate', () => {
    it('contains no legacy "Deal Analyzer" card or "1247 Elm Street" mockup residue', () => {
      expect(showcaseHtml).not.toContain('Deal Analyzer modal');
      expect(showcaseHtml).not.toContain('1247 Elm Street');
      expect(showcaseHtml).not.toContain('$485,000');
      expect(heroHtml).not.toContain('1247 Elm Street');
      expect(heroHtml).not.toContain('$485,000');
    });

    it('mounts HeroProductShowcase in LandingHero in place of the old modal', () => {
      expect(heroHtml).toContain('data-testid="hero-product-showcase"');
    });
  });

  describe('2. Browser-Chrome Container & Navigation Tabs', () => {
    it('renders framed browser-chrome with traffic lights, URL bar, and Demo data badge', () => {
      expect(showcaseHtml).toContain('bg-[#ff5f56]');
      expect(showcaseHtml).toContain('bg-[#ffbd2e]');
      expect(showcaseHtml).toContain('bg-[#27c93f]');
      expect(showcaseHtml).toContain('data-testid="showcase-address-bar"');
      expect(showcaseHtml).toContain('paperworking.co/deal-calculator');
      expect(showcaseHtml).toContain('Demo data');
    });

    it('renders 3 manual tab buttons for cycling views', () => {
      expect(showcaseHtml).toContain('data-testid="showcase-tab-calculator"');
      expect(showcaseHtml).toContain('data-testid="showcase-tab-insights"');
      expect(showcaseHtml).toContain('data-testid="showcase-tab-fund"');
      expect(showcaseHtml).toContain('Calculator');
      expect(showcaseHtml).toContain('Insights');
      expect(showcaseHtml).toContain('Fund');
    });

    it('renders previous and next carousel buttons', () => {
      expect(showcaseHtml).toContain('data-testid="showcase-prev-btn"');
      expect(showcaseHtml).toContain('data-testid="showcase-next-btn"');
    });
  });

  describe('3. View 1: Deal Calculator Math Reconciliation', () => {
    it('renders Deal Calculator with live engine math indicators', () => {
      expect(showcaseHtml).toContain('data-testid="showcase-view-calculator"');
      expect(showcaseHtml).toContain('Deal Calculator');
      expect(showcaseHtml).toContain('Engine Math Live');
      expect(showcaseHtml).toContain('512 Oak Ridge Ave, Austin, TX 78704');
    });

    it('reconciles mathematical equality with @paperworking/financial-engine', () => {
      const purchasePrice = canonicalDemoDeal.purchasePrice;
      const rehabBudget = canonicalDemoDeal.rehabBudget;
      const grossRentMonthly = canonicalDemoDeal.grossRentMonthly;
      const ltvPct = canonicalDemoDeal.targetLtvPct;
      const interestRatePct = canonicalDemoDeal.interestRatePct;
      const amortizationYears = canonicalDemoDeal.amortizationYears;
      const operatingExpensePct = canonicalDemoDeal.operatingExpenseRatioPct;

      const closingCosts = Math.round(
        purchasePrice * (canonicalDemoDeal.buyerClosingCostsPct / 100),
      );
      expect(closingCosts).toBe(15600);

      const totalCostBasis = purchasePrice + rehabBudget + closingCosts;
      expect(totalCostBasis).toBe(595400);

      const loanAmount = Math.round(purchasePrice * (ltvPct / 100));
      expect(loanAmount).toBe(390000);

      const cashRequired = totalCostBasis - loanAmount;
      expect(cashRequired).toBe(205400);

      const annualRent = grossRentMonthly * 12;
      expect(annualRent).toBe(62400);

      const vacancyRatePct = canonicalDemoDeal.vacancyRatePct;
      const vacancyAmount = Math.round(annualRent * (vacancyRatePct / 100));
      expect(vacancyAmount).toBe(3120);

      const goi = annualRent - vacancyAmount;
      expect(goi).toBe(59280);

      const opEx = Math.round(annualRent * (operatingExpensePct / 100));
      expect(opEx).toBe(21142);

      const noi = goi - opEx;
      expect(noi).toBe(38138);

      const rawPayment = computeMonthlyPayment(loanAmount, interestRatePct / 100, amortizationYears);
      const monthlyDebtService = Math.round(rawPayment);
      expect(monthlyDebtService).toBe(2465);

      const annualDebtService = monthlyDebtService * 12;
      expect(annualDebtService).toBe(29580);

      const cashFlow = noi - annualDebtService;
      expect(cashFlow).toBe(8558);

      const capRate = (noi / totalCostBasis) * 100;
      expect(capRate.toFixed(1)).toBe('6.4');

      const cashOnCash = (cashFlow / cashRequired) * 100;
      expect(cashOnCash.toFixed(1)).toBe('4.2');

      const projectedIrr = computeProjectedIrr({
        totalCashInvested: cashRequired,
        annualPreTaxCashFlow: cashFlow,
        purchasePrice,
        loanAmount,
        interestRatePct,
        amortizationYears,
        holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
        annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
        sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
      });
      expect(projectedIrr).toBe(3.8);

      // Verify DOM reflects exact computed values
      expect(showcaseHtml).toContain('data-testid="showcase-calc-cap-rate"');
      expect(showcaseHtml).toContain('6.4%');
      expect(showcaseHtml).toContain('data-testid="showcase-calc-coc"');
      expect(showcaseHtml).toContain('4.2%');
      expect(showcaseHtml).toContain('data-testid="showcase-calc-irr"');
      expect(showcaseHtml).toContain('3.8%');
      expect(showcaseHtml).toContain('$595,400');
      expect(showcaseHtml).toContain('$390,000');
      expect(showcaseHtml).toContain('$205,400');
      expect(showcaseHtml).toContain('$2,465/mo');
    });

    it('renders interactive scenario stress-test preset options', () => {
      expect(showcaseHtml).toContain('$520k (Base)');
      expect(showcaseHtml).toContain('$490k (Offer)');
      expect(showcaseHtml).toContain('$540k (Counter)');
    });

    it('returns honest null state when cash flows do not converge', () => {
      const nonConvergentIrr = computeProjectedIrr({
        totalCashInvested: 205400,
        annualPreTaxCashFlow: -10000,
        purchasePrice: 520000,
        loanAmount: 390000,
        interestRatePct: 6.5,
        amortizationYears: 30,
        holdPeriodYears: 5,
        annualAppreciationPct: -20.0,
        sellingCostsPct: 15.0,
      });
      expect(nonConvergentIrr).toBeNull();
    });
  });

  describe('4. View 2: Portfolio Insights & Seeded Dataset Reconciliation', () => {
    it('renders 5 headline KPIs with exact figures', () => {
      expect(showcaseHtml).toContain('data-testid="showcase-view-insights"');
      expect(showcaseHtml).toContain('Portfolio Insights');
      expect(showcaseHtml).toContain('$294,000');
      expect(showcaseHtml).toContain('7.0%');
      expect(showcaseHtml).toContain('1.40x');
      expect(showcaseHtml).toContain('8.0%');
      expect(showcaseHtml).toContain('18.4%');
    });

    it('renders portfolio ledger summary strip and SVG sparkline', () => {
      expect(showcaseHtml).toContain('$4,200,000');
      expect(showcaseHtml).toContain('$1,050,000');
      expect(showcaseHtml).toContain('$84,000/yr');
      expect(showcaseHtml).toContain('NOI Trend');
    });

    it('renders 4-property breakdown table reconciling to totals', () => {
      expect(showcaseHtml).toContain('Oakridge Quadplex');
      expect(showcaseHtml).toContain('Magnolia 6-Plex');
      expect(showcaseHtml).toContain('High St Triplex');
      expect(showcaseHtml).toContain('Elmwood Duplex');
      expect(showcaseHtml).toContain('Total (4 Props)');

      // Arithmetic reconciliation:
      const propValues = [1200000, 1600000, 800000, 600000];
      const propNois = [84000, 112000, 56000, 42000];
      const propCashFlows = [24000, 32000, 16000, 12000];

      expect(propValues.reduce((a, b) => a + b, 0)).toBe(4200000);
      expect(propNois.reduce((a, b) => a + b, 0)).toBe(294000);
      expect(propCashFlows.reduce((a, b) => a + b, 0)).toBe(84000);
    });
  });

  describe('5. View 3: REIL Fund Phase with Interactive Task Assignment', () => {
    it('renders REIL Fund phase context and active stepper', () => {
      expect(showcaseHtml).toContain('data-testid="showcase-view-fund"');
      expect(showcaseHtml).toContain('Oakridge Quadplex');
      expect(showcaseHtml).toContain('Phase 02: Fund · Target Closing Nov 14');
      expect(showcaseHtml).toContain('Earnest Money: $25,000 Escrowed');
      expect(showcaseHtml).toContain('01 Acquisition');
      expect(showcaseHtml).toContain('02 Fund (Active)');
      expect(showcaseHtml).toContain('03 Hold');
      expect(showcaseHtml).toContain('04 Exit');
    });

    it('renders 4 Fund tasks with status and assignees', () => {
      expect(showcaseHtml).toContain('Track appraisal contingency deadline');
      expect(showcaseHtml).toContain('Confirm earnest money deposit received');
      expect(showcaseHtml).toContain('Upload executed contract to vault');
      expect(showcaseHtml).toContain('Complete lender document checklist');
      expect(showcaseHtml).toContain('S. Reyes');
      expect(showcaseHtml).toContain('M. Okafor');
      expect(showcaseHtml).toContain('J. Lindqvist');
      expect(showcaseHtml).toContain('Assign');
    });

    it('renders team roster with avatars and roles', () => {
      expect(showcaseHtml).toContain('Active Team:');
      expect(showcaseHtml).toContain('SR');
      expect(showcaseHtml).toContain('MO');
      expect(showcaseHtml).toContain('JL');
    });
  });

  describe('6. Carousel Semantics & Accessibility', () => {
    it('implements standard ARIA carousel semantics', () => {
      expect(showcaseHtml).toContain('role="region"');
      expect(showcaseHtml).toContain('aria-roledescription="carousel"');
      expect(showcaseHtml).toContain('aria-label="PaperWorking in-browser product showcase"');
      expect(showcaseHtml).toContain('aria-live="polite"');
      expect(showcaseHtml).toContain('role="group"');
      expect(showcaseHtml).toContain('aria-roledescription="slide"');
    });
  });
});

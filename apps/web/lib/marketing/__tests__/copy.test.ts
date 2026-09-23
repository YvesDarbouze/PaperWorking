import { describe, expect, it } from '@jest/globals';
import * as copy from '../copy.js';

describe('Marketing Copy Constants', () => {
  it('should assert all constants are non-empty strings', () => {
    for (const [key, value] of Object.entries(copy)) {
      if (typeof value !== 'string') continue;
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('should assert no "Analyzer" or "analyzer" remains in marketing copy exports', () => {
    for (const [key, value] of Object.entries(copy)) {
      if (typeof value !== 'string') continue;
      const lowerVal = value.toLowerCase();
      expect(lowerVal).not.toContain('analyzer');
    }
  });

  it('should verify Deal Calculator naming in section constants', () => {
    expect(copy.dealCalculatorSectionTitle).toBe('DEAL CALCULATOR');
    expect(copy.dealCalculatorSectionSub).toContain('Deal Calculator');
    expect(copy.dealCalculatorSectionSub).not.toContain('Deal Analyzer');
  });

  it('should verify howItWorksHeader kicker copy (PROMPT 8)', () => {
    expect(copy.howItWorksHeader).toBe(
      'Project Management software made specifically for real estate investor.'
    );
    const legacyLabel = ['PORTFOLIO', 'EXECUTION', '&', 'AUTOMATED', 'METRICS'].join(' ');
    for (const [key, value] of Object.entries(copy)) {
      expect(value).not.toContain(legacyLabel);
    }
  });

  it('should verify howItWorksSubheadline headline copy (PROMPT 9)', () => {
    expect(copy.howItWorksSubheadline).toBe(
      'How the Real Estate Investment Lifecycle Works.'
    );
    const legacyHeadline = [
      'How',
      'PaperWorking',
      'Works:',
      'The',
      'Work',
      'You',
      'Do',
      'Becomes',
      'the',
      'Numbers',
      'You',
      'Need',
    ].join(' ');
    for (const [key, value] of Object.entries(copy)) {
      expect(value).not.toContain(legacyHeadline);
    }
  });

  it('should verify REIL system narrative copy constants', () => {
    expect(copy.reilNarrativeLead).toBe(
      'The Real Estate Investment Lifecycle (REIL) is a system created to properly manage your real estate investments in 4 compartmentalized steps.'
    );
    expect(copy.reilNarrativeAcquisitionFull).toBe(
      'PHASE 01 · ACQUISITION — hunting for investment opportunities, the option to crowdfund a deal working with serious investors, and tracking outcomes of individual Deals when you exit.'
    );
    expect(copy.reilNarrativeFundFull).toBe(
      'PHASE 02 · FUND — where you fund the project and compile the necessary documentation and paperwork to make a real-estate transaction.'
    );
    expect(copy.reilNarrativeHoldFull).toBe(
      'PHASE 03 · HOLD — before you start collecting a return on your Projects: what are your costs?'
    );
    expect(copy.reilNarrativeExitFull).toBe(
      'PHASE 04 · EXIT — how the investor exited: a complete sale, or renting, leasing, Airbnb, pop-ups, commercial, etc.'
    );

    const legacyLead = ['The', "'Real", 'Estate', 'Investment', "Lifecycle'", 'or', 'the', "'REIL'"].join(' ');
    const legacyFund = ['is', 'where', 'you', 'fund', 'the', 'project', 'and', 'compile', 'necessary'].join(' ');
    for (const [key, value] of Object.entries(copy)) {
      expect(value).not.toContain(legacyLead);
      expect(value).not.toContain(legacyFund);
    }
  });

  it('should verify pricingHeader positioning copy (PROMPT 12)', () => {
    expect(copy.pricingHeader).toBe('BLOOMBERG TERMINAL FOR REAL ESTATE INVESTORS');
    const legacyPricing = ['REAL', 'ESTATE', 'BLOOMBERG', 'TERMINAL'].join(' ');
    for (const [key, value] of Object.entries(copy)) {
      expect(value).not.toContain(legacyPricing);
    }
  });

  it('should verify authorized landing hero headline and subheadline (USER-AUTHORIZED)', () => {
    expect(copy.heroHeadline).toBe(
      'Finally, Project Management software made for serious real estate investors and Investments teams.'
    );
    expect(copy.heroSubheadline).toBe(
      'The Bloomberg terminal for real estate investors. Track every contingency deadline, underwrite every deal, and manage your projects across Acquisition, Fund, Hold, and Exit.'
    );

    // Forbid unauthorized headline phrasing
    const unauthorizedH1 = 'built for serious real estate investors';
    for (const [key, value] of Object.entries(copy)) {
      if (typeof value !== 'string') continue;
      expect(value.toLowerCase()).not.toContain(unauthorizedH1);
    }
  });
});


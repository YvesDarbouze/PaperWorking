import fs from 'fs';
import path from 'path';

function normalizeText(str: string): string {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('PROMPT 14.1 — Character-Exact Marketing Copy Verification & Enforcement', () => {
  const rootDir = process.cwd();
  const landingHeroPath = path.resolve(rootDir, 'src/components/landing/LandingHero.tsx');
  const lifecycleSectionPath = path.resolve(rootDir, 'src/components/landing/LifecycleSection.tsx');
  const landingFooterPath = path.resolve(rootDir, 'src/components/landing/LandingFooter.tsx');
  const howItWorksPath = path.resolve(rootDir, 'src/components/landing/HowItWorks.tsx');
  const marketplacesClientPath = path.resolve(rootDir, 'src/components/landing/MarketplacesClient.tsx');

  describe('TASK 1: Landing Page (/)', () => {
    it('Landing hero contains character-exact 4-phase sub-headline', () => {
      const raw = fs.readFileSync(landingHeroPath, 'utf8');
      const normalized = normalizeText(raw);
      const expected = "Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit. PaperWorking manages all four phases of an investment in one place and turns the work you're already doing into the 33 numbers that show whether your investments are actually working. NOI, cap rate, DSCR, cash-on-cash, IRR — calculated from your own project data, per deal and across your portfolio.";
      expect(normalized).toContain(expected);
    });

    it('Landing hero strictly excludes unapproved "first deal management system" claim', () => {
      const raw = fs.readFileSync(landingHeroPath, 'utf8');
      expect(raw).not.toContain('the first deal management system');
      expect(raw).not.toContain('thirty-three key metrics tracked from first look');
    });

    it('Landing hero contains exact primary CTA, secondary CTA, and microcopy', () => {
      const content = fs.readFileSync(landingHeroPath, 'utf8');
      expect(content).toContain('Start Free 14-Day Trial');
      expect(content).toContain('See the 33 metrics');
      expect(content).toContain('Free 14-day trial.');
    });

    it('Lifecycle section contains closing Kanban line verbatim', () => {
      const content = fs.readFileSync(lifecycleSectionPath, 'utf8');
      expect(content).toContain(
        'Deals move in order, Kanban-style; phase gates keep the pipeline reviewable.'
      );
    });

    it('Landing footer excludes Precision deal management banner sentence and keeps CTA', () => {
      const content = fs.readFileSync(landingFooterPath, 'utf8');
      expect(content).not.toContain('Precision deal management');
      expect(content).toContain('Start Free 14-Day Trial');
    });
  });

  describe('TASK 2: How It Works (/how-it-works)', () => {
    it('Hero matches exact eyebrow, headline, and sub-headline', () => {
      const content = fs.readFileSync(howItWorksPath, 'utf8');
      const normalized = normalizeText(content);
      expect(normalized).toContain('The REIL');
      expect(normalized).toContain('Four phases. One record. Thirty-three key datapoints.');
      expect(normalized).toContain(
        "Every investment property moves through the same lifecycle: Acquisition, Fund, Hold, Exit. PaperWorking is built on that lifecycle, not adapted from generic project software. Here's what happens at each phase."
      );
    });

    it('Phase 1 contains verbatim heading and body paragraphs', () => {
      const content = fs.readFileSync(howItWorksPath, 'utf8');
      const normalized = normalizeText(content);
      expect(normalized).toContain('Phase 1 — Acquisition: decide if the deal works before you buy');
      expect(normalized).toContain(
        "Drop in an address and deal goals and the Deal Analyzer will make an automated valuation, then projects cap rate, IRR, and cash-on-cash before you've spent a dollar on diligence. Save the deals worth chasing to your pipeline; let the rest go with a record of why."
      );
      expect(normalized).toContain(
        'What you log here (purchase price, projected rents, rehab estimate) becomes the baseline your actuals are measured against later.'
      );
      expect(normalized).toContain(
        'Raising money from partners? List the deal on the Deal Marketplace to track interest from other real estate investors in your network and pledges from investors in the PaperWorking community. Interest and pledges are tracked here; every closing happens between the parties, off-platform. No money moves through PaperWorking.'
      );
    });

    it('Phase 2 contains verbatim heading and body paragraph', () => {
      const content = fs.readFileSync(howItWorksPath, 'utf8');
      const normalized = normalizeText(content);
      expect(normalized).toContain('Phase 2 — Fund: get the money and paperwork lined up');
      expect(normalized).toContain(
        'Fund is the phase where PaperWorking helps you manage the transaction. Organizing every stakeholder in the process and contingency dates and earnest money, and alerts you before they expire. Contracts, title, and entity papers go into the document vault and once the transaction is complete the app moves to the next stage of the investments lifecycle.'
      );
    });

    it('Phase 3 contains verbatim heading and body paragraphs', () => {
      const content = fs.readFileSync(howItWorksPath, 'utf8');
      const normalized = normalizeText(content);
      expect(normalized).toContain('Phase 3 — Hold: own it and improve it');
      expect(normalized).toContain(
        'Hold is where you prepare the property for the market. Are you selling, are you renting are you developing the land? This is where cost and profitability is lost and even serious REIs lie to themselves counting on the top line numbers. Hold links each milestone (inspection, rehab draw, staging, lease-up) to your line-item budget. Log expenses as they happen, or connect your accounts through Plaid to track rent payments and recurring costs automatically. The Holding Cost Clock shows what every extra day costs. Budget vs. actual stays visible, so a drifting rehab shows up in week three, not at closing.'
      );
      expect(normalized).toContain(
        'The Vendor Marketplace earns its keep here: find the contractor, appraiser, or attorney when the project needs them.'
      );
    });

    it('Phase 4 contains verbatim heading and body paragraph', () => {
      const content = fs.readFileSync(howItWorksPath, 'utf8');
      const normalized = normalizeText(content);
      expect(normalized).toContain('Phase 4 — Exit: prove what it made');
      expect(normalized).toContain(
        "Sell it, or keep it as a rental. Either way, Exit is where the record pays off. PaperWorking generates performance reports from your actual project data: the documentation a buyer, lender, or appraiser expects. Walk into your refi with the files your lender wants, not a scattered folder you'll apologize for."
      );
    });

    it('Strictly purges invented subtitles, phase gate bullet lists, and legacy sections', () => {
      const content = fs.readFileSync(howItWorksPath, 'utf8');
      expect(content).not.toContain('Everything before the purchase contract');
      expect(content).not.toContain('From accepted offer to closed financing');
      expect(content).not.toContain('Operations, debt service, tenant management, and capital improvements');
      expect(content).not.toContain('Sale, refinance, or 1031 exchange');
      expect(content).not.toContain('Phase Gate');
      expect(content).not.toContain('The Real Estate Investment Lifecycle');
      expect(content).not.toContain('Lifecycle Workflow');
      expect(content).not.toContain('The 4-Phase Deal Flow Diagram');
      expect(content).not.toContain('HowItWorksLifecycleGraphic');
    });
  });

  describe('TASK 3: Marketplaces (/marketplaces)', () => {
    it('Hero contains verbatim eyebrow, headline, and paragraph', () => {
      const content = fs.readFileSync(marketplacesClientPath, 'utf8');
      const normalized = normalizeText(content);
      expect(normalized).toContain('Two marketplaces, one network');
      expect(normalized).toContain('Come for the tools. Stay for the community.');
      expect(normalized).toContain(
        'PaperWorking subscribers run real deals through the same four phases you do. The marketplaces connect them: Projects that need capital and Projects that need real estate professionals when they need them.'
      );
    });

    it('Deal Marketplace section contains verbatim headline, body, bullets, and compliance block', () => {
      const content = fs.readFileSync(marketplacesClientPath, 'utf8');
      const normalized = normalizeText(content);
      expect(normalized).toContain('Put your Project in front of investors who are looking.');
      expect(normalized).toContain(
        'Create a Project, run it through the Deal Analyzer, and list it. Every listed deal carries its own underwriting (cap rate, cash-on-cash, projected IRR), so interested investors see the numbers, not a pitch deck.'
      );
      expect(normalized).toContain(
        'Set your funding target and watch pledges accumulate against it. Deals that match your criteria arrive in your inbox.'
      );
      expect(normalized).toContain(
        'When a deal comes together, the closing happens where it always has: between the parties, outside PaperWorking. Log the outcome and your Project record stays complete.'
      );

      expect(normalized).toContain('Analyzer-backed listings: every deal shows its underwriting.');
      expect(normalized).toContain('Interest, visualized: pledges tracked against your target in real time.');
      expect(normalized).toContain('Inbox matchmaking: deals that fit your criteria come to you.');
      expect(normalized).toContain('Close off-platform, log the result: the Project keeps a complete history.');

      expect(normalized).toContain(
        'PaperWorking facilitates introductions and interest tracking only. No funds, securities, or ownership interests are offered, sold, or transferred through the platform. All transactions occur outside PaperWorking, directly between the parties.'
      );
    });

    it('Vendor Marketplace section contains verbatim headline, body, and all 5 approved categories', () => {
      const content = fs.readFileSync(marketplacesClientPath, 'utf8');
      const normalized = normalizeText(content);
      expect(normalized).toContain('Find the right professional when the deal needs them.');
      expect(normalized).toContain(
        'A deal needs different professionals at different phases. The Vendor Marketplace lists professionals by trade and service area, so when your project reaches the phase that needs an appraiser, attorney, or general contractor as examples, you find one right when the Project needs one.'
      );
      expect(normalized).toContain(
        "Vendors work inside PaperWorking with access limited to assigned work: they see the scope they're hired for, not your portfolio."
      );
      expect(normalized).toContain('Vendor categories:');
      
      // 5 approved vendor categories
      expect(normalized).toContain(
        'Transactional & Financial: mortgage lenders and brokers, title and escrow companies, appraisers, insurance providers.'
      );
      expect(normalized).toContain(
        'Legal & Advisory: real estate attorneys, 1031 exchange accommodators, CPAs and accountants.'
      );
      expect(normalized).toContain(
        'Construction, Trades & Maintenance: general contractors, specialty trades, inspectors and assessors, exterior and grounds crews.'
      );
      expect(normalized).toContain(
        'Marketing, Staging & Media: photographers and videographers, home stagers, signage and print.'
      );
      expect(normalized).toContain(
        'Property Operations: cleaning, handyman services, security, waste management.'
      );
      expect(normalized).toContain(
        'Are you one of these professionals? A Vendor account puts your services in front of active investor projects in your area.'
      );
    });

    it('Strictly purges legacy vendor category names and prohibited compliance strings', () => {
      const content = fs.readFileSync(marketplacesClientPath, 'utf8');
      expect(content).not.toContain('exclusive access to powerful tools');
      expect(content).not.toContain('crowdfund');
      expect(content).not.toContain('will recommend them');
      expect(content).not.toContain('Debt & Financing');
      expect(content).not.toContain('Tax & Accounting');
      expect(content).not.toContain('Property Management, 5');
    });
  });
});

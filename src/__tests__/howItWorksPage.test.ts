import fs from 'fs';
import path from 'path';

describe('PROMPT 14 — How It Works Page Reconciliation Verification', () => {
  const howItWorksPath = path.resolve(process.cwd(), 'src/components/landing/HowItWorks.tsx');
  const lifecycleSectionPath = path.resolve(process.cwd(), 'src/components/landing/LifecycleSection.tsx');

  it('Verifies the Kanban sentence is present on Landing LifecycleSection', () => {
    const lifecycleContent = fs.readFileSync(lifecycleSectionPath, 'utf8');
    const kanbanSentence = 'Deals move in order, Kanban-style; phase gates keep the pipeline reviewable.';
    expect(lifecycleContent).toContain(kanbanSentence);
  });

  it('HowItWorks hero section matches exact eyebrow, H1, and approved subcopy', () => {
    const content = fs.readFileSync(howItWorksPath, 'utf8');

    expect(content).toContain('The REIL');
    expect(content).toContain('Four phases. One record. Thirty-three key datapoints.');
    
    const expectedSubcopy = 'Every investment property moves through the same lifecycle: Acquisition, Fund, Hold, Exit. PaperWorking is built on that lifecycle, not adapted from generic project software. Here&apos;s what happens at each phase.';
    expect(content).toContain(expectedSubcopy);
  });

  it('HowItWorks contains long-form approved phase copy', () => {
    const content = fs.readFileSync(howItWorksPath, 'utf8');

    // Phase 1
    expect(content).toContain('Phase 1 — Acquisition: decide if the deal works before you buy');
    expect(content).toContain('Drop in an address and deal goals and the Deal Analyzer will make an automated valuation');
    expect(content).toContain('Raising money from partners? List the deal on the Deal Marketplace');

    // Phase 2
    expect(content).toContain('Phase 2 — Fund: get the money and paperwork lined up');
    expect(content).toContain('Fund is the phase where PaperWorking helps you manage the transaction.');

    // Phase 3
    expect(content).toContain('Phase 3 — Hold: own it and improve it');
    expect(content).toContain('Hold is where you prepare the property for the market.');
    expect(content).toContain('The Holding Cost Clock shows what every extra day costs.');

    // Phase 4
    expect(content).toContain('Phase 4 — Exit: prove what it made');
    expect(content).toContain('Sell it, or keep it as a rental. Either way, Exit is where the record pays off.');
  });

  it('HowItWorks contains approved story sections and CTA', () => {
    const content = fs.readFileSync(howItWorksPath, 'utf8');

    expect(content).toContain('What a Project is');
    expect(content).toContain('One deal, all the way through');
    expect(content).toContain('Lead Investor and Team roles');
    expect(content).toContain('Start Free 14-Day Trial');
  });

  it('HowItWorks strictly excludes non-approved legacy sections', () => {
    const content = fs.readFileSync(howItWorksPath, 'utf8');

    expect(content).not.toContain('The Real Estate Investment Lifecycle');
    expect(content).not.toContain('Lifecycle Workflow');
    expect(content).not.toContain('The 4-Phase Deal Flow Diagram');
    expect(content).not.toContain('HowItWorksLifecycleGraphic');
  });
});

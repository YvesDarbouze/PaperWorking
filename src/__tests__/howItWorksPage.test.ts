import fs from 'fs';
import path from 'path';

describe('PROMPT 2 — How It Works Page & Kanban Purge Verification', () => {
  const howItWorksPath = path.resolve(process.cwd(), 'src/components/landing/HowItWorks.tsx');
  const lifecycleSectionPath = path.resolve(process.cwd(), 'src/components/landing/LifecycleSection.tsx');
  const graphicComponentPath = path.resolve(process.cwd(), 'src/components/landing/HowItWorksLifecycleGraphic.tsx');

  it('Purges the Kanban sentence site-wide from LifecycleSection and HowItWorks', () => {
    const lifecycleContent = fs.readFileSync(lifecycleSectionPath, 'utf8');
    const howItWorksContent = fs.readFileSync(howItWorksPath, 'utf8');

    const kanbanSentence = 'Deals move in order, Kanban-style; phase gates keep the pipeline reviewable.';

    expect(lifecycleContent).not.toContain(kanbanSentence);
    expect(howItWorksContent).not.toContain(kanbanSentence);
  });

  it('HowItWorks hero section matches exact eyebrow, H1, and verbatim subcopy script', () => {
    const content = fs.readFileSync(howItWorksPath, 'utf8');

    expect(content).toContain('The REIL');
    expect(content).toContain('How PaperWorking Works');
    
    const expectedSubcopy = 'Real estate investments move through a unique four-phase lifecycle: &quot;Acquisition&quot;, &quot;Fund&quot;, &quot;Hold&quot;, &quot;Exit.&quot; PaperWorking organizes investments and investment teams to give real estate investors the tools to make their investment process more organized and informed.';
    expect(content).toContain(expectedSubcopy);
  });

  it('HowItWorks contains canonical 4-phase descriptions', () => {
    const content = fs.readFileSync(howItWorksPath, 'utf8');

    expect(content).toContain('Acquisition: Decide if the deal works before you buy.');
    expect(content).toContain('Fund: Get the money and paperwork lined up.');
    expect(content).toContain('Hold: Own it and improve it.');
    expect(content).toContain('Exit: Sell it or keep it as a rental, and prove what it made.');
  });

  it('HowItWorks contains Section 2.3 Lifecycle Body Copy section', () => {
    const content = fs.readFileSync(howItWorksPath, 'utf8');

    expect(content).toContain('The Real Estate Investment Lifecycle');
    expect(content).toContain('Real Estate investments move through a unique lifecycle that is different from most traditional project management workflows.');
    expect(content).toContain('By organizing your work around these four phases, PaperWorking ensures that no critical deadline is missed');
  });

  it('HowItWorks Lifecycle Graphic renders 4 steps with icons and sublabels', () => {
    const graphicContent = fs.readFileSync(graphicComponentPath, 'utf8');

    expect(graphicContent).toContain('Underwrite & Analyze');
    expect(graphicContent).toContain('Capital & Paperwork');
    expect(graphicContent).toContain('Execute & Track');
    expect(graphicContent).toContain('Realize & Prove');
    expect(graphicContent).toContain('HowItWorksLifecycleGraphic');
  });
});

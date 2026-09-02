import fs from 'fs';
import path from 'path';

describe('PROMPT 1 — Landing Page & Navigation Verification', () => {
  const landingHeaderPath = path.resolve(process.cwd(), 'src/components/landing/LandingHeader.tsx');
  const landingHeroPath = path.resolve(process.cwd(), 'src/components/landing/LandingHero.tsx');
  const howItWorksPath = path.resolve(process.cwd(), 'src/app/how-it-works/page.tsx');
  const marketplacesPath = path.resolve(process.cwd(), 'src/app/marketplaces/page.tsx');
  const pricingPath = path.resolve(process.cwd(), 'src/app/pricing/page.tsx');
  const supportLayoutPath = path.resolve(process.cwd(), 'src/app/support/layout.tsx');

  it('LandingHeader strictly excludes Playbook from desktop and mobile navigation', () => {
    const content = fs.readFileSync(landingHeaderPath, 'utf8');

    // "Playbook" nav button should be absent from desktop center links
    expect(content).not.toMatch(/href="\/support\/metrics"\s+className="[^"]*">[^<]*Playbook/);
    
    // Top nav elements present
    expect(content).toContain('How It Works');
    expect(content).toContain('Marketplaces');
    expect(content).toContain('Pricing');
    expect(content).toContain('Support');
    expect(content).toContain('Sign In');
    expect(content).toContain('Start Free 14-Day Trial');
  });

  it('LandingHero contains verbatim subcopy script with authorized fixes', () => {
    const content = fs.readFileSync(landingHeroPath, 'utf8');

    const expectedSubcopy = 'Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit. PaperWorking manages all four phases of an investment in one place and turns the work you&apos;re already doing into the 33 numbers that show whether your investments are actually working. NOI, cap rate, DSCR, cash-on-cash, IRR — calculated from your own project data, per deal and across your portfolio.';
    
    expect(content).toContain(expectedSubcopy);
  });

  it('LandingHero places TWO CTAs directly under HeroDealCard with exact copy, microcopy, and min-h-[44px]', () => {
    const content = fs.readFileSync(landingHeroPath, 'utf8');

    // Exact button text
    expect(content).toContain('Start Free 14-Day Trial');
    expect(content).toContain('See the 33 metrics');
    expect(content).toContain('Free 14-day trial.');

    // Min height 44px touch targets
    expect(content).toContain('min-h-[44px]');

    // Destination hrefs
    expect(content).toContain('href="/pricing"');
    expect(content).toContain('href="/support/metrics"');
  });

  it('All marketing route metadata titles adhere to PaperWorking — <Surface>', () => {
    const howItWorks = fs.readFileSync(howItWorksPath, 'utf8');
    const marketplaces = fs.readFileSync(marketplacesPath, 'utf8');
    const pricing = fs.readFileSync(pricingPath, 'utf8');
    const supportLayout = fs.readFileSync(supportLayoutPath, 'utf8');

    expect(howItWorks).toContain("title: 'PaperWorking — How It Works'");
    expect(marketplaces).toContain("title: 'PaperWorking — Marketplaces'");
    expect(pricing).toContain("title: 'PaperWorking — Pricing'");
    expect(supportLayout).toContain("title: 'PaperWorking — Support Center'");
  });
});

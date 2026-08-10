import fs from 'fs';
import path from 'path';

/**
 * 🔒 STANDING COPY-LOCK GUARDRALL (PROMPT 7)
 * Asserts character-for-character exact marketing copy strings against rendered components and sources.
 * Any unauthorized modification to a locked string will fail this test suite.
 */
describe('PROMPT 7 — Standing Marketing Copy-Lock Guardrail Suite', () => {
  const landingHeroPath = path.resolve(process.cwd(), 'src/components/landing/LandingHero.tsx');
  const landingHeaderPath = path.resolve(process.cwd(), 'src/components/landing/LandingHeader.tsx');
  const topAppBarPath = path.resolve(process.cwd(), 'src/components/layout/TopAppBar.tsx');
  const howItWorksPath = path.resolve(process.cwd(), 'src/components/landing/HowItWorks.tsx');
  const marketplacesSubnavPath = path.resolve(process.cwd(), 'src/components/marketplace/MarketplaceSubnav.tsx');
  const pricingSectionPath = path.resolve(process.cwd(), 'src/components/landing/PricingSection.tsx');
  const supportPagePath = path.resolve(process.cwd(), 'src/app/support/page.tsx');

  it('LOCKED COPY 1: Landing Hero subcopy matches exact ratified script', () => {
    const heroContent = fs.readFileSync(landingHeroPath, 'utf8');
    expect(heroContent).toContain('Real Estate investments have a unique lifecycle that is different from most work related projects.');
    expect(heroContent).toContain('PaperWorking organizes investments and investment teams to give Real Estate investors the tools to make their investments process more organized and informed.');
  });

  it('LOCKED COPY 2: Landing Hero CTAs match exact strings', () => {
    const heroContent = fs.readFileSync(landingHeroPath, 'utf8');
    expect(heroContent).toContain('Start Your Free 14 Days Trial');
    expect(heroContent).toContain('33 KPIs');
  });

  it('LOCKED COPY 3: How-It-Works kicker, H1, and hero paragraph match exact ratified copy', () => {
    const hwContent = fs.readFileSync(howItWorksPath, 'utf8');
    expect(hwContent).toContain('The REIL');
    expect(hwContent).toContain('How PaperWorking Works');
    expect(hwContent).toContain('Real estate investments move through a unique four-phase lifecycle');
    expect(hwContent).toContain('PaperWorking organizes investments and investment teams to give real estate investors the tools to make their investment process more organized and informed.');
  });

  it('LOCKED COPY 4: Top nav labels in order, Playbook strictly absent', () => {
    const headerContent = fs.readFileSync(landingHeaderPath, 'utf8');
    const drawerContent = fs.readFileSync(topAppBarPath, 'utf8');

    expect(headerContent).toContain('How It Works');
    expect(headerContent).toContain('Marketplaces');
    expect(headerContent).toContain('Pricing');
    expect(headerContent).toContain('Support');
    expect(headerContent).toContain('Sign In');
    expect(headerContent).toContain('Start Free 14-Day Trial');

    // "Playbook" ABSENT from top nav and mobile drawer
    expect(headerContent).not.toContain('Playbook');
    expect(drawerContent).not.toContain('Playbook');
  });

  it('LOCKED COPY 5: MarketplaceSubnav tabs match exact 3-tab ratified set', () => {
    const subnavContent = fs.readFileSync(marketplacesSubnavPath, 'utf8');
    expect(subnavContent).toContain('Deal Marketplace');
    expect(subnavContent).toContain('Vendor Marketplace');
    expect(subnavContent).toContain('Investors');
  });

  it('LOCKED COPY 6: Pricing toggle labels match exact strings', () => {
    const pricingContent = fs.readFileSync(pricingSectionPath, 'utf8');
    expect(pricingContent).toContain('Annual');
    expect(pricingContent).toContain('Monthly');
  });

  it('LOCKED COPY 7: Support search empty state copy matches exact mandated string', () => {
    const supportContent = fs.readFileSync(supportPagePath, 'utf8');
    expect(supportContent).toContain('No matches in the knowledge base. Email');
    expect(supportContent).toContain('support@paperworking.co');
    expect(supportContent).toContain('— a real person answers every message.');
  });
});


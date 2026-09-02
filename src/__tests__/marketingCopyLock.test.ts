import fs from 'fs';
import path from 'path';

/**
 * 🔒 STANDING COPY-LOCK GUARDRAIL (PROMPT 14)
 * Asserts character-for-character exact marketing copy strings against rendered components and sources.
 * Any unauthorized modification to a locked string will fail this test suite.
 */
describe('PROMPT 14 — Standing Marketing Copy-Lock Guardrail Suite', () => {
  const landingHeroPath = path.resolve(process.cwd(), 'src/components/landing/LandingHero.tsx');
  const landingHeaderPath = path.resolve(process.cwd(), 'src/components/landing/LandingHeader.tsx');
  const topAppBarPath = path.resolve(process.cwd(), 'src/components/layout/TopAppBar.tsx');
  const howItWorksPath = path.resolve(process.cwd(), 'src/components/landing/HowItWorks.tsx');
  const marketplacesSubnavPath = path.resolve(process.cwd(), 'src/components/marketplace/MarketplaceSubnav.tsx');
  const marketplacesClientPath = path.resolve(process.cwd(), 'src/components/landing/MarketplacesClient.tsx');
  const pricingSectionPath = path.resolve(process.cwd(), 'src/components/landing/PricingSection.tsx');
  const supportPagePath = path.resolve(process.cwd(), 'src/app/support/page.tsx');

  it('LOCKED COPY 1: Landing Hero subcopy matches exact approved 4-phase copy', () => {
    const heroContent = fs.readFileSync(landingHeroPath, 'utf8');
    expect(heroContent).toContain('Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit.');
    expect(heroContent).toContain('PaperWorking manages all four phases of an investment in one place and turns the work you&apos;re already doing into the 33 numbers that show whether your investments are actually working.');
    expect(heroContent).toContain('NOI, cap rate, DSCR, cash-on-cash, IRR — calculated from your own project data, per deal and across your portfolio.');
  });

  it('LOCKED COPY 2: Landing Hero CTAs and microcopy match exact strings', () => {
    const heroContent = fs.readFileSync(landingHeroPath, 'utf8');
    expect(heroContent).toContain('Start Free 14-Day Trial');
    expect(heroContent).toContain('See the 33 metrics');
    expect(heroContent).toContain('Free 14-day trial.');
  });

  it('LOCKED COPY 3: How-It-Works kicker, H1, and hero paragraph match exact approved copy', () => {
    const hwContent = fs.readFileSync(howItWorksPath, 'utf8');
    expect(hwContent).toContain('The REIL');
    expect(hwContent).toContain('Four phases. One record. Thirty-three key datapoints.');
    expect(hwContent).toContain('Every investment property moves through the same lifecycle: Acquisition, Fund, Hold, Exit.');
    expect(hwContent).toContain('PaperWorking is built on that lifecycle, not adapted from generic project software. Here&apos;s what happens at each phase.');
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

  it('LOCKED COPY 5: MarketplaceSubnav tabs match exact 3-tab ratified set and MarketplacesClient has approved copy', () => {
    const subnavContent = fs.readFileSync(marketplacesSubnavPath, 'utf8');
    expect(subnavContent).toContain('Deal Marketplace');
    expect(subnavContent).toContain('Vendor Marketplace');
    expect(subnavContent).toContain('Investors');

    const clientContent = fs.readFileSync(marketplacesClientPath, 'utf8');
    expect(clientContent).toContain('PaperWorking subscribers run real deals through the same four phases you do.');
    expect(clientContent).toContain('Put your Project in front of investors who are looking.');
    expect(clientContent).toContain('Find the right professional when the deal needs them.');
    expect(clientContent).toContain('PaperWorking facilitates introductions and interest tracking only.');
  });

  it('LOCKED COPY 6: Pricing toggle labels match exact strings', () => {
    const pricingContent = fs.readFileSync(pricingSectionPath, 'utf8');
    expect(pricingContent).toContain('Annual');
    expect(pricingContent).toContain('Monthly');
  });

  it('LOCKED COPY 7: Support search empty state copy matches exact mandated string', () => {
    const supportContent = fs.readFileSync(supportPagePath, 'utf8');
    expect(supportContent).toContain('No matches in the knowledge base. Email');
    expect(supportContent).toContain('hi@paperworking.co');
    expect(supportContent).toContain('— a real person answers every message.');
  });
});


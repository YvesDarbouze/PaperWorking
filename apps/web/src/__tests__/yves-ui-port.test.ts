import fs from 'fs';
import path from 'path';

const webRoot = path.resolve(process.cwd());

describe('Yves-update-UI marketing copy lock (V1 paths)', () => {
  const copyPath = path.join(webRoot, 'lib/marketing/copy.ts');
  const landingHeroPath = path.join(webRoot, 'components/marketing/LandingHero.tsx');
  const howItWorksPath = path.join(webRoot, 'components/marketing/HowItWorks.tsx');
  const marketplacesPath = path.join(webRoot, 'components/marketing/MarketplacesClient.tsx');
  const headerPath = path.join(webRoot, 'components/marketing/MarketingHeader.tsx');

  it('Landing Hero copy is sourced from the locked copy module', () => {
    const copy = fs.readFileSync(copyPath, 'utf8');
    expect(copy).toContain(
      "Generic tools don't track earnest money deadlines or contractor draws.",
    );
    const heroContent = fs.readFileSync(landingHeroPath, 'utf8');
    expect(heroContent).toContain('heroBody');
    expect(heroContent).toContain('heroHeadline');
  });

  it('How It Works hero copy is sourced from the locked copy module', () => {
    const copy = fs.readFileSync(copyPath, 'utf8');
    expect(copy).toContain('export const howItWorksHeader =');
    expect(copy).toContain(
      "export const howItWorksSubheadline = 'How the Real Estate Investment Lifecycle Works.';",
    );
    const hwContent = fs.readFileSync(howItWorksPath, 'utf8');
    expect(hwContent).toContain('howItWorksHeader');
    expect(hwContent).toContain('howItWorksSubheadline');
  });

  it('Marketplaces page copy is sourced from the locked copy module', () => {
    const copy = fs.readFileSync(copyPath, 'utf8');
    expect(copy).toContain('export const marketplaceSectionBody =');
    expect(copy).toContain('export const dealMarketplaceDescription =');
    expect(copy).toContain('export const vendorMarketplaceDescription =');
    const clientContent = fs.readFileSync(marketplacesPath, 'utf8');
    expect(clientContent.length).toBeGreaterThan(0);
  });

  it('Logo uses canonical raster brand masters', () => {
    const logoPath = path.join(webRoot, 'components/marketing/Logo.tsx');
    const logoContent = fs.readFileSync(logoPath, 'utf8');
    expect(logoContent).toContain('/brand/paperworking-logotype-white-transparent.png');
    expect(logoContent).toContain('/brand/paperworking-icon-black-transparent.png');
  });

  it('Marketing header does not expose Playbook nav', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    expect(headerContent).not.toContain('Playbook');
  });
});

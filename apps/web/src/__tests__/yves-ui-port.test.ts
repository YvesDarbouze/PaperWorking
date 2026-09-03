import fs from 'fs';
import path from 'path';

const webRoot = path.resolve(process.cwd());

describe('Yves-update-UI marketing copy lock (V1 paths)', () => {
  const landingHeroPath = path.join(webRoot, 'components/marketing/LandingHero.tsx');
  const howItWorksPath = path.join(webRoot, 'components/marketing/HowItWorks.tsx');
  const marketplacesPath = path.join(webRoot, 'components/marketing/MarketplacesClient.tsx');
  const headerPath = path.join(webRoot, 'components/marketing/MarketingHeader.tsx');

  it('Landing Hero subcopy matches approved 4-phase copy', () => {
    const heroContent = fs.readFileSync(landingHeroPath, 'utf8');
    expect(heroContent).toContain(
      'Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit.',
    );
    expect(heroContent).toContain('Start Free 14-Day Trial');
    expect(heroContent).toContain('See the 33 metrics');
  });

  it('How It Works hero matches approved copy', () => {
    const hwContent = fs.readFileSync(howItWorksPath, 'utf8');
    expect(hwContent).toContain('The REIL');
    expect(hwContent).toContain('Four phases. One record. Thirty-three key datapoints.');
  });

  it('Marketplaces page has approved marketplace copy', () => {
    const clientContent = fs.readFileSync(marketplacesPath, 'utf8');
    expect(clientContent).toContain(
      'PaperWorking subscribers run real deals through the same four phases you do.',
    );
    expect(clientContent).toContain('Put your Project in front of investors who are looking.');
    expect(clientContent).toContain('Find the right professional when the deal needs them.');
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

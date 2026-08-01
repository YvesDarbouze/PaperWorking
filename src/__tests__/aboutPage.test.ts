import fs from 'fs';
import path from 'path';

describe('About Page Copy Integrity', () => {
  const filePath = path.join(process.cwd(), 'src/app/about/page.tsx');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  it('renders hero eyebrow and headline verbatim', () => {
    expect(fileContent).toContain('About PaperWorking');
    expect(fileContent).toContain('Stock investors get dashboards. Real estate investors deserve the same.');
  });

  it('contains the optional positioning line verbatim', () => {
    expect(fileContent).toContain('Finally, project management software built for serious real estate investors.');
  });

  it('renders Why PaperWorking Exists verbatim copy', () => {
    expect(fileContent).toContain(
      "A stock investor can open an app and see, in seconds, what every position is worth and how it&apos;s performing. A real estate investor, carrying far larger positions, gets a spreadsheet from 2019 and a folder of PDFs."
    );
    expect(fileContent).toContain(
      "We built PaperWorking to close that gap with a system modeled on how a real estate deal actually works: Acquisition, Fund, Hold, Exit."
    );
    expect(fileContent).toContain(
      "The idea is simple. You already do the work: walkthroughs, budgets, contractor calls, rent collection. That work produces data, and PaperWorking captures it as you go, turning it into the 33 numbers investors, lenders, and appraisers use to judge a deal. The metrics are a byproduct of the work, not extra work."
    );
  });

  it('renders Mission verbatim copy', () => {
    expect(fileContent).toContain(
      "Give serious real estate investors the visibility stock and commodity investors take for granted: one place where every deal, dollar, and deadline adds up to a clear picture of performance."
    );
  });

  it('renders all 5 principles verbatim', () => {
    expect(fileContent).toContain(
      "Built for investors, not adapted for them. The four-phase lifecycle is the product's spine, not a feature."
    );
    expect(fileContent).toContain(
      "Numbers over adjectives. We publish the 33 KPIs and their formulas; if a metric matters, you can check the math."
    );
    expect(fileContent).toContain(
      "Your data is yours. Export everything, anytime. Cancel from Settings. No hostage negotiations."
    );
    expect(fileContent).toContain(
      "Honest about what we do. PaperWorking tracks interest; it never moves money. It produces reports for your CPA; it doesn't file your taxes. It's project management software, not investment advice."
    );
    expect(fileContent).toContain(
      "Community compounds. Tools bring investors here; the network of deals and professionals keeps them. Come for the tools, stay for the community."
    );
  });

  it('renders CTAs verbatim', () => {
    expect(fileContent).toContain('Start Free 14-Day Trial');
    expect(fileContent).toContain('See how it works');
    expect(fileContent).toContain('/how-it-works');
  });
});

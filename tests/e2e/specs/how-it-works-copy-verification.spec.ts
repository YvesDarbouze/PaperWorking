import { test, expect } from '@playwright/test';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';
const EXPECTED_COPY = 'Project Management software made specifically for real estate investor.';
const EXPECTED_HEADLINE = 'How the Real Estate Investment Lifecycle Works.';
const LEGACY_LABEL = ['PORTFOLIO', 'EXECUTION', '&', 'AUTOMATED', 'METRICS'].join(' ');
const LEGACY_HEADLINE = [
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

test.describe('How It Works Positioning Copy & Legacy Label Removal', () => {
  test('How It Works Page (/how-it-works) - Desktop (1280px) & Mobile (375px)', async ({ page }) => {
    // 1. Desktop 1280px
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/how-it-works');

    const bodyContent = await page.textContent('body');
    expect(bodyContent).toContain(EXPECTED_COPY);
    expect(bodyContent).not.toContain(LEGACY_LABEL);
    expect(bodyContent).toContain(EXPECTED_HEADLINE);
    expect(bodyContent).not.toContain(LEGACY_HEADLINE);

    const kickerLocator = page.locator(`text=${EXPECTED_COPY}`).first();
    await expect(kickerLocator).toBeVisible();

    const headlineLocator = page.getByRole('heading', { level: 1, name: EXPECTED_HEADLINE });
    await expect(headlineLocator).toBeVisible();

    // Verify mocked browser graphic is removed completely
    await expect(page.locator('text=paperworking.com/dashboard/portfolio')).toHaveCount(0);
    await expect(page.locator('text=Global Portfolio Dashboard')).toHaveCount(0);
    await expect(page.locator('text=Oakridge Duplex')).toHaveCount(0);

    // Suppress floating overlays for clean screenshot
    await page.addStyleTag({
      content: `
        [data-testid="ava-launcher-container"],
        [data-testid="mobile-bottom-nav"],
        [data-testid="sticky-mobile-cta"],
        header {
          display: none !important;
        }
      `,
    });

    const heroSection = page.locator('section').first();
    await heroSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-page-desktop-1280.png'),
    });

    // 2. Mobile 375px
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/how-it-works');

    const mobileContent = await page.textContent('body');
    expect(mobileContent).toContain(EXPECTED_COPY);
    expect(mobileContent).not.toContain(LEGACY_LABEL);
    expect(mobileContent).toContain(EXPECTED_HEADLINE);
    expect(mobileContent).not.toContain(LEGACY_HEADLINE);

    const mobileKicker = page.locator(`text=${EXPECTED_COPY}`).first();
    await expect(mobileKicker).toBeVisible();

    const mobileHeadline = page.getByRole('heading', { level: 1, name: EXPECTED_HEADLINE });
    await expect(mobileHeadline).toBeVisible();

    // Verify mocked browser graphic is removed completely on mobile
    await expect(page.locator('text=paperworking.com/dashboard/portfolio')).toHaveCount(0);
    await expect(page.locator('text=Global Portfolio Dashboard')).toHaveCount(0);
    await expect(page.locator('text=Oakridge Duplex')).toHaveCount(0);

    // Verify REIL Defining Content Block
    const expectedReilLead =
      'The Real Estate Investment Lifecycle (REIL) is a system created to properly manage your real estate investments in 4 compartmentalized steps.';
    expect(bodyContent).toContain(expectedReilLead);
    expect(bodyContent).toContain('PHASE 01 · ACQUISITION —');
    expect(bodyContent).toContain(
      'hunting for investment opportunities, the option to crowdfund a deal working with serious investors, and tracking outcomes of individual Deals when you exit.'
    );
    expect(bodyContent).toContain('PHASE 02 · FUND —');
    expect(bodyContent).toContain(
      'where you fund the project and compile the necessary documentation and paperwork to make a real-estate transaction.'
    );
    expect(bodyContent).toContain('PHASE 03 · HOLD —');
    expect(bodyContent).toContain(
      'before you start collecting a return on your Projects: what are your costs?'
    );
    expect(bodyContent).toContain('PHASE 04 · EXIT —');
    expect(bodyContent).toContain(
      'how the investor exited: a complete sale, or renting, leasing, Airbnb, pop-ups, commercial, etc.'
    );

    // Verify zero horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await page.addStyleTag({
      content: `
        [data-testid="ava-launcher-container"],
        [data-testid="mobile-bottom-nav"],
        [data-testid="sticky-mobile-cta"],
        header {
          display: none !important;
        }
      `,
    });

    const mobileHeroSection = page.locator('section').first();
    await mobileHeroSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-page-mobile-375.png'),
    });
  });

  test('Landing Page How It Works Section (/#how-it-works) - Desktop (1280px) & Mobile (375px)', async ({ page }) => {
    // 1. Desktop 1280px
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#how-it-works');

    const section = page.locator('#how-it-works');
    await expect(section).toBeVisible();

    const bodyContent = await page.textContent('body');
    expect(bodyContent).toContain(EXPECTED_COPY);
    expect(bodyContent).not.toContain(LEGACY_LABEL);
    expect(bodyContent).toContain(EXPECTED_HEADLINE);
    expect(bodyContent).not.toContain(LEGACY_HEADLINE);

    const kicker = section.locator(`text=${EXPECTED_COPY}`).first();
    await expect(kicker).toBeVisible();

    const headline = section.getByRole('heading', { level: 2, name: EXPECTED_HEADLINE });
    await expect(headline).toBeVisible();

    await section.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-section-desktop-1280.png'),
    });

    // 2. Mobile 375px
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/#how-it-works');

    const mobileSection = page.locator('#how-it-works');
    await expect(mobileSection).toBeVisible();

    const mobileBody = await page.textContent('body');
    expect(mobileBody).toContain(EXPECTED_COPY);
    expect(mobileBody).not.toContain(LEGACY_LABEL);
    expect(mobileBody).toContain(EXPECTED_HEADLINE);
    expect(mobileBody).not.toContain(LEGACY_HEADLINE);

    const mobileKicker = mobileSection.locator(`text=${EXPECTED_COPY}`).first();
    await expect(mobileKicker).toBeVisible();

    const mobileHeadline = mobileSection.getByRole('heading', { level: 2, name: EXPECTED_HEADLINE });
    await expect(mobileHeadline).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await mobileSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-section-mobile-375.png'),
    });
  });

  test('REIL Phase Modules reflow & screenshots across Desktop (1280px), Tablet (768px), and Mobile (375px)', async ({ page }) => {
    const modulesLocator = page.locator('[data-testid="reil-phase-modules"]');
    const phases = ['acquisition', 'fund', 'hold', 'exit'];
    const titles = ['Acquisition', 'Fund', 'Hold', 'Exit'];

    // 1. Desktop 1280px (4 columns)
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/how-it-works');
    await expect(modulesLocator).toBeVisible();

    for (let i = 0; i < phases.length; i++) {
      const card = page.locator(`[data-testid="reil-phase-${phases[i]}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator('h3')).toHaveText(titles[i]);
    }

    // Verify key bullets present
    await expect(modulesLocator).toContainText('Source and track deal leads');
    await expect(modulesLocator).toContainText('Line up the money and the paperwork');
    await expect(modulesLocator).toContainText('Link milestones to your budget');
    await expect(modulesLocator).toContainText('Generate the performance record your buyer, lender, or appraiser expects');

    let hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Suppress fixed overlays (header, bottom nav, sticky CTA, floating chat) to keep component screenshot clean
    await page.addStyleTag({
      content: `
        [data-testid="ava-launcher-container"],
        [data-testid="mobile-bottom-nav"],
        [data-testid="sticky-mobile-cta"],
        header {
          display: none !important;
        }
      `,
    });

    await modulesLocator.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-modules-desktop-1280.png'),
    });

    // 2. Tablet 768px (2 columns)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/how-it-works');
    await expect(modulesLocator).toBeVisible();

    for (let i = 0; i < phases.length; i++) {
      const card = page.locator(`[data-testid="reil-phase-${phases[i]}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator('h3')).toHaveText(titles[i]);
    }

    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await page.addStyleTag({
      content: `
        [data-testid="ava-launcher-container"],
        [data-testid="mobile-bottom-nav"],
        [data-testid="sticky-mobile-cta"],
        header {
          display: none !important;
        }
      `,
    });

    await modulesLocator.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-modules-tablet-768.png'),
    });

    // 3. Mobile 375px (1 column stacked)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/how-it-works');
    await expect(modulesLocator).toBeVisible();

    for (let i = 0; i < phases.length; i++) {
      const card = page.locator(`[data-testid="reil-phase-${phases[i]}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator('h3')).toHaveText(titles[i]);
    }

    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await page.addStyleTag({
      content: `
        [data-testid="ava-launcher-container"],
        [data-testid="mobile-bottom-nav"],
        [data-testid="sticky-mobile-cta"],
        header {
          display: none !important;
        }
      `,
    });

    await modulesLocator.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-modules-mobile-375.png'),
    });
  });

  test('REIL 4-Phase Lifecycle Block Above-the-Fold Placement (< 800px at 1280x800) & Mobile Stack', async ({ page }) => {
    // 1. Desktop 1280x800 (Standard Viewport)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/how-it-works');

    const lifecycleCards = page.locator('[data-testid="reil-lifecycle-cards"]');
    await expect(lifecycleCards).toBeVisible();

    // Verify verbatim structure & copy
    const eyebrow = lifecycleCards.locator('text=BUILT ON THE REAL ESTATE INVESTMENT LIFE CYCLE');
    await expect(eyebrow).toBeVisible();

    const sub = lifecycleCards.locator('text=Acquisition, Fund, Hold, Exit. Four phases. One system.');
    await expect(sub).toBeVisible();

    const phase1Copy = 'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.';
    const phase2Copy = 'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.';
    const phase3Copy = 'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.';
    const phase4Copy = 'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.';

    await expect(lifecycleCards).toContainText(phase1Copy);
    await expect(lifecycleCards).toContainText(phase2Copy);
    await expect(lifecycleCards).toContainText(phase3Copy);
    await expect(lifecycleCards).toContainText(phase4Copy);

    // Verify fold-line measurement: entire block must sit above 800px fold line without scrolling
    const boundingBox = await lifecycleCards.boundingBox();
    expect(boundingBox).not.toBeNull();
    const bottomCoordinate = boundingBox!.y + boundingBox!.height;
    console.log(`[FOLD MEASUREMENT] ReilLifecycleCards: y=${boundingBox!.y}px, height=${boundingBox!.height}px, bottom=${bottomCoordinate}px (Threshold: < 800px)`);
    expect(bottomCoordinate).toBeLessThan(800);

    // Suppress floating chatbot so screenshots are completely clean
    await page.addStyleTag({
      content: `
        [data-testid="ava-launcher-container"] {
          display: none !important;
        }
      `,
    });

    // Capture above-the-fold screenshot (standard 1280x800 viewport without scrolling)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-above-the-fold-1280x800.png'),
      fullPage: false,
    });

    // Capture full-page screenshot at 1280px
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-fullpage-1280.png'),
      fullPage: true,
    });

    // Capture dedicated card component screenshot
    await lifecycleCards.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-reil-cards-desktop-1280.png'),
    });

    // 2. Mobile 375x812 Viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/how-it-works');

    const mobileCards = page.locator('[data-testid="reil-lifecycle-cards"]');
    await expect(mobileCards).toBeVisible();

    const cardPhases = ['acquisition', 'fund', 'hold', 'exit'];
    for (const phase of cardPhases) {
      const card = page.locator(`[data-testid="reil-card-${phase}"]`);
      await expect(card).toBeVisible();
    }

    // Verify zero horizontal scroll
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await page.addStyleTag({
      content: `
        [data-testid="ava-launcher-container"] {
          display: none !important;
        }
      `,
    });

    // Capture mobile above-the-fold screenshot (375x812 viewport)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-above-the-fold-mobile-375.png'),
      fullPage: false,
    });

    // Capture mobile full-page screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'how-it-works-fullpage-mobile-375.png'),
      fullPage: true,
    });
  });
});


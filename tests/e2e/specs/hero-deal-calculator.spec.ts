import { test, expect } from '@playwright/test';

test.describe('Hero & Deal Calculator Section Tests', () => {
  test('landing page renders hero details and device mockup', async ({ page }) => {
    // 1. Load root / home
    await page.goto('/');

    // 2. Assert headline text is present
    const headline = page.locator('h1');
    await expect(headline).toContainText('REAL ESTATE INVESTMENT TERMINAL');

    // 3. Assert "DEAL CALCULATOR" section renders (id: deal-calculator)
    const calculatorSection = page.locator('#deal-calculator');
    await expect(calculatorSection).toBeVisible();

    // 4. Assert iPhone mockup is visible and contains expected calculator text
    const mockupText = page.locator('text=1247 Elm Street, Austin TX');
    await expect(mockupText).toBeVisible();
    await expect(calculatorSection).toContainText('$485,000');
    await expect(calculatorSection).toContainText('$620,000');
    await expect(calculatorSection).toContainText('$68,000');
    await expect(calculatorSection).toContainText('6.2%');
    await expect(calculatorSection).toContainText('24.8%');
    await expect(calculatorSection).toContainText('DEMO DATA');
    await expect(calculatorSection).toContainText('Confidence');
    await expect(calculatorSection).toContainText('84%');
    await expect(calculatorSection).toContainText('Appraisal contingency expires in 3 days');

    // Assert hero does not contain deal demo card
    const heroSection = page.locator('section').first();
    await expect(heroSection).not.toContainText('1247 Elm Street');
    await expect(heroSection).not.toContainText('DEAL ANALYZER');
    await expect(heroSection).not.toContainText('DEAL CALCULATOR');

    // 5. Assert no "THE PROBLEM" section exists in the DOM
    const bodyContent = await page.textContent('body');
    expect(bodyContent).not.toContain('Your deals live in too many places');
    expect(bodyContent).not.toContain("The spreadsheet isn't the problem");
    expect(bodyContent).not.toContain('If your spreadsheet system works, keep it');

    // 6. Mobile 375px -> assert stacked layout
    await page.setViewportSize({ width: 375, height: 812 });

    const textColumn = calculatorSection.locator('.flex-col').first();
    const visualColumn = calculatorSection.locator('.relative.flex').first();
    await expect(textColumn).toBeVisible();
    await expect(visualColumn).toBeVisible();
  });
});

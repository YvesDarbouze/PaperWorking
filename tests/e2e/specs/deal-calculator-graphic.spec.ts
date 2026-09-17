import { test, expect } from '@playwright/test';

test.describe('Deal Calculator Graphic Placement & Header Reflow', () => {
  test('desktop 1280px: header has zero trace of graphic; calculator section renders responsive graphic with required alt text', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    // 1. Header Verification
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    await expect(header).not.toContainText('DEAL ANALYZER');
    await expect(header).not.toContainText('Deal Analyzer');
    await expect(header).not.toContainText('1247 Elm Street');
    // Verify zero image tags in the navigation bar
    const headerImgs = header.locator('img');
    await expect(headerImgs).toHaveCount(0);

    // 2. Deal Calculator Section Verification
    const calcSection = page.locator('#deal-calculator');
    await expect(calcSection).toBeVisible();

    // Verify graphic image is visible with exact alt text
    const graphicImg = calcSection.locator('img[alt="PaperWorking Deal Calculator — projected cap rate, IRR and cash-on-cash"]');
    await expect(graphicImg).toBeVisible();

    // Verify src references the generated asset
    const src = await graphicImg.getAttribute('src');
    expect(src).toContain('deal-calculator-preview');

    // Verify dimensions / responsive layout
    const box = await graphicImg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
    expect(box!.height).toBeGreaterThan(200);

    // Verify underwriting figures are present and accurate
    await expect(calcSection).toContainText('1247 Elm Street, Austin TX');
    await expect(calcSection).toContainText('$485,000');
    await expect(calcSection).toContainText('$620,000');
    await expect(calcSection).toContainText('$68,000');
    await expect(calcSection).toContainText('6.2%');
    await expect(calcSection).toContainText('24.8%');
    await expect(calcSection).toContainText('84%');
  });

  test('mobile 375px: header has zero trace of graphic; calculator section stacks cleanly with visible graphic', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // 1. Mobile Header
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    await expect(header).not.toContainText('DEAL ANALYZER');
    await expect(header).not.toContainText('1247 Elm Street');
    const headerImgs = header.locator('img');
    await expect(headerImgs).toHaveCount(0);

    // 2. Mobile Deal Calculator Section
    const calcSection = page.locator('#deal-calculator');
    await expect(calcSection).toBeVisible();

    const graphicImg = calcSection.locator('img[alt="PaperWorking Deal Calculator — projected cap rate, IRR and cash-on-cash"]');
    await expect(graphicImg).toBeVisible();

    const box = await graphicImg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);
    expect(box!.width).toBeGreaterThan(250);
  });
});

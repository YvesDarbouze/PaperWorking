import { test, expect } from '@playwright/test';

test.describe('Migration E2E — marketing navigation (Phase 7c)', () => {
  test('pricing page renders plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'BLOOMBERG TERMINAL FOR REAL ESTATE INVESTORS',
      })
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Investor', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Investment Team', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Vendor', exact: true })).toBeVisible();
  });

  test('how-it-works page renders REIL steps', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'How the Real Estate Investment Lifecycle Works.',
      })
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: "'Acquisition'" })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: "'Exit'" })).toBeVisible();
  });

  test('contact page loads support channels', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1, name: 'Talk to our team' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Visit support center' })).toBeVisible();
  });

  test('top nav includes Deal Calculator leading to gated calculator page', async ({ page }) => {
    await page.goto('/');
    const dealCalcLink = page.getByRole('link', { name: 'Deal Calculator' }).first();
    await expect(dealCalcLink).toBeVisible();
    await dealCalcLink.click();
    await expect(page).toHaveURL(/(\/deal-calculator|\/login\?next=.*deal-calculator)/);
    // Unauthenticated user encounters the Sign in gate
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('Sign in to use the Deal Calculator.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  });

  test('top nav includes Support leading to Support Center', async ({ page }) => {
    await page.goto('/');
    const supportLink = page.getByRole('link', { name: 'Support', exact: true }).first();
    await expect(supportLink).toBeVisible();
    await supportLink.click();
    await expect(page).toHaveURL(/\/support/);
    await expect(page.getByRole('heading', { level: 1, name: 'Support Center' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Pepper' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'FAQ' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'PaperWorking Glossary' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Feature Request / Suggestions' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Request a call back' })).toBeVisible();
  });
});


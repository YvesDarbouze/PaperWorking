import { test, expect } from '@playwright/test';

test.describe('Support Center E2E — full interaction suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByRole('heading', { level: 1, name: 'Support Center' })).toBeVisible();
  });

  test('sub-nav jump links are all present and route to sections', async ({ page }) => {
    const jumpLinks = [
      { text: 'Pepper', hash: '#pepper' },
      { text: 'FAQ', hash: '#faq' },
      { text: 'Glossary', hash: '#glossary' },
      { text: 'Feature Request / Suggestions', hash: '#feature-request' },
      { text: 'Request a call back', hash: '#request-a-call-back' },
    ];

    for (const jump of jumpLinks) {
      const link = page.locator(`a[href="${jump.hash}"]`).first();
      await expect(link).toBeVisible();
      await expect(link).toHaveText(jump.text);
    }
  });

  test('FAQ search filters questions dynamically and accordion expands', async ({ page }) => {
    const faqSearchInput = page.locator('input[placeholder="Search FAQs…"]');
    await expect(faqSearchInput).toBeVisible();

    // Type query
    await faqSearchInput.fill('REIL');
    const matchedFaq = page.getByRole('button', { name: /Real Estate Investment Lifecycle/i });
    await expect(matchedFaq).toBeVisible();

    // Expand accordion
    await matchedFaq.click();
    await expect(page.getByText(/four-phase operational framework/i)).toBeVisible();

    // Clear search
    await faqSearchInput.fill('');
  });

  test('Glossary filters terms by text and alphabetical buttons', async ({ page }) => {
    const filterInput = page.locator('input[placeholder="Filter terms…"]');
    await expect(filterInput).toBeVisible();

    // Search by term
    await filterInput.fill('Cap Rate');
    await expect(page.getByRole('heading', { level: 3, name: /Cap Rate/i })).toBeVisible();

    // Clear filter
    await filterInput.fill('');

    // Click letter jump pill
    const dButton = page.getByRole('button', { name: 'D', exact: true });
    await expect(dButton).toBeVisible();
    await dButton.click();
    await expect(page.getByRole('heading', { level: 3, name: 'Deal Calculator' })).toBeVisible();
  });

  test('Feature request section shows subscriber-gated card for anonymous users', async ({ page }) => {
    const gatedCard = page.locator('#feature-request');
    await expect(gatedCard.getByRole('heading', { level: 3, name: 'Subscriber Access Required' })).toBeVisible();
    await expect(gatedCard.getByText(/You must be a subscriber to make a 'Feature Request'/i)).toBeVisible();
    await expect(gatedCard.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(gatedCard.getByRole('link', { name: 'View Pricing' })).toBeVisible();
  });

  test('Call back form validates phone and successfully submits', async ({ page }) => {
    await page.fill('#cb-name', 'Morgan Vance');
    await page.fill('#cb-email', 'morgan.vance@fundinvest.com');

    const phoneInput = page.locator('#cb-phone');
    await phoneInput.fill('2125559823');
    await expect(phoneInput).toHaveValue('(212) 555-9823');

    await page.selectOption('#cb-preferred-time', 'Morning (9am - 12pm EST)');
    await page.selectOption('#cb-topic', 'Platform Demo & Onboarding');

    const submitBtn = page.locator('#request-a-call-back button[type="submit"]');
    await submitBtn.click();

    await expect(
      page.getByText(/Your call back request has been sent\. An investment specialist will call you directly\./i)
    ).toBeVisible({ timeout: 15000 });
  });

  test('Pepper chat answers questions with streaming response and supports out-of-scope fallback', async ({ page }) => {
    const pepperInput = page.locator('input[placeholder="Ask Pepper anything…"]');
    await expect(pepperInput).toBeVisible();

    // In-scope question
    await pepperInput.fill('How does the Deal Calculator work?');
    await page.locator('#pepper button[type="submit"]').click();

    // Verify response streams in
    await expect(page.locator('#pepper').getByText(/Analyze deals with professional precision/i)).toBeVisible({
      timeout: 15000,
    });

    // Out-of-scope question
    await pepperInput.fill('How to bake sourdough bread?');
    await page.locator('#pepper button[type="submit"]').click();

    await expect(
      page.locator('#pepper').getByText(/I don't know — want to make a feature request or request a call back\?/i)
    ).toBeVisible({ timeout: 15000 });
  });
});

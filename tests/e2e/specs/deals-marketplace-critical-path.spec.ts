import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';
import { createBroadcastToken } from '../../../apps/web/lib/deals/token';
import { renderDealBroadcastHtml } from '../../../apps/web/lib/email/dealBroadcast';

test.describe('Deals Marketplace End-to-End Critical Path (deals-marketplace-critical-path.spec.ts)', () => {
  test('1: Subscriber logs in -> Portfolio command center -> clicks Deals Marketplace', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await createDevSessionForContext(context, 'investor');
    const page = await context.newPage();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();

    const marketplaceBtn = page.getByRole('link', { name: /explore deals/i }).first();
    await marketplaceBtn.click();

    await expect(page).toHaveURL(/.*\/deals/);
    await expect(page.getByPlaceholder(/search any street address/i)).toBeVisible();

    await context.close();
  });

  test('2: Search address -> filters marketplace in-place without redirecting away (F-03 guard)', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await createDevSessionForContext(context, 'investor');
    const page = await context.newPage();

    await page.goto('/deals');
    const searchInput = page.getByPlaceholder(/search any street address/i);
    await searchInput.fill('Elm');
    await searchInput.press('Enter');

    // Assert in-place search: URL updates with query, no redirect away to creation form
    await expect(page).toHaveURL(/.*\/deals\?.*search=Elm.*/);
    await expect(page.getByText('1247 Elm Street').first()).toBeVisible();

    await context.close();
  });

  test('3: Deals listed on marketplace appear in Discover tab', async ({ browser }) => {
    const context = await browser.newContext();
    await createDevSessionForContext(context, 'investor');
    const page = await context.newPage();

    await page.goto('/deals?tab=discover');
    await expect(page.locator('text=1247 Elm Street, Austin, TX 78702').first()).toBeVisible();

    await context.close();
  });

  test('4: Broadcast deal analysis -> mock email payload dispatched with token link', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await createDevSessionForContext(context, 'investor');
    const page = await context.newPage();

    await page.goto('/deals/1247elmst/detail');

    await page.getByRole('button', { name: /share analysis/i }).click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.getByLabel(/Recipient Emails/i).fill('external_partner@fund.com');
    await modal.getByLabel(/Subject/i).fill('Opportunity: Elm Street Deal');

    let broadcastPostData: Record<string, unknown> | null = null;
    await page.route('**/api/deals/broadcast', async (route) => {
      broadcastPostData = route.request().postDataJSON();
      await route.continue();
    });

    await modal.getByRole('button', { name: /Share Analysis/i }).click();
    await expect(modal.locator('text=Analysis broadcast successfully dispatched!')).toBeVisible();

    expect(broadcastPostData).toBeTruthy();
    expect(broadcastPostData?.recipientEmails).toEqual(['external_partner@fund.com']);

    await context.close();
  });

  test('5: External recipient opens tokenized link -> views confidential deal preview', async ({
    browser,
  }) => {
    const externalContext = await browser.newContext();
    const page = await externalContext.newPage();

    const token = createBroadcastToken({
      dealId: 'deal-mp-1',
      email: 'external_partner@fund.com',
      broadcast: true,
      dealName: 'Elm Street Flip',
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 485000,
      projectedRoi: 18.4,
      senderName: 'Sarah Jenkins',
      senderEmail: 'sarah@leadinvestor.com',
      subject: 'Opportunity: Elm Street Deal',
      message: 'Take a look at this high-yield flip opportunity.',
    });

    await page.goto(`/deals/1247elmst/external?token=${encodeURIComponent(token)}&broadcast=true`);

    await expect(page.getByRole('heading', { name: /1247 Elm Street|Elm Street Flip/i })).toBeVisible();
    await expect(page.locator('text=$485,000')).toBeVisible();
    await expect(page.locator('text=18.4%')).toBeVisible();

    await externalContext.close();
  });

  test('6: External recipient sends inbound reply via email composer', async ({ browser }) => {
    const externalContext = await browser.newContext();
    const page = await externalContext.newPage();

    const token = createBroadcastToken({
      dealId: 'deal-mp-1',
      email: 'external_partner@fund.com',
      broadcast: true,
      senderName: 'Sarah Jenkins',
    });

    await page.goto(`/deals/1247elmst/external?token=${encodeURIComponent(token)}&broadcast=true`);

    await page.getByLabel(/Your Email/i).fill('external_partner@fund.com');
    await page.getByLabel(/Message/i).fill('Looks promising. What is the expected timeline?');

    let replyData: Record<string, unknown> | null = null;
    await page.route('**/api/deals/reply', async (route) => {
      replyData = route.request().postDataJSON();
      await route.continue();
    });

    await page.getByRole('button', { name: /Send reply/i }).click();
    await expect(page.locator('text=Your message has been sent to Sarah Jenkins!')).toBeVisible();

    expect(replyData?.source).toBe('email_inbound');
    expect(replyData?.content).toBe('Looks promising. What is the expected timeline?');

    await externalContext.close();
  });

  test('7: External recipient clicks "Subscribe to view full deal analysis" -> navigates to signup', async ({
    browser,
  }) => {
    const externalContext = await browser.newContext();
    const page = await externalContext.newPage();

    await page.goto('/deals/1247elmst/external?broadcast=true');

    const subscribeCta = page.getByRole('link', {
      name: /Subscribe to view full deal analysis and invest/i,
    });
    await expect(subscribeCta).toBeVisible();
    await subscribeCta.click();

    await expect(page).toHaveURL(/.*\/signup\?redirect=\/deals\/1247elmst/);

    await externalContext.close();
  });

  test('8: Deal detail displays funding metrics and Lead Investor info without sponsor terminology', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await createDevSessionForContext(context, 'investor');
    const page = await context.newPage();

    await page.goto('/deals/1247elmst/detail');

    await expect(page.locator('text=Lead Investor')).toBeVisible();
    await expect(page.locator('text=PaperWorking Capital')).toBeVisible();
    await expect(page.locator('text=Sponsor')).not.toBeVisible();

    await context.close();
  });

  test('9: Deal broadcast email rendering contains accurate financial details', async () => {
    const html = renderDealBroadcastHtml({
      dealName: 'Elm Street Flip',
      dealAddress: '1247 Elm Street, Austin, TX 78702',
      dealSlug: '1247elmst',
      purchasePrice: 485000,
      projectedRoi: 18.4,
      senderName: 'Sarah Jenkins',
      senderEmail: 'sarah@leadinvestor.com',
      subject: 'Investment Opportunity: Elm Street Flip',
      message: 'Underwriting details attached.',
      token: 'jwt_critical_path_test',
    });

    expect(html).toContain('PaperWorking');
    expect(html).toContain('$485,000');
    expect(html).toContain('18.4%');
    expect(html).toContain('&broadcast=true');
  });

  test('10: Mobile 375px viewport maintains full responsiveness on deals marketplace', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await createDevSessionForContext(context, 'investor');
    const page = await context.newPage();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/deals');

    const searchInput = page.getByPlaceholder(/search any street address/i);
    await expect(searchInput).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await context.close();
  });
});

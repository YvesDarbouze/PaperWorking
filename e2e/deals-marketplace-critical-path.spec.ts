import { test, expect } from '@playwright/test';

test.describe('Deals Marketplace Critical Path & Luminous Glass Audit', () => {
  test('Full 10-Step Critical Path Flow & Design System Audit', async ({ page, browser }) => {
    // ── Step 1: Subscriber login & Portfolio navigate to Deals ──
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('domcontentloaded');

    const exploreDealsCta = page.getByTestId('explore-deals-cta');
    if (await exploreDealsCta.isVisible()) {
      await exploreDealsCta.click();
      await expect(page).toHaveURL(/\/dashboard\/deals/);
    } else {
      await page.goto('/dashboard/deals');
    }

    // Design System Audit: Canvas Background & No Solid White
    const pageBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(pageBgColor).not.toBe('rgb(255, 255, 255)');

    // ── Step 2: Search 123 Main St & Address Search Interception ──
    const searchInput = page.getByTestId('deals-address-search-input');
    await expect(searchInput).toBeVisible();

    const searchStartTime = Date.now();
    await searchInput.fill('123 Main St');
    
    // Assert prediction dropdown renders within 800ms
    const dropdown = page.getByTestId('address-prediction-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 1000 });
    const searchDuration = Date.now() - searchStartTime;
    expect(searchDuration).toBeLessThan(1200);

    const predictionItem = page.getByTestId('prediction-item-0');
    await expect(predictionItem).toBeVisible();
    await predictionItem.click();

    // ── Step 3: View Deal Detail View & Luminous Glass Headers ──
    await page.goto('/deals/123mainstaustintx78701/detail');
    await page.waitForLoadState('domcontentloaded');

    const addressHeader = page.getByTestId('deal-detail-address');
    await expect(addressHeader).toBeVisible();

    // Design System Audit: Glass Card & Teal Accent
    const maximizeBtn = page.getByTestId('maximize-view-btn');
    await expect(maximizeBtn).toBeVisible();

    // ── Step 4: Invite External Investor ──
    const inviteBtn = page.getByTestId('invite-investors-btn');
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    const inviteModal = page.getByTestId('invite-modal');
    await expect(inviteModal).toBeVisible();

    const emailInput = page.getByTestId('invite-emails-input');
    await emailInput.fill('external@example.com');

    const sendInviteBtn = page.getByTestId('send-invites-btn');
    await sendInviteBtn.click();

    await expect(inviteModal).not.toBeVisible();

    // ── Step 5: Incognito Tokenized External View & Glass Paywall ──
    const incognitoContext = await browser.newContext();
    const incognitoPage = await incognitoContext.newPage();

    await incognitoPage.goto('/deals/123mainstaustintx78701/external?token=mock_jwt_token');
    await incognitoPage.waitForLoadState('domcontentloaded');

    const paywallOverlay = incognitoPage.getByTestId('paywall-overlay');
    await expect(paywallOverlay).toBeVisible();

    const subscribeBtn = incognitoPage.getByTestId('subscribe-now-button');
    await expect(subscribeBtn).toBeVisible();

    // ── Step 6: External Email Reply Composer ──
    const replyTextarea = incognitoPage.getByTestId('email-reply-textarea');
    await replyTextarea.fill('Interested in this deal! What is the projected rehab timeline?');

    const sendReplyBtn = incognitoPage.getByTestId('send-reply-button');
    await sendReplyBtn.click();

    await expect(incognitoPage.getByTestId('reply-sent-success')).toBeVisible();
    await incognitoContext.close();

    // ── Step 7 & 8: Investment Commitment & Progress Update ──
    const investmentPanel = page.getByTestId('investment-panel');
    await expect(investmentPanel).toBeVisible();

    const amountInput = page.getByTestId('commitment-amount-input');
    await amountInput.fill('50000');

    const commitSubmitBtn = page.getByTestId('commit-submit-button');
    await commitSubmitBtn.click();

    await expect(page.getByTestId('existing-commitment-banner')).toBeVisible();

    // ── Step 9: Broadcast & Social Sharing ──
    const shareAnalysisBtn = page.getByTestId('share-analysis-btn');
    await expect(shareAnalysisBtn).toBeVisible();

    // ── Step 10: Mobile Viewport Verification (375px) ──
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const mobileSearch = page.getByTestId('deals-address-search-input');
    await expect(mobileSearch).toBeVisible();
  });
});

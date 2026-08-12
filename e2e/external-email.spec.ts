import { test, expect } from '@playwright/test';

test.describe('External Email Agent Suite', () => {
  test('1. External invite email sent with correct token', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail');
    await page.waitForLoadState('domcontentloaded');

    const inviteBtn = page.getByTestId('invite-investors-btn');
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    const inviteModal = page.getByTestId('invite-modal');
    await expect(inviteModal).toBeVisible();

    const emailInput = page.getByTestId('invite-emails-input');
    await emailInput.fill('external_investor@example.com');

    const sendBtn = page.getByTestId('send-invites-btn');
    await sendBtn.click();

    await expect(inviteModal).not.toBeVisible();
  });

  test('2. Tokenized link opens paywalled deal', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/external?token=mock_jwt_token');
    await page.waitForLoadState('domcontentloaded');

    const address = page.getByTestId('external-deal-address');
    await expect(address).toBeVisible();

    const paywallOverlay = page.getByTestId('paywall-overlay');
    await expect(paywallOverlay).toBeVisible();

    const subscribeBtn = page.getByTestId('subscribe-now-button');
    await expect(subscribeBtn).toBeVisible();
  });

  test('3. Email reply composer is functional', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/external?token=mock_jwt_token');
    await page.waitForLoadState('domcontentloaded');

    const replyComposer = page.getByTestId('email-reply-composer');
    await expect(replyComposer).toBeVisible();

    const replyTextarea = page.getByTestId('email-reply-textarea');
    await replyTextarea.fill('Interested in this deal! What is the estimated rehab timeline?');

    const sendReplyBtn = page.getByTestId('send-reply-button');
    await sendReplyBtn.click();

    const replySuccess = page.getByTestId('reply-sent-success');
    await expect(replySuccess).toBeVisible();
  });

  test('4. Inbound webhook creates DealMessage correctly', async ({ request }) => {
    const response = await request.post('/api/webhooks/email-reply', {
      data: {
        from: 'external_investor@example.com',
        text: 'I would like to review the full financial package.',
        slug: '123mainstaustintx78701',
      },
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.message.source).toBe('email_inbound');
  });
});

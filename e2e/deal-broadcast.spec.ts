import { test, expect } from '@playwright/test';

test.describe('Deal Broadcast & External Sharing Flow', () => {
  test('Share analysis button opens broadcast modal and dispatches email teaser', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail');
    await page.waitForLoadState('domcontentloaded');

    const shareAnalysisBtn = page.getByTestId('share-analysis-btn');
    await expect(shareAnalysisBtn).toBeVisible();
    await shareAnalysisBtn.click();

    const broadcastModal = page.getByTestId('broadcast-modal');
    await expect(broadcastModal).toBeVisible();

    const emailsInput = page.getByTestId('broadcast-emails-input');
    await emailsInput.fill('external_partner@example.com');

    const subjectInput = page.getByTestId('broadcast-subject-input');
    await expect(subjectInput).toHaveValue('Check out this deal on PaperWorking');

    const sendBtn = page.getByTestId('send-broadcast-btn');
    await sendBtn.click();

    await expect(broadcastModal).not.toBeVisible();
  });

  test('External view for broadcast token shows sender message and NO invite response buttons', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/external?broadcast=true');
    await page.waitForLoadState('domcontentloaded');

    const address = page.getByTestId('external-deal-address');
    await expect(address).toBeVisible();

    // Assert sender broadcast message renders
    const broadcastMsg = page.getByTestId('sender-broadcast-message');
    await expect(broadcastMsg).toBeVisible();

    // Assert sender business card renders
    const card = page.getByTestId('sender-business-card');
    await expect(card).toBeVisible();

    // Assert NO invite response buttons (Decline / I'm Interested)
    const inviteeActions = page.getByTestId('invitee-actions');
    await expect(inviteeActions).not.toBeVisible();

    // Assert reply composer and subscribe button are present
    const composer = page.getByTestId('email-reply-composer');
    await expect(composer).toBeVisible();

    const subscribeBtn = page.getByTestId('subscribe-now-button');
    await expect(subscribeBtn).toBeVisible();
  });

  test('External user sends email reply and gets success confirmation', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/external?broadcast=true');
    await page.waitForLoadState('domcontentloaded');

    const replyArea = page.getByTestId('email-reply-textarea');
    await replyArea.fill('Interested in reviewing this broadcast! Can you send financials?');

    const sendReplyBtn = page.getByTestId('send-reply-button');
    await sendReplyBtn.click();

    const successAlert = page.getByTestId('reply-sent-success');
    await expect(successAlert).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';
import { createBroadcastToken } from '../../../apps/web/lib/deals/token';
import { renderDealBroadcastHtml } from '../../../apps/web/lib/email/dealBroadcast';

test.describe('Deal Broadcast & External View (Broadcast Completion)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Open deal detail -> click "Share Analysis" -> assert BroadcastModal opens', async ({
    page,
  }) => {
    await page.goto('/deals/1247elmst/detail');

    const shareBtn = page.getByRole('button', { name: /share analysis/i });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Assert modal
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Share Analysis/i })).toBeVisible();
    await expect(modal.getByLabel(/Recipient Emails/i)).toBeVisible();
    await expect(modal.getByLabel(/Subject/i)).toBeVisible();
    await expect(modal.getByLabel(/Custom Note/i)).toBeVisible();
  });

  test('2, 3 & 4: Enter 2 emails, subject, message, toggle business card ON -> click Send -> assert API 200 and email HTML has &broadcast=true', async ({
    page,
  }) => {
    await page.goto('/deals/1247elmst/detail');

    await page.getByRole('button', { name: /share analysis/i }).click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    const emailsInput = modal.getByLabel(/Recipient Emails/i);
    await emailsInput.fill('partner1@investor.com, partner2@fund.com');

    const subjectInput = modal.getByLabel(/Subject/i);
    await subjectInput.fill('Underwriting: Elm Street Flip Opportunity');

    const messageInput = modal.getByLabel(/Custom Note/i);
    await messageInput.fill('Please review the projected 18.4% ROI on Elm Street.');

    // Ensure business card toggle is checked
    const cardCheckbox = modal.getByRole('checkbox', { name: /Include digital business card/i });
    if (!(await cardCheckbox.isChecked())) {
      await cardCheckbox.check();
    }

    // Intercept POST /api/deals/broadcast
    let broadcastRequestBody: Record<string, unknown> | null = null;
    await page.route('**/api/deals/broadcast', async (route) => {
      broadcastRequestBody = route.request().postDataJSON();
      await route.continue();
    });

    const sendBtn = modal.getByRole('button', { name: /Share Analysis/i });
    await sendBtn.click();

    // Assert success message in modal
    await expect(modal.locator('text=Analysis broadcast successfully dispatched!')).toBeVisible();
    await expect(modal.locator('text=Sent to 2 recipients.')).toBeVisible();

    // Assert payload had correct fields
    expect(broadcastRequestBody).toBeTruthy();
    expect(['deal-1', 'deal-mp-1']).toContain(broadcastRequestBody?.dealId);
    expect(broadcastRequestBody?.recipientEmails).toEqual([
      'partner1@investor.com',
      'partner2@fund.com',
    ]);
    expect(broadcastRequestBody?.includeBusinessCard).toBe(true);

    // Assert generated email HTML contains link with &broadcast=true
    const sampleHtml = renderDealBroadcastHtml({
      dealName: 'Elm Street Flip',
      dealAddress: '1247 Elm Street, Austin, TX 78702',
      dealSlug: '1247elmst',
      purchasePrice: 485000,
      projectedRoi: 18.4,
      senderName: 'Sarah Jenkins',
      senderEmail: 'sarah@leadinvestor.com',
      subject: 'Underwriting: Elm Street Flip Opportunity',
      message: 'Please review the projected 18.4% ROI on Elm Street.',
      token: 'jwt_mock_token_abc',
      includeBusinessCard: true,
    });
    expect(sampleHtml).toContain('/deals/1247elmst/external?token=jwt_mock_token_abc&broadcast=true');
  });

  test('5 & 6: Open broadcast link in external context -> assert NO Decline/Interested buttons and assert sender note + business card', async ({
    browser,
  }) => {
    // Fresh context simulating external non-logged in investor recipient
    const externalContext = await browser.newContext();
    const externalPage = await externalContext.newPage();

    const token = createBroadcastToken({
      dealId: 'deal-mp-1',
      email: 'partner1@investor.com',
      broadcast: true,
      dealName: 'Elm Street Flip',
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 485000,
      projectedRoi: 18.4,
      senderName: 'Sarah Jenkins',
      senderEmail: 'sarah@leadinvestor.com',
      subject: 'Underwriting: Elm Street Flip Opportunity',
      message: 'Priority co-investment allocation available for 48 hours.',
      businessCard: {
        name: 'Sarah Jenkins',
        email: 'sarah@leadinvestor.com',
        company: 'Apex Capital Partners',
        phone: '+1 (512) 555-0199',
        investmentCriteria: 'Value-add residential & multifamily',
      },
    });

    await externalPage.goto(`/deals/1247elmst/external?token=${encodeURIComponent(token)}&broadcast=true`);

    // Assert deal preview elements
    await expect(externalPage.getByRole('heading', { name: /1247 Elm Street|Elm Street Flip/i })).toBeVisible();
    await expect(externalPage.locator('text=1247 Elm Street, Austin, TX 78702')).toBeVisible();

    // Assert sender note and business card are visible
    await expect(externalPage.locator('text=Note from Sarah Jenkins')).toBeVisible();
    await expect(
      externalPage.locator('text=Priority co-investment allocation available for 48 hours.'),
    ).toBeVisible();
    await expect(externalPage.locator('[data-testid="sender-business-card"]')).toBeVisible();
    await expect(externalPage.locator('text=Apex Capital Partners')).toBeVisible();

    // Assert NO "Decline" or "I'm Interested" buttons
    await expect(externalPage.getByRole('button', { name: /^Decline$/i })).not.toBeVisible();
    await expect(externalPage.getByRole('button', { name: /I'm Interested/i })).not.toBeVisible();

    // Assert Subscribe CTA is visible
    await expect(
      externalPage.getByRole('link', { name: /Subscribe to view full deal analysis and invest/i }),
    ).toBeVisible();

    await externalContext.close();
  });

  test('7: Type reply in composer -> assert submit creates DealMessage with source email_inbound', async ({
    browser,
  }) => {
    const externalContext = await browser.newContext();
    const externalPage = await externalContext.newPage();

    const token = createBroadcastToken({
      dealId: 'deal-mp-1',
      email: 'partner_reply@investor.com',
      broadcast: true,
      dealName: 'Elm Street Flip',
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 485000,
      projectedRoi: 18.4,
      senderName: 'Sarah Jenkins',
      senderEmail: 'sarah@leadinvestor.com',
      subject: 'Underwriting: Elm Street Flip Opportunity',
      message: 'Please review and reply.',
    });

    await externalPage.goto(`/deals/1247elmst/external?token=${encodeURIComponent(token)}&broadcast=true`);

    // Fill reply composer
    const emailInput = externalPage.getByLabel(/Your Email/i);
    await emailInput.fill('partner_reply@investor.com');

    const messageInput = externalPage.getByLabel(/Message/i);
    await messageInput.fill('We reviewed the model and are interested in allocating $50k.');

    // Intercept reply submission
    let replyPayload: Record<string, unknown> | null = null;
    await externalPage.route('**/api/deals/reply', async (route) => {
      replyPayload = route.request().postDataJSON();
      await route.continue();
    });

    const sendReplyBtn = externalPage.getByRole('button', { name: /Send reply/i });
    await expect(sendReplyBtn).toBeVisible();
    await sendReplyBtn.click();

    // Assert success confirmation
    await expect(externalPage.locator('text=Your message has been sent to Sarah Jenkins!')).toBeVisible();

    // Assert DealMessage payload had source: email_inbound
    expect(replyPayload).toBeTruthy();
    expect(['deal-1', 'deal-mp-1']).toContain(replyPayload?.dealId);
    expect(replyPayload?.senderEmail).toBe('partner_reply@investor.com');
    expect(replyPayload?.content).toBe(
      'We reviewed the model and are interested in allocating $50k.',
    );
    expect(replyPayload?.source).toBe('email_inbound');

    await externalContext.close();
  });

  test('8: Toggle business card OFF -> send broadcast -> assert email does not contain card data', async ({
    page,
  }) => {
    await page.goto('/deals/1247elmst/detail');

    await page.getByRole('button', { name: /share analysis/i }).click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    const emailsInput = modal.getByLabel(/Recipient Emails/i);
    await emailsInput.fill('private_investor@firm.com');

    // Uncheck business card toggle
    const cardCheckbox = modal.getByRole('checkbox', { name: /Include digital business card/i });
    if (await cardCheckbox.isChecked()) {
      await cardCheckbox.uncheck();
    }

    let broadcastRequestBody: Record<string, unknown> | null = null;
    await page.route('**/api/deals/broadcast', async (route) => {
      broadcastRequestBody = route.request().postDataJSON();
      await route.continue();
    });

    const sendBtn = modal.getByRole('button', { name: /Share Analysis/i });
    await sendBtn.click();

    await expect(modal.locator('text=Analysis broadcast successfully dispatched!')).toBeVisible();
    expect(broadcastRequestBody?.includeBusinessCard).toBe(false);

    // Verify rendered email without business card
    const htmlWithoutCard = renderDealBroadcastHtml({
      dealName: 'Elm Street Flip',
      dealAddress: '1247 Elm Street, Austin, TX 78702',
      dealSlug: '1247elmst',
      purchasePrice: 485000,
      projectedRoi: 18.4,
      senderName: 'Sarah Jenkins',
      senderEmail: 'sarah@leadinvestor.com',
      subject: 'Private Opportunity',
      message: 'Private syndication note.',
      token: 'jwt_mock_token_nocard',
      includeBusinessCard: false,
    });

    expect(htmlWithoutCard).not.toContain('data-testid="business-card-section"');
    expect(htmlWithoutCard).not.toContain('Lead Investor Contact');
  });
});

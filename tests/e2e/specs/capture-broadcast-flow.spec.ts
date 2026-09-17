import { test } from '@playwright/test';
import { createBroadcastToken } from '../../../apps/web/lib/deals/token';
import { renderDealBroadcastHtml } from '../../../apps/web/lib/email/dealBroadcast';

test.describe('Capture Broadcast Flow Screenshots', () => {
  test('Capture email template and external view artifacts', async ({ page }) => {
    // 1. Email Template HTML rendering (1440px)
    const emailHtml = renderDealBroadcastHtml({
      dealName: 'Elm Street Flip',
      dealAddress: '1247 Elm Street, Austin, TX 78702',
      dealSlug: '1247elmst',
      purchasePrice: 485000,
      projectedRoi: 18.4,
      senderName: 'Sarah Jenkins',
      senderEmail: 'sarah@leadinvestor.com',
      subject: 'Investment Opportunity: Elm Street Flip',
      message: 'Review this underwriting package and let me know your thoughts on co-investing.',
      token: 'jwt_sample_token_xyz',
      includeBusinessCard: true,
      businessCard: {
        name: 'Sarah Jenkins',
        email: 'sarah@leadinvestor.com',
        company: 'Apex Capital Partners',
        phone: '+1 (512) 555-0199',
        investmentCriteria: 'Value-add residential & multifamily',
      },
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(emailHtml);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/deal-broadcast-email-1440.png',
      fullPage: true,
    });

    // 2. External Deal Broadcast View (1440px)
    const token = createBroadcastToken({
      dealId: 'deal-mp-1',
      email: 'partner@investor.com',
      broadcast: true,
      dealName: 'Elm Street Flip',
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 485000,
      projectedRoi: 18.4,
      senderName: 'Sarah Jenkins',
      senderEmail: 'sarah@leadinvestor.com',
      subject: 'Investment Opportunity: Elm Street Flip',
      message: 'Review this underwriting package and let me know your thoughts on co-investing.',
      businessCard: {
        name: 'Sarah Jenkins',
        email: 'sarah@leadinvestor.com',
        company: 'Apex Capital Partners',
        phone: '+1 (512) 555-0199',
        investmentCriteria: 'Value-add residential & multifamily syndications',
      },
    });

    await page.goto(`/deals/1247elmst/external?token=${encodeURIComponent(token)}&broadcast=true`);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/deal-broadcast-external-view-1440.png',
      fullPage: true,
    });

    // 3. External Deal Broadcast View (375px Mobile)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/deals/1247elmst/external?token=${encodeURIComponent(token)}&broadcast=true`);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/deal-broadcast-external-view-375.png',
      fullPage: true,
    });
  });
});

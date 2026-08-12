import { test, expect } from '@playwright/test';

test.describe('Business Card Exchange & Investor Profile Snapshots', () => {
  test('Invitee clicks Interested -> glass modal previews Business Card -> confirms share', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail');
    await page.waitForLoadState('domcontentloaded');

    // Click "I'm Interested" button
    const interestedBtn = page.getByTestId('invite-interested-button');
    await expect(interestedBtn).toBeVisible();
    await interestedBtn.click();

    // Assert glass modal opens with business card preview
    const confirmModal = page.getByTestId('interest-confirm-modal');
    await expect(confirmModal).toBeVisible();

    const cardPreview = page.getByTestId('business-card-preview-snapshot');
    await expect(cardPreview).toBeVisible();
    await expect(cardPreview).toContainText('Sarah Jenkins');
    await expect(cardPreview).toContainText('Acme Capital Group');

    // Confirm share
    const confirmShareBtn = page.getByTestId('confirm-share-card-button');
    await confirmShareBtn.click();

    // Assert interest accepted badge
    const acceptedBadge = page.getByTestId('invite-accepted-badge');
    await expect(acceptedBadge).toBeVisible();
  });

  test('Creator views shared investor business cards in Investors tab', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail');
    await page.waitForLoadState('domcontentloaded');

    const investorsTab = page.getByTestId('detail-tab-investors');
    await investorsTab.click();

    const investorsContent = page.getByTestId('investors-tab-content');
    await expect(investorsContent).toBeVisible();

    // Assert investor card rendering with accredited badge
    const sarahCard = page.getByTestId('shared-investor-card-card_sarah_1');
    await expect(sarahCard).toBeVisible();
    await expect(sarahCard).toContainText('Sarah Jenkins');
    await expect(sarahCard).toContainText('Acme Capital Group');

    const accreditedBadge = sarahCard.getByTestId('accredited-badge');
    await expect(accreditedBadge).toBeVisible();

    const messageBtn = sarahCard.getByTestId('message-investor-btn-card_sarah_1');
    await expect(messageBtn).toBeVisible();
  });
});

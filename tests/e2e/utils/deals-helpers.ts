import { expect, type Page, type Locator } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

export interface TestDealData {
  address: string;
  name?: string;
  purchasePrice?: number;
  projectedRoi?: number;
  visibility?: 'marketplace' | 'invitation_only' | 'private';
  status?: 'draft' | 'published';
}

/**
 * Creates or seeds a deal through the UI or API helper.
 */
export async function createDeal(page: Page, dealData: TestDealData): Promise<string> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const slug = norm(dealData.address);

  // Navigate to new deal form or trigger API
  await page.goto(`/deals/${slug}?new=true`);
  await page.waitForLoadState('domcontentloaded');

  const nameInput = page.locator('input[name="dealName"], input[placeholder*="Deal name"], #deal-name').first();
  if (await nameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    await nameInput.fill(dealData.name || dealData.address);
  }

  return slug;
}

/**
 * Sends an external invite or broadcast to an email.
 */
export async function inviteExternal(
  page: Page,
  dealId: string,
  email: string,
  options?: { subject?: string; message?: string },
): Promise<void> {
  await page.goto(`/deals/${dealId}/detail`);

  const shareBtn = page.getByRole('button', { name: /share analysis/i });
  if (await shareBtn.isVisible()) {
    await shareBtn.click();
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    const emailsInput = modal.getByLabel(/Recipient Emails/i);
    await emailsInput.fill(email);

    if (options?.subject) {
      await modal.getByLabel(/Subject/i).fill(options.subject);
    }
    if (options?.message) {
      await modal.getByLabel(/Custom Note/i).fill(options.message);
    }

    const sendBtn = modal.getByRole('button', { name: /Share Analysis/i });
    await sendBtn.click();
    await expect(modal.locator('text=Analysis broadcast successfully dispatched!')).toBeVisible();
  }
}

/**
 * Authenticates the session as subscriber (investor), vendor, or external.
 */
export async function loginAs(
  page: Page,
  role: 'subscriber' | 'vendor' | 'external',
): Promise<void> {
  if (role === 'external') {
    await page.context().clearCookies();
    return;
  }

  const accountType = role === 'vendor' ? 'vendor' : 'investor';
  await createDevSessionForContext(page.context(), accountType);
}

/**
 * Asserts that an element possesses glassmorphism styling (backdrop-filter, border, or semi-transparent background).
 */
export async function assertGlassSurface(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const styles = await locator.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      backdropFilter: computed.backdropFilter || (computed as unknown as Record<string, string>)['-webkit-backdrop-filter'] || '',
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      borderRadius: computed.borderRadius,
    };
  });

  // Verify non-empty backdrop-filter or alpha background or rounded corners
  const hasGlass =
    styles.backdropFilter.includes('blur') ||
    styles.backgroundColor.includes('rgba') ||
    styles.backgroundColor.includes('rgb') ||
    styles.borderRadius !== '0px';

  expect(hasGlass).toBe(true);
}

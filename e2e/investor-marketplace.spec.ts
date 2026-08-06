import { test, expect, type Page } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Investor marketplace profiles — acceptance + evidence.
 * Sprint: UX/UI Hardening, August 2026 (Prompt 8).
 */

const SHOT_DIR = path.join(process.cwd(), 'screenshots', 'investor-marketplace');
const DISCOVERY = '/marketplace/investors';
const EDITOR = '/dashboard/settings/marketplace-profile';

const PROFILES = [
  {
    uid: 'inv-1',
    displayName: 'Sophie Bennett',
    profileType: 'individual',
    publicProfile: true,
    isVerified: true,
    publicBio: 'Value-add multifamily across the Sun Belt.',
    location: 'Austin, TX',
    strategies: ['buy_and_hold'],
    followerCount: 1240,
    followingCount: 86,
    dealCount: 12,
    aumCents: 4_200_000_00,
    avgRoiPct: 18.4,
    showRoiPublicly: true,
  },
  {
    uid: 'inv-2',
    displayName: 'Marcus Aurelius',
    businessName: 'Apex Capital',
    profileType: 'team',
    publicProfile: true,
    isVerified: false,
    location: 'Phoenix, AZ',
    strategies: ['flip'],
    followerCount: 310,
    followingCount: 42,
    dealCount: 5,
  },
];

/** Stub the directory + profile endpoints so the suite is hermetic. */
async function stubApi(page: Page, opts: { following?: string[] } = {}) {
  await page.route('**/api/marketplace/investors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profiles: PROFILES, following: opts.following ?? [] }),
    });
  });

  await page.route('**/api/marketplace/investors/inv-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: PROFILES[0],
        deals: [
          {
            id: 'd1',
            address: '4208 Melrose Ave',
            phaseStatus: 'Phase 3: Hold',
            headlineMetric: { label: 'Value range', value: '$250k–$500k' },
          },
        ],
        activity: [{ id: 'a1', text: 'Closed on 4208 Melrose Ave' }],
        isFollowing: false,
      }),
    });
  });

  await page.route('**/api/marketplace/investors/follow', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ following: true, changed: true }),
    });
  });

  /* Owner's editable profile (req 4 write path). Captures the PUT body so the
     tests can assert what the editor actually sends. */
  await page.route('**/api/marketplace/profile', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      await page.evaluate((b) => {
        (window as unknown as { __lastProfilePut?: unknown }).__lastProfilePut = b;
      }, body);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: body }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          uid: 'user_123',
          displayName: 'Test User',
          profileType: 'individual',
          businessName: '',
          publicBio: '',
          location: '',
          websiteUrl: '',
          strategies: [],
          publicProfile: false,
          showRoiPublicly: false,
          teamMembers: [],
          isVerified: false,
        },
      }),
    });
  });
}

test.describe('Investor marketplace', () => {
  test.beforeEach(async ({ page }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true }),
        );
      } catch {}
    });
    await setupMocks(page, createDefaultState());
    await stubApi(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('discovery grid loads with profile cards', async ({ page }) => {
    await safeGoto(page, DISCOVERY);

    await expect(page.getByTestId('investor-discovery')).toBeVisible();
    const cards = page.getByTestId('investor-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(2);

    await expect(page.getByTestId('investor-card-name').first()).toHaveText('Sophie Bennett');
    // Teams display their business name.
    await expect(page.getByTestId('investor-card-name').nth(1)).toHaveText('Apex Capital');

    await page.screenshot({ path: path.join(SHOT_DIR, 'discovery-desktop.png'), fullPage: true });
  });

  test('verification badge is blue, never green', async ({ page }) => {
    await safeGoto(page, DISCOVERY);
    const badge = page.getByTestId('investor-card-verified').first();
    await expect(badge).toBeVisible();

    const color = await badge.evaluate((el) => getComputedStyle(el).color);
    // #60a5fa
    expect(color).toBe('rgb(96, 165, 250)');
    const green = /rgb\(\s*(52,\s*211,\s*153|16,\s*185,\s*129|0,\s*(206|221),\s*(142|148))\s*\)/;
    expect(green.test(color)).toBe(false);
  });

  test('avatar falls back to initials on a gradient', async ({ page }) => {
    await safeGoto(page, DISCOVERY);
    const initials = page.getByTestId('investor-avatar-initials').first();
    await expect(initials).toBeVisible();
    await expect(initials).toHaveText('SB');

    const bg = await initials.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('gradient');
  });

  test('search and filters narrow the grid', async ({ page }) => {
    await safeGoto(page, DISCOVERY);
    await expect(page.getByTestId('investor-card').first()).toBeVisible();

    await page.getByTestId('investor-search').fill('apex');
    await expect(page.getByTestId('investor-card')).toHaveCount(1);
    await expect(page.getByTestId('investor-card-name').first()).toHaveText('Apex Capital');

    await page.getByTestId('investor-search').fill('');
    await page.getByTestId('filter-type').selectOption('individual');
    await expect(page.getByTestId('investor-card')).toHaveCount(1);
    await expect(page.getByTestId('investor-card-name').first()).toHaveText('Sophie Bennett');

    await page.getByTestId('filter-type').selectOption('all');
    await page.getByTestId('filter-location').fill('phoenix');
    await expect(page.getByTestId('investor-card')).toHaveCount(1);
  });

  test('follow button toggles optimistically', async ({ page }) => {
    await safeGoto(page, DISCOVERY);
    const follow = page.getByTestId('investor-card-follow').first();
    await expect(follow).toBeVisible();
    await expect(follow).toHaveText('Follow');
    await expect(follow).toHaveAttribute('aria-pressed', 'false');

    await follow.click();
    // Optimistic: flips without waiting on the network.
    await expect(follow).toHaveText('Following');
    await expect(follow).toHaveAttribute('aria-pressed', 'true');
  });

  test('profile page loads with stats and tabs', async ({ page }) => {
    await safeGoto(page, `${DISCOVERY}/inv-1`);

    await expect(page.getByTestId('investor-profile')).toBeVisible();
    await expect(page.getByTestId('investor-profile-name')).toHaveText('Sophie Bennett');
    await expect(page.getByTestId('investor-stats')).toContainText('$4.2M');
    await expect(page.getByTestId('investor-stats')).toContainText('18.4%');

    for (const t of ['deals', 'activity', 'about']) {
      await expect(page.getByTestId(`investor-tab-${t}`)).toBeVisible();
    }

    await expect(page.getByTestId('public-deal-card')).toHaveCount(1);

    await page.getByTestId('investor-tab-about').click();
    await expect(page.getByTestId('investor-panel-about')).toBeVisible();
    await expect(page.getByTestId('investor-panel-about')).toContainText('Buy & Hold');

    await page.screenshot({ path: path.join(SHOT_DIR, 'profile-desktop.png'), fullPage: true });
  });

  test('public deal card never shows financial detail', async ({ page }) => {
    await safeGoto(page, `${DISCOVERY}/inv-1`);
    const card = page.getByTestId('public-deal-card').first();
    await expect(card).toBeVisible();

    const text = (await card.textContent()) ?? '';
    // Address, phase and a bucketed range are allowed…
    expect(text).toContain('4208 Melrose Ave');
    expect(text).toContain('$250k–$500k');
    // …exact figures and counterparties are not.
    expect(text).not.toMatch(/400,?000/);
    expect(text).not.toMatch(/300,?000/);
    expect(text).not.toMatch(/purchase price/i);
  });

  test('no Sponsor terminology anywhere on these surfaces', async ({ page }) => {
    for (const url of [DISCOVERY, `${DISCOVERY}/inv-1`]) {
      await safeGoto(page, url);
      await expect(page.locator('body')).not.toContainText(/sponsor/i);
    }
  });

  test('responsive: 1 column mobile, 3 desktop', async ({ page }) => {
    await safeGoto(page, DISCOVERY);
    const colsAt = async (w: number) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(350);
      return page.evaluate(() => {
        const grid = document.querySelector('[data-testid="investor-grid"]');
        if (!grid) return null;
        return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
      });
    };

    expect(await colsAt(375)).toBe(1);
    await page.screenshot({ path: path.join(SHOT_DIR, 'discovery-mobile.png'), fullPage: true });
    expect(await colsAt(1440)).toBe(3);
  });

  /* ── Req 4 write path: the profile editor ── */
  test('profile editor loads and reveals team fields only for teams', async ({ page }) => {
    await safeGoto(page, EDITOR);

    const editor = page.getByTestId('marketplace-profile-editor');
    await expect(editor).toBeVisible();

    // Individual is the default; a business name and roster would be noise.
    await expect(page.getByTestId('profile-type-individual')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('field-business-name')).toHaveCount(0);
    await expect(page.getByTestId('team-members-section')).toHaveCount(0);

    await page.getByTestId('profile-type-team').click();
    await expect(page.getByTestId('field-business-name')).toBeVisible();
    await expect(page.getByTestId('team-members-section')).toBeVisible();

    await page.screenshot({ path: path.join(SHOT_DIR, 'profile-editor.png'), fullPage: true });
  });

  test('editor sends only editable fields, never isVerified', async ({ page }) => {
    await safeGoto(page, EDITOR);
    await expect(page.getByTestId('marketplace-profile-editor')).toBeVisible();

    await page.getByTestId('field-location').fill('Austin, TX');
    await page.getByTestId('strategy-buy_and_hold').click();
    await page.getByTestId('toggle-publicProfile').click();
    await page.getByTestId('save-profile').click();

    await expect
      .poll(async () =>
        page.evaluate(() => (window as unknown as { __lastProfilePut?: Record<string, unknown> }).__lastProfilePut),
      )
      .toBeTruthy();

    const sent = (await page.evaluate(
      () => (window as unknown as { __lastProfilePut?: Record<string, unknown> }).__lastProfilePut,
    )) as Record<string, unknown>;

    expect(sent.location).toBe('Austin, TX');
    expect(sent.strategies).toEqual(['buy_and_hold']);
    expect(sent.publicProfile).toBe(true);
    // The badge is an admin decision — the editor must not offer it.
    expect('isVerified' in sent).toBe(false);
    expect('followerCount' in sent).toBe(false);
  });

  test('team invites can be added and removed', async ({ page }) => {
    await safeGoto(page, EDITOR);
    await expect(page.getByTestId('marketplace-profile-editor')).toBeVisible();

    await page.getByTestId('profile-type-team').click();
    await page.getByTestId('field-business-name').fill('Apex Capital');

    await page.getByTestId('add-member').click();
    await page.getByTestId('member-name-0').fill('Ada Lovelace');
    await page.getByTestId('member-email-0').fill('ada@apex.com');

    await page.getByTestId('save-profile').click();
    await expect
      .poll(async () =>
        page.evaluate(() => (window as unknown as { __lastProfilePut?: Record<string, unknown> }).__lastProfilePut),
      )
      .toBeTruthy();

    const sent = (await page.evaluate(
      () => (window as unknown as { __lastProfilePut?: Record<string, unknown> }).__lastProfilePut,
    )) as { teamMembers: Array<{ displayName: string; invitedEmail: string }> };
    expect(sent.teamMembers).toHaveLength(1);
    expect(sent.teamMembers[0].invitedEmail).toBe('ada@apex.com');

    await page.getByTestId('member-remove-0').click();
    await expect(page.getByTestId('member-name-0')).toHaveCount(0);
  });
});

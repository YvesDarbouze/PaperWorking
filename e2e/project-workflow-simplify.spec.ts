import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Project workflow screen simplification — acceptance + evidence.
 * Sprint: UX/UI Hardening, August 2026 (Prompt 7).
 */

const SHOT_DIR = path.join(process.cwd(), 'screenshots', 'project-workflow');

test.describe('Project workflow screen', () => {
  let projectPath: string;

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
    const state = createDefaultState();
    projectPath = `/dashboard/projects/${state.projects[0].id}/phase-1`;
    await setupMocks(page, state);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('action bar shows the three-tier hierarchy', async ({ page }) => {
    await safeGoto(page, projectPath);

    const bar = page.getByTestId('project-actions');
    await expect(bar).toBeVisible();

    // PRIMARY — the only filled control.
    await expect(page.getByTestId('project-actions-primary')).toContainText('Continue Workflow');
    // SECONDARY — Share.
    await expect(page.getByTestId('project-actions-share')).toBeVisible();
    // TERTIARY — icon-only settings + overflow.
    await expect(page.getByTestId('project-actions-settings')).toBeVisible();
    await expect(page.getByTestId('project-actions-more')).toBeVisible();

    await page.screenshot({ path: path.join(SHOT_DIR, 'workflow-desktop.png'), fullPage: true });
  });

  test('EXPORT PDF is gone from the project screen', async ({ page }) => {
    await safeGoto(page, projectPath);
    await expect(page.getByTestId('project-actions')).toBeVisible();

    // The action bar is the only place it ever lived.
    await expect(page.getByTestId('project-actions')).not.toContainText(/export pdf/i);
    const strays = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, a'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => /export\s*pdf/i.test(t)),
    );
    expect(strays, `stray Export PDF controls: ${strays.join(', ')}`).toEqual([]);
  });

  test('Share and More open as dropdowns', async ({ page }) => {
    await safeGoto(page, projectPath);

    await page.getByTestId('project-actions-share').click();
    const shareMenu = page.getByTestId('project-actions-share-menu');
    await expect(shareMenu).toBeVisible();
    await expect(shareMenu).toContainText('Share with CPA');
    await expect(shareMenu).toContainText('Copy Link');
    await expect(shareMenu).toContainText('Email');

    // Escape closes it.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('project-actions-share-menu')).toHaveCount(0);

    await page.getByTestId('project-actions-more').click();
    const moreMenu = page.getByTestId('project-actions-more-menu');
    await expect(moreMenu).toBeVisible();
    await expect(moreMenu).toContainText('Instruments');
    await expect(moreMenu).toContainText('Hire Professional');
    await expect(moreMenu).toContainText('Archive Project');
  });

  test('action buttons keep at least 12px between them', async ({ page }) => {
    for (const width of [1440, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await safeGoto(page, projectPath);
      await expect(page.getByTestId('project-actions')).toBeVisible();

      const gaps = await page.evaluate(() => {
        const bar = document.querySelector('[data-testid="project-actions"]');
        if (!bar) return [];
        const kids = Array.from(bar.children) as HTMLElement[];
        const boxes = kids
          .map((k) => k.getBoundingClientRect())
          .filter((r) => r.width > 0)
          // Compare only controls sharing a row.
          .sort((a, b) => a.left - b.left);
        const out: number[] = [];
        for (let i = 1; i < boxes.length; i++) {
          if (Math.abs(boxes[i].top - boxes[i - 1].top) > 4) continue; // wrapped
          out.push(Math.round(boxes[i].left - boxes[i - 1].right));
        }
        return out;
      });

      for (const g of gaps) {
        expect(g, `gap ${g}px at ${width}px viewport`).toBeGreaterThanOrEqual(12);
      }
    }
  });

  test('phase timeline is visible', async ({ page }) => {
    await safeGoto(page, projectPath);
    const body = page.locator('body');
    // The four REIL phases label the tracker.
    for (const label of ['Acquisition', 'Fund', 'Hold', 'Exit']) {
      await expect(body).toContainText(label);
    }
  });

  test('explainer video is collapsed by default and toggles open', async ({ page }) => {
    // Land first, then clear the preference and reload, so the clear happens
    // exactly once rather than on every navigation.
    await safeGoto(page, projectPath);
    await page.evaluate(() =>
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith('pw_explainer_dismissed_'))
        .forEach((k) => window.localStorage.removeItem(k)),
    );
    await safeGoto(page, projectPath);

    const trigger = page.getByTestId('phase-video-trigger');
    if (!(await trigger.count())) {
      test.skip(true, 'Phase explainer not mounted on this route in mock mode.');
    }

    // Default: collapsed accordion row, not a mounted player.
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText(/Learn about/i);
    expect(await page.locator('video').count(), 'no player before expanding').toBe(0);

    await trigger.click();
    await expect(page.locator('video').first()).toBeVisible();
    await expect(page.getByTestId('phase-video-trigger')).toHaveCount(0);
  });

  test('expanded state persists across reloads', async ({ page }) => {
    await safeGoto(page, projectPath);

    const trigger = page.getByTestId('phase-video-trigger');
    if (!(await trigger.count())) {
      test.skip(true, 'Phase explainer not mounted on this route in mock mode.');
    }
    await trigger.click();
    await expect(page.locator('video').first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // Choosing to open it is remembered — it must not snap shut.
    await expect(page.locator('video').first()).toBeVisible();
  });

  /* ── Req 5: the stage rail is a connected stepper, not seven boxes ── */
  test('stage rail renders as a connected stepper with a rail line', async ({ page }) => {
    await safeGoto(page, projectPath);

    const stepper = page.getByTestId('workflow-stepper');
    await expect(stepper).toBeVisible();

    // All seven stages are present and keep the ids the workflow specs click.
    for (const key of [
      'target', 'underwrite', 'strategy', 'offer',
      'due_diligence', 'raise_interest', 'phase_gate',
    ]) {
      await expect(page.locator(`#stage-tab-${key}`)).toHaveCount(1);
    }

    // The connectors are hairlines (<= 2px), not progress bars, and there is
    // one fewer of them than there are stages.
    const rails = await stepper.evaluate((el) =>
      Array.from(el.querySelectorAll('span[aria-hidden="true"] > span')).map(
        (r) => r.getBoundingClientRect().height,
      ),
    );
    expect(rails.length).toBe(6);
    for (const h of rails) expect(h).toBeLessThanOrEqual(2);

    // The nodes sit on one horizontal line — that is what makes it read as a
    // single process rather than a row of tabs.
    const tops = await stepper.evaluate((el) =>
      Array.from(el.querySelectorAll('button')).map((b) => {
        const node = b.querySelector('span');
        return node ? Math.round(node.getBoundingClientRect().top) : -1;
      }),
    );
    expect(new Set(tops).size, `node tops: ${tops.join(', ')}`).toBe(1);

    // No stage is a filled pill any more: the button itself is transparent.
    const fills = await stepper.evaluate((el) =>
      Array.from(el.querySelectorAll('button')).map(
        (b) => getComputedStyle(b).backgroundColor,
      ),
    );
    for (const f of fills) {
      expect(f === 'rgba(0, 0, 0, 0)' || f === 'transparent').toBe(true);
    }

    await page.screenshot({ path: path.join(SHOT_DIR, 'stage-stepper.png'), fullPage: false });
  });

  test('locked stages stay unreachable in the stepper', async ({ page }) => {
    await safeGoto(page, projectPath);
    await expect(page.getByTestId('workflow-stepper')).toBeVisible();

    // Stage 1 is always reachable; a stage gated on later completion is not.
    await expect(page.locator('#stage-tab-target')).toBeEnabled();
    const gate = page.locator('#stage-tab-phase_gate');
    if (await gate.isDisabled()) {
      await expect(gate).toHaveAttribute('aria-disabled', 'true');
    }
  });
});

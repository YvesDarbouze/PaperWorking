import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Pepper AI Onboarding Copilot & Lifecycle E2E Journey (§11.4)', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies to simulate a fresh session
    await context.clearCookies();
    await createDevSessionForContext(context, 'investor');
  });

  // Test 1
  test('idle pulse → drawer with chips → intent builds a real skeleton in split view → auto-minimize', async ({ page }) => {
    await page.goto('/dashboard');

    // 1. Idle pulse bubble appears
    const pulseBubble = page.locator('[data-testid="ava-pulse-bubble"]');
    await expect(pulseBubble).toBeVisible({ timeout: 10_000 });
    await expect(pulseBubble).toContainText('What are we building today? Let me set up your workspace.');

    // 2. Open drawer from pulse button
    await page.locator('[data-testid="open-from-pulse-button"]').click();
    const drawer = page.locator('[data-testid="ava-drawer-container"]');
    await expect(drawer).toBeVisible();

    // 3. Categorized prompt chips visible
    const chipsContainer = page.locator('[data-testid="intent-chips-container"]');
    await expect(chipsContainer).toBeVisible();
    await expect(page.locator('[data-testid="prompt-chip-analyze_deal"]')).toBeVisible();

    // 4. Intent chip builds skeleton deal in split view
    await page.locator('[data-testid="prompt-chip-analyze_deal"]').click();
    const splitCard = page.locator('[data-testid="split-view-narration-card"]');
    await expect(splitCard).toBeVisible({ timeout: 10_000 });
    await expect(splitCard).toContainText('Real Workspace Build');

    // 5. Auto-minimizes to pill upon completion
    const minimizedPill = page.locator('[data-testid="ava-minimized-pill"]');
    await expect(minimizedPill).toBeVisible({ timeout: 15_000 });
  });

  // Test 2
  test('ghost text triggers on a simulated stall (idle on a complex modal), Tab accepts, any other key dismisses', async ({ page }) => {
    await page.goto('/dashboard');

    // Simulate idle stall on a complex modal / form
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('pw:assistant:stall', {
          detail: { hint: 'Try analyzing 1247 Elm Street Duplex with $485k purchase price' },
        }),
      );
    });

    const ghostCopilot = page.locator('[data-testid="ava-ghost-copilot"]');
    await expect(ghostCopilot).toBeVisible({ timeout: 5_000 });
    await expect(ghostCopilot).toContainText('Try analyzing 1247 Elm Street Duplex');

    // Test dismissal with any other key (e.g., 'Escape')
    await page.keyboard.press('Escape');
    await expect(ghostCopilot).not.toBeVisible();

    // Trigger simulated stall again
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('pw:assistant:stall', {
          detail: { hint: 'Try analyzing 1247 Elm Street Duplex with $485k purchase price' },
        }),
      );
    });
    await expect(ghostCopilot).toBeVisible({ timeout: 5_000 });

    // Test Tab acceptance
    await page.keyboard.press('Tab');
    await expect(ghostCopilot).not.toBeVisible();
  });

  // Test 3
  test('bailout works at every phase', async ({ page }) => {
    await page.goto('/dashboard');

    // Phase 1 bailout: dismiss pulse bubble
    const pulseBubble = page.locator('[data-testid="ava-pulse-bubble"]');
    await expect(pulseBubble).toBeVisible({ timeout: 10_000 });
    const dismissPulseBtn = page.locator('[data-testid="dismiss-pulse-button"]');
    await dismissPulseBtn.click();
    await expect(pulseBubble).not.toBeVisible();

    // Phase 2 bailout: open drawer, then click "Skip AI & Explore Manually"
    const launcher = page.locator('[data-testid="ava-launcher-bubble"]');
    await launcher.click();
    const drawer = page.locator('[data-testid="ava-drawer-container"]');
    await expect(drawer).toBeVisible();

    const bailoutBtn = page.locator('[data-testid="bailout-manual-button"]');
    await expect(bailoutBtn).toBeVisible();
    await bailoutBtn.click();
    await expect(drawer).not.toBeVisible();
    await expect(page.locator('[data-testid="ava-minimized-pill"]')).toBeVisible();

    // Phase 3 bailout: re-open from pill, click chip, then bailout during split view
    await page.locator('[data-testid="ava-minimized-pill"]').click();
    await expect(drawer).toBeVisible();
    await page.locator('[data-testid="prompt-chip-switch_spreadsheets"]').click();
    await expect(bailoutBtn).toBeVisible();
    await bailoutBtn.click();
    await expect(drawer).not.toBeVisible();
    await expect(page.locator('[data-testid="ava-minimized-pill"]')).toBeVisible();

    // Phase 4 bailout: dismiss ghost copilot via close button
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('pw:assistant:stall', {
          detail: { hint: 'Optional copilot suggestion' },
        }),
      );
    });
    const ghost = page.locator('[data-testid="ava-ghost-copilot"]');
    await expect(ghost).toBeVisible();
    await page.locator('[data-testid="dismiss-ghost-button"]').click();
    await expect(ghost).not.toBeVisible();
  });

  // Test 4
  test('callback flow dispatches both emails (internal notification with transcript + user receipt)', async ({ page }) => {
    await page.goto('/dashboard');

    const launcher = page.locator('[data-testid="ava-launcher-bubble"]');
    if (await launcher.isVisible()) {
      await launcher.click();
    } else {
      await page.locator('[data-testid="open-from-pulse-button"]').click();
    }

    // Switch to Support / Escalation tab
    await page.locator('[data-testid="tab-escalation"]').click();
    await expect(page.locator('[data-testid="escalation-tab-panel"]')).toBeVisible();

    // Listen for callback API response
    const callbackResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/assistant/callback') && res.request().method() === 'POST',
    );

    // Submit callback request
    await page.locator('[data-testid="callback-name-input"]').fill('Taylor Closing Desk');
    await page.locator('[data-testid="callback-phone-input"]').fill('(555) 234-5678');
    await page.locator('[data-testid="callback-email-input"]').fill('taylor@dealclosing.com');
    await page.locator('[data-testid="submit-callback-button"]').click();

    const callbackResponse = await callbackResponsePromise;
    expect(callbackResponse.status()).toBe(200);
    const body = await callbackResponse.json();
    expect(body.success).toBe(true);
    // Invariant: Both user receipt and team notification emails were dispatched
    expect(body.emailsDispatched).toBe(2);

    await expect(page.locator('[data-testid="callback-status-message"]')).toContainText('Callback registered');
  });

  // Test 5
  test('bug-report path attaches route + error context and is consent-gated', async ({ page }) => {
    await page.goto('/dashboard');

    const launcher = page.locator('[data-testid="ava-launcher-bubble"]');
    if (await launcher.isVisible()) {
      await launcher.click();
    } else {
      await page.locator('[data-testid="open-from-pulse-button"]').click();
    }

    // Navigate to Community Feedback tab
    await page.locator('[data-testid="tab-feedback"]').click();
    await expect(page.locator('[data-testid="feedback-tab-panel"]')).toBeVisible();

    // Select "Bug"
    await page.locator('[data-testid="feedback-type-bug"]').click();
    const consentCheckbox = page.locator('[data-testid="consent-diagnostics-checkbox"]');
    await expect(consentCheckbox).toBeVisible();
    await expect(consentCheckbox).not.toBeChecked();

    // CASE 1: Consent NOT granted -> route and errorContext MUST NOT be attached
    let interceptedRequest: any = null;
    page.on('request', (req) => {
      if (req.url().includes('/api/assistant/feedback') && req.method() === 'POST') {
        interceptedRequest = req.postDataJSON();
      }
    });

    await page.locator('[data-testid="feedback-title-input"]').fill('Rendering artifact on chart');
    await page.locator('[data-testid="feedback-desc-input"]').fill('Line chart overlaps the KPI container.');
    await page.locator('[data-testid="submit-feedback-button"]').click();

    await expect(page.locator('[data-testid="feedback-status-message"]')).toContainText('Feedback sent successfully');
    expect(interceptedRequest).toBeDefined();
    expect(interceptedRequest.kind).toBe('bug');
    expect(interceptedRequest.route).toBeFalsy();
    expect(interceptedRequest.errorContext).toBeFalsy();

    // CASE 2: Consent IS granted -> route and errorContext MUST be attached
    await page.locator('[data-testid="feedback-type-bug"]').click();
    await consentCheckbox.check();
    await expect(consentCheckbox).toBeChecked();

    await page.locator('[data-testid="feedback-title-input"]').fill('Uncaught syntax error in export');
    await page.locator('[data-testid="feedback-desc-input"]').fill('Clicking export fails on Schedule E.');
    await page.locator('[data-testid="submit-feedback-button"]').click();

    await expect(page.locator('[data-testid="feedback-status-message"]')).toContainText('Feedback sent successfully');
    expect(interceptedRequest.route).toBe('/dashboard');
    expect(interceptedRequest.errorContext).toContain('UserAgent:');
  });

  // Test 6
  test('feature-request gating (subscriber only, graceful upsell otherwise)', async ({ context, page }) => {
    // Part A: Non-subscriber (vendor or guest)
    await context.clearCookies();
    await createDevSessionForContext(context, 'vendor');
    await page.goto('/dashboard');

    let launcher = page.locator('[data-testid="ava-launcher-bubble"]');
    if (await launcher.isVisible()) {
      await launcher.click();
    } else {
      await page.locator('[data-testid="open-from-pulse-button"]').click();
    }

    await page.locator('[data-testid="tab-feedback"]').click();
    await page.locator('[data-testid="feedback-type-feature_request"]').click();
    await page.locator('[data-testid="feedback-title-input"]').fill('Syndication Portal Export');
    await page.locator('[data-testid="feedback-desc-input"]').fill('Export deal packets directly to LP portal.');
    await page.locator('[data-testid="submit-feedback-button"]').click();

    // Invariant: Non-subscribers get graceful upsell banner, not a crash
    const upsellBanner = page.locator('[data-testid="feedback-upsell-banner"]');
    await expect(upsellBanner).toBeVisible();
    await expect(upsellBanner).toContainText('Subscribers Only Feature');
    await expect(upsellBanner.locator('a[href="/pricing"]')).toBeVisible();

    // Part B: Subscriber (Investor tier with active trial/subscription)
    await context.clearCookies();
    await createDevSessionForContext(context, 'investor');
    await page.goto('/dashboard');

    launcher = page.locator('[data-testid="ava-launcher-bubble"]');
    if (await launcher.isVisible()) {
      await launcher.click();
    } else {
      await page.locator('[data-testid="open-from-pulse-button"]').click();
    }

    await page.locator('[data-testid="tab-feedback"]').click();
    await page.locator('[data-testid="feedback-type-feature_request"]').click();
    await page.locator('[data-testid="feedback-title-input"]').fill('Automated Waterfall Distribution');
    await page.locator('[data-testid="feedback-desc-input"]').fill('Multi-tier promote waterfall calculations.');
    await page.locator('[data-testid="submit-feedback-button"]').click();

    // Invariant: Subscriber feature request succeeds and displays confirmation
    await expect(page.locator('[data-testid="feedback-status-message"]')).toContainText('Feedback sent successfully');
  });

  // Test 7
  test('tier-aware escalation: an Investor user is never offered the priority line; an Investment Team user with urgency language gets priority routing', async ({ context, page }) => {
    // Part A: Investor user — Invariant: NEVER offered priority line
    await context.clearCookies();
    await createDevSessionForContext(context, 'investor');
    await page.goto('/dashboard');

    let launcher = page.locator('[data-testid="ava-launcher-bubble"]');
    if (await launcher.isVisible()) {
      await launcher.click();
    } else {
      await page.locator('[data-testid="open-from-pulse-button"]').click();
    }

    await page.locator('[data-testid="tab-escalation"]').click();
    await expect(page.locator('[data-testid="escalation-tab-panel"]')).toBeVisible();

    // Invariant: Priority line channel must NEVER be displayed for Investor tier
    await expect(page.locator('[data-testid="escalation-channel-priority_line"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="escalation-channel-email"]')).toBeVisible();

    // Part B: Investment Team user with urgency language gets priority routing
    await context.clearCookies();
    await createDevSessionForContext(context, 'investment_team');
    await page.goto('/dashboard');

    launcher = page.locator('[data-testid="ava-launcher-bubble"]');
    if (await launcher.isVisible()) {
      await launcher.click();
    } else {
      await page.locator('[data-testid="open-from-pulse-button"]').click();
    }

    // Type urgent mid-closing message in chat
    const chatInput = page.locator('[data-testid="assistant-chat-input"]');
    await chatInput.fill('URGENT: I am mid-closing and wiring funds today, need help!');
    await page.locator('[data-testid="send-message-button"]').click();

    await expect(page.locator('[data-testid="message-user"]').last()).toContainText('mid-closing');

    // Switch to Support tab
    await page.locator('[data-testid="tab-escalation"]').click();

    // Invariant: Investment Team user has access to priority line, flagged as urgent
    const priorityChannel = page.locator('[data-testid="escalation-channel-priority_line"]');
    await expect(priorityChannel).toBeVisible();
    await expect(priorityChannel).toContainText('Emergency Priority Line');
  });

  // Test 8
  test('no autoscroll hijack while scrolled up mid-stream', async ({ page }) => {
    await page.goto('/dashboard');

    const launcher = page.locator('[data-testid="ava-launcher-bubble"]');
    if (await launcher.isVisible()) {
      await launcher.click();
    } else {
      await page.locator('[data-testid="open-from-pulse-button"]').click();
    }

    const scrollContainer = page.locator('[data-testid="messages-scroll-container"]');
    await expect(scrollContainer).toBeVisible();

    // Send first query
    const chatInput = page.locator('[data-testid="assistant-chat-input"]');
    await chatInput.fill('What is your pricing?');
    await page.locator('[data-testid="send-message-button"]').click();

    // Wait for response
    await expect(page.locator('[data-testid="message-assistant"]').first()).toBeVisible({ timeout: 10_000 });

    // Scroll up in the container to simulate reading earlier messages
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 0;
    });

    // Send another query while scrolled up
    await chatInput.fill('Tell me about the 4 phases');
    await page.locator('[data-testid="send-message-button"]').click();

    // Invariant: User viewport is NOT hijacked; jump button appears
    const jumpBtn = page.locator('[data-testid="jump-to-bottom-button"]');
    await expect(jumpBtn).toBeVisible({ timeout: 10_000 });
    await expect(jumpBtn).toContainText('New messages');

    // Click jump button to restore bottom alignment (force: true bypasses continuous animate-bounce motion)
    await jumpBtn.click({ force: true });
    await expect(jumpBtn).not.toBeVisible();
  });
});

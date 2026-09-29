import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/b823e882-4415-4439-893a-38927c3aab61';
const BASE_URL = 'http://localhost:3000';

async function runBrowserVerification() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  console.log('Launching Chromium for Chatbot verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Launcher FAB with Alternating Badge (1280x800)
    console.log('1. Testing Desktop Launcher FAB...');
    const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, '01-launcher-desktop.png'),
      fullPage: false,
    });
    console.log('Saved 01-launcher-desktop.png');

    // 2. Open Chatbot Drawer
    console.log('2. Opening Chatbot Drawer on Desktop...');
    const launcherButton = desktopPage.locator('[data-testid="ava-launcher-bubble"]');
    await launcherButton.click();
    await desktopPage.waitForSelector('[data-testid="ava-drawer-container"]', { state: 'visible' });
    await desktopPage.waitForTimeout(600);

    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, '02-chatbot-drawer-welcome.png'),
      fullPage: false,
    });
    console.log('Saved 02-chatbot-drawer-welcome.png');

    // 3. Conversational Bug Report Flow
    console.log('3. Testing Conversational Bug Report Flow...');
    const reportBugChip = desktopPage.getByRole('button', { name: /Report a Bug/i });
    await reportBugChip.click();
    await desktopPage.waitForTimeout(500);

    const chatInput = desktopPage.locator('[data-testid="assistant-chat-input"]');
    await chatInput.fill('The Deal Calculator cap rate on Elm Street duplex does not recalculate after changing loan APR.');
    const sendButton = desktopPage.locator('[data-testid="send-message-button"]');
    await sendButton.click();
    await desktopPage.waitForTimeout(800);

    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, '03-chatbot-bug-triage-card.png'),
      fullPage: false,
    });
    console.log('Saved 03-chatbot-bug-triage-card.png');

    // 4. Conversational Feature Request Flow
    console.log('4. Testing Conversational Feature Request Flow...');
    // Click back to starter options
    const backBtn = desktopPage.getByRole('button', { name: /Back/i });
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await desktopPage.waitForTimeout(400);
    }

    const featureReqChip = desktopPage.getByRole('button', { name: /Feature Request/i });
    await featureReqChip.click();
    await desktopPage.waitForTimeout(400);

    await chatInput.fill('Automated 1031 Exchange escrow clock tracker with 45-day identification alerts and CPA export.');
    await sendButton.click();
    await desktopPage.waitForTimeout(800);

    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, '04-chatbot-feature-dinner-card.png'),
      fullPage: false,
    });
    console.log('Saved 04-chatbot-feature-dinner-card.png');

    // 5. Mobile Responsiveness View (375x812)
    console.log('5. Testing Mobile Viewport (375x812)...');
    const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    const mobileLauncher = mobilePage.locator('[data-testid="ava-launcher-bubble"]');
    await mobileLauncher.click();
    await mobilePage.waitForSelector('[data-testid="ava-drawer-container"]', { state: 'visible' });
    await mobilePage.waitForTimeout(600);

    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, '05-chatbot-mobile-drawer.png'),
      fullPage: false,
    });
    console.log('Saved 05-chatbot-mobile-drawer.png');

    console.log('Browser verification completed successfully!');
  } finally {
    await browser.close();
  }
}

runBrowserVerification().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});

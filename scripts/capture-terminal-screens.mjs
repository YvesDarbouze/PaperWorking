import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/ad6468c7-7cd1-4b82-b77a-da6d5866895f';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');
const HTML_FILE = path.join(ARTIFACT_DIR, 'scratch', 'terminal_preview.html');

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile First Viewport: iPhone 14 / Mobile standard (390 x 844)
  console.log('Capturing Mobile Terminal Screen (Mobile First)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`file://${HTML_FILE}`, { waitUntil: 'load' });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({
    path: path.join(SCREENSHOT_DIR, '01_mobile_dashboard_command_terminal.png'),
    fullPage: true,
  });
  await mobileContext.close();

  // 2. Desktop Standard Viewport: 1440 x 900
  console.log('Capturing Desktop Terminal Screen (1440 x 900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(`file://${HTML_FILE}`, { waitUntil: 'load' });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({
    path: path.join(SCREENSHOT_DIR, '02_desktop_dashboard_command_terminal.png'),
    fullPage: true,
  });

  // 3. Desktop High-Density Viewport: Full HD (1920 x 1080)
  console.log('Capturing Desktop Full HD Terminal Screen (1920 x 1080)...');
  const fhdContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  const fhdPage = await fhdContext.newPage();
  await fhdPage.goto(`file://${HTML_FILE}`, { waitUntil: 'load' });
  await fhdPage.waitForTimeout(1000);
  await fhdPage.screenshot({
    path: path.join(SCREENSHOT_DIR, '03_desktop_fhd_command_terminal.png'),
    fullPage: true,
  });

  await fhdContext.close();
  await desktopContext.close();
  await browser.close();
  console.log('Successfully captured all Mobile First and Desktop institutional terminal screenshots!');
}

main().catch((err) => {
  console.error('Failed to capture terminal screenshots:', err);
  process.exit(1);
});

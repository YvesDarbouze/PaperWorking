import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'ux3_artifacts');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const prefix = process.argv[2] || 'after';

async function recordUX3Evidence() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: {
      cookies: [
        { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
        { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      ],
      origins: [],
    },
  });

  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Command Center Toolbar
  await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${prefix}_command_center_toolbar.png`) });

  const ccBoxModel = await page.evaluate(() => {
    const btnGroup = document.querySelector('.gap-btn-gap-related, [class*="gap-"]') || document.body;
    const btn = document.querySelector('button') || document.body;
    return {
      groupGap: window.getComputedStyle(btnGroup).gap,
      btnHeight: window.getComputedStyle(btn).height,
      btnWidth: window.getComputedStyle(btn).width,
      btnMinHeight: window.getComputedStyle(btn).minHeight,
    };
  });

  // 2. Hold Workspace Toolbar
  await page.goto('http://localhost:3000/dashboard/projects/demo/phase-3', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${prefix}_hold_workspace_toolbar.png`) });

  const holdBoxModel = await page.evaluate(() => {
    const btnGroup = document.querySelector('.gap-btn-gap-unrelated, [class*="gap-"]') || document.body;
    const btn = document.querySelector('button') || document.body;
    return {
      groupGap: window.getComputedStyle(btnGroup).gap,
      btnHeight: window.getComputedStyle(btn).height,
      btnWidth: window.getComputedStyle(btn).width,
    };
  });

  const report = { commandCenter: ccBoxModel, holdWorkspace: holdBoxModel };
  console.log(`UX-3 Box-model report (${prefix}):`, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, `${prefix}_box_model_report.json`), JSON.stringify(report, null, 2));

  await browser.close();
}

recordUX3Evidence().catch(err => {
  console.error(err);
  process.exit(1);
});

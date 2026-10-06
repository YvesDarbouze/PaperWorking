import { chromium } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import email template generators from apps/web
import {
  renderWelcomeEmailHtml,
  renderPasswordResetEmailHtml,
  renderUnsubscribeEmailHtml,
} from '../apps/web/lib/email/templates/index.js';
import { renderDealBroadcastHtml } from '../apps/web/lib/email/dealBroadcast.js';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/575d8b8e-0d10-424c-a458-6bd2744bd8cc';
const SCRATCH_DIR = path.join(ARTIFACT_DIR, 'scratch');

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

// 1. Generate HTML contents
const welcomeHtml = renderWelcomeEmailHtml({
  recipientName: 'Sarah Jenkins',
  recipientEmail: 'sarah@beaconinvest.test',
  appUrl: 'https://paperworking.co',
});

const resetHtml = renderPasswordResetEmailHtml({
  recipientEmail: 'sarah@beaconinvest.test',
  resetUrl: 'https://paperworking.co/auth/reset-password?token=sec_pw_token_998124&email=sarah%40beaconinvest.test',
  expiresInMinutes: 60,
});

const unsubHtml = renderUnsubscribeEmailHtml({
  recipientEmail: 'sarah@beaconinvest.test',
  recipientName: 'Sarah Jenkins',
  resubscribeUrl: 'https://paperworking.co/unsubscribe?action=resubscribe&email=sarah%40beaconinvest.test',
});

const dealBroadcastHtml = renderDealBroadcastHtml({
  dealName: 'Oakridge Luxury Apartments',
  dealAddress: '1240 Oakridge Lane, Austin TX',
  dealSlug: 'oakridge-apt',
  purchasePrice: 2450000,
  projectedRoi: 18.5,
  senderName: 'Marcus Cole',
  senderEmail: 'marcus@apexcap.internal',
  subject: 'Underwriting Analysis: Oakridge Luxury Apartments',
  message: 'Reviewing this 24-unit value-add opportunity with 18.5% projected ROI.',
  token: 'broadcast_tok_123',
});

// Write to scratch
const files = [
  { name: 'welcome-email.html', content: welcomeHtml },
  { name: 'password-reset-email.html', content: resetHtml },
  { name: 'unsubscribe-email.html', content: unsubHtml },
  { name: 'deal-broadcast-email.html', content: dealBroadcastHtml },
];

for (const f of files) {
  fs.writeFileSync(path.join(SCRATCH_DIR, f.name), f.content, 'utf8');
}
console.log('Generated HTML preview files in scratch directory.');

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });

  const templates = [
    { file: 'welcome-email.html', prefix: '01_welcome_email' },
    { file: 'password-reset-email.html', prefix: '02_password_reset_email' },
    { file: 'unsubscribe-email.html', prefix: '03_unsubscribe_email' },
    { file: 'deal-broadcast-email.html', prefix: '04_deal_broadcast_email' },
  ];

  for (const t of templates) {
    const filePath = `file://${path.join(SCRATCH_DIR, t.file)}`;

    // Desktop capture (700px email container centered on 1200px viewport)
    const desktopContext = await browser.newContext({
      viewport: { width: 1200, height: 900 },
      deviceScaleFactor: 2,
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(filePath, { waitUntil: 'load' });
    await desktopPage.waitForTimeout(300);
    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, `${t.prefix}_desktop.png`),
      fullPage: true,
    });
    await desktopContext.close();

    // Mobile capture (390px iPhone standard viewport)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(filePath, { waitUntil: 'load' });
    await mobilePage.waitForTimeout(300);
    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, `${t.prefix}_mobile.png`),
      fullPage: true,
    });
    await mobileContext.close();

    console.log(`Captured desktop & mobile screenshots for ${t.file}`);
  }

  await browser.close();
  console.log('All email screenshots captured successfully!');
}

captureScreenshots().catch((err) => {
  console.error('Error capturing email screenshots:', err);
  process.exit(1);
});

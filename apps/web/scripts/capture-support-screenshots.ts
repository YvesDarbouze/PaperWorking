import { chromium } from 'playwright';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';
const BASE_URL = 'http://localhost:3000';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Screenshot (1280x900)
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktopPage.goto(`${BASE_URL}/support`, { waitUntil: 'networkidle' });
  await desktopPage.screenshot({
    path: path.join(ARTIFACT_DIR, 'support-desktop-1280.png'),
    fullPage: false,
  });
  console.log('Saved support-desktop-1280.png');

  // 2. Mobile Screenshot (375x812)
  const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobilePage.goto(`${BASE_URL}/support`, { waitUntil: 'networkidle' });
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, 'support-mobile-375.png'),
    fullPage: false,
  });
  console.log('Saved support-mobile-375.png');

  // 3. Pepper Chat Interactive Grounding Screenshot
  const pepperPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await pepperPage.goto(`${BASE_URL}/support#pepper`, { waitUntil: 'networkidle' });
  const pepperInput = pepperPage.locator('input[placeholder="Ask Pepper anything…"]');
  await pepperInput.fill('How does a Project workspace in PaperWorking differ from generic task managers?');
  await pepperPage.locator('#pepper button[type="submit"]').click();
  // Wait for response stream
  await pepperPage.waitForTimeout(2000);
  await pepperPage.screenshot({
    path: path.join(ARTIFACT_DIR, 'support-pepper-grounded.png'),
    fullPage: false,
  });
  console.log('Saved support-pepper-grounded.png');

  // 4. Live Edit Proof Screenshot (No Redeploy)
  // We PATCH the FAQ entry live with verified Admin Bearer token
  const LIVE_NOTICE = 'LIVE NO-REDEPLOY PROOF: Synced from Cloud Firestore support_faq collection!';
  await fetch(`${BASE_URL}/api/support/faq`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-admin-token',
    },
    body: JSON.stringify({
      id: 'faq-projects',
      answer: LIVE_NOTICE,
    }),
  });

  // Reload page to show dynamic SSR pick-up of Firestore doc without redeploy
  const liveEditPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await liveEditPage.goto(`${BASE_URL}/support#faq`, { waitUntil: 'networkidle' });
  // Click the faq-projects button to expand it if not open
  const faqBtn = liveEditPage.getByRole('button', { name: /How does a Project workspace in PaperWorking differ/i });
  await faqBtn.click();
  await liveEditPage.waitForTimeout(500);
  await liveEditPage.screenshot({
    path: path.join(ARTIFACT_DIR, 'support-live-edit-proof.png'),
    fullPage: false,
  });
  console.log('Saved support-live-edit-proof.png');

  // Revert back to canonical
  await fetch(`${BASE_URL}/api/support/faq`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-admin-token',
    },
    body: JSON.stringify({
      id: 'faq-projects',
      answer:
        'Unlike generic project managers, every PaperWorking Project is organized around the Real Estate Investment Lifecycle (REIL). Each project links contingency deadlines directly to earnest money release dates, maps contractor draw milestones to your rehabilitation budget, and automatically converts daily operational expense entries into institutional KPIs and tax-ready Schedule E ledgers.',
    }),
  });
  console.log('Reverted FAQ to canonical text.');

  await browser.close();
}

captureScreenshots().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});

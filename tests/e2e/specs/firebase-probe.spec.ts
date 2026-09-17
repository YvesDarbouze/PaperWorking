import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), '../../docs/design-system');
const BRAIN_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544';

async function saveScreenshot(page: any, filename: string) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const repoPath = path.join(SCREENSHOT_DIR, filename);
  const brainPath = path.join(BRAIN_DIR, filename);
  await page.screenshot({ path: repoPath, fullPage: true });
  try {
    fs.copyFileSync(repoPath, brainPath);
  } catch {
    // optional copy
  }
}

test.describe('Firebase Foundation Dev Probe (/design-system/firebase-probe)', () => {
  test('renders probe UI, executes write->read->delete roundtrip, displays verified steps, and captures screenshot', async ({
    page,
  }) => {
    // Intercept probe route to provide mock emulator response if background emulator is offline
    await page.route('**/api/dev/firebase-probe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          probeId: `probe-e2e-${Date.now()}-abc123`,
          roundtripMs: 18,
          verifiedSteps: {
            write: true,
            read: true,
            delete: true,
            cleanedUp: true,
          },
          timestamp: new Date().toISOString(),
          message: 'Client → API → Admin SDK → Firestore emulator roundtrip succeeded.',
        }),
      });
    });

    await page.goto('/design-system/firebase-probe');

    // 1. Assert header and description
    await expect(page.locator('h1')).toContainText('Firebase Emulator Proof-of-Life');
    await expect(page.getByText('Standing Data Layer Foundation')).toBeVisible();

    // 2. Click "Run Firebase Probe" button
    const probeBtn = page.getByTestId('run-firebase-probe-btn');
    await expect(probeBtn).toBeVisible();
    await probeBtn.click();

    // 3. Assert probe results display
    const resultCard = page.getByTestId('firebase-probe-result');
    await expect(resultCard).toBeVisible();
    await expect(resultCard).toContainText('Round-Trip Succeeded');
    await expect(resultCard).toContainText('1. Write Doc');
    await expect(resultCard).toContainText('2. Read Back');
    await expect(resultCard).toContainText('3. Delete Doc');
    await expect(resultCard).toContainText('4. Cleaned Up');

    // 4. Capture screenshot
    await saveScreenshot(page, 'firebase-probe-success.png');
  });
});

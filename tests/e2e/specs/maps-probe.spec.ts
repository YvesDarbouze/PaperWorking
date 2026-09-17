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

test.describe('Google Maps & Places Diagnostics Probe (/design-system/maps-probe)', () => {
  test('renders diagnostics probe UI, executes missing-key diagnostic, verifies mock success roundtrip, and saves screenshot', async ({
    page,
  }) => {
    // Intercept probe route to return mock successful 4-step diagnostic
    await page.route('**/api/dev/maps-probe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          keyConfigured: true,
          maskedKey: 'AIzaSy…9012',
          steps: {
            scriptLoad: {
              step: 1,
              name: 'Maps JS Script & API Key Validation',
              status: 'passed',
              latencyMs: 14,
              details: { keyLength: 39, keyPrefix: 'AIzaSy' },
            },
            placesAutocomplete: {
              step: 2,
              name: 'Places AutocompleteService',
              status: 'passed',
              latencyMs: 42,
              details: { predictionCount: 5, topMatch: '1247 Elm Street, Austin, TX, USA', placeId: 'ChIJ...test' },
            },
            geocoding: {
              step: 3,
              name: 'Geocoding API',
              status: 'passed',
              latencyMs: 38,
              details: {
                formattedAddress: '1247 Elm St, Austin, TX 78702, USA',
                coordinates: { lat: 30.2781, lng: -97.7184 },
              },
            },
            streetViewAndStaticMaps: {
              step: 4,
              name: 'Street View Metadata & Static Maps',
              status: 'passed',
              latencyMs: 55,
              details: { staticMapsHttpStatus: 200, streetViewStatus: 'OK', panoId: 'pano-test-123' },
            },
          },
        }),
      });
    });

    await page.goto('/design-system/maps-probe');

    // 1. Assert header and design tokens
    await expect(page.locator('h1')).toContainText('Google Maps & Places Diagnostics Probe');
    await expect(page.getByText('Diagnostic Proof-of-Life Harness')).toBeVisible();
    await expect(page.getByText('Google Cloud Console Configuration Checklist')).toBeVisible();

    // 2. Click "Run Maps Diagnostics Probe" button
    const probeBtn = page.getByTestId('run-maps-probe-btn');
    await expect(probeBtn).toBeVisible();
    await probeBtn.click();

    // 3. Assert probe results display
    const resultCard = page.getByTestId('maps-probe-result');
    await expect(resultCard).toBeVisible();
    await expect(resultCard).toContainText('All 4 Maps Integration Checks Passed');

    // 4. Assert all 4 step cards are rendered and passed
    await expect(page.getByTestId('step-script-load')).toContainText('PASSED');
    await expect(page.getByTestId('step-places-autocomplete')).toContainText('PASSED');
    await expect(page.getByTestId('step-geocoding')).toContainText('PASSED');
    await expect(page.getByTestId('step-streetview-static')).toContainText('PASSED');

    // 5. Capture screenshot of passed state
    await saveScreenshot(page, 'maps-probe.png');
  });

  test('renders missing-key diagnostic state with taxonomy guide and captures screenshot', async ({
    page,
  }) => {
    // Intercept probe route to return missing key diagnostic
    await page.route('**/api/dev/maps-probe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          timestamp: new Date().toISOString(),
          keyConfigured: false,
          maskedKey: null,
          overallError: 'No Google Maps API key configured. Autocomplete and static imagery disabled.',
          errorClassification: 'MissingKeyMapError',
          steps: {
            scriptLoad: {
              step: 1,
              name: 'Maps JS Script & API Key Validation',
              status: 'failed',
              latencyMs: 0,
              errorType: 'MissingKeyMapError',
              errorMessage: 'Neither NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nor GOOGLE_MAPS_API_KEY is present in environment.',
            },
            placesAutocomplete: {
              step: 2,
              name: 'Places AutocompleteService',
              status: 'skipped',
              latencyMs: 0,
              errorMessage: 'Skipped: Missing API key.',
            },
            geocoding: {
              step: 3,
              name: 'Geocoding API',
              status: 'skipped',
              latencyMs: 0,
              errorMessage: 'Skipped: Missing API key.',
            },
            streetViewAndStaticMaps: {
              step: 4,
              name: 'Street View Metadata & Static Maps',
              status: 'skipped',
              latencyMs: 0,
              errorMessage: 'Skipped: Missing API key.',
            },
          },
        }),
      });
    });

    await page.goto('/design-system/maps-probe');

    const probeBtn = page.getByTestId('run-maps-probe-btn');
    await expect(probeBtn).toBeVisible();
    await probeBtn.click();

    const resultCard = page.getByTestId('maps-probe-result');
    await expect(resultCard).toBeVisible();
    await expect(resultCard).toContainText('Maps Diagnostic Issues Detected');
    await expect(resultCard).toContainText('MissingKeyMapError');
    await expect(page.getByText('Remediation Guide: MissingKeyMapError')).toBeVisible();

    await saveScreenshot(page, 'maps-probe-missing-key.png');
  });
});

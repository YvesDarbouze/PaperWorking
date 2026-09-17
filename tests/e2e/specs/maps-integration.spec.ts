import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createDevSessionForContext } from '../helpers/auth.js';

// Visual SVGs for clear screenshot evidence in e2e tests
const STREET_VIEW_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a202c"/>
        <stop offset="60%" stop-color="#2d3748"/>
        <stop offset="100%" stop-color="#171923"/>
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#sky)"/>
    <path d="M0 320 Q200 280, 400 320 T800 320 L800 450 L0 450 Z" fill="#121014"/>
    <path d="M360 450 L390 320 L410 320 L440 450 Z" fill="#2d3748"/>
    <line x1="400" y1="330" x2="400" y2="440" stroke="#00DD94" stroke-width="4" stroke-dasharray="16 12"/>
    <rect x="24" y="24" width="260" height="40" rx="8" fill="rgba(0,0,0,0.75)" stroke="rgba(255,255,255,0.15)"/>
    <text x="38" y="49" fill="#00DD94" font-family="system-ui, sans-serif" font-size="14" font-weight="700">STREET VIEW STATIC (OK ≤50m)</text>
    <text x="400" y="225" fill="rgba(255,255,255,0.85)" font-family="system-ui, sans-serif" font-size="20" font-weight="600" text-anchor="middle">1247 Elm Street • Panorama Verified</text>
  </svg>`,
);

const MAP_TILE_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="#161318"/>
    <path d="M0 100 H800 M0 200 H800 M0 300 H800 M0 400 H800" stroke="#262329" stroke-width="2"/>
    <path d="M150 0 V450 M300 0 V450 M450 0 V450 M600 0 V450 M750 0 V450" stroke="#262329" stroke-width="2"/>
    <path d="M0 220 C200 240, 500 180, 800 230" stroke="#38333d" stroke-width="8" fill="none"/>
    <path d="M250 0 C280 200, 380 300, 420 450" stroke="#38333d" stroke-width="6" fill="none"/>
    <rect x="24" y="24" width="220" height="40" rx="8" fill="rgba(0,0,0,0.75)" stroke="rgba(255,255,255,0.15)"/>
    <text x="38" y="49" fill="#F06543" font-family="system-ui, sans-serif" font-size="14" font-weight="700">STATIC MAP TILE (ZOOM 17)</text>
    <circle cx="400" cy="225" r="14" fill="#00DD94" stroke="#ffffff" stroke-width="3"/>
    <circle cx="400" cy="225" r="4" fill="#121014"/>
    <text x="400" y="265" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="600" text-anchor="middle">30.2672° N, 97.7431° W</text>
  </svg>`,
);

const MOCK_DEAL_TIERS = [
  {
    id: 'deal-map-tier-1',
    slug: 'austin-tier-test',
    propertyName: 'Corridor Innovation Center',
    address: '1247 Elm Street, Austin, TX 78702',
    city: 'Austin',
    state: 'TX',
    lat: 30.2672,
    lng: -97.7431,
    assetClass: 'Multifamily',
    subStrategy: 'VALUE_ADD',
    status: 'funding',
    fundingTarget: 3200000,
    targetIrr: 19.2,
    equityMultiple: 1.85,
    minInvestment: 50000,
    isVerifiedOperator: true,
  },
];

test.describe('Google Maps & Places Integration Suite (Zero Cost / Full Network Stubbing)', () => {
  const screenshotsDir = path.resolve(process.cwd(), '../../docs/design-system/maps');
  const brainDir = path.resolve(
    process.env.HOME || '',
    '.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544',
  );

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ context, page }) => {
    await createDevSessionForContext(context, 'investor');

    // 1. Strict Network Stubbing: Intercept ALL calls to maps.googleapis.com
    await page.route('**/*maps.googleapis.com/*', async (route) => {
      const url = route.request().url();
      if (url.includes('/maps/api/js')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'window.google = window.google || { maps: { places: {} } };',
        });
      } else if (url.includes('/place/autocomplete/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'OK',
            predictions: [
              {
                place_id: 'place_austin_1247',
                description: '1247 Elm Street, Austin, TX 78702',
                structured_formatting: {
                  main_text: '1247 Elm Street',
                  secondary_text: 'Austin, TX 78702',
                },
              },
            ],
          }),
        });
      } else if (url.includes('/place/details/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'OK',
            result: {
              place_id: 'place_austin_1247',
              formatted_address: '1247 Elm Street, Austin, TX 78702, USA',
              geometry: { location: { lat: 30.2672, lng: -97.7431 } },
            },
          }),
        });
      } else if (url.includes('/streetview/metadata')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'OK', location: { lat: 30.2672, lng: -97.7431 } }),
        });
      } else if (url.includes('/streetview')) {
        await route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: STREET_VIEW_SVG,
        });
      } else if (url.includes('/staticmap')) {
        await route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: MAP_TILE_SVG,
        });
      } else {
        await route.fulfill({ status: 200, body: '' });
      }
    });

    // 2. Intercept internal places autocomplete backend proxy
    await page.route('**/api/places/autocomplete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          predictions: [
            {
              placeId: 'place_austin_1247',
              description: '1247 Elm Street, Austin, TX 78702',
              mainText: '1247 Elm Street',
              secondaryText: 'Austin, TX 78702',
            },
            {
              placeId: 'place_austin_1250',
              description: '1250 Elm Street, Austin, TX 78702',
              mainText: '1250 Elm Street',
              secondaryText: 'Austin, TX 78702',
            },
          ],
        }),
      });
    });
  });

  test('Scenario 1: Marketplace discovery search filters in place without redirecting (F-03 Invariant)', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    const searchInput = page.getByTestId('marketplace-search-input');
    await expect(searchInput).toBeVisible();

    // Type search query to bring up suggestions
    await searchInput.fill('Austin');
    await searchInput.press('Enter');

    // Assert grid filters in-place and preserves /dashboard/deals
    await expect(page).toHaveURL(/.*\/dashboard\/deals\?.*search=Austin.*/);
    expect(page.url()).not.toContain('/projects/new');
    expect(page.url()).not.toContain('/deals/austin');

    const card = page.locator('[data-testid^="deal-card-"]').first();
    await expect(card).toBeVisible();
  });

  test('Scenario 2: Autocomplete selection in New Project flow feeds collision-check pipeline (/api/deals/exists)', async ({
    page,
  }) => {
    // Stub collision endpoint to return an existing deal
    await page.route('**/api/deals/exists*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exists: true,
          deal: {
            id: 'deal_col_1247',
            slug: '1247elmst',
            propertyName: '1247 Elm Street Portfolio',
            address: '1247 Elm Street, Austin, TX 78702',
            purchasePrice: 485000,
            status: 'funding',
          },
        }),
      });
    });

    await page.goto('/projects/new');

    // Step 1: Fill Project Name and proceed to Step 2 (Property Identification)
    const nameInput = page.getByPlaceholder(/e\.g\. Elm Street Flip/i);
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Elm Street Capital Project');
    await page.getByRole('button', { name: /next: identify property/i }).click();

    // Step 2: AddressSearch combobox is now mounted
    const addressInput = page.getByRole('combobox');
    await expect(addressInput).toBeVisible();

    // Type address query to trigger debounced autocomplete
    await addressInput.fill('1247 Elm');

    const predictionsList = page.locator('#address-predictions-list');
    await expect(predictionsList).toBeVisible();

    // Capture Screenshot (a): Autocomplete dropdown with live suggestions
    const shotPathA = path.join(screenshotsDir, 'autocomplete-dropdown.png');
    await page.screenshot({ path: shotPathA });
    if (fs.existsSync(brainDir)) {
      fs.copyFileSync(shotPathA, path.join(brainDir, 'maps-autocomplete-dropdown.png'));
    }

    // Select the first suggestion
    const firstOption = page.locator('#address-prediction-0');
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    // Verify Collision Modal is displayed with the matching deal
    const collisionModal = page.locator('[data-testid="collision-modal"]');
    await expect(collisionModal).toBeVisible();
    await expect(collisionModal).toContainText('1247 Elm Street');
  });

  test('Scenario 3: 4-tier imagery fallback (Street View, Static Map tile, and Degraded Mode)', async ({
    page,
  }) => {
    // Inject mock deal that exercises imagery fallback (no curated imageUrl)
    await page.route((url) => url.pathname === '/api/deals', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ deals: MOCK_DEAL_TIERS }),
      });
    });

    // 3A: Street View tier (metadata OK + <=50m)
    await page.route('**/api/street-view*', async (route) => {
      const url = route.request().url();
      if (url.includes('metadata=true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'OK', location: { lat: 30.2672, lng: -97.7431 } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: STREET_VIEW_SVG,
        });
      }
    });

    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');
    const streetViewImg = page.locator('img[src*="/api/street-view"]').first();
    await expect(streetViewImg).toBeVisible();

    // Capture Screenshot (b): Deal card with Street View imagery
    const shotPathB = path.join(screenshotsDir, 'deal-card-street-view.png');
    await page.screenshot({ path: shotPathB });
    if (fs.existsSync(brainDir)) {
      fs.copyFileSync(shotPathB, path.join(brainDir, 'maps-deal-card-street-view.png'));
      fs.copyFileSync(shotPathB, path.join(brainDir, 'deal-card-street-view.png'));
    }

    // 3B: Static Map tier (Street View returns ZERO_RESULTS -> falls back to /api/map-tile)
    await page.route('**/api/street-view*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ZERO_RESULTS' }),
      });
    });

    await page.route('**/api/map-tile*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: MAP_TILE_SVG,
      });
    });

    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');
    const mapTileImg = page.locator('img[src*="/api/map-tile"]').first();
    await expect(mapTileImg).toBeVisible();

    // Capture Screenshot (c): Deal card on static map tier
    const shotPathC = path.join(screenshotsDir, 'deal-card-map-tile.png');
    await page.screenshot({ path: shotPathC });
    if (fs.existsSync(brainDir)) {
      fs.copyFileSync(shotPathC, path.join(brainDir, 'maps-deal-card-map-tile.png'));
      fs.copyFileSync(shotPathC, path.join(brainDir, 'deal-card-map-tile.png'));
    }

    // 3C: Degraded mode (No API key, services fail 503)
    await page.route('**/api/street-view*', async (route) => {
      await route.fulfill({ status: 503, body: 'Service unconfigured' });
    });
    await page.route('**/api/map-tile*', async (route) => {
      await route.fulfill({ status: 503, body: 'Service unconfigured' });
    });
    await page.route('**/api/places/autocomplete', async (route) => {
      await route.fulfill({ status: 200, json: { predictions: [] } });
    });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    // Assert placeholder icon is visible
    const placeholderIcon = page.locator('span.material-symbols-outlined:has-text("apartment")').first();
    await expect(placeholderIcon).toBeVisible();

    // Capture Screenshot (d): Degraded mode with placeholder imagery
    const shotPathD = path.join(screenshotsDir, 'degraded-mode.png');
    await page.screenshot({ path: shotPathD });
    if (fs.existsSync(brainDir)) {
      fs.copyFileSync(shotPathD, path.join(brainDir, 'maps-degraded-mode.png'));
      fs.copyFileSync(shotPathD, path.join(brainDir, 'degraded-mode.png'));
    }

    // Ensure zero uncaught JavaScript application errors
    const fatalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('503') &&
        !err.includes('Failed to load resource'),
    );
    expect(fatalErrors).toHaveLength(0);
  });
});

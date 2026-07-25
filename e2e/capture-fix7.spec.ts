import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState } from './mocks';
import * as path from 'path';

test.describe('PaperWorking E2E — Capture Invitation & Terms Versioning (AQ-26 / FIX-7)', () => {
  const projectId = 'project_compose_test';

  test('Capture invitation preview and terms versioning flow', async ({ page }) => {
    // Console logging
    page.on('console', msg => {
      console.log(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`BROWSER PAGE ERROR: ${err.message}\n${err.stack}`);
    });

    const state = createDefaultState();
    state.projects = [
      {
        id: projectId,
        propertyName: 'Capital Heights',
        address: '500 Syndicate Ave, Austin, TX',
        propertyAddress: '500 Syndicate Ave, Austin, TX',
        condition: 'turnkey',
        firstPassVerdict: 'PURSUE',
        dispositionType: 'RENT',
        subStrategy: 'Long-Term',
        status: 'Under Contract',
        units: 1,
        propertyType: 'SFR',
        comps: [
          { id: 'c1', addressLine: '102 Cascade Way', soldPriceCents: 30000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.1, condition: 'Good' },
          { id: 'c2', addressLine: '104 Cascade Way', soldPriceCents: 31000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.2, condition: 'Good' },
          { id: 'c3', addressLine: '106 Cascade Way', soldPriceCents: 32000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.3, condition: 'Good' },
        ],
        financials: {
          purchasePrice: 50000000, // $500k
          finalAgreedPrice: 50000000,
          projectedNOI: 4560000,
          projectedCapRate: 9.12,
          projectedCashOnCash: 8.29,
          financingType: 'All Cash',
          capitalPlan: 'raise interest',
          equityTerms: {
            funding_target: 200000, // $200k
            equity_offered_pct: 30,
            min_ticket: 10000,
            price_basis: 500000, // matches purchasePrice ($500k) -> NOT stale initially
            version: 1,
          },
        },
        members: {
          user_123: { role: 'owner' },
        },
      }
    ];

    await setupMocks(page, state);

    // Seed cookie consent
    await page.addInitScript(() => {
    try {
    
          window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
        
    } catch (e) {}
  });

    // Go to project page
    await page.goto(`/dashboard/projects/${projectId}/phase-1`);
    await page.waitForTimeout(2000);

    // Select Stage 6: Raise Interest
    const tabStage6 = page.locator('#stage-tab-raise_interest').first();
    await tabStage6.click();
    await page.waitForTimeout(1000);

    // Check that we have v1 terms loaded
    const versionHeader = page.locator('h4', { hasText: 'Equity Terms Version' });
    await expect(versionHeader).toContainText('Version 1');

    // Screenshot the composed invitation preview
    const previewContainer = page.locator('#composer-preview');
    await expect(previewContainer).toBeVisible();

    const destDir = '/Users/yvesdarbouze/.gemini/antigravity/brain/80408936-7203-445d-8a3d-ebf4d31d5e15';
    await previewContainer.screenshot({ path: path.join(destDir, 'invitation-composed.png') });
    console.log('Saved invitation-composed.png successfully.');

    // Now, change the rehab budget to make the terms STALE
    // Let's call the PATCH route directly using fetch in the page context
    await page.evaluate(async ({ pid }) => {
      await fetch(`/api/projects/${pid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financials: {
            projectedRehabCost: 5000000, // $50k in cents
          }
        })
      });
    }, { pid: projectId });

    // Wait and reload page to see the stale state
    await page.goto(`/dashboard/projects/${projectId}/phase-1`);
    await page.waitForTimeout(2000);

    // Click Stage 6 again
    await page.locator('#stage-tab-raise_interest').first().click();
    await page.waitForTimeout(1000);

    // Stale warning should be visible
    const warningBanner = page.locator('#terms-stale-warning');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner).toContainText('Terms are Stale');

    // Take screenshot of stale warning + calculations card
    await page.screenshot({ path: path.join(destDir, 'terms-stale-warning.png'), fullPage: true });
    console.log('Saved terms-stale-warning.png successfully.');

    // Click "Update & Re-Version" button to resolve the stale terms
    const updateBtn = page.locator('#btn-update-stale-terms');
    await updateBtn.click();
    await page.waitForTimeout(1000);

    // Stale warning should disappear, and version should become 2
    await expect(warningBanner).not.toBeVisible();
    await expect(versionHeader).toContainText('Version 2');

    // Take final screenshot showing version 2 and no stale state
    await page.screenshot({ path: path.join(destDir, 'terms-resolved-v2.png'), fullPage: true });
    console.log('Saved terms-resolved-v2.png successfully.');
  });
});

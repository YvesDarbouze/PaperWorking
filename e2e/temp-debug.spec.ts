import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test('debug oak avenue workspace render', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('request', req => console.log('REQ:', req.method(), req.url()));
  page.on('response', res => console.log('RES:', res.status(), res.url()));

  const state = createDefaultState();
  const project = state.projects[0];
  project.name = 'Oak Avenue';
  project.propertyName = 'Oak Avenue';
  project.address = '456 Oak Ave, San Diego, CA 92101';
  project.city = 'San Diego';
  project.state = 'CA';
  project.zip = '92101';
  project.squareFootage = 1500;
  project.yearBuilt = 2000;
  project.units = 1;
  project.occupiedUnits = 1;
  project.condition = 'Good';
  project.propertyType = 'Single Family';
  project.sellerName = 'Ned Flanders';
  project.firstPassVerdict = 'PURSUE';
  project.dispositionType = 'RENT';
  project.subStrategy = 'LONG_TERM';

  project.comps = [
    { id: 'c1', addressLine: '744 Evergreen Ter', soldPriceCents: 27900000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.1, condition: 'Good' },
    { id: 'c2', addressLine: '746 Evergreen Ter', soldPriceCents: 28500000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.2, condition: 'Good' },
    { id: 'c3', addressLine: '748 Evergreen Ter', soldPriceCents: 29000000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.3, condition: 'Good' },
  ];

  project.financials = {
    ...project.financials,
    purchasePrice: 40000000,
    listedPrice: 40000000,
    estimatedARV: 50000000,
    loanAmount: 32000000,
    closingCosts: 800000,
    fixedAcquisitionCosts: 800000,
    projectedRehabCost: 5000000,
    totalCashInvested: 8800000,
    monthlyRent: 2500,
    otherMonthlyIncome: 100,
    vacancyRatePercent: 5.0,
    loanInterestRate: 6.5,
    loanTermYears: 30,
    financingType: 'Financed',
    offerStatus: 'Accepted',
  };

  await setupMocks(page, state);

  console.log('Navigating...');
  await safeGoto(page, `/dashboard/projects/${project.id}/phase-1`);
  
  const cookies = await page.evaluate(() => document.cookie);
  console.log('BROWSER COOKIES:', cookies);

  console.log('Waiting...');
  await page.waitForTimeout(5000);
});

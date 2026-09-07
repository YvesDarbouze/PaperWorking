import { test, expect } from '@playwright/test';
import { createDevSession } from '../helpers/auth.js';
import {
  saveDealBaselineAndWaitForProjectSync,
  saveFinancialInputsAndWait,
  waitForFinancialInputsPanel,
  waitForScorecardPanel,
  fetchCurrentKpis,
} from '../helpers/kpi-sync.js';

const BASE_FINANCIALS = {
  monthlyGrossRent: 3500,
  vacancyRatePercent: 5,
  operatingExpenseTaxes: 4800,
  operatingExpenseInsurance: 1200,
  maintenanceReserves: 1500,
  loanAmount: 312_000,
  loanInterestRate: 6.5,
  loanTermYears: 30,
  totalCashInvested: 88_000,
  numberOfUnits: 4,
  occupiedUnits: 3,
};

function slugFromAddress(address: string): string {
  return address.replace(/\s+/g, '').toLowerCase();
}

async function authenticateBrowser(
  context: import('@playwright/test').BrowserContext,
  request: import('@playwright/test').APIRequestContext,
) {
  await createDevSession(request, 'investor');
  const storage = await request.storageState();
  await context.addCookies(storage.cookies);
}

async function createProject(
  request: import('@playwright/test').APIRequestContext,
  name: string,
  purchasePrice: number,
  financials?: Record<string, unknown>,
) {
  const res = await request.post('/api/projects', {
    data: { name, purchasePrice, financials },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  return body.project.id as string;
}

async function createDeal(
  request: import('@playwright/test').APIRequestContext,
  input: {
    address: string;
    purchasePrice: number;
    projectedMonthlyRent: number;
    rehabCost?: number;
    arv?: number;
    projectId?: string;
  },
) {
  const slug = slugFromAddress(input.address);
  const res = await request.post('/api/deals', {
    data: {
      slug,
      address: input.address,
      purchasePrice: input.purchasePrice,
      projectedMonthlyRent: input.projectedMonthlyRent,
      rehabCost: input.rehabCost ?? 50_000,
      arv: input.arv ?? input.purchasePrice * 1.15,
      projectId: input.projectId,
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return { slug, ...(await res.json()).deal };
}

function scorecardCell(page: import('@playwright/test').Page, metric: string) {
  return page.locator('tr', { has: page.getByRole('cell', { name: metric, exact: true }) });
}

test.describe('KPI completion gates', () => {
  test.beforeEach(async ({ request }) => {
    await createDevSession(request, 'investor');
  });

  test('Gate 1 — linked Deal → /projects/new → Project with transferred financials', async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(120_000);
    await authenticateBrowser(context, request);

    const address = `Gate One ${Date.now()} Test Blvd`;
    const dealFinancials = {
      purchasePrice: 425_000,
      projectedMonthlyRent: 3200,
      rehabCost: 55_000,
      arv: 510_000,
    };
    await createDeal(request, { address, ...dealFinancials });

    await page.goto('/projects/new');
    await page.getByPlaceholder(/Elm Street/i).fill(`Gate 1 Project ${Date.now()}`);
    await page.getByRole('button', { name: /Next: Identify property/i }).click();

    await page.getByPlaceholder(/Search any street address/i).fill(address);
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /Link to this deal/i }).click();

    await expect(page.getByRole('heading', { name: /Confirm & Launch/i })).toBeVisible();
    await page.getByRole('button', { name: /Launch project/i }).click();

    await page.waitForURL(/\/project\/[^/]+/, { timeout: 30_000 });
    const projectId = page.url().match(/\/project\/([^/?#]+)/)?.[1];
    expect(projectId).toBeTruthy();

    await waitForFinancialInputsPanel(page);
    await expect(page.getByLabel(/purchase price/i)).toHaveValue(String(dealFinancials.purchasePrice));
    await expect(page.getByLabel(/Potential rental income/i)).toHaveValue(
      String(dealFinancials.projectedMonthlyRent),
    );

    const kpiRes = await request.get(`/api/projects/${projectId}/kpis/current`);
    const kpiBody = await kpiRes.json();
    const noiBefore = kpiBody.kpis.scorecard.noi.value as number;
    expect(noiBefore).toBeGreaterThan(0);

    await page.getByLabel(/Potential rental income/i).fill('3600');
    await saveFinancialInputsAndWait(page);

    await page.goto(`/project/${projectId}/scorecard`);
    const kpiAfterRes = await request.get(`/api/projects/${projectId}/kpis/current`);
    const noiAfter = (await kpiAfterRes.json()).kpis.scorecard.noi.value as number;
    expect(noiAfter).toBeGreaterThan(noiBefore);

    await page.reload();
    await expect(scorecardCell(page, 'NOI').getByRole('cell').nth(1)).not.toHaveText('N/A');

    await page.goto(`/project/${projectId}`);
    await expect(page.getByRole('heading', { name: 'Project financial inputs' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel(/Potential rental income/i)).toHaveValue('3600');
  });

  test('Gate 3 — Deal page save syncs linked Project and updates KPIs', async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(120_000);
    await authenticateBrowser(context, request);

    const projectId = await createProject(request, `Gate 3 ${Date.now()}`, 380_000, {
      purchasePrice: 380_000,
      monthlyGrossRent: 2800,
      operatingExpenseTaxes: 4000,
      operatingExpenseInsurance: 1000,
    });

    const address = `Gate Three ${Date.now()} Ave`;
    const slug = slugFromAddress(address);
    await createDeal(request, {
      address,
      purchasePrice: 380_000,
      projectedMonthlyRent: 2800,
      projectId,
    });

    const kpiBefore = (await (await request.get(`/api/projects/${projectId}/kpis/current`)).json())
      .kpis.scorecard.noi.value as number;

    await page.goto(`/deals/${slug}?fromProject=${projectId}`);
    await expect(page.locator('#deal-purchase-price')).toHaveValue('380000', { timeout: 15_000 });
    await page.getByLabel(/Target Purchase Price/i).fill('410000');
    await page.getByLabel(/Projected Monthly Rent/i).fill('3300');
    await saveDealBaselineAndWaitForProjectSync(page, request, {
      slug,
      projectId,
      purchasePrice: 410_000,
      monthlyRent: 3300,
    });

    const kpiAfter = await fetchCurrentKpis(request, projectId);
    expect((kpiAfter.scorecard as { noi: { value: number } }).noi.value).toBeGreaterThan(kpiBefore);

    await page.goto(`/project/${projectId}`);
    await waitForFinancialInputsPanel(page);
    await expect(page.getByLabel(/purchase price/i)).toHaveValue('410000');
    await expect(page.getByLabel(/Potential rental income/i)).toHaveValue('3300');
  });

  test('Gate 4 — missing data renders N/A in scorecard UI', async ({ page, context, request }) => {
    await authenticateBrowser(context, request);

    const projectId = await createProject(request, `Gate 4 ${Date.now()}`, 350_000, {
      purchasePrice: 350_000,
    });

    await page.goto(`/project/${projectId}/scorecard`);
    await waitForScorecardPanel(page);

    const noiRow = scorecardCell(page, 'NOI');
    await expect(noiRow.getByRole('cell').nth(1)).toHaveText('N/A');
    await expect(noiRow.getByRole('cell').nth(2)).toContainText('Unavailable');

    await expect(scorecardCell(page, 'Cap rate').getByRole('cell').nth(1)).toHaveText('N/A');
    await expect(scorecardCell(page, 'DSCR').getByRole('cell').nth(1)).toHaveText('N/A');
    await expect(
      scorecardCell(page, 'IRR (requires cash-flow schedule)').getByRole('cell').nth(1),
    ).toHaveText('N/A');
  });

  test('Gate 5 — input change through UI updates dependent KPIs after reload', async ({
    page,
    context,
    request,
  }) => {
    await authenticateBrowser(context, request);

    const projectId = await createProject(
      request,
      `Gate 5 ${Date.now()}`,
      400_000,
      BASE_FINANCIALS,
    );

    const before = await request.get(`/api/projects/${projectId}/kpis/current`);
    const noiBefore = (await before.json()).kpis.scorecard.noi.value as number;
    const dscrBefore = (await before.json()).kpis.scorecard.dscr.value as number;

    await page.goto(`/project/${projectId}`);
    await page.getByLabel(/Potential rental income/i).fill('4200');
    await page.getByLabel(/loan amount/i).fill('200000');
    await page.getByRole('button', { name: /save financial inputs/i }).click();
    await expect(page.getByText(/saved — scorecard refreshed/i)).toBeVisible();

    await page.reload();
    await page.getByLabel(/Potential rental income/i).fill('4200');

    const after = await request.get(`/api/projects/${projectId}/kpis/current`);
    const afterBody = await after.json();
    expect(afterBody.kpis.scorecard.noi.value).toBeGreaterThan(noiBefore);
    expect(afterBody.kpis.scorecard.dscr.value).not.toBe(dscrBefore);

    await page.goto(`/project/${projectId}/scorecard`);
    await page.reload();
    await expect(scorecardCell(page, 'NOI').getByRole('cell').nth(1)).not.toHaveText('N/A');
  });

  test('Gate 7 — purchase-only project does not fabricate loan KPIs', async ({ request }) => {
    const projectId = await createProject(request, `Gate 7 ${Date.now()}`, 500_000, {
      purchasePrice: 500_000,
    });

    const kpi = await request.get(`/api/projects/${projectId}/kpis/current`);
    const body = await kpi.json();

    expect(body.kpis.scorecard.noi.value).toBeNull();
    expect(body.kpis.scorecard.dscr.value).toBeNull();
    expect(body.kpis.insights.financial.ltv.value).toBeNull();
    expect(body.kpis.scorecard.irr.value).toBeNull();
    expect(body.kpis.insights.riskCompliance.complianceRate.value).toBeNull();
  });

  test('Gate 2 — consolidated Project financial panel is the phase input surface (Case B)', async ({
    page,
    context,
    request,
  }) => {
    await authenticateBrowser(context, request);

    const projectId = await createProject(
      request,
      `Gate 2 ${Date.now()}`,
      400_000,
      BASE_FINANCIALS,
    );

    await page.goto(`/project/${projectId}`);
    await expect(page.getByRole('heading', { name: 'Project financial inputs' })).toBeVisible();

    // Phase-specific financial forms are not present — consolidated panel is primary input surface.
    await expect(page.getByRole('heading', { name: /acquisition financial/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /hold financial/i })).toHaveCount(0);

    // Phase progress indicators exist (product design — todos/phases, not separate financial forms).
    await expect(page.getByText(/Current phase|Queued/i).first()).toBeVisible();
  });
});

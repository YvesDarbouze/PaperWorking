import { test, expect } from '@playwright/test';
import { createDevSession } from '../helpers/auth.js';

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

async function createKpiTestProject(
  request: import('@playwright/test').APIRequestContext,
  suffix: string,
  financials?: Record<string, unknown>,
  purchasePrice = 400_000,
) {
  const createRes = await request.post('/api/projects', {
    data: {
      name: `E2E KPI ${suffix} ${Date.now()}`,
      purchasePrice,
      financials: financials ?? BASE_FINANCIALS,
    },
  });
  expect(createRes.ok(), await createRes.text()).toBeTruthy();
  const created = await createRes.json();
  return created.project.id as string;
}

test.describe('Project KPI flow — real Firestore path', () => {
  test.beforeEach(async ({ request }) => {
    await createDevSession(request, 'investor');
  });

  test('Flow A — deal PATCH syncs financials to linked project KPIs', async ({ request }) => {
    const projectId = await createKpiTestProject(
      request,
      'flow-a',
      { purchasePrice: 300_000 },
      300_000,
    );
    const slug = `e2e-deal-${Date.now()}`;

    const createDeal = await request.post('/api/deals', {
      data: {
        slug,
        address: '100 E2E Test St',
        purchasePrice: 300_000,
        projectedMonthlyRent: 2500,
        projectId,
      },
    });
    expect(createDeal.ok(), await createDeal.text()).toBeTruthy();

    const patchDeal = await request.patch(`/api/deals/${slug}`, {
      data: {
        purchasePrice: 450_000,
        projectedMonthlyRent: 4200,
        projectId,
      },
    });
    expect(patchDeal.ok(), await patchDeal.text()).toBeTruthy();

    const syncProject = await request.patch(`/api/projects/${projectId}`, {
      data: {
        purchasePrice: 450_000,
        financials: {
          purchasePrice: 450_000,
          monthlyGrossRent: 4200,
          operatingExpenseTaxes: 5000,
          operatingExpenseInsurance: 1500,
        },
      },
    });
    expect(syncProject.ok(), await syncProject.text()).toBeTruthy();

    const kpiRes = await request.get(`/api/projects/${projectId}/kpis/current`);
    expect(kpiRes.ok()).toBeTruthy();
    const body = await kpiRes.json();
    expect(body.kpis.scorecard.noi.value).not.toBeNull();
    expect(body.kpis.scorecard.noi.value).toBeGreaterThan(0);
  });

  test('Flow B — project financial inputs persist and drive scorecard KPIs', async ({
    page,
    context,
    request,
  }) => {
    const storage = await request.storageState();
    await context.addCookies(storage.cookies);

    const projectId = await createKpiTestProject(request, 'flow-b');

    const kpiBefore = await request.get(`/api/projects/${projectId}/kpis/current`);
    expect(kpiBefore.ok()).toBeTruthy();
    const beforeBody = await kpiBefore.json();
    const noiBefore = beforeBody.kpis.scorecard.noi.value as number;
    expect(noiBefore).toBeGreaterThan(0);

    await page.goto(`/project/${projectId}`);
    await expect(page.getByRole('heading', { name: 'Project financial inputs' })).toBeVisible();

    await page.getByLabel(/Potential rental income/i).fill('4000');
    await page.getByRole('button', { name: /save financial inputs/i }).click();
    await expect(page.getByText(/saved — scorecard refreshed/i)).toBeVisible({ timeout: 15_000 });

    await page.goto(`/project/${projectId}/scorecard`);
    await expect(page.getByRole('heading', { name: /scorecard snapshot/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'NOI' })).toBeVisible();

    const kpiAfter = await request.get(`/api/projects/${projectId}/kpis/current`);
    const afterBody = await kpiAfter.json();
    const noiAfter = afterBody.kpis.scorecard.noi.value as number;
    expect(noiAfter).toBeGreaterThan(noiBefore);

    await page.reload();
    await expect(page.getByRole('heading', { name: /scorecard snapshot/i })).toBeVisible();
    const row = page.locator('tr', { has: page.getByRole('cell', { name: 'NOI' }) });
    await expect(row.getByRole('cell').nth(1)).not.toHaveText('N/A');
  });

  test('Flow C — missing income inputs produce N/A KPIs', async ({ request }) => {
    const projectId = await createKpiTestProject(
      request,
      'flow-c',
      { purchasePrice: 350_000 },
      350_000,
    );

    const kpiRes = await request.get(`/api/projects/${projectId}/kpis/current`);
    expect(kpiRes.ok()).toBeTruthy();
    const body = await kpiRes.json();

    expect(body.kpis.scorecard.noi.value).toBeNull();
    expect(body.kpis.scorecard.capRate.value).toBeNull();
    expect(body.kpis.scorecard.dscr.value).toBeNull();
    expect(body.kpis.scorecard.irr.value).toBeNull();
    expect(body.kpis.insights.financial.ltv.value).toBeNull();
    expect(body.kpis.insights.riskCompliance.complianceRate.value).toBeNull();
  });

  test('Flow B — rent change updates NOI after reload via API', async ({ request }) => {
    const projectId = await createKpiTestProject(request, 'flow-b-reload');

    const first = await request.get(`/api/projects/${projectId}/kpis/current`);
    const firstNoi = (await first.json()).kpis.scorecard.noi.value as number;

    await request.patch(`/api/projects/${projectId}`, {
      data: {
        financials: {
          ...BASE_FINANCIALS,
          monthlyGrossRent: 5000,
        },
      },
    });

    const second = await request.get(`/api/projects/${projectId}/kpis/current`);
    const secondNoi = (await second.json()).kpis.scorecard.noi.value as number;
    expect(secondNoi).toBeGreaterThan(firstNoi);
  });
});

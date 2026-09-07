import { test, expect } from '@playwright/test';
import { createDevSession } from '../helpers/auth.js';

async function authenticateBrowser(
  context: import('@playwright/test').BrowserContext,
  request: import('@playwright/test').APIRequestContext,
) {
  await createDevSession(request, 'investor');
  const storage = await request.storageState();
  await context.addCookies(storage.cookies);
}

function scorecardCell(page: import('@playwright/test').Page, metric: string) {
  return page.locator('tr', { has: page.getByRole('cell', { name: metric, exact: true }) });
}

async function addCashFlowEvent(
  page: import('@playwright/test').Page,
  input: { date: string; type: 'investment' | 'return'; amount: string; description?: string },
) {
  const section = page.getByTestId('cash-flow-schedule');
  await section.getByTestId('cash-flow-draft-date').fill(input.date);
  await section.getByTestId('cash-flow-draft-type').selectOption(input.type);
  await section.getByTestId('cash-flow-draft-amount').fill(input.amount);
  if (input.description) {
    await section.getByTestId('cash-flow-draft-description').fill(input.description);
  }
  await section.getByTestId('cash-flow-add-button').click();
}

test.describe('Project cash-flow schedule', () => {
  test.beforeEach(async ({ request }) => {
    await createDevSession(request, 'investor');
  });

  test('investor can manage cash-flow events and IRR / equity multiple update', async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(180_000);
    await authenticateBrowser(context, request);

    const createRes = await request.post('/api/projects', {
      data: {
        name: `Cash Flow E2E ${Date.now()}`,
        purchasePrice: 400_000,
        financials: {
          purchasePrice: 400_000,
          monthlyGrossRent: 3500,
          operatingExpenseTaxes: 4800,
          operatingExpenseInsurance: 1200,
        },
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const projectId = ((await createRes.json()) as { project: { id: string } }).project.id;

    await page.goto(`/project/${projectId}/scorecard`);
    await expect(scorecardCell(page, 'IRR (requires cash-flow schedule)').getByRole('cell').nth(1)).toHaveText(
      'N/A',
    );

    await page.goto(`/project/${projectId}`);
    await expect(page.getByTestId('cash-flow-schedule')).toBeVisible();

    await addCashFlowEvent(page, {
      date: '2026-01-01',
      type: 'investment',
      amount: '100000',
      description: 'Initial equity investment',
    });
    await addCashFlowEvent(page, { date: '2026-03-01', type: 'investment', amount: '10000' });
    await addCashFlowEvent(page, {
      date: '2027-01-01',
      type: 'return',
      amount: '140000',
      description: 'Sale proceeds',
    });

    await page.getByRole('button', { name: /save financial inputs/i }).click();
    await expect(page.getByText(/saved — scorecard refreshed/i)).toBeVisible();

    const kpiAfterSave = await request.get(`/api/projects/${projectId}/kpis/current`);
    const kpiBody = await kpiAfterSave.json();
    expect(kpiBody.kpis.scorecard.irr.value).not.toBeNull();
    const equityMultipleBefore = kpiBody.kpis.insights.financial.equityMultiple.value as number;
    expect(equityMultipleBefore).toBeCloseTo(1.27, 1);

    await page.goto(`/project/${projectId}/scorecard`);
    await expect(scorecardCell(page, 'IRR (requires cash-flow schedule)').getByRole('cell').nth(1)).not.toHaveText(
      'N/A',
    );

    await page.goto(`/project/${projectId}`);
    await page.reload();
    await expect(page.getByText('Initial equity investment')).toBeVisible();
    await expect(page.getByText('Sale proceeds')).toBeVisible();
    await expect(page.getByLabel(/Potential rental income/i)).toHaveValue('3500');

    const kpiAfterReload = await request.get(`/api/projects/${projectId}/kpis/current`);
    expect((await kpiAfterReload.json()).kpis.scorecard.irr.value).not.toBeNull();

    await page.getByRole('button', { name: 'Edit' }).last().click();
    const saleRow = page.locator('tr').filter({ has: page.locator('input[value="Sale proceeds"]') });
    await saleRow.locator('input[type="number"]').fill('150000');
    await saleRow.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: /save financial inputs/i }).click();
    await expect(page.getByText(/saved — scorecard refreshed/i)).toBeVisible();

    const kpiAfterEdit = await request.get(`/api/projects/${projectId}/kpis/current`);
    const equityMultipleAfter = (await kpiAfterEdit.json()).kpis.insights.financial.equityMultiple
      .value as number;
    expect(equityMultipleAfter).toBeGreaterThan(equityMultipleBefore);

    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.getByRole('button', { name: /save financial inputs/i }).click();
    await expect(page.getByText(/saved — scorecard refreshed/i)).toBeVisible();
    await expect(page.getByText('Initial equity investment')).toHaveCount(0);

    const kpiAfterDelete = await request.get(`/api/projects/${projectId}/kpis/current`);
    const equityMultipleDeleted = (await kpiAfterDelete.json()).kpis.insights.financial.equityMultiple
      .value as number;
    expect(equityMultipleDeleted).not.toBe(equityMultipleAfter);
  });
});

import { test, expect } from '@playwright/test';
import { createDevSession } from '../helpers/auth.js';
import {
  fetchCurrentKpis,
  saveFinancialInputsAndWait,
  waitForFinancialInputsPanel,
  waitForScorecardPanel,
} from '../helpers/kpi-sync.js';

/** Loan amount that amortizes to exactly $20,000 annual debt service at 6% / 30yr. */
const LOAN_FOR_20K_DEBT_SERVICE = 277_986;

const DETERMINISTIC = {
  purchasePrice: 500_000,
  monthlyRent: 10_000,
  otherIncome: 10_000,
  operatingExpenseTaxes: 30_000,
  loanAmount: LOAN_FOR_20K_DEBT_SERVICE,
  loanInterestRate: 6,
  loanTermYears: 30,
  totalCashInvested: 100_000,
  ppePreviousYear: 100_000,
  ppeCurrentYear: 125_000,
  depreciationCurrentYear: 5_000,
  financialRiskScore: 2,
  marketRiskScore: 4,
  operationalRiskScore: 6,
  complianceRiskScore: 8,
};

const EXPECTED = {
  goi: 130_000,
  noi: 100_000,
  capex: 30_000,
  debtService: 20_000.04,
  cashFlow: 49_999.96,
  capRate: 20,
  expenseRatio: 23.08,
  dscr: 5,
  cashOnCash: 50,
  riskAssessment: 5,
};

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

async function fillDeterministicNetSuiteInputs(page: import('@playwright/test').Page): Promise<void> {
  await page.getByLabel(/Purchase price/i).fill(String(DETERMINISTIC.purchasePrice));
  await page.getByLabel(/Potential rental income/i).fill(String(DETERMINISTIC.monthlyRent));
  await page.getByLabel(/Other income/i).fill(String(DETERMINISTIC.otherIncome));
  await page.getByLabel(/Property tax/i).fill(String(DETERMINISTIC.operatingExpenseTaxes));
  await page.getByLabel(/Loan amount/i).fill(String(DETERMINISTIC.loanAmount));
  await page.getByLabel(/Loan interest rate/i).fill(String(DETERMINISTIC.loanInterestRate));
  await page.getByLabel(/Loan term/i).fill(String(DETERMINISTIC.loanTermYears));
  await page.getByLabel(/Total cash invested/i).fill(String(DETERMINISTIC.totalCashInvested));
  await page.getByLabel(/PP&E previous year/i).fill(String(DETERMINISTIC.ppePreviousYear));
  await page.getByLabel(/PP&E current year/i).fill(String(DETERMINISTIC.ppeCurrentYear));
  await page.getByLabel(/Depreciation current year/i).fill(String(DETERMINISTIC.depreciationCurrentYear));
  await page.getByLabel(/Financial risk/i).fill(String(DETERMINISTIC.financialRiskScore));
  await page.getByLabel(/Market risk/i).fill(String(DETERMINISTIC.marketRiskScore));
  await page.getByLabel(/Operational risk/i).fill(String(DETERMINISTIC.operationalRiskScore));
  await page.getByLabel(/Compliance risk/i).fill(String(DETERMINISTIC.complianceRiskScore));
}

function kpi(body: Record<string, unknown>, path: string): number | null {
  const parts = path.split('.');
  let cur: unknown = body;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[part];
  }
  if (cur != null && typeof cur === 'object' && 'value' in (cur as object)) {
    return (cur as { value: number | null }).value;
  }
  return typeof cur === 'number' ? cur : null;
}

test.describe('NetSuite KPI browser verification', () => {
  test.beforeEach(async ({ request }) => {
    await createDevSession(request, 'investor');
  });

  test('deterministic formulas through production KPI path', async ({ page, context, request }) => {
    test.setTimeout(180_000);
    await authenticateBrowser(context, request);

    const createRes = await request.post('/api/projects', {
      data: { name: `NetSuite Deterministic ${Date.now()}`, purchasePrice: 500_000, financials: {} },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const projectId = ((await createRes.json()) as { project: { id: string } }).project.id;

    await page.goto(`/project/${projectId}`);
    await waitForFinancialInputsPanel(page);
    await fillDeterministicNetSuiteInputs(page);
    await saveFinancialInputsAndWait(page);

    const kpis = await fetchCurrentKpis(request, projectId);
    expect(kpi(kpis, 'insights.financial.goi')).toBe(EXPECTED.goi);
    expect(kpi(kpis, 'scorecard.noi')).toBe(EXPECTED.noi);
    expect(kpi(kpis, 'insights.financial.capex')).toBe(EXPECTED.capex);
    expect(kpi(kpis, 'scorecard.cashFlow')).toBeCloseTo(EXPECTED.cashFlow, 0);
    expect(kpi(kpis, 'insights.riskCompliance.riskAssessmentScore')).toBe(EXPECTED.riskAssessment);
    expect(kpi(kpis, 'scorecard.capRate')).toBeCloseTo(EXPECTED.capRate, 1);
    expect(kpi(kpis, 'scorecard.expenseRatio')).toBeCloseTo(EXPECTED.expenseRatio, 1);
    expect(kpi(kpis, 'scorecard.dscr')).toBeCloseTo(EXPECTED.dscr, 1);
    expect(kpi(kpis, 'scorecard.cashOnCash')).toBeCloseTo(EXPECTED.cashOnCash, 1);

    // Cash Flow = Total Income − OpEx − Debt Service − CapEx (not NOI − debt alone)
    expect(
      EXPECTED.goi - (EXPECTED.goi - EXPECTED.noi) - EXPECTED.debtService - EXPECTED.capex,
    ).toBeCloseTo(EXPECTED.cashFlow, 1);

    await page.goto(`/project/${projectId}/scorecard`);
    await waitForScorecardPanel(page);
    await expect(scorecardCell(page, 'NOI').getByRole('cell').nth(1)).toHaveText('$100,000');
    await expect(scorecardCell(page, 'Cash flow').getByRole('cell').nth(1)).toHaveText('$50,000');
    await expect(scorecardCell(page, 'Cap rate').getByRole('cell').nth(1)).toHaveText('20.0%');
    await expect(scorecardCell(page, 'DSCR').getByRole('cell').nth(1)).toHaveText('5.00x');
    await expect(scorecardCell(page, 'Expense ratio').getByRole('cell').nth(1)).toHaveText('23.1%');
  });

  test('vacancy rate does not reduce GOI or NOI', async ({ page, context, request }) => {
    test.setTimeout(120_000);
    await authenticateBrowser(context, request);

    const createRes = await request.post('/api/projects', {
      data: { name: `NetSuite Vacancy ${Date.now()}`, purchasePrice: 500_000, financials: {} },
    });
    const projectId = ((await createRes.json()) as { project: { id: string } }).project.id;

    await page.goto(`/project/${projectId}`);
    await waitForFinancialInputsPanel(page);
    await fillDeterministicNetSuiteInputs(page);
    await saveFinancialInputsAndWait(page);

    const before = await fetchCurrentKpis(request, projectId);
    expect(kpi(before, 'insights.financial.goi')).toBe(EXPECTED.goi);
    expect(kpi(before, 'scorecard.noi')).toBe(EXPECTED.noi);

    await page.getByLabel(/Vacancy rate/i).fill('25');
    await saveFinancialInputsAndWait(page);

    const after = await fetchCurrentKpis(request, projectId);
    expect(kpi(after, 'insights.financial.goi')).toBe(EXPECTED.goi);
    expect(kpi(after, 'scorecard.noi')).toBe(EXPECTED.noi);
  });

  test('risk assessment average and N/A when a category is cleared', async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(120_000);
    await authenticateBrowser(context, request);

    const createRes = await request.post('/api/projects', {
      data: { name: `NetSuite Risk ${Date.now()}`, purchasePrice: 500_000, financials: {} },
    });
    const projectId = ((await createRes.json()) as { project: { id: string } }).project.id;

    await page.goto(`/project/${projectId}`);
    await waitForFinancialInputsPanel(page);
    await page.getByLabel(/Financial risk/i).fill('2');
    await page.getByLabel(/Market risk/i).fill('4');
    await page.getByLabel(/Operational risk/i).fill('6');
    await page.getByLabel(/Compliance risk/i).fill('8');
    await saveFinancialInputsAndWait(page);

    let kpis = await fetchCurrentKpis(request, projectId);
    expect(kpi(kpis, 'insights.riskCompliance.riskAssessmentScore')).toBe(5);

    await page.getByLabel(/Compliance risk/i).fill('');
    await saveFinancialInputsAndWait(page);

    kpis = await fetchCurrentKpis(request, projectId);
    expect(kpi(kpis, 'insights.riskCompliance.riskAssessmentScore')).toBeNull();
  });

  test('missing PP&E inputs make CapEx and Cash Flow N/A', async ({ page, context, request }) => {
    test.setTimeout(120_000);
    await authenticateBrowser(context, request);

    const createRes = await request.post('/api/projects', {
      data: { name: `NetSuite CapEx NA ${Date.now()}`, purchasePrice: 500_000, financials: {} },
    });
    const projectId = ((await createRes.json()) as { project: { id: string } }).project.id;

    await page.goto(`/project/${projectId}`);
    await waitForFinancialInputsPanel(page);
    await fillDeterministicNetSuiteInputs(page);
    await saveFinancialInputsAndWait(page);

    let kpis = await fetchCurrentKpis(request, projectId);
    expect(kpi(kpis, 'insights.financial.capex')).toBe(EXPECTED.capex);
    expect(kpi(kpis, 'scorecard.cashFlow')).toBeCloseTo(EXPECTED.cashFlow, 0);

    await page.getByLabel(/Depreciation current year/i).fill('');
    await saveFinancialInputsAndWait(page);

    kpis = await fetchCurrentKpis(request, projectId);
    expect(kpi(kpis, 'insights.financial.capex')).toBeNull();
    expect(kpi(kpis, 'scorecard.cashFlow')).toBeNull();
  });

  test('persistence after reload and KPI updates when rent changes', async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(180_000);
    await authenticateBrowser(context, request);

    const createRes = await request.post('/api/projects', {
      data: { name: `NetSuite Persist ${Date.now()}`, purchasePrice: 500_000, financials: {} },
    });
    const projectId = ((await createRes.json()) as { project: { id: string } }).project.id;

    await page.goto(`/project/${projectId}`);
    await waitForFinancialInputsPanel(page);
    await fillDeterministicNetSuiteInputs(page);
    await saveFinancialInputsAndWait(page);

    const saved = await fetchCurrentKpis(request, projectId);
    expect(kpi(saved, 'scorecard.noi')).toBe(EXPECTED.noi);

    await page.reload();
    await waitForFinancialInputsPanel(page);
    await expect(page.getByLabel(/Potential rental income/i)).toHaveValue(String(DETERMINISTIC.monthlyRent));
    await expect(page.getByLabel(/PP&E current year/i)).toHaveValue(String(DETERMINISTIC.ppeCurrentYear));

    const afterReload = await fetchCurrentKpis(request, projectId);
    expect(kpi(afterReload, 'scorecard.noi')).toBe(EXPECTED.noi);
    expect(kpi(afterReload, 'scorecard.cashFlow')).toBeCloseTo(EXPECTED.cashFlow, 0);

    await page.getByLabel(/Potential rental income/i).fill('11000');
    await saveFinancialInputsAndWait(page);

    const afterRentChange = await fetchCurrentKpis(request, projectId);
    expect(kpi(afterRentChange, 'insights.financial.goi')).toBe(142_000);
    expect(kpi(afterRentChange, 'scorecard.noi')).toBe(112_000);
    expect(kpi(afterRentChange, 'scorecard.cashFlow')).toBeCloseTo(61_999.96, 0);
    expect(kpi(afterRentChange, 'insights.financial.capex')).toBe(EXPECTED.capex);
    expect(kpi(afterRentChange, 'insights.riskCompliance.riskAssessmentScore')).toBe(
      EXPECTED.riskAssessment,
    );
  });
});

import { expect, type APIRequestContext, type Page } from '@playwright/test';

export async function waitForFinancialInputsPanel(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Project financial inputs' })).toBeVisible({
    timeout: 20_000,
  });
}

export async function waitForScorecardPanel(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /scorecard snapshot/i })).toBeVisible({
    timeout: 20_000,
  });
}

export async function waitForProjectFinancialSync(
  request: APIRequestContext,
  projectId: string,
  expected: { purchasePrice?: number; monthlyRent?: number },
  timeoutMs = 20_000,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/projects/${projectId}`);
        if (!res.ok()) return false;
        const body = await res.json();
        const project = body.project ?? body;
        const fin = (project.financials ?? {}) as Record<string, unknown>;
        const price = project.purchasePrice ?? fin.purchasePrice;
        const rent = fin.potentialRentalIncomeMonthly ?? fin.monthlyGrossRent;
        if (expected.purchasePrice !== undefined && price !== expected.purchasePrice) return false;
        if (expected.monthlyRent !== undefined && rent !== expected.monthlyRent) return false;
        return true;
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
}

export async function fetchCurrentKpis(
  request: APIRequestContext,
  projectId: string,
): Promise<Record<string, unknown>> {
  const res = await request.get(`/api/projects/${projectId}/kpis/current`);
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).kpis as Record<string, unknown>;
}

export async function saveFinancialInputsAndWait(page: Page): Promise<void> {
  await page.getByRole('button', { name: /save financial inputs/i }).click();
  await expect(page.getByText(/saved — scorecard refreshed/i)).toBeVisible({ timeout: 20_000 });
}

/**
 * Deal baseline save triggers PATCH /api/deals/:slug and PATCH /api/projects/:id.
 * Waits for both network responses, success UI, and Firestore project sync.
 */
export async function saveDealBaselineAndWaitForProjectSync(
  page: Page,
  request: APIRequestContext,
  input: {
    slug: string;
    projectId: string;
    purchasePrice: number;
    monthlyRent: number;
  },
): Promise<void> {
  const dealPatch = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/deals/${input.slug}`) &&
      ['PATCH', 'PUT', 'POST'].includes(resp.request().method()) &&
      resp.ok(),
  );
  const projectPatch = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/projects/${input.projectId}`) &&
      resp.request().method() === 'PATCH' &&
      resp.ok(),
  );

  await page.getByRole('button', { name: /Save to Pipeline as Baseline/i }).click();
  await Promise.all([dealPatch, projectPatch]);
  await expect(page.getByText(/Deal Baseline Saved/i)).toBeVisible({ timeout: 20_000 });

  await waitForProjectFinancialSync(request, input.projectId, {
    purchasePrice: input.purchasePrice,
    monthlyRent: input.monthlyRent,
  });
}

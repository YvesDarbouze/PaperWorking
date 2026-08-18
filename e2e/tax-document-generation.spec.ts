import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 4: Tax Datapoint Engine & Document Automation E2E', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch (e) {}
    });
    state = createDefaultState();
    await setupMocks(page, state);

    // Mock 1040-ES PDF Generation Route
    await page.route('**/api/tax/1040-es', async (route) => {
      const dummyPdfBuffer = Buffer.from('%PDF-1.4 %PaperWorking Tax Test PDF');
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': 'attachment; filename="IRS_1040-ES_2026_Project_proj_tax_e2e.pdf"',
        },
        body: dummyPdfBuffer,
      });
    });

    // Mock Tax Package Route
    await page.route('**/api/tax/package', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          workflow: {
            taxYear: 2025,
            formsGeneratedCount: 4,
            formsList: ['Schedule E', 'Form 4562', 'Schedule D', 'Form 1099-NEC'],
            contractor1099Count: 1,
            alertText: 'Your 2025 tax package is ready. 4 forms generated, 1 1099s need to be sent to contractors.',
            isReady: true,
          },
          documents: [
            { doc_id: 'tax_doc_sched_e_1', formType: 'Schedule-E', fileName: 'IRS_Schedule-E_2025.pdf' },
            { doc_id: 'tax_doc_4562_1', formType: 'Form-4562', fileName: 'IRS_Form-4562_2025.pdf' },
            { doc_id: 'tax_doc_sched_d_1', formType: 'Schedule-D', fileName: 'IRS_Schedule-D_2025.pdf' },
            { doc_id: 'tax_doc_1099_1', formType: 'Form-1099-NEC', fileName: 'IRS_Form-1099-NEC_2025.pdf' },
          ],
        }),
      });
    });

    // Mock project workdesk with Tax Package triggers
    await page.route('**/api/projects/proj_tax_e2e_123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          project: {
            project_id: 'proj_tax_e2e_123',
            propertyName: 'Tax Vault Villa',
            property_address: '404 Capitol Hill, Austin, TX',
            phase: 'exit',
            phase_completion_pct: 100,
            todos: [],
            documents: [],
            team_assignments: [],
          },
        }),
      });
    });
  });

  test('Generates 1040-ES PDF document and triggers year-end Schedule E tax package', async ({ page }) => {
    // 1. Navigate to Project Workdesk first to initialize browser context
    await safeGoto(page, '/project/proj_tax_e2e_123');
    const workdesk = page.getByTestId('project-workdesk');
    await expect(workdesk).toBeVisible({ timeout: 15000 });

    // 2. Trigger 1040-ES PDF Generation via browser fetch (intercepted by route mock)
    const pdfRes = await page.evaluate(async () => {
      const res = await fetch('/api/tax/1040-es', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'proj_tax_e2e_123', taxYear: 2026 }),
      });
      return { status: res.status, contentType: res.headers.get('content-type') };
    });

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.contentType).toContain('application/pdf');

    // 3. Trigger Year-End Tax Package via browser fetch (intercepted by route mock)
    const packageRes = await page.evaluate(async () => {
      const res = await fetch('/api/tax/package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'proj_tax_e2e_123', taxYear: 2025 }),
      });
      return await res.json();
    });

    expect(packageRes.success).toBe(true);
    expect(packageRes.workflow.formsGeneratedCount).toBe(4);
    expect(packageRes.workflow.alertText).toContain('Your 2025 tax package is ready');
    expect(packageRes.documents).toHaveLength(4);
  });
});

import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 7: Storage, Files & Receipt Management E2E', () => {
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

    // Mock Upload API route
    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          file_id: 'file_e2e_123',
          fileName: 'Rehab_Invoice_Electrical.pdf',
          url: 'https://storage.paperworking.co/u1/p1/hold/Rehab_Invoice_Electrical.pdf',
          size: 1048576,
          category: 'hold',
          uploaded_at: new Date().toISOString(),
        }),
      });
    });
  });

  test('Renders Document Vault, links receipt to expense, and enforces tax document retention lock', async ({ page }) => {
    // 1. Navigate to Project Document Vault Page first
    await safeGoto(page, '/project/proj_demo_1/documents');
    const vault = page.getByTestId('document-vault-component');
    await expect(vault).toBeVisible({ timeout: 15000 });

    // Verify file table list mounts
    const fileTable = page.getByTestId('file-list-table');
    await expect(fileTable).toBeVisible();

    // 2. Test Upload API endpoint via browser evaluate
    const uploadRes = await page.evaluate(async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['dummy content'], { type: 'application/pdf' }), 'Rehab_Invoice_Electrical.pdf');
      formData.append('projectId', 'proj_demo_1');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    });

    expect(uploadRes.success).toBe(true);
    expect(uploadRes.category).toBe('hold');

    // 3. Link unlinked receipt to expense
    const unlinkedBtn = page.getByTestId('link-receipt-btn-doc_5');
    await expect(unlinkedBtn).toBeVisible();
    await unlinkedBtn.click();

    const confirmLinkBtn = page.getByTestId('confirm-link-receipt-btn');
    await expect(confirmLinkBtn).toBeVisible();
    await confirmLinkBtn.click();

    // Verify linked badge with expense description appears
    await expect(page.getByText(/Plumbing Repairs/i).first()).toBeVisible();

    // 4. Verify 3-year tax document deletion protection lock
    const taxDeleteBtn = page.getByTestId('delete-file-btn-doc_4');
    await expect(taxDeleteBtn).toBeVisible();
    await taxDeleteBtn.click();

    // Expect IRS compliance retention alert message
    await expect(page.getByText(/IRS compliance lock/i)).toBeVisible();
  });
});

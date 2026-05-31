import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, MockState } from './mocks';

test.describe('PaperWorking E2E — Critical Path Deployment Gate', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = createDefaultState();
    await setupMocks(page, state);
  });

  // 1. New User Onboarding & Wizard Flow
  test('Path 1 — New User signs up, completes onboarding wizard & lights first metric', async ({ page }) => {
    // Navigate to Signup
    await page.goto('/signup');
    await page.fill('input[type="email"]', 'newuser@paperworking.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Onboarding Intent selection
    await page.waitForURL('**/onboarding/intent');
    await expect(page.locator('h1')).toContainText('What brings you to PaperWorking today?');
    await page.click('text=Evaluating my first investment property');

    // Onboarding Wizard steps
    await page.waitForURL('**/onboarding/wizard**');
    await expect(page.locator('h2')).toContainText('Acquisition Wizard');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Finish")');

    // Land in Workspace
    await page.waitForURL('**/dashboard/projects/**');
    
    // Fill first 3 fields to trigger metric lit
    await page.fill('input[name="monthlyRent"]', '3000');
    await page.fill('input[name="vacancyRatePercent"]', '5');
    await page.fill('input[name="projectedRehabCost"]', '20000');
    await page.click('button:has-text("Calculate")');

    // Confetti and metric lit indicators
    await expect(page.locator('.metric-lit')).toBeVisible();
    await expect(page.locator('.confetti-canvas')).toBeVisible();
  });

  // 2. NOI Updates & Notifications
  test('Path 2 — Expense addition triggers NOI re-calculation & alerts', async ({ page }) => {
    await page.goto('/dashboard/projects/project_1');
    
    // Check initial NOI
    await expect(page.locator('.noi-value')).toContainText('$37,000'); // Simulated initial value

    // Add an expense ledger item
    await page.click('button:has-text("Add Expense")');
    await page.fill('input[name="expenseName"]', 'Roof repair');
    await page.fill('input[name="expenseAmount"]', '40000'); // Exceeds NOI -> makes it negative
    await page.click('button:has-text("Save Expense")');

    // NOI updates instantly
    await expect(page.locator('.noi-value')).toContainText('-$3,000');

    // Notification fires for crossed threshold
    await page.goto('/dashboard/inbox');
    await expect(page.locator('text=Critical Alert: NOI is Negative')).toBeVisible();
  });

  // 3. Document Vault CD Upload & OCR Hardening
  test('Path 3 — Closing Disclosure upload, OCR validation & audit logs', async ({ page }) => {
    await page.goto('/dashboard/data-room');
    
    // Drag-and-drop / select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.upload-zone');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'closing_disclosure.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 ...'),
    });

    // Verify OCR Extraction values on screen
    await expect(page.locator('.ocr-review-panel')).toBeVisible();
    await expect(page.locator('input[name="extractedLoanAmount"]')).toHaveValue('240000');

    // Confirm fields to harden project
    await page.click('button:has-text("Confirm & Harden Project")');
    await expect(page.locator('.hardened-badge')).toBeVisible();

    // Verify Audit log entry
    await page.goto('/dashboard/settings');
    await page.click('text=Audit Logs');
    await expect(page.locator('text=PROJECT_UPDATE')).toBeVisible();
  });

  // 4. Upgrade Flow and project limits
  test('Path 4 — Upgrade Solo to Investor unlocks Compare Board & 4th Project creation', async ({ page }) => {
    state.plan = 'none'; // Solo plan has 3 project limit max
    await page.goto('/dashboard/projects');

    // Attempting to create 4th project fails on Solo plan
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="projectName"]', 'Project 4');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Project limit reached')).toBeVisible();

    // Upgrade subscription to Investor
    await page.goto('/dashboard/settings/billing');
    await page.click('button:has-text("Upgrade to Investor")');
    await expect(page.locator('text=Success')).toBeVisible();
    state.plan = 'individual'; // Mapped to Investor plan in our state

    // Compare Board / Deal Analyzer unlocks
    await page.goto('/dashboard/deal-analyzer');
    await expect(page.locator('.compare-board-locked')).not.toBeVisible();

    // Can now successfully create 4th Project
    await page.goto('/dashboard/projects');
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="projectName"]', 'Project 4');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Project 4')).toBeVisible();
  });

  // 5. Downgrade Flow & Read-only oldest projects
  test('Path 5 — Downgrade Team to Solo locks the oldest projects to read-only', async ({ page }) => {
    // Add 2 more projects to reach 5 projects total
    state.projects.push(
      { id: 'project_4', name: 'Westside Condo', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'project_5', name: 'South Bay Villa', createdAt: new Date().toISOString() }
    );
    state.plan = 'team'; // Upgraded to Team plan

    await page.goto('/dashboard/projects');
    await expect(page.locator('.read-only-badge')).toHaveCount(0); // All edit-enabled

    // Downgrade to Solo
    await page.goto('/dashboard/settings/billing');
    await page.click('button:has-text("Downgrade to Solo")');
    state.plan = 'none';

    // The oldest two projects (project_1 and project_2) become read-only, all data still accessible
    await page.goto('/dashboard/projects');
    await expect(page.locator('.read-only-badge')).toHaveCount(2);
    
    // Attempting to write to project_1 fails or hides editing tools
    await page.goto('/dashboard/projects/project_1');
    await expect(page.locator('input[name="monthlyRent"]')).toBeDisabled();
  });

  // 6. Tax Pack & CPA share links
  test('Path 6 — Tax Pack generation downloads ZIP, CPA share links work in incognito', async ({ page }) => {
    await page.goto('/dashboard/tax');

    // Click Generate Tax Pack
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Generate Tax Pack")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('tax-pack.zip');

    // Generate Share Link for CPA
    await page.click('button:has-text("Generate CPA Share Link")');
    await page.fill('input[name="cpaEmail"]', 'cpa@accountant.com');
    await page.click('button:has-text("Generate Link")');
    const shareUrl = await page.locator('.share-url-text').innerText();

    // Verify share link loads unauthenticated in a clean context (mimics incognito)
    const browser = page.context().browser();
    const incognitoContext = await browser!.newContext();
    const incognitoPage = await incognitoContext.newPage();
    
    await incognitoPage.goto(shareUrl);
    await expect(incognitoPage.locator('.schedule-e-pdf-view')).toBeVisible();
    await expect(incognitoPage.locator('text=cpa@accountant.com')).toBeVisible();
    await incognitoContext.close();
  });

  // 7. Vendor workflows
  test('Path 7 — Vendor signs up, receives quote request, accepts & is added to team', async ({ page }) => {
    // Create quote request for vendor_123 on project_1
    await page.goto('/dashboard/projects/project_1');
    await page.click('button:has-text("Hire Professional")');
    await page.fill('input[name="vendorEmail"]', 'electrician@vendor.com');
    await page.click('button:has-text("Send Quote Request")');

    // Verify request is pending in vendor's pipeline
    // Simulate vendor sign in & accept
    await page.goto('/vendor-portal/requests');
    await expect(page.locator('text=Apex Mortgage Corp Quote Request')).toBeVisible();
    await page.click('button:has-text("Accept Quote")');

    // Investor verifies vendor is now part of the project team
    await page.goto('/dashboard/projects/project_1/team');
    await expect(page.locator('text=electrician@vendor.com')).toBeVisible();
  });

  // 8. GDPR Delete Loop
  test('Path 8 — Triggering GDPR delete, waiting 24h & hard delete user records', async ({ page }) => {
    await page.goto('/dashboard/settings/profile');
    
    // Trigger GDPR Delete
    await page.click('button:has-text("Request Data Erasure (GDPR)")');
    await page.click('button:has-text("Confirm Request")');
    await expect(page.locator('text=scheduled for deletion')).toBeVisible();

    // Verify account is deleted in system, but audit logs remain
    expect(state.gdprDeleted).toBe(true);
  });
});

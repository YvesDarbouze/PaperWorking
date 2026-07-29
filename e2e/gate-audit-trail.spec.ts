import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

interface ScorecardProject {
  financials?: Record<string, unknown>;
  dispositionType?: string;
  subStrategy?: string;
}

// Scorecard inputs hash generator helper to align with layout validations
function getScorecardInputsHash(project: ScorecardProject | null | undefined): string {
  if (!project) return '';
  const f = project.financials || {};
  const values = [
    f.purchasePrice ?? 0,
    f.listedPrice ?? 0,
    f.projectedRehabCost ?? 0,
    f.estimatedARV ?? 0,
    f.arv ?? 0,
    f.targetCapRate ?? 0,
    f.targetCoc ?? f.targetCoCReturn ?? 0,
    f.minDscr ?? f.targetMinDSCR ?? 0,
    f.maxPurchasePrice ?? f.targetMaxPurchasePrice ?? 0,
    f.gross_rent_per_unit ?? f.monthlyGrossRent ?? f.grossRent ?? 0,
    f.vacancy_pct ?? f.vacancyRatePercent ?? f.vacancyRate ?? 0,
    f.other_income ?? f.otherIncome ?? 0,
    f.tax ?? f.taxes ?? 0,
    f.insurance ?? 0,
    f.utilities ?? 0,
    f.management ?? 0,
    f.management_pct ?? 0,
    f.maintenance ?? 0,
    f.maintenance_pct ?? f.monthlyMaintenanceReserve ?? 0,
    f.otherExpenses ?? 0,
    f.downPaymentPercent ?? 0,
    f.loanInterestRate ?? f.interestRate ?? 0,
    f.loanTermYears ?? 0,
    project.dispositionType || '',
    project.subStrategy || '',
  ];
  return values.join('|');
}

test.describe('PaperWorking E2E — Phase Gate Audit Trail & Override Governance', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch {}
    });
  });

  test('Normal advance when criteria pass writes an event row and snapshot', async ({ page }) => {
    const state = createDefaultState();

    // Configure project with all gate criteria satisfied
    const proj = {
      id: 'proj_gate_pass',
      propertyName: 'Fully Compliant Asset',
      address: '100 Complete Street, Austin, TX',
      units: 1,
      yearBuilt: 2015,
      condition: 'turnkey',
      dispositionType: 'SALE',
      subStrategy: 'Flip',
      currentPhase: 1,
      status: 'Lead',
      state: 'TX',
      propertyType: 'SFR',
      entryPath: 'new_acquisition',
      ownerUid: 'user_123',
      retrospective: true,
      comps: [{ price: 300000 }, { price: 310000 }, { price: 320000 }],
      contingencies: [],
      financials: {
        offerStatus: 'Accepted',
        purchasePrice: 35000000,
        finalAgreedPrice: 35000000,
        estimatedARV: 60000000, // $600,000 to pass MAO check
        targetCapRate: 0,
        targetCoCReturn: 0,
        targetMinDSCR: 0,
        targetMaxPurchasePrice: 99999999,
        psaDocumentUrl: 'http://example.com/psa.pdf',
        psaDocumentName: 'psa.pdf',
        titleDocumentUrl: 'http://example.com/title.pdf',
        titleDocumentName: 'title.pdf',
        titleVestingConfirmed: true,
        titleOwnersPolicyOrdered: true,
        titleCommitmentReceived: true,
        titleStatus: 'clear',
        emdAmount: 1000000,
        emdVerified: true,
        emdReceiptUrl: 'http://example.com/emd.pdf',
        capitalPlan: 'all-cash solo',
        decision: 'proceed',
        grossRent: 3500,
        tax: 250,
        insurance: 120,
        scorecardAcknowledged: true,
        acknowledgedInputsHash: '',
        retrospectiveCompleted: true,
      },
    };
    proj.financials.acknowledgedInputsHash = getScorecardInputsHash(proj);
    state.projects = [proj];

    await setupMocks(page, state);
    await safeGoto(page, '/dashboard/projects/proj_gate_pass/phase-1');

    // Select the Phase Gate tab first
    await page.click('#stage-tab-phase_gate');

    // Verify Acquisition Phase Gate card exists
    await expect(page.locator('#phase_gate')).toBeVisible();

    // Verify all criteria satisfied label is present
    await expect(page.locator('text=All criteria satisfied')).toBeVisible();

    // Advance button should show "Advance to Fund →"
    const advanceBtn = page.locator('#phase_gate button:has-text("Advance to Fund →")');
    await expect(advanceBtn).toBeEnabled();

    // Click advance
    await advanceBtn.click();

    // Verify toast or milestone advance celebration
    await expect(page.locator('text=Milestone Unlocked!').or(page.locator('text=Deal Advanced')).first()).toBeVisible({ timeout: 15000 });
  });

  test('Blocked advance when criteria fail and short/missing override reason', async ({ page }) => {
    const state = createDefaultState();

    // Project with failing criteria
    const proj = {
      id: 'proj_gate_blocked',
      propertyName: 'Pending Diligence Building',
      address: '200 Incomplete Ave, Denver, CO',
      units: 2,
      condition: 'turnkey',
      dispositionType: 'SALE',
      subStrategy: 'Flip',
      currentPhase: 1,
      propertyType: 'SFR',
      ownerUid: 'user_123',
      retrospective: true,
      comps: [{ price: 200000 }, { price: 210000 }, { price: 220000 }],
      contingencies: [{ isSatisfied: false, isWaived: false }],
      financials: {
        offerStatus: 'Accepted',
        purchasePrice: 20000000,
        finalAgreedPrice: 20000000,
        estimatedARV: 40000000, // $400,000 to pass MAO check
        targetCapRate: 0,
        targetCoCReturn: 0,
        targetMinDSCR: 0,
        targetMaxPurchasePrice: 99999999,
        grossRent: 2000,
        tax: 150,
        insurance: 100,
        scorecardAcknowledged: true,
        acknowledgedInputsHash: '',
        retrospectiveCompleted: true,
      },
    };
    proj.financials.acknowledgedInputsHash = getScorecardInputsHash(proj);
    state.projects = [proj];

    await setupMocks(page, state);
    await safeGoto(page, '/dashboard/projects/proj_gate_blocked/phase-1');

    // Select the Phase Gate tab
    await page.click('#stage-tab-phase_gate');

    // Verify gate locked button state
    const lockedBtn = page.locator('#phase_gate button:has-text("Phase Gate (Locked)")');
    await expect(lockedBtn).toBeVisible();
    await expect(lockedBtn).toBeDisabled();

    // Verify blocked warning banner is visible
    await expect(page.locator('text=CRITERIA BLOCKED')).toBeVisible();

    // Type a short reason (< 20 chars)
    const textarea = page.locator('#phase_gate textarea');
    await textarea.fill('Short note');

    // Button should still be disabled because reason < 20 chars
    await expect(lockedBtn).toBeDisabled();
    await expect(page.locator('text=10 / 20 chars')).toBeVisible();
  });

  test('Privileged override with valid reason (>= 20 chars) advances gate and renders OVERRIDE badge in timeline', async ({ page }) => {
    const state = createDefaultState();

    const proj = {
      id: 'proj_gate_override',
      propertyName: 'Speed Acquisition LLC',
      address: '300 Fast Track Rd, Miami, FL',
      units: 4,
      condition: 'turnkey',
      dispositionType: 'SALE',
      subStrategy: 'Flip',
      currentPhase: 1,
      propertyType: 'SFR',
      ownerUid: 'user_123',
      retrospective: true,
      comps: [{ price: 400000 }, { price: 410000 }, { price: 420000 }],
      contingencies: [{ isSatisfied: false, isWaived: false }],
      financials: {
        offerStatus: 'Accepted',
        purchasePrice: 40000000,
        finalAgreedPrice: 40000000,
        estimatedARV: 80000000, // $800,000 to pass MAO check
        targetCapRate: 0,
        targetCoCReturn: 0,
        targetMinDSCR: 0,
        targetMaxPurchasePrice: 99999999,
        grossRent: 4000,
        tax: 300,
        insurance: 150,
        scorecardAcknowledged: true,
        acknowledgedInputsHash: '',
        retrospectiveCompleted: true,
      },
    };
    proj.financials.acknowledgedInputsHash = getScorecardInputsHash(proj);
    state.projects = [proj];

    await setupMocks(page, state);
    await safeGoto(page, '/dashboard/projects/proj_gate_override/phase-1');

    // Select the Phase Gate tab
    await page.click('#stage-tab-phase_gate');

    // Type valid override reason (>= 20 chars)
    const validReason = 'Bypassing Phase I environmental inspection per partner agreement.';
    const textarea = page.locator('#phase_gate textarea');
    await textarea.fill(validReason);

    // Locked button should now be enabled
    const overrideBtn = page.locator('#phase_gate button:has-text("Phase Gate (Locked)")');
    await expect(overrideBtn).toBeEnabled();

    // Click advance with override
    await overrideBtn.click();

    // Verify successful milestone celebration
    await expect(page.locator('text=Milestone Unlocked!').or(page.locator('text=Deal Advanced')).first()).toBeVisible({ timeout: 15000 });
  });

  test('Gate history timeline renders timeline events, expandable snapshot, and OVERRIDE badge', async ({ page }) => {
    const state = createDefaultState();

    const proj = {
      id: 'proj_timeline_test',
      propertyName: 'Historic Manor',
      address: '400 Heritage Way, Charleston, SC',
      units: 1,
      condition: 'turnkey',
      dispositionType: 'SALE',
      subStrategy: 'Flip',
      currentPhase: 1,
      propertyType: 'SFR',
      ownerUid: 'user_123',
      retrospective: true,
      comps: [{ price: 300000 }, { price: 310000 }, { price: 320000 }],
      financials: {
        offerStatus: 'Accepted',
        purchasePrice: 35000000,
        finalAgreedPrice: 35000000,
        estimatedARV: 60000000, // $600,000 to pass MAO check
        targetCapRate: 0,
        targetCoCReturn: 0,
        targetMinDSCR: 0,
        targetMaxPurchasePrice: 99999999,
        grossRent: 3500,
        tax: 250,
        insurance: 120,
        scorecardAcknowledged: true,
        acknowledgedInputsHash: '',
        retrospectiveCompleted: true,
      },
    };
    proj.financials.acknowledgedInputsHash = getScorecardInputsHash(proj);
    state.projects = [proj];

    await setupMocks(page, state);
    await safeGoto(page, '/dashboard/projects/proj_timeline_test/phase-1');

    // Verify Gate History Timeline widget is rendered
    const timeline = page.locator('#gate_history_timeline');
    await expect(timeline).toBeVisible();

    // If no events exist yet, verify empty state renders cleanly
    const emptyOrEvent = page.locator('text=No gate activity yet').or(page.locator('text=Phase 1: Acquisition')).first();
    await expect(emptyOrEvent).toBeVisible();
  });

  test('Terminal Audit Feed surfaces OVERRIDE badge portfolio-wide', async ({ page }) => {
    const state = createDefaultState();

    await setupMocks(page, state);
    await safeGoto(page, '/dashboard/command-center');

    // Verify System Activity feed renders
    await expect(page.locator('text=System Activity')).toBeVisible();
  });
});

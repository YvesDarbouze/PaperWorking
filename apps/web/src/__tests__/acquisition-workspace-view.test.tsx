import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import AcquisitionWorkspaceView from '../../components/projects/AcquisitionWorkspaceView.js';
import AcquisitionPipelineBoard from '../../components/projects/AcquisitionPipelineBoard.js';
import {
  createProjectInStore,
  getProjectFromStore,
  listProjectsFromStore,
  updateProjectInStore,
  isInternalMetadataValidationNoise,
} from '../../lib/projects/project-store.js';
import {
  extractValidationErrorMessage,
  formatValidationDetailsMap,
} from '../../lib/api/adapt-route-result.js';
import { formatCurrency } from '../../lib/projects/phase-utils.js';
import type { ProjectSummary, ProjectWorkspace } from '../../lib/projects/types.js';

const baseProject: ProjectWorkspace = {
  id: 'deal-test-1',
  project_id: 'deal-test-1',
  propertyName: '1247 Elm Street',
  address: '1247 Elm Street, Austin, TX 78702',
  property_address: '1247 Elm Street, Austin, TX 78702',
  city: 'Austin, TX',
  currentPhase: 'acquisition',
  phase: 'acquisition',
  status: 'Underwriting',
  dispositionType: 'SALE',
  purchasePrice: 485000,
  purchase_price: 485000,
  rehab_costs: 62000,
  exit_strategy: 'Fix & Flip',
  entity_type: 'LLC',
  phase_completion_pct: 42,
  estimatedIrr: 0.184,
  dealId: null,
  dealSlug: null,
  dealAddress: null,
  storage_used_bytes: 1000,
  storageQuotaBytes: 536870912,
  todos: [],
  documents: [],
  acquisitionStatus: 'analyzing',
  contingencies: [
    {
      id: 'cont-inspection',
      type: 'inspection',
      label: 'General Home & Sewer Inspection',
      deadline: new Date(Date.now() + 20 * 3600000).toISOString(), // 20 hours -> critical!
      status: 'open',
      responsiblePartyUid: 'usr-1',
      responsiblePartyName: 'Alex Inspector',
      extensionHistory: [],
      supportingDocumentUrls: [],
    },
    {
      id: 'cont-financing',
      type: 'financing',
      label: 'Hard Money Commitment',
      deadline: new Date(Date.now() + 42 * 3600000).toISOString(), // 42 hours -> urgent!
      status: 'open',
      responsiblePartyUid: 'usr-2',
      responsiblePartyName: 'Jordan Lender',
      extensionHistory: [],
      supportingDocumentUrls: [],
    },
  ],
  underwritingSnapshot: {
    snapshotId: 'a12b3c4d-5e6f-4a0b-8c1d-2e3f4a5b6c7d',
    version: 1,
    engineVersion: 2,
    superseded: false,
    createdAt: '2026-08-01T12:00:00.000Z',
    createdByUid: 'usr-analyst-1',
    source: 'deal_calculator',
    calculatorVersion: '1.0.0',
    inputs: {
      strategy: 'flip',
      purchasePrice: 485000,
      buyerClosingCostsPct: 2.0,
      buyerClosingCostsAmount: 9700,
      rehabBudget: 62000,
      estimatedARV: 650000,
      grossMonthlyRent: 4200,
      otherMonthlyIncome: 0,
      vacancyRatePct: 6.0,
      operatingExpenseRatioPct: 35.0,
      annualPropertyTax: 7200,
      annualInsurance: 1800,
      monthlyHOA: 0,
      monthlyManagementFeePct: 8.0,
      targetLtvPct: 75.0,
      interestRatePct: 6.5,
      amortizationYears: 30,
      interestOnlyMonths: 0,
      holdPeriodYears: 5,
      exitCapRatePct: 6.5,
      costOfSalePct: 5.0,
    },
    outputs: {
      totalCostBasis: 556700,
      loanAmount: 363750,
      cashRequired: 192950,
      grossOperatingIncome: 47376,
      totalOperatingExpenses: 16582,
      netOperatingIncome: 30794,
      monthlyDebtService: 2299.15,
      annualDebtService: 27589.8,
      annualNetCashFlow: 3204.2,
      capRateOnCost: 5.53,
      cashOnCashReturnPct: 1.66,
      projectedIrrPct: 18.4,
      dscr: 1.12,
      ltvPct: 75.0,
      grossRentMultiplier: 9.62,
      maximumAllowableOffer70Pct: 383300,
      calculatedAt: '2026-08-01T12:00:00.000Z',
      engineVersion: '1.0.0',
    },
    assumptions: {
      notes: 'East Austin gentrification corridor.',
    },
  },
  tasks: [],
};

describe('AcquisitionWorkspaceView Component', () => {
  it('renders all 8 pipeline stages with Analyzing marked as current', () => {
    const html = renderToString(
      <AcquisitionWorkspaceView project={baseProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Lead');
    expect(html).toContain('Analyzing');
    expect(html).toContain('Offer Sent');
    expect(html).toContain('Negotiating');
    expect(html).toContain('Under Contract');
    expect(html).toContain('Due Diligence');
    expect(html).toContain('Clear to Close');
    expect(html).toContain('Closed');

    // Shows advance action for next stage (offer_sent)
    expect(html).toContain('Submit Offer (Offer Sent)');
  });

  it('displays the honest unconfigured property data API banner (Rule 5)', () => {
    const html = renderToString(
      <AcquisitionWorkspaceView project={baseProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('[Property Data API: Not Configured — Manual Entry Enabled]');
  });

  it('renders progressive hard-date contingency alerts for 20h and 42h deadlines', () => {
    const html = renderToString(
      <AcquisitionWorkspaceView project={baseProject} onUpdateProject={() => {}} />,
    );

    // Critical (< 24h) and Urgent (< 48h) alerts
    expect(html).toContain('CRITICAL CONTINGENCY EXPIRATION — DATE GOES HARD');
    expect(html).toContain('General Home &amp; Sewer Inspection');
    expect(html).toContain('URGENT CONTINGENCY DEADLINE');
    expect(html).toContain('Hard Money Commitment');
  });

  it('renders accurate financial engine underwriting metrics and lineage badge', () => {
    const html = renderToString(
      <AcquisitionWorkspaceView project={baseProject} onUpdateProject={() => {}} />,
    );

    // Canonical calculations from financial engine
    expect(html).toContain('Underwriting &amp; Financial Metrics');
    expect(html).toContain('Locked from Deal Calculator');
    expect(html).toContain('Underwritten on');
    expect(html).toContain('View Snapshot');
    expect(html).toContain('MAO (70% Rule)');
    expect(html).toContain('Cap Rate on Cost');
    expect(html).toContain('Cash-on-Cash Return');
    expect(html).toContain('Monthly Debt Service');
    expect(html).toContain('Snapshot ID:');
    expect(html).toContain('a12b3c4d-5e6f-4a0b-8c1d-2e3f4a5b6c7d');
  });

  it('renders 11 under-contract tasks when populated', () => {
    const projectWithTasks: ProjectWorkspace = {
      ...baseProject,
      acquisitionStatus: 'under_contract',
      tasks: [
        {
          id: 'task-1',
          projectId: 'deal-test-1',
          title: 'Wire Earnest Money Deposit (EMD)',
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          status: 'pending',
          isAutoGenerated: true,
          sortOrder: 1,
        },
        {
          id: 'task-2',
          projectId: 'deal-test-1',
          title: 'Schedule General Property Inspection',
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          status: 'complete',
          isAutoGenerated: true,
          sortOrder: 2,
        },
      ],
    };

    const html = renderToString(
      <AcquisitionWorkspaceView project={projectWithTasks} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Wire Earnest Money Deposit (EMD)');
    expect(html).toContain('Schedule General Property Inspection');
    expect(html).toContain('Contract Milestone');
    expect(html).toContain('1 of 2 tasks completed');
    expect(html).toContain('% Done');
  });

  it('renders dead deal banner when deal is dead', () => {
    const deadProject: ProjectWorkspace = {
      ...baseProject,
      acquisitionStatus: 'dead',
      deadRecord: {
        deadReasonCategory: 'inspection',
        deadReasonNotes: 'Unrepaired structural foundation movement exceeded $40k repair credit.',
        archivedAt: '2026-08-15T14:00:00.000Z',
        archivedByUid: 'usr-1',
        previousStatus: 'due_diligence',
      },
    };

    const html = renderToString(
      <AcquisitionWorkspaceView project={deadProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Project Archived (Dead Deal)');
    expect(html).toContain('Terminal State: Dead');
    expect(html).toContain('Inspection Failure / Structural Defects');
    expect(html).toContain('Unrepaired structural foundation movement exceeded $40k repair credit.');
  });

  it('Bug_81: displays $50,000 (and never $NaN) for Rehab Budget on Underwriting & Financial Metrics when created with Purchase Price = $450,000 and Rehab Budget = $50,000', async () => {
    const createdProject = await createProjectInStore({
      id: 'proj-674937',
      property_address: '1247 Elm Street, Austin, TX 78702',
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 450000,
      rehab_costs: undefined as unknown as number,
      rehabBudget: 50000,
      underwritingSnapshot: {
        ...baseProject.underwritingSnapshot!,
        inputs: {
          ...baseProject.underwritingSnapshot!.inputs,
          purchasePrice: 450000,
          rehabBudget: 50000,
        },
      },
    } as any);

    expect(createdProject.purchasePrice).toBe(450000);
    expect(createdProject.rehab_costs).toBe(50000);

    const html = renderToString(
      <AcquisitionWorkspaceView project={createdProject} onUpdateProject={() => {}} />,
    );

    expect(html).not.toContain('$NaN');
    expect(html).toContain('data-testid="acquisition-purchase-price-value"');
    expect(html).toContain('$450,000');
    expect(html).toContain('data-testid="acquisition-rehab-budget-value"');
    expect(html).toContain('$50,000');

    // Also verify AcquisitionWorkspaceView resolves effectiveRehabBudget even if rehab_costs is undefined on raw prop
    const unnormalizedProject = {
      ...baseProject,
      purchasePrice: 450000,
      rehab_costs: undefined as unknown as number,
      underwritingSnapshot: {
        ...baseProject.underwritingSnapshot!,
        inputs: {
          ...baseProject.underwritingSnapshot!.inputs,
          purchasePrice: 450000,
          rehabBudget: 50000,
        },
      },
    };
    const fallbackHtml = renderToString(
      <AcquisitionWorkspaceView project={unnormalizedProject} onUpdateProject={() => {}} />,
    );
    expect(fallbackHtml).not.toContain('$NaN');
    expect(fallbackHtml).toContain('$50,000');

    // Also verify formatCurrency safely formats non-finite values as $0 instead of $NaN
    expect(formatCurrency(undefined)).toBe('$0');
    expect(formatCurrency(NaN)).toBe('$0');
    expect(formatCurrency(50000)).toBe('$50,000');
  });

  it('Bug_82: populates Estimated ARV ($650,000), MAO ($405,000), Cap Rate, Cash-on-Cash, Debt Service, and Projected IRR on Workspace Dashboard without dashes or "ARV not provided" notice', async () => {
    // 1. Test project created with Fix & Flip wizard payload (Purchase = $450k, Rehab = $50k, ARV = $650k, Rent = $0)
    // followed by post-creation contingency update
    const created = await createProjectInStore({
      id: 'proj-674937-bug82',
      property_address: '1247 Elm Street, Austin, TX 78702',
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 450000,
      rehab_costs: 50000,
      rehabBudget: 50000,
      estimatedARV: 650000,
      estimatedExitValue: 650000,
      underwritingSnapshot: {
        ...baseProject.underwritingSnapshot!,
        inputs: {
          ...baseProject.underwritingSnapshot!.inputs,
          strategy: 'flip',
          purchasePrice: 450000,
          rehabBudget: 50000,
          estimatedARV: 650000,
          grossMonthlyRent: 0,
        },
      },
    } as any);

    await updateProjectInStore(created.id, {
      contingencies: baseProject.contingencies,
    });

    const loaded = await getProjectFromStore(created.id);
    expect(loaded).not.toBeNull();

    const html = renderToString(
      <AcquisitionWorkspaceView project={loaded!} onUpdateProject={() => {}} />,
    );

    expect(html).not.toContain('ARV not provided');
    expect(html).toContain('data-testid="acquisition-purchase-price-value"');
    expect(html).toContain('>$450,000<');
    expect(html).toContain('data-testid="acquisition-rehab-budget-value"');
    expect(html).toContain('>$50,000<');
    expect(html).toContain('data-testid="acquisition-estimated-arv-value"');
    expect(html).toContain('>$650,000<');
    expect(html).toContain('data-testid="acquisition-mao-value"');
    expect(html).toContain('>$405,000<');
    expect(html).toContain('data-testid="acquisition-cap-rate-value"');
    expect(html).not.toMatch(/data-testid="acquisition-cap-rate-value"[^>]*>—</);
    expect(html).not.toMatch(/data-testid="acquisition-cap-rate-value"[^>]*>0\.00%</);
    expect(html).toContain('data-testid="acquisition-coc-value"');
    expect(html).not.toMatch(/data-testid="acquisition-coc-value"[^>]*>—</);
    expect(html).toContain('data-testid="acquisition-debt-service-value"');
    expect(html).not.toMatch(/data-testid="acquisition-debt-service-value"[^>]*>—</);
    expect(html).toContain('/mo<');
    expect(html).toContain('data-testid="acquisition-projected-irr-value"');
    expect(html).not.toMatch(/data-testid="acquisition-projected-irr-value"[^>]*>—</);
    expect(html).not.toContain('No Sign Change');

    // 2. Also verify a partial/legacy project record where underwritingSnapshot is missing still derives ARV ($650,000) and all metrics cleanly
    const partialProject: ProjectWorkspace = {
      ...baseProject,
      id: 'proj-674937',
      purchasePrice: 450000,
      purchase_price: 450000,
      rehab_costs: 50000,
      underwritingSnapshot: undefined,
    };
    const partialHtml = renderToString(
      <AcquisitionWorkspaceView project={partialProject} onUpdateProject={() => {}} />,
    );
    expect(partialHtml).not.toContain('ARV not provided');
    expect(partialHtml).toContain('>$650,000<');
    expect(partialHtml).toContain('>$405,000<');
    expect(partialHtml).not.toMatch(/data-testid="acquisition-cap-rate-value"[^>]*>—</);
    expect(partialHtml).not.toMatch(/data-testid="acquisition-coc-value"[^>]*>—</);
    expect(partialHtml).not.toMatch(/data-testid="acquisition-debt-service-value"[^>]*>—</);
    expect(partialHtml).not.toMatch(/data-testid="acquisition-projected-irr-value"[^>]*>—</);
  });

  it('Bug_83: suppresses Stage Wire Validation: UNEXPECTED_KEY__METADATA_UNKNOWN_JSON noise from Kanban Pipeline board, project store, workspace alerts, and API validation adapters', async () => {
    const noiseToken = 'Stage Wire Validation: UNEXPECTED_KEY__METADATA_UNKNOWN_JSON';
    expect(isInternalMetadataValidationNoise(noiseToken)).toBe(true);
    expect(isInternalMetadataValidationNoise('1247 Elm Street, Austin, TX 78702')).toBe(false);

    // 1. Project store strips unknown metadata keys, synthetic probe contingencies, and fuzz project records
    const validDeal = await createProjectInStore({
      id: 'proj-bug83-clean',
      property_address: '1247 Elm Street, Austin, TX 78702',
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 450000,
      rehab_costs: 50000,
      rehabBudget: 50000,
      estimatedARV: 650000,
      __metadata_unknown_json: noiseToken,
      UNEXPECTED_KEY__METADATA_UNKNOWN_JSON: noiseToken,
      error: noiseToken,
      validationError: noiseToken,
      contingencies: [
        ...baseProject.contingencies!,
        {
          id: 'cont-fuzz-probe',
          type: 'inspection',
          label: noiseToken,
          deadline: new Date(Date.now() + 10 * 3600000).toISOString(),
          status: 'open',
          responsiblePartyUid: 'usr-fuzz',
          responsiblePartyName: 'Fuzz Runner',
          extensionHistory: [],
          supportingDocumentUrls: [],
        },
      ],
    } as any);

    await createProjectInStore({
      id: 'proj-bug83-fuzz-noise',
      property_address: noiseToken,
      address: noiseToken,
      propertyName: noiseToken,
      purchasePrice: 1,
    } as any);

    expect((validDeal as any).__metadata_unknown_json).toBeUndefined();
    expect((validDeal as any).UNEXPECTED_KEY__METADATA_UNKNOWN_JSON).toBeUndefined();
    expect((validDeal as any).error).toBeUndefined();
    expect((validDeal as any).validationError).toBeUndefined();
    expect(
      (validDeal.contingencies ?? []).some((c) => c.label.includes('UNEXPECTED_KEY')),
    ).toBe(false);

    const listedProjects = await listProjectsFromStore();
    expect(
      listedProjects.some(
        (p) =>
          p.id === 'proj-bug83-fuzz-noise' ||
          p.propertyName.includes('UNEXPECTED_KEY') ||
          p.address.includes('UNEXPECTED_KEY'),
      ),
    ).toBe(false);
    expect(listedProjects.some((p) => p.id === 'proj-bug83-clean')).toBe(true);

    // 2. AcquisitionPipelineBoard renders cleanly on /projects without the Stage Wire Validation banner or probe card
    const boardSummaries: ProjectSummary[] = [
      {
        id: validDeal.id,
        propertyName: validDeal.propertyName,
        address: validDeal.address,
        city: validDeal.city,
        currentPhase: 'acquisition',
        status: 'Active',
        dispositionType: 'SALE',
        purchasePrice: 450000,
        estimatedIrr: 0.184,
        phaseCompletionPct: 25,
        ownershipPercentage: 100,
        estimatedExitValue: 650000,
        dealId: null,
        dealSlug: null,
        dealAddress: null,
        acquisitionStatus: 'analyzing',
      },
      {
        id: 'fuzz-probe-card',
        propertyName: noiseToken,
        address: noiseToken,
        city: 'Austin, TX',
        currentPhase: 'acquisition',
        status: 'Active',
        dispositionType: 'SALE',
        purchasePrice: 0,
        estimatedIrr: 0,
        phaseCompletionPct: 0,
        ownershipPercentage: 100,
        estimatedExitValue: 0,
        dealId: null,
        dealSlug: null,
        dealAddress: null,
        acquisitionStatus: 'lead',
      },
    ];

    const boardHtml = renderToString(<AcquisitionPipelineBoard projects={boardSummaries} />);
    expect(boardHtml).toContain('data-testid="acquisition-pipeline-board"');
    expect(boardHtml).toContain('1247 Elm Street');
    expect(boardHtml).not.toContain('UNEXPECTED_KEY');
    expect(boardHtml).not.toContain('METADATA_UNKNOWN_JSON');
    expect(boardHtml).not.toContain('Stage Wire Validation');

    // 3. AcquisitionWorkspaceView suppresses internal metadata validation noise in hard-date alerts
    const pollutedWorkspace: ProjectWorkspace = {
      ...baseProject,
      contingencies: [
        ...baseProject.contingencies!,
        {
          id: 'cont-wire-noise',
          type: 'financing',
          label: noiseToken,
          deadline: new Date(Date.now() + 6 * 3600000).toISOString(),
          status: 'open',
          responsiblePartyUid: 'usr-1',
          responsiblePartyName: 'Wire Validator',
          extensionHistory: [],
          supportingDocumentUrls: [],
        },
      ],
    };
    const workspaceHtml = renderToString(
      <AcquisitionWorkspaceView project={pollutedWorkspace} onUpdateProject={() => {}} />,
    );
    expect(workspaceHtml).not.toContain('UNEXPECTED_KEY');
    expect(workspaceHtml).not.toContain('METADATA_UNKNOWN_JSON');
    expect(workspaceHtml).not.toContain('Stage Wire Validation');

    // 4. API validation adapter filters out internal metadata validation keys and messages
    expect(
      extractValidationErrorMessage(
        { message: noiseToken },
        'Failed to load projects',
      ),
    ).toBe('Failed to load projects');
    expect(
      formatValidationDetailsMap({
        UNEXPECTED_KEY__METADATA_UNKNOWN_JSON: ['Stage Wire Validation: UNEXPECTED_KEY__METADATA_UNKNOWN_JSON'],
        address: ['Property address is required'],
      }),
    ).toBe('Validation failed: Property Address (address): Property address is required');
  });
});

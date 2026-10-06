import type {
  ProjectSummary,
  ProjectWorkspace,
  ProjectDealComponent,
  AssigneeOption,
  LegacyProjectPhase,
} from './types';
import { addSeedDeal, SEED_RAW_DEALS } from '../marketplace/seed-data';

export const DEFAULT_SAMPLE_PHASE_ASSIGNEES: Partial<Record<LegacyProjectPhase, AssigneeOption | null>> = {
  acquisition: {
    id: 'usr-acq-sarah',
    uid: 'usr-acq-sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@paperworking-investments.com',
    role: 'Director of Acquisitions',
    status: 'active',
  },
  purchase: {
    id: 'usr-fund-david',
    uid: 'usr-fund-david',
    name: 'David Vance',
    email: 'david.vance@apexcapitalpartners.com',
    role: 'Capital Markets Lead',
    status: 'active',
  },
  hold: {
    id: 'usr-hold-elena',
    uid: 'usr-hold-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@highlandassetmgmt.com',
    role: 'Asset Manager',
    status: 'active',
  },
  exit: {
    id: 'usr-exit-marcus',
    uid: 'usr-exit-marcus',
    name: 'Marcus Brody',
    email: 'marcus.brody@sterlingcapitaladvisors.com',
    role: 'Disposition Director',
    status: 'active',
  },
};

const BASE_TODOS = {
  acquisition: [
    {
      id: 'todo-acq-1',
      type: 'file' as const,
      content: 'Upload proof of funds letter',
      status: 'completed' as const,
      phase: 'acquisition' as const,
      action_label: 'Upload letter',
    },
    {
      id: 'todo-acq-2',
      type: 'question' as const,
      content: 'Confirm maximum offer price',
      status: 'pending' as const,
      phase: 'acquisition' as const,
      action_label: 'Set offer cap',
    },
  ],
  purchase: [
    {
      id: 'todo-fund-1',
      type: 'task' as const,
      content: 'Collect lender package checklist items',
      status: 'pending' as const,
      phase: 'purchase' as const,
      action_label: 'Open checklist',
    },
  ],
  hold: [
    {
      id: 'todo-hold-1',
      type: 'task' as const,
      content: 'Update monthly operating statement',
      status: 'pending' as const,
      phase: 'hold' as const,
      action_label: 'Add statement',
    },
  ],
  exit: [
    {
      id: 'todo-exit-1',
      type: 'file' as const,
      content: 'Upload disposition settlement statement',
      status: 'pending' as const,
      phase: 'exit' as const,
      action_label: 'Upload statement',
    },
  ],
};

const globalWithSeed = globalThis as unknown as {
  __PW_SEED_PROJECTS?: ProjectWorkspace[];
};

export function buildSeedProjectDeals(project: Partial<ProjectWorkspace>): ProjectDealComponent[] {
  if (project.deals && project.deals.length > 0) {
    return project.deals;
  }

  const deals: ProjectDealComponent[] = [];
  const pId = project.id || project.project_id || 'project';
  const addr = project.address || project.property_address || 'Property Address';
  const name = project.propertyName || addr.split(',')[0];
  const purchasePrice = Number(project.purchasePrice || project.purchase_price || 450000);
  const rehabCost = Number(project.rehab_costs || 50000);

  // 1. Primary Underwriting Deal Component (canonical pro-forma)
  const snap = project.underwritingSnapshot;
  deals.push({
    id: `deal-calc-${pId}`,
    slug: `${pId}-underwriting`,
    name: `${name} Acquisition Underwriting`,
    address: addr,
    dealType: 'underwriting',
    status: snap ? 'underwritten' : 'draft',
    purchasePrice: snap?.inputs.purchasePrice ?? purchasePrice,
    rehabBudget: snap?.inputs.rehabBudget ?? rehabCost,
    cashRequired: snap?.outputs.cashRequired ?? Math.round(purchasePrice * 0.25),
    projectedIrr: snap?.outputs.projectedIrrPct ?? (project.estimatedIrr ? Number((project.estimatedIrr * 100).toFixed(1)) : 16.5),
    capRate: snap?.outputs.capRateOnCost ?? 6.2,
    cashOnCashPct: snap?.outputs.cashOnCashReturnPct ?? 7.5,
    updatedAt: snap?.createdAt || '2026-08-01T12:00:00.000Z',
  });

  // 2. Marketplace Syndication Offering Component (if dealId/dealSlug is active)
  if (project.dealId || project.dealSlug) {
    const rawDeal = SEED_RAW_DEALS.find((d) => d.id === project.dealId || d.slug === project.dealSlug);
    deals.push({
      id: project.dealId || `deal-mp-${pId}`,
      slug: project.dealSlug || project.dealId || 'offering',
      name: rawDeal?.projects?.[0]?.name || `${name} Syndication Offering`,
      address: project.dealAddress || addr,
      dealType: 'syndication',
      status: (rawDeal?.status as any) || 'active',
      purchasePrice: rawDeal?.purchasePrice ?? purchasePrice,
      rehabBudget: rawDeal?.rehabCost ?? rehabCost,
      cashRequired: rawDeal?.calculatorResults?.cashRequired ?? Math.round(purchasePrice * 0.25),
      projectedIrr: rawDeal?.targetIrr ?? (project.estimatedIrr ? Number((project.estimatedIrr * 100).toFixed(1)) : 17.0),
      capRate: rawDeal?.calculatorResults?.capRateOnCost ?? 6.8,
      targetRaise: rawDeal?.fundingTarget ?? 150000,
      committedAmount: rawDeal?.commitments?.reduce((acc, c) => acc + Number(c.amount || 0), 0) || 75000,
      marketplaceUrl: `/marketplace/${project.dealSlug || project.dealId}`,
      updatedAt: '2026-08-01T12:00:00.000Z',
    });
  }

  // 3. Financing / Debt Component (if project funding exists)
  if (project.funding?.loanAmount) {
    deals.push({
      id: `deal-debt-${pId}`,
      slug: `${pId}-debt`,
      name: `${project.funding.lenderName || 'Senior Debt'} Financing Package`,
      address: addr,
      dealType: 'financing',
      status: project.funding.fundingStatus === 'Funded' ? 'funded' : 'active',
      purchasePrice,
      cashRequired: project.funding.actualCashToClose ?? Math.round(purchasePrice * 0.25),
      committedAmount: project.funding.loanAmount,
      updatedAt: '2026-08-01T12:00:00.000Z',
    });
  }

  return deals;
}

const INITIAL_SEED_PROJECTS: ProjectWorkspace[] = [
  {
    id: 'deal-lifecycle',
    project_id: 'deal-lifecycle',
    propertyName: '742 Evergreen Terrace',
    address: '742 Evergreen Terrace, Austin, TX 78704',
    property_address: '742 Evergreen Terrace, Austin, TX 78704',
    city: 'Austin, TX',
    currentPhase: 'acquisition',
    phase: 'acquisition',
    status: 'Lead intake',
    dispositionType: 'SALE',
    purchasePrice: 450000,
    purchase_price: 450000,
    rehab_costs: 55000,
    exit_strategy: 'Fix & Flip',
    entity_type: 'LLC (single)',
    phase_completion_pct: 12,
    estimatedIrr: 0.185,
    dealId: 'deal-mp-lifecycle',
    dealSlug: '742evergreen',
    dealAddress: '742 Evergreen Terrace, Austin, TX 78704',
    acquisitionStatus: 'lead',
    organizationId: 'org-1',
    tasks: [],
    contingencies: [],
    storage_used_bytes: 1_200_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.acquisition,
    documents: [],
    teamMembers: [
      { id: 'usr-analyst-1', uid: 'usr-analyst-1', name: 'Alex Mercer', role: 'Analyst' },
      { id: 'usr-lender-1', uid: 'usr-lender-1', name: 'Elena Rostova', role: 'Lender' },
      { id: 'usr-escrow-1', uid: 'usr-escrow-1', name: 'Marcus Vance', role: 'Escrow Officer' },
    ],
    phaseAssignees: { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
  },
  {
    id: 'deal-dead-path',
    project_id: 'deal-dead-path',
    propertyName: '904 Oakwood Ridge',
    address: '904 Oakwood Ridge, Austin, TX 78703',
    property_address: '904 Oakwood Ridge, Austin, TX 78703',
    city: 'Austin, TX',
    currentPhase: 'acquisition',
    phase: 'acquisition',
    status: 'Underwriting',
    dispositionType: 'SALE',
    purchasePrice: 510000,
    purchase_price: 510000,
    rehab_costs: 40000,
    exit_strategy: 'Fix & Flip',
    entity_type: 'LLC',
    phase_completion_pct: 20,
    estimatedIrr: 0.165,
    dealId: 'deal-mp-dead',
    dealSlug: '904oakwood',
    dealAddress: '904 Oakwood Ridge, Austin, TX 78703',
    acquisitionStatus: 'analyzing',
    organizationId: 'org-1',
    tasks: [],
    contingencies: [],
    storage_used_bytes: 1_100_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.acquisition,
    documents: [],
    phaseAssignees: { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
  },
  {
    id: 'deal-org-beta',
    project_id: 'deal-org-beta',
    propertyName: '100 Beta Tower',
    address: '100 Beta Tower, Dallas, TX 75201',
    property_address: '100 Beta Tower, Dallas, TX 75201',
    city: 'Dallas, TX',
    currentPhase: 'acquisition',
    phase: 'acquisition',
    status: 'Analyzing',
    dispositionType: 'SALE',
    purchasePrice: 750000,
    purchase_price: 750000,
    rehab_costs: 80000,
    exit_strategy: 'Fix & Flip',
    entity_type: 'LLC',
    phase_completion_pct: 25,
    estimatedIrr: 0.19,
    dealId: null,
    dealSlug: null,
    dealAddress: null,
    acquisitionStatus: 'analyzing',
    organizationId: 'org-beta',
    tasks: [],
    contingencies: [],
    storage_used_bytes: 1_000_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.acquisition,
    documents: [],
    phaseAssignees: { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
  },
  {
    id: 'deal-1',
    project_id: 'deal-1',
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
    entity_type: 'LLC (single)',
    phase_completion_pct: 42,
    estimatedIrr: 0.184,
    dealId: 'deal-mp-1',
    dealSlug: '1247elmst',
    dealAddress: '1247 Elm Street, Austin, TX 78702',
    acquisitionStatus: 'analyzing',
    organizationId: 'org-1',
    tasks: [],
    contingencies: [
      {
        id: 'e28a3f89-9a73-4566-a36c-2f96e5b497b1',
        type: 'inspection',
        label: 'Inspection Contingency',
        deadline: new Date(Date.now() + 38 * 3600000).toISOString(),
        status: 'open',
        responsiblePartyUid: 'usr-analyst-1',
        responsiblePartyName: 'Alex Mercer',
        extensionHistory: [],
        supportingDocumentUrls: [],
      },
      {
        id: 'f94b4192-31d8-4f81-9b45-6677f59dae13',
        type: 'financing',
        label: 'Financing Contingency',
        deadline: new Date(Date.now() + 6 * 86400000).toISOString(),
        status: 'open',
        responsiblePartyUid: 'usr-lead-1',
        responsiblePartyName: 'Jordan Taylor',
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
        operatingExpensesAnnual: 16582,
        annualPropertyTax: 7200,
        annualInsurance: 1800,
        monthlyHOA: 0,
        monthlyManagementFeePct: 8.0,
        targetLtvPct: 75.0,
        interestRatePct: 6.5,
        amortizationYears: 30,
        interestOnlyMonths: 0,
        holdPeriodYears: 5,
        annualAppreciationPct: 3.0,
        exitCapRatePct: 6.5,
        costOfSalePct: 5.0,
        terminalValueMethod: 'appreciation_pct',
      },
      outputs: {
        totalCostBasis: 556700,
        loanAmount: 363750,
        cashRequired: 192950,
        buyerClosingCostsAmount: 9700,
        grossOperatingIncome: 47376,
        totalOperatingExpenses: 16582,
        netOperatingIncome: 30794,
        monthlyDebtService: 2299.15,
        annualDebtService: 27589.8,
        annualNetCashFlow: 3204.2,
        monthlyNetCashFlow: 267,
        capRateOnCost: 5.53,
        cashOnCashReturnPct: 1.66,
        projectedIrrPct: 18.4,
        irrStatus: 'converged',
        irrRoots: [{ ratePct: 18.4, npvResidual: 0 }],
        irrCashFlowVector: [-192950, 3204, 3204, 3204, 3204, 250000],
        terminalValueMethod: 'appreciation_pct',
        appreciationBase: 'purchase_price',
        terminalValueLabel: 'Exit @ 3.0%/yr on $485,000 purchase price',
        estimatedExitValue: 562243,
        projectedFlipProfit: 25000,
        dscr: 1.12,
        ltvPct: 75.0,
        grossRentMultiplier: 9.62,
        maximumAllowableOffer70Pct: 383300,
        loanConstantPct: 7.585,
        yieldOnCostPct: 5.53,
        isNegativeLeverage: true,
        calculatedAt: '2026-08-01T12:00:00.000Z',
        engineVersion: '1.0.0',
      },
      assumptions: {
        propertyCondition: 'B-',
        submarketRating: 'A',
        notes: 'East Austin gentrification corridor; rapid appreciation.',
      },
    },
    storage_used_bytes: 1_240_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.acquisition,
    documents: [
      {
        doc_id: 'doc-1',
        type: 'Proof of Funds',
        name: 'Bank_Statement_POF.pdf',
        url: '/api/projects/documents/doc-1.pdf',
        generated_at: '2026-08-01T00:00:00.000Z',
      },
    ],
    phaseAssignees: { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
  },
  {
    id: 'deal-2',
    project_id: 'deal-2',
    propertyName: '88 Harbor Lane',
    address: '88 Harbor Lane, Tampa, FL 33602',
    property_address: '88 Harbor Lane, Tampa, FL 33602',
    city: 'Tampa, FL',
    currentPhase: 'purchase',
    phase: 'purchase',
    status: 'Lender review',
    dispositionType: 'SALE',
    purchasePrice: 392000,
    purchase_price: 392000,
    rehab_costs: 48000,
    exit_strategy: 'Fix & Flip',
    entity_type: 'LLC (single)',
    phase_completion_pct: 58,
    estimatedIrr: 0.162,
    dealId: null,
    dealSlug: null,
    dealAddress: null,
    funding: {
      loanAmount: 294000,
      interestRatePct: 6.875,
      amortizationYears: 30,
      downPayment: 98000,
      closingCosts: 7840,
      actualCashToClose: 105840,
      fundingStatus: 'Term Sheet Received',
      lenderName: 'Apex Commercial Capital',
      loanType: 'Hard Money / Bridge',
      monthlyDebtService: 1931.33,
      capitalStack: {
        seniorDebt: 294000,
        mezzanineDebt: 0,
        preferredEquity: 0,
        investorEquity: 85000,
        leadEquity: 68840,
        totalCostBasis: 447840,
        ltvPct: 75.0,
        ltcPct: 65.6,
      },
      lenderConditions: [
        {
          id: 'cond-1',
          category: 'PTD',
          title: 'Narrative appraisal report review & valuation acceptance',
          status: 'approved',
          clearedAt: '2026-08-11T14:00:00.000Z',
        },
        {
          id: 'cond-2',
          category: 'PTD',
          title: 'Title commitment Schedule B items and 24-month chain of title',
          status: 'approved',
          clearedAt: '2026-08-12T10:30:00.000Z',
        },
        {
          id: 'cond-3',
          category: 'PTD',
          title: 'Borrower entity Operating Agreement & Certificate of Good Standing',
          status: 'submitted',
        },
        {
          id: 'cond-4',
          category: 'PTF',
          title: 'Commercial hazard & builder risk insurance binder with lender loss payee',
          status: 'approved',
          clearedAt: '2026-08-13T16:15:00.000Z',
        },
        {
          id: 'cond-5',
          category: 'PTF',
          title: 'Final ALTA / Closing Disclosure reconciliation with escrow desk',
          status: 'pending',
        },
        {
          id: 'cond-6',
          category: 'CLOSING',
          title: 'Senior underwriter final clear-to-close funding authorization',
          status: 'pending',
        },
      ],
      valuationVerification: {
        appraisedValue: 510000,
        appraisalCompany: 'CBRE Valuation Services',
        appraisalDate: '2026-08-11',
        contractPurchasePrice: 392000,
        appraisalGapAmount: 0,
        gapResolutionStrategy: 'none',
        phase1EsaStatus: 'clean',
        surveyStatus: 'clean',
        physicalInspectionSignedOff: true,
        notes: 'Commercial appraisal exceeds purchase price by $118,000. Phase I ESA clear with no recognized environmental conditions.',
      },
      legalTransfer: {
        vestingEntityName: '88 Harbor Lane Investments LLC',
        vestingEntityState: 'FL',
        vestingEntityEin: 'XX-XXX8921',
        goodStandingVerified: true,
        operatingAgreementExecuted: true,
        authorizedSignatoryName: 'Jordan Taylor (Managing Member)',
        titleCommitmentNumber: 'TC-FL-2026-88912',
        titleInsurer: 'First American Title Insurance Co',
        scheduleBCurativeItems: [
          { id: 'sch-1', item: 'Prior mortgage payoff letter verified', category: 'requirement', status: 'cleared' },
          { id: 'sch-2', item: 'Municipal tax certificate paid through current year', category: 'requirement', status: 'cleared' },
          { id: 'sch-3', item: 'Utility easement standard setback exception noted', category: 'exception', status: 'cleared' },
        ],
        wireFraudVerified: true,
        wireVerifiedPhone: '(813) 555-0144',
        wireVerifiedWith: 'Sarah Jenkins (Escrow Officer)',
        wireVerifiedDate: '2026-08-14',
        outgoingWireReference: 'FED-WIRE-2026-99214',
        deedInstrumentNumber: 'DOC-2026-089412',
        deedRecordingDate: '2026-08-15',
      },
    },
    underwritingSnapshot: {
      snapshotId: 'b23c4d5e-6f7a-4b1c-9d2e-3f4a5b6c7d8e',
      version: 1,
      engineVersion: 2,
      superseded: false,
      createdAt: '2026-08-10T12:00:00.000Z',
      createdByUid: 'usr-analyst-1',
      source: 'deal_calculator',
      calculatorVersion: '1.0.0',
      inputs: {
        strategy: 'flip',
        purchasePrice: 392000,
        buyerClosingCostsPct: 2.0,
        buyerClosingCostsAmount: 7840,
        rehabBudget: 48000,
        estimatedARV: 520000,
        grossMonthlyRent: 3600,
        otherMonthlyIncome: 0,
        vacancyRatePct: 6.0,
        operatingExpenseRatioPct: 35.0,
        operatingExpensesAnnual: 14212,
        annualPropertyTax: 5800,
        annualInsurance: 1600,
        monthlyHOA: 0,
        monthlyManagementFeePct: 8.0,
        targetLtvPct: 75.0,
        interestRatePct: 6.875,
        amortizationYears: 30,
        interestOnlyMonths: 0,
        holdPeriodYears: 5,
        annualAppreciationPct: 3.0,
        exitCapRatePct: 6.5,
        costOfSalePct: 5.0,
        terminalValueMethod: 'appreciation_pct',
      },
      outputs: {
        totalCostBasis: 447840,
        loanAmount: 294000,
        cashRequired: 153840,
        buyerClosingCostsAmount: 7840,
        grossOperatingIncome: 40608,
        totalOperatingExpenses: 14212,
        netOperatingIncome: 26396,
        monthlyDebtService: 1931.33,
        annualDebtService: 23175.96,
        annualNetCashFlow: 3220.04,
        monthlyNetCashFlow: 268,
        capRateOnCost: 5.90,
        cashOnCashReturnPct: 2.10,
        projectedIrrPct: 16.2,
        irrStatus: 'converged',
        irrRoots: [{ ratePct: 16.2, npvResidual: 0 }],
        irrCashFlowVector: [-153840, 3220, 3220, 3220, 3220, 200000],
        terminalValueMethod: 'appreciation_pct',
        appreciationBase: 'purchase_price',
        terminalValueLabel: 'Exit @ 3.0%/yr on $392,000 purchase price',
        estimatedExitValue: 454437,
        projectedFlipProfit: 30000,
        dscr: 1.14,
        ltvPct: 75.0,
        grossRentMultiplier: 9.07,
        maximumAllowableOffer70Pct: 308160,
        loanConstantPct: 7.883,
        yieldOnCostPct: 5.90,
        isNegativeLeverage: true,
        calculatedAt: '2026-08-10T12:00:00.000Z',
        engineVersion: '1.0.0',
      },
      assumptions: {
        propertyCondition: 'B',
        submarketRating: 'B+',
        notes: 'Tampa waterfront submarket. 75% bridge financing secured.',
      },
    },
    earnestMoney: {
      amount: 5000,
      holderEntity: 'First American Title & Escrow Co',
      contactName: 'Sarah Jenkins (Escrow Officer)',
      phone: '(813) 555-0144',
      email: 'sjenkins@firstamtitle.example.com',
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      status: 'held',
      receiptConfirmed: true,
      receiptDocUrl: '/api/projects/deal-2/documents/doc-emd.pdf',
      notes: 'EMD wired and receipt confirmed by title on Aug 11.',
    },
    contingencies: [
      {
        id: 'ctg-fund-1',
        type: 'financing',
        label: 'Financing Contingency (Loan Commitment)',
        deadline: new Date(Date.now() + 36 * 3600000).toISOString(),
        status: 'open',
        responsiblePartyUid: 'usr-lender-1',
        responsiblePartyName: 'Elena Rostova (Lender)',
        extensionHistory: [
          {
            extensionId: 'ext-1',
            previousDeadline: new Date(Date.now() - 48 * 3600000).toISOString(),
            newDeadline: new Date(Date.now() + 36 * 3600000).toISOString(),
            reason: 'Lender requested appraisal clarification on detached garage',
            requestedAt: new Date(Date.now() - 50 * 3600000).toISOString(),
            approvedBySeller: true,
          },
        ],
        supportingDocumentUrls: [],
      },
      {
        id: 'ctg-fund-2',
        type: 'appraisal',
        label: 'Appraisal Contingency',
        deadline: new Date(Date.now() + 68 * 3600000).toISOString(),
        status: 'open',
        responsiblePartyUid: 'usr-analyst-1',
        responsiblePartyName: 'Alex Mercer (Analyst)',
        extensionHistory: [],
        supportingDocumentUrls: [],
      },
      {
        id: 'ctg-fund-3',
        type: 'title',
        label: 'Title Review Contingency',
        deadline: new Date(Date.now() + 120 * 3600000).toISOString(),
        status: 'satisfied',
        responsiblePartyUid: 'usr-escrow-1',
        responsiblePartyName: 'Heritage Escrow (Title Officer)',
        extensionHistory: [],
        supportingDocumentUrls: [],
      },
    ],
    teamMembers: [
      {
        id: 'usr-lead-1',
        uid: 'usr-lead-1',
        name: 'Jordan Taylor',
        email: 'jordan.taylor@paperworking.investments',
        role: 'Lead Investor',
        phone: '(512) 555-0100',
      },
      {
        id: 'usr-analyst-1',
        uid: 'usr-analyst-1',
        name: 'Alex Mercer',
        email: 'alex.mercer@paperworking.investments',
        role: 'Acquisitions Analyst',
        phone: '(512) 555-0101',
      },
      {
        id: 'usr-lender-1',
        uid: 'usr-lender-1',
        name: 'Elena Rostova',
        email: 'elena.rostova@apexcommercial.example.com',
        role: 'Mortgage Loan Officer',
        phone: '(813) 555-0199',
      },
      {
        id: 'usr-escrow-1',
        uid: 'usr-escrow-1',
        name: 'Heritage Escrow Co',
        email: 'closings@heritage-escrow.example.com',
        role: 'Title & Escrow Officer',
        phone: '(813) 555-0155',
      },
      {
        id: 'usr-contractor-1',
        uid: 'usr-contractor-1',
        name: 'Marcus Vance',
        email: 'marcus@vanceconstruction.example.com',
        role: 'General Contractor',
        phone: '(813) 555-0177',
      },
    ],
    tasks: [
      {
        id: 'task-fund-1',
        title: 'Wire Earnest Money Deposit to Escrow',
        status: 'complete',
        assignedTo: 'Heritage Escrow Co',
        assignedToUid: 'usr-escrow-1',
        dueDate: new Date(Date.now() - 24 * 3600000).toISOString(),
        linkedContingencyId: 'ctg-fund-3',
        isAutoGenerated: true,
      },
      {
        id: 'task-fund-2',
        title: 'Submit Lender Package & Underwriting Disclosures',
        status: 'complete',
        assignedTo: 'Alex Mercer',
        assignedToUid: 'usr-analyst-1',
        dueDate: new Date(Date.now() - 12 * 3600000).toISOString(),
        linkedContingencyId: 'ctg-fund-1',
        isAutoGenerated: true,
      },
      {
        id: 'task-fund-3',
        title: 'Review Loan Estimate (LE) and Lock Interest Rate',
        status: 'pending',
        assignedTo: 'Elena Rostova',
        assignedToUid: 'usr-lender-1',
        dueDate: new Date(Date.now() + 24 * 3600000).toISOString(),
        linkedContingencyId: 'ctg-fund-1',
        isAutoGenerated: true,
      },
      {
        id: 'task-fund-4',
        title: 'Confirm Appraisal Inspection Scheduled with Lender Desk',
        status: 'pending',
        assignedTo: 'Elena Rostova',
        assignedToUid: 'usr-lender-1',
        dueDate: new Date(Date.now() + 48 * 3600000).toISOString(),
        linkedContingencyId: 'ctg-fund-2',
        isAutoGenerated: true,
      },
      {
        id: 'task-fund-5',
        title: "Obtain Hazard & Builder's Risk Insurance Binder",
        status: 'pending',
        assignedTo: 'Jordan Taylor',
        assignedToUid: 'usr-lead-1',
        dueDate: new Date(Date.now() + 72 * 3600000).toISOString(),
        isAutoGenerated: true,
      },
      {
        id: 'task-fund-6',
        title: 'Review Final Settlement Statement (Closing Disclosure)',
        status: 'pending',
        assignedTo: 'Heritage Escrow Co',
        assignedToUid: 'usr-escrow-1',
        dueDate: new Date(Date.now() + 120 * 3600000).toISOString(),
        isAutoGenerated: true,
      },
    ],
    storage_used_bytes: 2_480_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.purchase,
    documents: [
      {
        doc_id: 'doc-psa-88',
        type: 'Purchase Agreement',
        name: 'Executed_Purchase_and_Sale_Agreement.pdf',
        url: '/api/projects/deal-2/documents/doc-psa-88',
        generated_at: '2026-08-08T14:30:00.000Z',
      },
      {
        doc_id: 'doc-le-88',
        type: 'Loan Estimate',
        name: 'Loan_Estimate_Apex_Commercial.pdf',
        url: '/api/projects/deal-2/documents/doc-le-88',
        generated_at: '2026-08-10T09:15:00.000Z',
      },
      {
        doc_id: 'doc-emd-88',
        type: 'Escrow Receipt',
        name: 'Escrow_Receipt_EMD_Confirmed.pdf',
        url: '/api/projects/deal-2/documents/doc-emd-88',
        generated_at: '2026-08-11T16:45:00.000Z',
      },
    ],
    phaseAssignees: { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
  },
  {
    id: 'deal-3',
    project_id: 'deal-3',
    propertyName: '512 Oak Ridge',
    address: '512 Oak Ridge, Denver, CO 80205',
    property_address: '512 Oak Ridge, Denver, CO 80205',
    city: 'Denver, CO',
    currentPhase: 'hold',
    phase: 'hold',
    status: 'Under construction',
    dispositionType: 'RENT',
    purchasePrice: 540000,
    purchase_price: 540000,
    rehab_costs: 92000,
    exit_strategy: 'BRRRR',
    entity_type: 'LLC',
    phase_completion_pct: 35,
    estimatedIrr: 0.185,
    dealId: 'deal-mp-3',
    dealSlug: 'oakridgehold',
    dealAddress: '88 Oak Ridge Dr, Denver, CO 80202',
    underwritingSnapshot: {
      snapshotId: 'c34d5e6f-7a8b-4c2d-0e3f-4a5b6c7d8e9f',
      version: 1,
      engineVersion: 2,
      superseded: false,
      createdAt: '2026-08-15T12:00:00.000Z',
      createdByUid: 'usr-analyst-1',
      source: 'deal_calculator',
      calculatorVersion: '1.0.0',
      inputs: {
        strategy: 'brrrr',
        purchasePrice: 540000,
        buyerClosingCostsPct: 2.0,
        buyerClosingCostsAmount: 10800,
        rehabBudget: 92000,
        estimatedARV: 720000,
        grossMonthlyRent: 4800,
        otherMonthlyIncome: 0,
        vacancyRatePct: 5.0,
        operatingExpenseRatioPct: 38.0,
        annualPropertyTax: 6800,
        annualInsurance: 2100,
        monthlyHOA: 0,
        monthlyManagementFeePct: 8.0,
        targetLtvPct: 75.0,
        interestRatePct: 6.75,
        amortizationYears: 30,
        interestOnlyMonths: 0,
        holdPeriodYears: 5,
        annualAppreciationPct: 3.0,
        exitCapRatePct: 6.5,
        costOfSalePct: 5.0,
        terminalValueMethod: 'appreciation_pct',
      },
      outputs: {
        totalCostBasis: 642800,
        loanAmount: 405000,
        cashRequired: 237800,
        buyerClosingCostsAmount: 10800,
        grossOperatingIncome: 54720,
        totalOperatingExpenses: 21888,
        netOperatingIncome: 32832,
        monthlyDebtService: 2626.82,
        annualDebtService: 31521.84,
        annualNetCashFlow: 1310.16,
        monthlyNetCashFlow: 109,
        capRateOnCost: 5.11,
        cashOnCashReturnPct: 0.55,
        projectedIrrPct: 18.5,
        irrStatus: 'converged',
        irrRoots: [{ ratePct: 18.5, npvResidual: 0 }],
        irrCashFlowVector: [-237800, 1310, 1310, 1310, 1310, 300000],
        terminalValueMethod: 'appreciation_pct',
        appreciationBase: 'purchase_price',
        terminalValueLabel: 'Exit @ 3.0%/yr on $540,000 purchase price',
        estimatedExitValue: 626008,
        projectedFlipProfit: 35000,
        dscr: 1.04,
        ltvPct: 75.0,
        grossRentMultiplier: 9.38,
        maximumAllowableOffer70Pct: 401200,
        loanConstantPct: 7.783,
        yieldOnCostPct: 5.11,
        isNegativeLeverage: true,
        calculatedAt: '2026-08-15T12:00:00.000Z',
        engineVersion: '1.0.0',
      },
      assumptions: {
        propertyCondition: 'C+',
        submarketRating: 'B+',
        notes: 'Denver RiNo periphery BRRRR rehab; refinance upon stabilization.',
      },
    },
    storage_used_bytes: 5_120_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.hold,
    documents: [
      {
        doc_id: 'doc-3',
        type: 'Insurance Policy',
        name: 'Oak_Ridge_Insurance.pdf',
        url: '/api/projects/documents/doc-3.pdf',
        generated_at: '2026-07-15T00:00:00.000Z',
      },
    ],
    phaseAssignees: { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
  },
];

export const SEED_PROJECTS: ProjectWorkspace[] =
  globalWithSeed.__PW_SEED_PROJECTS ??
  (globalWithSeed.__PW_SEED_PROJECTS = INITIAL_SEED_PROJECTS.map((p) => ({
    ...p,
    deals: p.deals || buildSeedProjectDeals(p),
    phaseAssignees: p.phaseAssignees || { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
  })));

export function addSeedProject(project: Partial<ProjectWorkspace> & { id: string; propertyName: string }): ProjectWorkspace {
  const newProject: ProjectWorkspace = {
    id: project.id,
    project_id: project.id,
    propertyName: project.propertyName,
    address: project.address || project.property_address || 'Property Address',
    property_address: project.property_address || project.address || 'Property Address',
    city: project.city || 'Austin, TX',
    currentPhase:
      (project.currentPhase as any) === 1 || (project.currentPhase as any) === '1' || project.phase === 'acquisition'
        ? 'acquisition'
        : ((project.currentPhase as any) || 'acquisition'),
    phase: project.phase || 'acquisition',
    status: project.status || 'Active',
    dispositionType: project.dispositionType || 'SALE',
    purchasePrice: project.purchasePrice || project.purchase_price || 450000,
    purchase_price: project.purchase_price || project.purchasePrice || 450000,
    rehab_costs: project.rehab_costs || 50000,
    exit_strategy: project.exit_strategy || 'Fix & Flip',
    entity_type: project.entity_type || 'LLC',
    phase_completion_pct: project.phase_completion_pct || 10,
    estimatedIrr: project.estimatedIrr || 0.15,
    dealId: project.dealId || `deal-${project.id}`,
    dealSlug:
      project.dealSlug ||
      (project.address || project.property_address || '1247elmstreet')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase(),
    dealAddress: project.dealAddress || project.address || project.property_address || '1247 Elm Street, Austin, TX 78702',
    underwriting: project.underwriting ?? null,
    acquisitionStatus: project.acquisitionStatus || 'lead',
    tasks: project.tasks || [],
    deadRecord: project.deadRecord ?? null,
    statusHistory: project.statusHistory || [],
    contingencies: project.contingencies || [],
    underwritingSnapshot: project.underwritingSnapshot ?? null,
    isArchived: project.isArchived ?? false,
    teamMembers: project.teamMembers || [],
    offers: project.offers || [],
    checklistItems: project.checklistItems || [],
    earnestMoney: project.earnestMoney ?? null,
    funding: project.funding ?? null,
    deals: project.deals || buildSeedProjectDeals(project),
    storage_used_bytes: 1000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.acquisition,
    documents: project.documents || [],
    organizationId: (project as any).organizationId || 'org-1',
    phaseAssignees: project.phaseAssignees || { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
  };

  const existingIndex = SEED_PROJECTS.findIndex((p) => p.id === newProject.id);
  if (existingIndex >= 0) {
    SEED_PROJECTS[existingIndex] = newProject;
  } else {
    SEED_PROJECTS.unshift(newProject);
  }

  // Two-way synchronization: Every Deal lives inside a Project
  try {
    const rawPurchasePrice = Number(newProject.purchasePrice || newProject.purchase_price || 450000);
    const rawIrr = Number(newProject.estimatedIrr ? (newProject.estimatedIrr * 100).toFixed(1) : 16.5);
    const estArv = Number((newProject.underwritingSnapshot?.inputs as any)?.estimatedARV || Math.round(rawPurchasePrice * 1.25));

    addSeedDeal({
      id: newProject.dealId || `deal-${newProject.id}`,
      slug: newProject.dealSlug || 'deal' + newProject.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      address: newProject.dealAddress || newProject.address || 'Property Address',
      status: 'published',
      visibility: 'marketplace',
      purchasePrice: rawPurchasePrice,
      rehabCost: Number(newProject.rehab_costs || 50000),
      arv: estArv,
      holdingCosts: 15_000,
      projectedRoi: rawIrr,
      targetIrr: rawIrr,
      equityMultiple: 1.75,
      holdPeriod: '3–5 Years',
      minInvestment: 25_000,
      dealType: 'syndication',
      imageUrl: '/images/properties/deal-property-default.jpg',
      isVerifiedOperator: true,
      creatorId: (newProject as any).creatorId || 'lead-1',
      createdAt: new Date().toISOString(),
      projectId: newProject.id,
      projects: [
        {
          name: newProject.propertyName,
          city: (newProject.city || 'Austin, TX').split(',')[0]?.trim() || 'Austin',
          state: (newProject.city || 'Austin, TX').split(',')[1]?.trim() || 'TX',
          zip: '78702',
          propertyType: 'Single-family',
          subStrategy: 'FLIP',
        },
      ],
      commitments: [],
      invitations: [],
      creator: { name: 'Lead Underwriter' },
      calculatorResults: {
        purchasePrice: rawPurchasePrice,
        rehabBudget: Number(newProject.rehab_costs || 50000),
        arv: estArv,
        targetIrr: rawIrr,
        cashRequired: Math.round(rawPurchasePrice * 0.25),
        netOperatingIncome: Math.round(rawPurchasePrice * 0.06),
        capRateOnCost: 6.0,
        equityMultiple: 1.75,
        strategy: newProject.exit_strategy || 'Fix & Flip',
        holdPeriod: '3–5 Years',
      },
    });
  } catch {
    // Non-fatal synchronization fallback
  }

  return newProject;
}

export function updateSeedProject(
  projectId: string,
  updates: Partial<ProjectWorkspace>,
): ProjectWorkspace | null {
  const index = SEED_PROJECTS.findIndex((p) => p.id === projectId);
  if (index < 0) return null;
  const current = SEED_PROJECTS[index];
  const isClosing = updates.acquisitionStatus === 'closed' || updates.status === 'fund';
  const nextPhase = isClosing ? 'purchase' : (updates.currentPhase ?? current.currentPhase);

  const defaultFunding = isClosing && !current.funding ? {
    loanAmount: current.underwritingSnapshot?.outputs.loanAmount ?? Math.round((current.purchasePrice || 392000) * 0.75),
    interestRatePct: current.underwritingSnapshot?.inputs.interestRatePct ?? 6.875,
    amortizationYears: current.underwritingSnapshot?.inputs.amortizationYears ?? 30,
    downPayment: Math.round((current.purchasePrice || 392000) * 0.25),
    closingCosts: Math.round((current.purchasePrice || 392000) * 0.02),
    actualCashToClose: Math.round((current.purchasePrice || 392000) * 0.27),
    fundingStatus: 'Term Sheet Received',
    lenderName: 'Apex Commercial Capital',
    loanType: 'Hard Money / Bridge',
    monthlyDebtService: 0,
  } : null;

  const updated: ProjectWorkspace = {
    ...current,
    ...updates,
    currentPhase: nextPhase,
    phase: nextPhase,
    status: updates.status ?? (isClosing ? 'fund' : current.status),
    underwriting: updates.underwriting !== undefined ? updates.underwriting : current.underwriting,
    purchasePrice: updates.purchasePrice ?? updates.purchase_price ?? current.purchasePrice,
    purchase_price: updates.purchase_price ?? updates.purchasePrice ?? current.purchase_price,
    rehab_costs: updates.rehab_costs ?? current.rehab_costs,
    acquisitionStatus: updates.acquisitionStatus ?? current.acquisitionStatus,
    tasks: updates.tasks ?? current.tasks,
    deadRecord: updates.deadRecord !== undefined ? updates.deadRecord : current.deadRecord,
    statusHistory: updates.statusHistory ?? current.statusHistory,
    contingencies: updates.contingencies ?? current.contingencies,
    underwritingSnapshot: updates.underwritingSnapshot !== undefined ? updates.underwritingSnapshot : current.underwritingSnapshot,
    isArchived: updates.isArchived ?? current.isArchived,
    organizationId: updates.organizationId ?? current.organizationId ?? 'org-1',
    offers: updates.offers ?? current.offers ?? [],
    earnestMoney: updates.earnestMoney !== undefined ? updates.earnestMoney : (current.earnestMoney ?? null),
    checklistItems: updates.checklistItems ?? current.checklistItems ?? [],
    teamMembers: updates.teamMembers ?? current.teamMembers ?? [],
    underwritingRecord: updates.underwritingRecord !== undefined ? updates.underwritingRecord : (current.underwritingRecord ?? null),
    funding: updates.funding !== undefined ? updates.funding : (current.funding ?? defaultFunding),
    documents: updates.documents ?? current.documents ?? [],
    phaseAssignees: updates.phaseAssignees !== undefined ? updates.phaseAssignees : current.phaseAssignees,
  };
  SEED_PROJECTS[index] = updated;
  return updated;
}

export function listSeedProjectSummaries(): ProjectSummary[] {
  return SEED_PROJECTS.map((project) => {
    const explicitArv = project.underwritingSnapshot?.inputs?.estimatedARV ?? null;
    const isIllustrative = false;
    return {
      id: project.id,
      propertyName: project.propertyName,
      address: project.address,
      city: project.city,
      currentPhase: project.currentPhase,
      status: project.status,
      dispositionType: project.dispositionType,
      purchasePrice: project.purchasePrice,
      estimatedIrr: project.estimatedIrr,
      phaseCompletionPct: project.phase_completion_pct,
      ownershipPercentage: 100,
      estimatedExitValue: explicitArv ?? Math.round(project.purchasePrice * 1.22),
      isIllustrativeExitValue: false,
      dealId: project.dealId,
      dealSlug: project.dealSlug,
      dealAddress: project.dealAddress,
      deals: project.deals || buildSeedProjectDeals(project),
      acquisitionStatus: project.acquisitionStatus,
      tasks: project.tasks,
      deadRecord: project.deadRecord,
      contingencies: project.contingencies,
      underwritingSnapshot: project.underwritingSnapshot,
      isArchived: project.isArchived,
      funding: project.funding || null,
      phaseAssignees: project.phaseAssignees,
    };
  });
}

export function getSeedProjectById(projectId: string): ProjectWorkspace | null {
  const existing = SEED_PROJECTS.find((project) => project.id === projectId);
  if (existing) {
    if (!existing.deals || existing.deals.length === 0) {
      existing.deals = buildSeedProjectDeals(existing);
    }
    return existing;
  }

  // Synthesize overarching project from matching deal component
  const deal = SEED_RAW_DEALS.find((d) => d.projectId === projectId || d.projects?.some((p) => p.id === projectId));
  if (deal) {
    const rawProject = deal.projects?.[0];
    const synthetic: ProjectWorkspace = {
      id: projectId,
      project_id: projectId,
      propertyName: rawProject?.name || deal.address.split(',')[0],
      address: deal.address,
      property_address: deal.address,
      city: (deal as any).city && (deal as any).state ? `${(deal as any).city}, ${(deal as any).state}` : deal.address.split(',')[1]?.trim() || 'Austin, TX',
      currentPhase: 'acquisition',
      phase: 'acquisition',
      status: 'Active',
      dispositionType: (deal.calculatorResults?.strategy?.toLowerCase().includes('hold') || deal.calculatorResults?.strategy?.toLowerCase().includes('rent')) ? 'RENT' : 'SALE',
      purchasePrice: deal.purchasePrice || 500000,
      purchase_price: deal.purchasePrice || 500000,
      rehab_costs: deal.rehabCost || 50000,
      exit_strategy: deal.calculatorResults?.strategy || 'Fix & Flip',
      entity_type: 'LLC',
      phase_completion_pct: 25,
      estimatedIrr: (deal.targetIrr || 15) / 100,
      dealId: deal.id,
      dealSlug: deal.slug,
      dealAddress: deal.address,
      organizationId: 'org-1',
      tasks: [],
      contingencies: [],
      storage_used_bytes: 1000000,
      storageQuotaBytes: 536870912,
      todos: BASE_TODOS.acquisition,
      documents: [],
      teamMembers: [
        { id: 'usr-analyst-1', uid: 'usr-analyst-1', name: 'Alex Mercer', role: 'Analyst' },
      ],
      phaseAssignees: { ...DEFAULT_SAMPLE_PHASE_ASSIGNEES },
    };
    synthetic.deals = buildSeedProjectDeals(synthetic);
    SEED_PROJECTS.push(synthetic);
    return synthetic;
  }

  return null;
}

export function deleteSeedProject(projectId: string): boolean {
  const idx = SEED_PROJECTS.findIndex((project) => project.id === projectId);
  if (idx >= 0) {
    SEED_PROJECTS.splice(idx, 1);
  }
  for (let i = SEED_RAW_DEALS.length - 1; i >= 0; i--) {
    const d = SEED_RAW_DEALS[i];
    if (d.projectId === projectId) {
      SEED_RAW_DEALS.splice(i, 1);
    }
  }
  return idx >= 0;
}


export function seedProjectsForApiList(): Array<Record<string, unknown>> {
  return SEED_PROJECTS.map((project) => {
    const explicitArv = project.underwritingSnapshot?.inputs?.estimatedARV ?? null;
    const isIllustrative = false;
    return {
      id: project.id,
      propertyName: project.propertyName,
      address: project.address,
      city: project.city,
      currentPhase: project.currentPhase,
      status: project.status,
      dispositionType: project.dispositionType,
      purchasePrice: project.purchasePrice,
      estimatedIrr: project.estimatedIrr,
      phaseCompletionPct: project.phase_completion_pct,
      ownershipPercentage: 100,
      estimatedExitValue: explicitArv ?? Math.round(project.purchasePrice * 1.22),
      isIllustrativeExitValue: false,
      financials: { purchasePrice: project.purchasePrice },
      dealId: project.dealId,
      dealSlug: project.dealSlug,
      dealAddress: project.dealAddress,
      deals: project.deals || buildSeedProjectDeals(project),
      acquisitionStatus: project.acquisitionStatus || 'lead',
      tasks: project.tasks || [],
      deadRecord: project.deadRecord || null,
      contingencies: project.contingencies || [],
      underwritingSnapshot: project.underwritingSnapshot || null,
      isArchived: Boolean(project.isArchived),
      funding: project.funding || null,
      phaseAssignees: project.phaseAssignees || null,
    };
  });
}

export function seedProjectForApiGet(projectId: string): Record<string, unknown> | null {
  const project = getSeedProjectById(projectId);
  if (!project) return null;
  return { ...project, project_id: project.id, organizationId: project.organizationId ?? 'org-1' };
}

'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { bffFetch } from '@/lib/api/bff-fetch';
import type {
  ProjectWorkspace,
  RenovationTier,
  HoldingCostItem,
  ListingAdRecord,
  HoldPhaseDetails,
  SowLineItem,
  MunicipalPermit,
  ContractorRecord,
  QualityControlInspection,
  DrawRequest,
  GroundUpMilestone,
  DebtServiceHoldDetails,
  PropertyTaxHoldDetails,
  InsuranceHoldDetails,
  UtilityHoldItem,
  HoaHoldDetails,
  CapExHoldItem,
  BookkeepingVarianceSummary,
  StabilizationReadiness,
  PropertyManagerHoldDetails,
  SiteSecurityHoldDetails,
  RoutineMaintenanceHoldItem,
} from '@/lib/projects/types';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import PropertySatelliteViewer from '@/components/maps/PropertySatelliteViewer';
import PropertyImageGallery from '@/components/projects/PropertyImageGallery';
import type { AssigneeOption } from './AssignOrInviteModal';
import {
  HoldConversationalEngine,
  RenovationTierCard,
  CarryingCostsLedgerCard,
  MarketingAdvertisingCard,
  HoldBurnCalculatorCard,
  HoldRenovationDevelopmentTasks,
  HoldFinancialCarryingTasks,
  HoldAssetManagementTasks,
} from './hold';

export interface MaintenanceLog {
  id: string;
  date: string;
  type: string;
  inspector: string;
  notes: string;
  actionRequired: boolean;
}

interface HoldWorkspaceViewProps {
  project: ProjectWorkspace;
  onUpdateProject: (updated: ProjectWorkspace) => void;
}

export default function HoldWorkspaceView({
  project,
  onUpdateProject,
}: HoldWorkspaceViewProps) {
  // Mode Switcher: Conversational vs Executive Workspace
  const [viewMode, setViewMode] = useState<'conversational' | 'workspace'>('workspace');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'conversational') {
        setViewMode('conversational');
      }
    }
  }, []);

  // Disposition Strategy
  const dispositionStrategy: 'RENT' | 'LEASE' | 'SALE' = useMemo(() => {
    if (project.holdPhase?.targetDisposition) return project.holdPhase.targetDisposition;
    if (project.exit_strategy?.toLowerCase().includes('flip') || project.exit_strategy?.toLowerCase().includes('sale')) return 'SALE';
    if (project.exit_strategy?.toLowerCase().includes('lease')) return 'LEASE';
    return 'RENT';
  }, [project.holdPhase?.targetDisposition, project.exit_strategy]);

  // Renovation Tier state (STAGE, REFURBISH, RENOVATE, GUT, DEVELOP)
  const [selectedTier, setSelectedTier] = useState<RenovationTier>(
    project.holdPhase?.renovationTier || 'RENOVATE'
  );

  // Scope of Work (SOW) State
  const defaultSow: SowLineItem[] = [
    {
      id: 'sow-1',
      category: 'Demolition & Prep',
      description: 'Interior tear-out, drywall removal, haul-away dumpster',
      contractor: 'Apex Demo Services LLC',
      budgetedAmount: 6500,
      actualAmount: 6200,
      completionPct: 100,
      status: 'completed',
    },
    {
      id: 'sow-2',
      category: 'Structural & Framing',
      description: 'Open floor plan beam installation, subfloor repairs',
      contractor: 'Lone Star Framing Co.',
      budgetedAmount: 14000,
      actualAmount: 14500,
      completionPct: 100,
      status: 'completed',
    },
    {
      id: 'sow-3',
      category: 'MEP (Mechanical, Electrical, Plumbing)',
      description: '200A panel upgrade, copper rough-in, 4-ton high efficiency heat pump',
      contractor: 'Capital City MEP Pros',
      budgetedAmount: 22500,
      actualAmount: 21000,
      completionPct: 85,
      status: 'in_progress',
    },
    {
      id: 'sow-4',
      category: 'Drywall & Insulation',
      description: 'Level 5 smooth drywall finish, R-38 blown attic insulation',
      contractor: 'Precision Drywall Inc.',
      budgetedAmount: 11000,
      actualAmount: 7500,
      completionPct: 65,
      status: 'in_progress',
    },
    {
      id: 'sow-5',
      category: 'Cabinetry & Countertops',
      description: 'Custom shaker soft-close cabinetry, Calacatta quartz waterfall island',
      contractor: 'Granite & Oak Studio',
      budgetedAmount: 16500,
      actualAmount: 4000,
      completionPct: 25,
      status: 'in_progress',
    },
    {
      id: 'sow-6',
      category: 'Flooring & Tile',
      description: 'Engineered European white oak throughout, designer porcelain bath tile',
      contractor: 'Artisan Tile & Hardwood',
      budgetedAmount: 13500,
      actualAmount: 0,
      completionPct: 0,
      status: 'not_started',
    },
    {
      id: 'sow-7',
      category: 'Paint & Finishes',
      description: 'Interior/exterior Sherwin-Williams Emerald paint, matte black fixtures',
      contractor: 'ProTouch Paint Works',
      budgetedAmount: 9500,
      actualAmount: 0,
      completionPct: 0,
      status: 'not_started',
    },
  ];
  const initialSow: SowLineItem[] = project.holdPhase?.sowItems && project.holdPhase.sowItems.length > 0
    ? project.holdPhase.sowItems
    : defaultSow;
  const [sowItems, setSowItems] = useState<SowLineItem[]>(initialSow);

  // The 8 Core Holding Cost Pillars Ledger
  const monthlyDebt = project.funding?.monthlyDebtService ?? 2450;
  const initialHoldingCosts: HoldingCostItem[] = project.holdPhase?.holdingCosts && project.holdPhase.holdingCosts.length > 0
    ? project.holdPhase.holdingCosts
    : [
        {
          id: 'cc-1',
          category: 'piti_debt_service',
          name: 'Lender Interest-Only Bridge Payment',
          frequency: 'monthly',
          monthlyAmount: monthlyDebt,
          dueDay: 1,
          status: 'active',
          notes: 'Lender debt service schedule',
        },
        {
          id: 'cc-2',
          category: 'piti_property_taxes',
          name: 'County Tax Assessor Escrow',
          frequency: 'monthly',
          monthlyAmount: 480,
          dueDay: 1,
          status: 'active',
          notes: 'Travis County ad valorem property taxes',
        },
        {
          id: 'cc-3',
          category: 'piti_insurance',
          name: 'Landlord Hazard & Liability Insurance (Travelers DP-3)',
          frequency: 'monthly',
          monthlyAmount: 260,
          dueDay: 1,
          status: 'active',
          notes: 'Includes 15% to 20% landlord premium and premises liability',
        },
        {
          id: 'cc-4',
          category: 'maintenance_repairs',
          name: 'Routine Maintenance & Landscaping',
          frequency: 'monthly',
          monthlyAmount: 404,
          dueDay: 5,
          status: 'active',
          notes: '1% of property value per year rule-of-thumb benchmark',
        },
        {
          id: 'cc-5',
          category: 'capex_reserves',
          name: 'CapEx Reserves Allocation',
          frequency: 'monthly',
          monthlyAmount: 304,
          dueDay: 1,
          status: 'active',
          notes: '8% of gross scheduled rental income reserve',
        },
        {
          id: 'cc-6',
          category: 'vacancy_buffer',
          name: 'Vacancy & Turnover Reserve Buffer',
          frequency: 'monthly',
          monthlyAmount: 190,
          dueDay: 1,
          status: 'active',
          notes: '5% vacancy buffer for tenant turns',
        },
        {
          id: 'cc-7',
          category: 'property_management',
          name: 'Pioneer Austin Management Fee',
          frequency: 'monthly',
          monthlyAmount: 304,
          dueDay: 1,
          status: 'active',
          notes: '8.0% of collected rent benchmark',
        },
        {
          id: 'cc-8',
          category: 'utilities',
          name: 'Landlord Electric, Gas & Construction Water',
          frequency: 'monthly',
          monthlyAmount: 195,
          dueDay: 5,
          status: 'active',
          notes: 'Active utility meters during renovation/turnover',
        },
        {
          id: 'cc-9',
          category: 'hoa_dues',
          name: 'Community Association Assessment',
          frequency: 'monthly',
          monthlyAmount: 0,
          dueDay: 1,
          status: 'active',
          notes: 'No HOA dues for standalone triplex parcel',
        },
        {
          id: 'cc-10',
          category: 'municipal_fees_taxes',
          name: 'Austin Short-Term & Rental Licensing Fees',
          frequency: 'monthly',
          monthlyAmount: 45,
          dueDay: 15,
          status: 'active',
          notes: 'City registration and periodic safety inspection fees',
        },
      ];
  const [holdingCosts, setHoldingCosts] = useState<HoldingCostItem[]>(initialHoldingCosts);

  // Property Management fee settings
  const [isSelfManaged, setIsSelfManaged] = useState<boolean>(project.holdPhase?.isSelfManaged ?? false);
  const [propertyManagementFeePct, setPropertyManagementFeePct] = useState<number>(
    project.holdPhase?.propertyManagementFeePct ?? 8.0
  );

  // Marketing & Advertising Log
  const initialListingAds: ListingAdRecord[] = project.holdPhase?.listingAds && project.holdPhase.listingAds.length > 0
    ? project.holdPhase.listingAds
    : [
        {
          id: 'ad-1',
          channel: 'Zillow',
          datePlaced: '2026-03-01',
          spendAmount: 120,
          isRecurring: true,
          status: 'active',
          inquiriesGenerated: 14,
          showingsScheduled: 6,
          applicationsReceived: 2,
          notes: 'Zillow Rental Manager premium syndication',
        },
        {
          id: 'ad-2',
          channel: 'Facebook Marketplace',
          datePlaced: '2026-03-05',
          spendAmount: 60,
          isRecurring: false,
          status: 'active',
          inquiriesGenerated: 19,
          showingsScheduled: 8,
          applicationsReceived: 1,
          notes: 'Hyper-local Austin community rental group boosts',
        },
        {
          id: 'ad-3',
          channel: 'MLS / Realtor.com',
          datePlaced: '2026-03-10',
          spendAmount: 150,
          isRecurring: false,
          status: 'active',
          inquiriesGenerated: 7,
          showingsScheduled: 4,
          applicationsReceived: 1,
          notes: 'Broker direct network leasing blast',
        },
      ];
  const [listingAds, setListingAds] = useState<ListingAdRecord[]>(initialListingAds);

  // Days In Hold
  const [daysInHold, setDaysInHold] = useState<number>(project.holdPhase?.daysInHold || 90);

  // Permits & Contractors state
  const defaultPermits: MunicipalPermit[] = [
    {
      id: 'prm-1',
      permitNumber: 'BP-2026-08492',
      type: 'building',
      jurisdiction: 'City of Austin Development Services',
      appliedDate: '2026-01-14',
      approvedDate: '2026-01-29',
      status: 'approved',
    },
    {
      id: 'prm-2',
      permitNumber: 'EP-2026-01934',
      type: 'electrical',
      jurisdiction: 'City of Austin Development Services',
      appliedDate: '2026-01-16',
      approvedDate: '2026-01-28',
      status: 'approved',
    },
    {
      id: 'prm-3',
      permitNumber: 'MP-2026-00481',
      type: 'mechanical',
      jurisdiction: 'City of Austin Development Services',
      appliedDate: '2026-01-18',
      approvedDate: '2026-02-02',
      status: 'approved',
    },
    {
      id: 'prm-4',
      permitNumber: 'PL-2026-00319',
      type: 'plumbing',
      jurisdiction: 'City of Austin Development Services',
      appliedDate: '2026-01-18',
      approvedDate: '2026-01-30',
      status: 'approved',
    },
  ];
  const initialPermits: MunicipalPermit[] = project.holdPhase?.permits && project.holdPhase.permits.length > 0
    ? project.holdPhase.permits
    : defaultPermits;
  const [permits, setPermits] = useState<MunicipalPermit[]>(initialPermits);

  // Draws state
  const defaultDraws: DrawRequest[] = [
    {
      id: 'drw-1',
      drawNumber: 1,
      amountRequested: 22000,
      retainageAmount: 2200,
      amountApproved: 19800,
      lenderInspector: 'Trinity Inspection Group',
      status: 'funded',
      requestedDate: '2026-02-05',
      fundedDate: '2026-02-10',
    },
    {
      id: 'drw-2',
      drawNumber: 2,
      amountRequested: 28500,
      retainageAmount: 2850,
      amountApproved: 25650,
      lenderInspector: 'Trinity Inspection Group',
      status: 'funded',
      requestedDate: '2026-02-25',
      fundedDate: '2026-03-02',
    },
    {
      id: 'drw-3',
      drawNumber: 3,
      amountRequested: 21500,
      retainageAmount: 2150,
      amountApproved: 19350,
      lenderInspector: 'Trinity Inspection Group',
      status: 'inspected',
      requestedDate: '2026-03-15',
    },
  ];
  const initialDraws: DrawRequest[] = project.holdPhase?.drawRequests && project.holdPhase.drawRequests.length > 0
    ? project.holdPhase.drawRequests
    : defaultDraws;
  const [draws, setDraws] = useState<DrawRequest[]>(initialDraws);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [newDrawAmount, setNewDrawAmount] = useState<number>(15000);

  // User Tier & Roster Context
  const userTier = project.userTier || 'Investment Team';
  const propertyState = project.propertyState || 'TX';
  const activeRoster = (project.teamMembers || []) as AssigneeOption[];

  // 18 Core Activities states
  const initialContractors: ContractorRecord[] = project.holdPhase?.contractors || [
    {
      id: 'ctr-1',
      name: 'Apex Construction Group LLC',
      trade: 'General Contractor',
      licenseNumber: 'TX-GC-92841',
      insuranceExpDate: '2026-11-30',
      phone: '(512) 555-0142',
      status: 'active',
      hasCoiVerified: true,
    },
    {
      id: 'ctr-2',
      name: 'Lone Star MEP Contractors',
      trade: 'Mechanical, Electrical & Plumbing',
      licenseNumber: 'TX-MEP-44012',
      insuranceExpDate: '2026-10-15',
      phone: '(512) 555-0188',
      status: 'active',
      hasCoiVerified: true,
    },
  ];
  const [contractors, setContractors] = useState<ContractorRecord[]>(initialContractors);

  const initialInspections: QualityControlInspection[] = project.holdPhase?.qualityControlInspections || [
    {
      id: 'insp-1',
      title: 'Rough MEP & Framing Walkthrough',
      stage: 'mep_rough',
      inspector: 'City Building Inspector J. Harris',
      date: '2026-02-28',
      status: 'passed',
      findings: 'Electrical grounding and PEX water lines verified at pressure test.',
      actionRequired: false,
    },
    {
      id: 'insp-2',
      title: 'Pre-Drywall Insulation Sign-Off',
      stage: 'pre_drywall',
      inspector: 'Marcus Vance (Owner Rep)',
      date: '2026-03-10',
      status: 'passed',
      findings: 'Batt insulation R-19 installed to code; ready for drywall hang.',
      actionRequired: false,
    },
  ];
  const [inspections, setInspections] = useState<QualityControlInspection[]>(initialInspections);

  const initialGroundUp: GroundUpMilestone[] = project.holdPhase?.groundUpMilestones && project.holdPhase.groundUpMilestones.length > 0
    ? project.holdPhase.groundUpMilestones
    : [
    {
      id: 'gum-1',
      milestone: 'grading_earthwork',
      label: 'Civil Grading & Soil Compaction',
      targetDate: '2026-01-20',
      status: 'completed',
      engineeringSignoff: true,
    },
    {
      id: 'gum-2',
      milestone: 'foundation_pour',
      label: 'Engineered Slab Foundation Pour',
      targetDate: '2026-02-05',
      status: 'completed',
      engineeringSignoff: true,
    },
    {
      id: 'gum-3',
      milestone: 'utility_connections',
      label: 'Water, Sewer & Electric Lateral Tie-ins',
      targetDate: '2026-03-20',
      status: 'in_progress',
      engineeringSignoff: false,
    },
    {
      id: 'gum-4',
      milestone: 'framing_envelope',
      label: 'Structural Framing & Building Envelope',
      targetDate: '2026-04-15',
      status: 'in_progress',
      engineeringSignoff: false,
    },
  ];
  const [groundUpMilestones, setGroundUpMilestones] = useState<GroundUpMilestone[]>(initialGroundUp);

  const initialDebt: DebtServiceHoldDetails = project.holdPhase?.debtService || {
    monthlyPayment: monthlyDebt,
    paymentType: 'interest_only',
    lenderName: project.funding?.lenderName || 'Apex Commercial Lending',
    dueDay: 1,
    autopayEnabled: true,
    lastPaymentDate: '2026-03-01',
  };
  const [debtService, setDebtService] = useState<DebtServiceHoldDetails>(initialDebt);

  const initialTax: PropertyTaxHoldDetails = project.holdPhase?.propertyTax || {
    countyParcelId: 'TCAD-849201',
    annualTaxAmount: 5760,
    monthlyEscrowAmount: 480,
    appealStatus: 'not_applicable',
    nextDueDate: '2026-10-31',
    assessedValue: 470000,
  };
  const [propertyTax, setPropertyTax] = useState<PropertyTaxHoldDetails>(initialTax);

  const initialInsurance: InsuranceHoldDetails = project.holdPhase?.insurance || {
    policyType: 'builders_risk',
    carrier: 'Travelers Specialty',
    policyNumber: 'BR-2026-8941',
    annualPremium: 3120,
    monthlyPremium: 260,
    coverageLimit: 600000,
    expirationDate: '2026-09-30',
    transitionReady: false,
  };
  const [insurance, setInsurance] = useState<InsuranceHoldDetails>(initialInsurance);

  const initialUtilities: UtilityHoldItem[] = project.holdPhase?.utilities || [
    { id: 'util-1', type: 'electricity', provider: 'Austin Energy', accountNumber: 'AE-88910', monthlyBudget: 110, meterActive: true },
    { id: 'util-2', type: 'water_sewer', provider: 'Austin Water', accountNumber: 'AW-44102', monthlyBudget: 45, meterActive: true },
    { id: 'util-3', type: 'gas', provider: 'Texas Gas Service', accountNumber: 'TG-19402', monthlyBudget: 40, meterActive: true },
    { id: 'util-4', type: 'trash_dumpster', provider: 'Waste Management (20yd)', accountNumber: 'WM-00914', monthlyBudget: 25, meterActive: true },
  ];
  const [utilities, setUtilities] = useState<UtilityHoldItem[]>(initialUtilities);

  const initialHoa: HoaHoldDetails = project.holdPhase?.hoa || {
    hasHoa: false,
    associationName: '',
    monthlyDues: 0,
    dueDay: 1,
    arcApprovalStatus: 'not_required',
    goodStanding: true,
  };
  const [hoa, setHoa] = useState<HoaHoldDetails>(initialHoa);

  const initialCapex: CapExHoldItem[] = project.holdPhase?.capexItems || [
    { id: 'cap-1', title: 'Complete Roof Shingle Tear-off & Decking', category: 'roofing', amount: 9800, dateCapitalized: '2026-02-15', recoveryYears: 27.5, isCapitalizedForTax: true },
    { id: 'cap-2', title: 'Carrier 3-Ton 16 SEER Heat Pump HVAC', category: 'hvac', amount: 8200, dateCapitalized: '2026-02-28', recoveryYears: 27.5, isCapitalizedForTax: true },
    { id: 'cap-3', title: 'Stainless Steel Commercial Appliance Suite', category: 'appliance_package', amount: 4500, dateCapitalized: '2026-03-10', recoveryYears: 5, isCapitalizedForTax: true },
  ];
  const [capexItems, setCapexItems] = useState<CapExHoldItem[]>(initialCapex);

  const initialBookkeeping: BookkeepingVarianceSummary = project.holdPhase?.bookkeepingSummary || {
    initialHoldingBudget: 35000,
    actualHoldingSpend: 11400,
    projectedCarryingAtExit: 32000,
    varianceAmount: -3000,
    variancePct: -8.5,
    hasOverrunWarning: false,
  };
  const [bookkeepingSummary, setBookkeepingSummary] = useState<BookkeepingVarianceSummary>(initialBookkeeping);

  const initialStabilization: StabilizationReadiness = project.holdPhase?.stabilization || {
    punchListRemainingCount: 6,
    certificateOfOccupancyObtained: false,
    deepCleaningCompleted: false,
    stagingCompleted: false,
    readyForMarketing: false,
  };
  const [stabilization, setStabilization] = useState<StabilizationReadiness>(initialStabilization);

  const initialPM: PropertyManagerHoldDetails = project.holdPhase?.propertyManagerDetails || {
    isSelfManaged,
    companyName: 'Pioneer Austin Management',
    leadManagerName: 'Elena Rostova',
    feePct: propertyManagementFeePct,
    leaseUpFeeAmount: 1900,
    phone: '(512) 555-0199',
    email: 'elena@pioneeraustin.com',
    contractSigned: true,
  };
  const [propertyManager, setPropertyManager] = useState<PropertyManagerHoldDetails>(initialPM);

  const initialSecurity: SiteSecurityHoldDetails = project.holdPhase?.siteSecurity || {
    hasCellularCameras: true,
    hasSmartLockbox: true,
    hasMotionLighting: true,
    lockboxCodeLastRotated: '2026-03-01',
    weeklySiteWalkLogged: true,
    squatterPreventionProtocolActive: true,
  };
  const [siteSecurity, setSiteSecurity] = useState<SiteSecurityHoldDetails>(initialSecurity);

  const initialRoutine: RoutineMaintenanceHoldItem[] = project.holdPhase?.routineMaintenance || [
    { id: 'maint-1', service: 'lawn_care', provider: 'GreenThumb Pro Landscaping', frequency: 'biweekly', costPerVisit: 85, nextScheduledDate: '2026-03-25', status: 'active' },
    { id: 'maint-2', service: 'pest_control', provider: 'Terminix Commercial Barrier', frequency: 'quarterly', costPerVisit: 140, nextScheduledDate: '2026-04-15', status: 'active' },
    { id: 'maint-3', service: 'hvac_filter_turnover', provider: 'Internal Crew', frequency: 'monthly', costPerVisit: 35, nextScheduledDate: '2026-04-01', status: 'active' },
  ];
  const [routineMaintenance, setRoutineMaintenance] = useState<RoutineMaintenanceHoldItem[]>(initialRoutine);

  // Maintenance & Inspections
  const [maintenanceLogs] = useState<MaintenanceLog[]>([
    {
      id: 'ml-1',
      date: '2026-03-12',
      type: 'Weekly Safety & Securing Check',
      inspector: 'Marcus Vance (Owner Rep)',
      notes: 'All windows boarded, fence secured, no storm water intrusion.',
      actionRequired: false,
    },
    {
      id: 'ml-2',
      date: '2026-03-05',
      type: 'Rough MEP Lender Walkthrough',
      inspector: 'Trinity Inspection Group',
      notes: 'Passed plumbing rough-in pressure test at 60 PSI for 48 hours.',
      actionRequired: false,
    },
  ]);

  // Active Sub-Tab in Executive Workspace
  const [activeSubTab, setActiveSubTab] = useState<'renovation' | 'financials' | 'marketing' | 'management'>('renovation');

  // Computed Financials
  const totalMonthlyBurn = useMemo(
    () => holdingCosts.reduce((acc, item) => acc + item.monthlyAmount, 0),
    [holdingCosts]
  );
  const dailyCarryingCost = Math.round((totalMonthlyBurn * 12) / 365);

  const totalSowBudget = useMemo(
    () => sowItems.reduce((acc, item) => acc + item.budgetedAmount, 0),
    [sowItems]
  );
  const totalSowActual = useMemo(
    () => sowItems.reduce((acc, item) => acc + item.actualAmount, 0),
    [sowItems]
  );

  const overallProgressPct = useMemo(() => {
    if (sowItems.length === 0) return 0;
    const weightedSum = sowItems.reduce(
      (acc, item) => acc + item.budgetedAmount * (item.completionPct / 100),
      0
    );
    return Math.round((weightedSum / (totalSowBudget || 1)) * 100);
  }, [sowItems, totalSowBudget]);

  const totalFundedDraws = useMemo(
    () => draws.filter((d) => d.status === 'funded').reduce((acc, d) => acc + d.amountApproved, 0),
    [draws]
  );
  const totalRetainageHeld = useMemo(
    () => draws.filter((d) => d.status === 'funded').reduce((acc, d) => acc + d.retainageAmount, 0),
    [draws]
  );

  // Persistence engine & state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPayloadRef = useRef<HoldPhaseDetails | null>(null);

  const executePersist = useCallback(
    async (payload: HoldPhaseDetails) => {
      setSaveStatus('saving');
      setSaveError(null);
      try {
        const pId = project.id || project.project_id;
        if (!pId) return;

        const fetchFn = typeof bffFetch === 'function' ? bffFetch : fetch;
        const res = await fetchFn(`/api/projects/${pId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ holdPhase: payload }),
        });

        if (!res.ok) {
          throw new Error(`Failed to save hold phase (${res.status})`);
        }

        setSaveStatus('saved');
      } catch (err: unknown) {
        console.error('[HoldWorkspaceView] Persistence error:', err);
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : 'Network error');
      }
    },
    [project.id, project.project_id]
  );

  const schedulePersist = useCallback(
    (payload: HoldPhaseDetails, immediate: boolean = false) => {
      pendingPayloadRef.current = payload;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (immediate) {
        void executePersist(payload);
      } else {
        setSaveStatus('saving');
        debounceTimerRef.current = setTimeout(() => {
          if (pendingPayloadRef.current) {
            void executePersist(pendingPayloadRef.current);
          }
        }, 500);
      }
    },
    [executePersist]
  );

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Synchronize local states if project.holdPhase updates externally
  useEffect(() => {
    if (!project.holdPhase) return;
    if (project.holdPhase.renovationTier) setSelectedTier(project.holdPhase.renovationTier);
    if (project.holdPhase.sowItems?.length) setSowItems(project.holdPhase.sowItems);
    if (project.holdPhase.holdingCosts?.length) setHoldingCosts(project.holdPhase.holdingCosts);
    if (project.holdPhase.listingAds?.length) setListingAds(project.holdPhase.listingAds);
    if (typeof project.holdPhase.daysInHold === 'number') setDaysInHold(project.holdPhase.daysInHold);
    if (project.holdPhase.permits?.length) setPermits(project.holdPhase.permits);
    if (project.holdPhase.drawRequests?.length) setDraws(project.holdPhase.drawRequests);
    if (project.holdPhase.contractors?.length) setContractors(project.holdPhase.contractors);
    if (project.holdPhase.qualityControlInspections?.length) setInspections(project.holdPhase.qualityControlInspections);
    if (project.holdPhase.groundUpMilestones?.length) setGroundUpMilestones(project.holdPhase.groundUpMilestones);
    if (project.holdPhase.debtService) setDebtService(project.holdPhase.debtService);
    if (project.holdPhase.propertyTax) setPropertyTax(project.holdPhase.propertyTax);
    if (project.holdPhase.insurance) setInsurance(project.holdPhase.insurance);
    if (project.holdPhase.utilities?.length) setUtilities(project.holdPhase.utilities);
    if (project.holdPhase.hoa) setHoa(project.holdPhase.hoa);
    if (project.holdPhase.capexItems?.length) setCapexItems(project.holdPhase.capexItems);
    if (project.holdPhase.bookkeepingSummary) setBookkeepingSummary(project.holdPhase.bookkeepingSummary);
    if (project.holdPhase.stabilization) setStabilization(project.holdPhase.stabilization);
    if (project.holdPhase.propertyManagerDetails) setPropertyManager(project.holdPhase.propertyManagerDetails);
    if (project.holdPhase.siteSecurity) setSiteSecurity(project.holdPhase.siteSecurity);
    if (project.holdPhase.routineMaintenance?.length) setRoutineMaintenance(project.holdPhase.routineMaintenance);
    if (typeof project.holdPhase.isSelfManaged === 'boolean') setIsSelfManaged(project.holdPhase.isSelfManaged);
    if (typeof project.holdPhase.propertyManagementFeePct === 'number') setPropertyManagementFeePct(project.holdPhase.propertyManagementFeePct);
  }, [project.holdPhase]);

  // Sync state helper
  const syncStateToProject = (
    updatedSow: SowLineItem[] = sowItems,
    updatedHoldingCosts: HoldingCostItem[] = holdingCosts,
    updatedAds: ListingAdRecord[] = listingAds,
    updatedTier: RenovationTier = selectedTier,
    updatedDays: number = daysInHold,
    extraFields: Partial<HoldPhaseDetails> = {},
    immediate: boolean = false
  ) => {
    const updatedHoldPhase: HoldPhaseDetails = {
      targetDisposition: dispositionStrategy,
      renovationTier: updatedTier,
      initialRehabBudget: totalSowBudget,
      committedSowBudget: totalSowBudget,
      actualRehabSpend: totalSowActual,
      finalProjectedCost: totalSowBudget,
      targetCompletionDate: '2026-06-30',
      daysInHold: updatedDays,
      holdingCosts: updatedHoldingCosts,
      listingAds: updatedAds,
      isSelfManaged,
      propertyManagementFeePct,
      propertyManagerName: isSelfManaged ? 'Self-Managed' : 'Pioneer Austin Management',
      targetMarketRent: project.underwriting?.rentRoll?.grossScheduledRent || 3800,
      targetSaleArv: 710000,
      sowItems: updatedSow,
      permits: extraFields.permits || permits,
      contractors: extraFields.contractors || contractors,
      qualityControlInspections: extraFields.qualityControlInspections || inspections,
      drawRequests: extraFields.drawRequests || draws,
      groundUpMilestones: extraFields.groundUpMilestones || groundUpMilestones,
      debtService: extraFields.debtService || debtService,
      propertyTax: extraFields.propertyTax || propertyTax,
      insurance: extraFields.insurance || insurance,
      utilities: extraFields.utilities || utilities,
      hoa: extraFields.hoa || hoa,
      capexItems: extraFields.capexItems || capexItems,
      bookkeepingSummary: extraFields.bookkeepingSummary || bookkeepingSummary,
      stabilization: extraFields.stabilization || stabilization,
      propertyManagerDetails: extraFields.propertyManagerDetails || propertyManager,
      siteSecurity: extraFields.siteSecurity || siteSecurity,
      routineMaintenance: extraFields.routineMaintenance || routineMaintenance,
      ...extraFields,
    };

    onUpdateProject({
      ...project,
      holdPhase: updatedHoldPhase,
    });

    schedulePersist(updatedHoldPhase, immediate);
  };

  const handleUpdateProjectWithPersist = (updated: ProjectWorkspace) => {
    onUpdateProject(updated);
    if (updated.holdPhase) {
      schedulePersist(updated.holdPhase, true);
    } else {
      const pId = project.id || project.project_id;
      if (pId) {
        const fetchFn = typeof bffFetch === 'function' ? bffFetch : fetch;
        fetchFn(`/api/projects/${pId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }).catch((err) => console.error('[HoldWorkspaceView] updateProject persist error:', err));
      }
    }
  };

  const handleUpdateSowItems = (updated: SowLineItem[]) => {
    setSowItems(updated);
    syncStateToProject(updated);
  };

  const handleUpdateHoldingCosts = (updated: HoldingCostItem[]) => {
    setHoldingCosts(updated);
    syncStateToProject(undefined, updated);
  };

  const handleUpdateListingAds = (updated: ListingAdRecord[]) => {
    setListingAds(updated);
    syncStateToProject(undefined, undefined, updated);
  };

  const handleSelectTier = (tier: RenovationTier) => {
    setSelectedTier(tier);
    syncStateToProject(undefined, undefined, undefined, tier, undefined, {}, true);
  };

  const handleToggleSelfManaged = (val: boolean) => {
    setIsSelfManaged(val);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { isSelfManaged: val }, true);
  };

  const handleChangeManagementFeePct = (fee: number) => {
    setPropertyManagementFeePct(fee);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { propertyManagementFeePct: fee });
  };

  const handleUpdateContractors = (updated: ContractorRecord[]) => {
    setContractors(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { contractors: updated });
  };

  const handleUpdateInspections = (updated: QualityControlInspection[]) => {
    setInspections(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { qualityControlInspections: updated });
  };

  const handleUpdatePermits = (updated: MunicipalPermit[]) => {
    setPermits(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { permits: updated });
  };

  const handleUpdateDraws = (updated: DrawRequest[]) => {
    setDraws(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { drawRequests: updated }, true);
  };

  const handleUpdateGroundUpMilestones = (updated: GroundUpMilestone[]) => {
    setGroundUpMilestones(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { groundUpMilestones: updated });
  };

  const handleUpdateDebtService = (updated: DebtServiceHoldDetails) => {
    setDebtService(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { debtService: updated });
  };

  const handleUpdatePropertyTax = (updated: PropertyTaxHoldDetails) => {
    setPropertyTax(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { propertyTax: updated });
  };

  const handleUpdateInsurance = (updated: InsuranceHoldDetails) => {
    setInsurance(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { insurance: updated });
  };

  const handleUpdateUtilities = (updated: UtilityHoldItem[]) => {
    setUtilities(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { utilities: updated });
  };

  const handleUpdateHoa = (updated: HoaHoldDetails) => {
    setHoa(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { hoa: updated });
  };

  const handleUpdateCapexItems = (updated: CapExHoldItem[]) => {
    setCapexItems(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { capexItems: updated });
  };

  const handleUpdateBookkeepingSummary = (updated: BookkeepingVarianceSummary) => {
    setBookkeepingSummary(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { bookkeepingSummary: updated });
  };

  const handleUpdateStabilization = (updated: StabilizationReadiness) => {
    setStabilization(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { stabilization: updated });
  };

  const handleUpdatePropertyManager = (updated: PropertyManagerHoldDetails) => {
    setPropertyManager(updated);
    setIsSelfManaged(updated.isSelfManaged);
    setPropertyManagementFeePct(updated.feePct);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, {
      propertyManagerDetails: updated,
      isSelfManaged: updated.isSelfManaged,
      propertyManagementFeePct: updated.feePct,
    }, true);
  };

  const handleUpdateSiteSecurity = (updated: SiteSecurityHoldDetails) => {
    setSiteSecurity(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { siteSecurity: updated });
  };

  const handleUpdateRoutineMaintenance = (updated: RoutineMaintenanceHoldItem[]) => {
    setRoutineMaintenance(updated);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { routineMaintenance: updated });
  };

  const handleSubmitDraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDrawAmount <= 0) return;
    const retainage = Math.round(newDrawAmount * 0.1);
    const newDraw: DrawRequest = {
      id: `drw-${Date.now()}`,
      drawNumber: draws.length + 1,
      amountRequested: newDrawAmount,
      retainageAmount: retainage,
      amountApproved: newDrawAmount - retainage,
      lenderInspector: 'Trinity Inspection Group',
      status: 'submitted',
      requestedDate: new Date().toISOString().slice(0, 10),
    };
    const updatedDraws = [...draws, newDraw];
    setDraws(updatedDraws);
    setShowDrawModal(false);
    syncStateToProject(undefined, undefined, undefined, undefined, undefined, { drawRequests: updatedDraws }, true);
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden" data-testid="hold-workspace-view">
      {/* Mode Switcher Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-800 bg-neutral-950 p-3 rounded-none">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-neutral-400 text-base">tune</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Hold Phase Mode
          </span>
        </div>
        <div className="flex items-center border border-neutral-800 bg-neutral-900/80 p-0.5 rounded-none">
          <button
            type="button"
            data-testid="toggle-conversational-view"
            onClick={() => setViewMode('conversational')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-none transition ${
              viewMode === 'conversational'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            Conversational Walkthrough
          </button>
          <button
            type="button"
            data-testid="toggle-executive-view"
            onClick={() => setViewMode('workspace')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-none transition ${
              viewMode === 'workspace'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            Executive Workspace
          </button>
        </div>
      </div>

      {viewMode === 'conversational' ? (
        <HoldConversationalEngine
          project={project}
          onUpdateProject={handleUpdateProjectWithPersist}
          onSwitchToExecutiveView={() => setViewMode('workspace')}
          activeRoster={(project.teamMembers || []) as AssigneeOption[]}
        />
      ) : (
        <>
          {/* Target Property / Deal Header Banner */}
          <section
            data-testid="hold-deal-header-card"
            className="border border-neutral-800 bg-neutral-950 p-5 rounded-none"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900 text-white rounded-none">
                  <span className="material-symbols-outlined text-[22px]">construction</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                      REIL Phase 03: Hold Workspace
                    </span>
                    <span className="border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-mono text-neutral-300 rounded-none">
                      {project.dealId || project.id}
                    </span>
                    <span className="border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-mono uppercase text-emerald-400 font-semibold rounded-none">
                      Strategy: {dispositionStrategy}
                    </span>
                    {saveStatus === 'saving' && (
                      <span data-testid="hold-save-status" className="border border-amber-800/60 bg-amber-950/40 px-2 py-0.5 text-[10px] font-mono text-amber-400 rounded-none animate-pulse">
                        Saving…
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span data-testid="hold-save-status" className="border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-mono text-emerald-400 rounded-none">
                        Saved to Cloud
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span data-testid="hold-save-status" className="border border-red-800/60 bg-red-950/40 px-2 py-0.5 text-[10px] font-mono text-red-400 rounded-none" title={saveError || 'Save failed'}>
                        Save Error
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg font-bold text-white mt-1">
                    {project.address || project.propertyName}
                  </h1>
                  <p className="text-xs text-neutral-400">
                    Asset Holding, Scope Tier Execution ({selectedTier}) & Carrying Cost Containment
                  </p>
                </div>
              </div>

              {/* Top Carrying & Rehab KPIs */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="border border-neutral-800 bg-neutral-900/60 px-3.5 py-2 text-right rounded-none">
                  <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                    Rehab Progress
                  </span>
                  <span className="text-sm font-bold font-mono text-white">
                    {overallProgressPct}% Complete
                  </span>
                </div>
                <div className="border border-neutral-800 bg-neutral-900/60 px-3.5 py-2 text-right rounded-none">
                  <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                    Monthly Carrying Burn
                  </span>
                  <span className="text-sm font-bold font-mono text-white">
                    {formatCurrency(totalMonthlyBurn)}/mo
                  </span>
                </div>
                <div className="border border-neutral-800 bg-neutral-900/60 px-3.5 py-2 text-right rounded-none">
                  <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                    Daily Run Rate
                  </span>
                  <span className="text-sm font-bold font-mono text-amber-300">
                    {formatCurrency(dailyCarryingCost)}/day
                  </span>
                </div>
              </div>
            </div>

            {/* Satellite & Imagery Viewers */}
            <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PropertySatelliteViewer
                address={project.address || project.propertyName}
                defaultZoom={18}
                className="min-h-[200px]"
              />
              <PropertyImageGallery
                projectId={project.id}
                dealAddress={project.address || project.propertyName}
                className="min-h-[200px]"
              />
            </div>
          </section>

          {/* Hold Phase Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto">
            <button
              type="button"
              data-testid="hold-tab-renovation"
              onClick={() => setActiveSubTab('renovation')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs font-bold transition rounded-none whitespace-nowrap ${
                activeSubTab === 'renovation'
                  ? 'border border-white bg-neutral-900 text-white'
                  : 'border border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">engineering</span>
              <span>1. Renovation & Scope Tiers (SOW & Draws)</span>
            </button>

            <button
              type="button"
              data-testid="hold-tab-financials"
              onClick={() => setActiveSubTab('financials')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs font-bold transition rounded-none whitespace-nowrap ${
                activeSubTab === 'financials'
                  ? 'border border-white bg-neutral-900 text-white'
                  : 'border border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span>2. Carrying Costs & The 8 Pillars</span>
            </button>

            <button
              type="button"
              data-testid="hold-tab-marketing"
              onClick={() => setActiveSubTab('marketing')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs font-bold transition rounded-none whitespace-nowrap ${
                activeSubTab === 'marketing'
                  ? 'border border-white bg-neutral-900 text-white'
                  : 'border border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>3. Marketing & Advertising Log</span>
            </button>

            <button
              type="button"
              data-testid="hold-tab-management"
              onClick={() => setActiveSubTab('management')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs font-bold transition rounded-none whitespace-nowrap ${
                activeSubTab === 'management'
                  ? 'border border-white bg-neutral-900 text-white'
                  : 'border border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">apartment</span>
              <span>4. Asset Management & Permits</span>
            </button>
          </div>

          {/* SUB-TAB 1: Renovation & Scope Tiers */}
          {activeSubTab === 'renovation' && (
            <div className="space-y-6">
              {/* Renovation Tier Selector & SOW Reconciliation */}
              <RenovationTierCard
                project={project}
                selectedTier={selectedTier}
                onSelectTier={handleSelectTier}
                sowItems={sowItems}
                onUpdateSowItems={handleUpdateSowItems}
                onUpdateProject={handleUpdateProjectWithPersist}
              />

              {/* Municipal Permits & Lender Draws Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Municipal Permits */}
                <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
                      Municipal Building Permits
                    </h3>
                    <span className="border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-mono text-emerald-400 rounded-none">
                      {permits.filter((p) => p.status === 'approved' || p.status === 'finaled').length}/{permits.length} Approved
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {permits.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between border border-neutral-800 bg-neutral-900/40 p-3 text-xs rounded-none"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{p.permitNumber}</span>
                            <span className="border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] uppercase font-semibold text-neutral-300 rounded-none">
                              {p.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{p.jurisdiction}</p>
                        </div>
                        <div className="text-right">
                          <span className="border border-emerald-600 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase rounded-none">
                            {p.status}
                          </span>
                          <p className="text-[10px] text-neutral-400 font-mono mt-1">Applied: {p.appliedDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Construction Draw Requests */}
                <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
                        Lender Draw Requests
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Funded: {formatCurrency(totalFundedDraws)} | Retainage (10%): {formatCurrency(totalRetainageHeld)}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="request-draw-btn"
                      onClick={() => setShowDrawModal(true)}
                      className="min-h-[44px] px-3.5 py-1.5 border border-neutral-700 bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 transition rounded-none"
                    >
                      Request Draw
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {draws.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between border border-neutral-800 bg-neutral-900/40 p-3 text-xs rounded-none"
                      >
                        <div>
                          <span className="font-bold text-white">Draw #{d.drawNumber}</span>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Inspector: {d.lenderInspector}
                          </p>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-emerald-400">{formatCurrency(d.amountApproved)}</span>
                          <p className="text-[10px] text-neutral-400">
                            {d.status === 'funded' ? `Funded ${d.fundedDate}` : `Requested ${d.requestedDate}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pillar 1: 7 Core Renovation & Development Activities */}
              <HoldRenovationDevelopmentTasks
                project={project}
                sowItems={sowItems}
                onUpdateSowItems={handleUpdateSowItems}
                permits={permits}
                onUpdatePermits={handleUpdatePermits}
                contractors={contractors}
                onUpdateContractors={handleUpdateContractors}
                inspections={inspections}
                onUpdateInspections={handleUpdateInspections}
                draws={draws}
                onUpdateDraws={handleUpdateDraws}
                groundUpMilestones={groundUpMilestones}
                onUpdateGroundUpMilestones={handleUpdateGroundUpMilestones}
                userTier={userTier}
                propertyState={propertyState}
                activeRoster={activeRoster}
                onUpdateProject={handleUpdateProjectWithPersist}
              />
            </div>
          )}

          {/* SUB-TAB 2: Carrying Costs & 8 Pillars */}
          {activeSubTab === 'financials' && (
            <div className="space-y-6">
              {/* Carrying Costs Ledger with 8 Pillars & Benchmarks */}
              <CarryingCostsLedgerCard
                project={project}
                holdingCosts={holdingCosts}
                onUpdateHoldingCosts={handleUpdateHoldingCosts}
                isSelfManaged={isSelfManaged}
                onToggleSelfManaged={handleToggleSelfManaged}
                propertyManagementFeePct={propertyManagementFeePct}
                onChangeManagementFeePct={handleChangeManagementFeePct}
              />

              {/* Holding Drag & Daily Burn Calculator */}
              <HoldBurnCalculatorCard
                project={project}
                monthlyBurn={totalMonthlyBurn}
                dispositionStrategy={dispositionStrategy}
                initialDaysInHold={daysInHold}
                onUpdateDaysInHold={(days) => {
                  setDaysInHold(days);
                  syncStateToProject(undefined, undefined, undefined, undefined, days);
                }}
              />

              {/* Pillar 2: 7 Core Financial & Carrying Cost Activities */}
              <HoldFinancialCarryingTasks
                project={project}
                debtService={debtService}
                onUpdateDebtService={handleUpdateDebtService}
                propertyTax={propertyTax}
                onUpdatePropertyTax={handleUpdatePropertyTax}
                insurance={insurance}
                onUpdateInsurance={handleUpdateInsurance}
                utilities={utilities}
                onUpdateUtilities={handleUpdateUtilities}
                hoa={hoa}
                onUpdateHoa={handleUpdateHoa}
                capexItems={capexItems}
                onUpdateCapexItems={handleUpdateCapexItems}
                bookkeepingSummary={bookkeepingSummary}
                onUpdateBookkeepingSummary={handleUpdateBookkeepingSummary}
                userTier={userTier}
                propertyState={propertyState}
                activeRoster={activeRoster}
                onUpdateProject={handleUpdateProjectWithPersist}
              />
            </div>
          )}

          {/* SUB-TAB 3: Marketing & Advertising Log */}
          {activeSubTab === 'marketing' && (
            <div className="space-y-6">
              <MarketingAdvertisingCard
                project={project}
                listingAds={listingAds}
                onUpdateListingAds={handleUpdateListingAds}
                dispositionStrategy={dispositionStrategy}
              />
            </div>
          )}

          {/* SUB-TAB 4: Asset Management & Site Inspections */}
          {activeSubTab === 'management' && (
            <div className="space-y-6">
              {/* Pillar 3: 4 Core Asset & Property Management Activities */}
              <HoldAssetManagementTasks
                project={project}
                stabilization={stabilization}
                onUpdateStabilization={handleUpdateStabilization}
                propertyManager={propertyManager}
                onUpdatePropertyManager={handleUpdatePropertyManager}
                siteSecurity={siteSecurity}
                onUpdateSiteSecurity={handleUpdateSiteSecurity}
                routineMaintenance={routineMaintenance}
                onUpdateRoutineMaintenance={handleUpdateRoutineMaintenance}
                userTier={userTier}
                propertyState={propertyState}
                activeRoster={activeRoster}
                onUpdateProject={handleUpdateProjectWithPersist}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Municipal Permits Summary */}
                <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono mb-4">
                    Municipal Building Permits
                  </h3>
                  <div className="space-y-2.5">
                    {permits.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between border border-neutral-800 bg-neutral-900/40 p-3 text-xs rounded-none"
                      >
                        <div>
                          <span className="font-mono font-bold text-white">{p.permitNumber}</span>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{p.jurisdiction}</p>
                        </div>
                        <div className="text-right">
                          <span className="border border-emerald-600 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase rounded-none">
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Site Inspection & Maintenance Log */}
                <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono mb-4">
                    Site Inspection & Maintenance Log
                  </h3>
                  <div className="space-y-3">
                    {maintenanceLogs.map((log) => (
                      <div
                        key={log.id}
                        className="border border-neutral-800 bg-neutral-900/40 p-3 text-xs space-y-1 rounded-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{log.type}</span>
                          <span className="font-mono text-[10px] text-neutral-400">{log.date}</span>
                        </div>
                        <p className="text-[11px] text-neutral-300">{log.notes}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">Inspector: {log.inspector}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Request Draw */}
          {showDrawModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <form
                onSubmit={handleSubmitDraw}
                className="w-full max-w-md border border-neutral-700 bg-neutral-950 p-6 space-y-4 rounded-none shadow-2xl"
              >
                <h3 className="text-base font-bold text-white">Submit Construction Draw Request</h3>
                <p className="text-xs text-neutral-400">
                  Draw requests trigger third-party lender inspection. Standard 10% retainage is withheld until substantial completion.
                </p>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Requested Draw Amount ($)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={newDrawAmount}
                    onChange={(e) => setNewDrawAmount(Number(e.target.value))}
                    className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white font-mono text-base sm:text-xs outline-none focus:border-white rounded-none"
                  />
                </div>
                <div className="border border-neutral-800 bg-neutral-900 p-3 text-xs space-y-1 font-mono rounded-none">
                  <div className="flex justify-between text-neutral-400">
                    <span>Gross Request:</span>
                    <span>{formatCurrency(newDrawAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>10% Retainage Withheld:</span>
                    <span>-{formatCurrency(Math.round(newDrawAmount * 0.1))}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold border-t border-neutral-800 pt-1">
                    <span>Net Disbursement:</span>
                    <span>{formatCurrency(Math.round(newDrawAmount * 0.9))}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDrawModal(false)}
                    className="min-h-[44px] px-4 py-2 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-neutral-900 rounded-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 bg-white text-black text-xs font-bold hover:bg-neutral-200 rounded-none"
                  >
                    Submit Draw to Lender
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

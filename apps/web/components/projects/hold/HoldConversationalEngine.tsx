'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
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
import { RENOVATION_TIER_DETAILS } from './RenovationTierCard';
import { HOLDING_PILLAR_DEFINITIONS } from './CarryingCostsLedgerCard';
import { MARKETING_CHANNELS } from './MarketingAdvertisingCard';
import HoldRenovationDevelopmentTasks from './HoldRenovationDevelopmentTasks';
import HoldFinancialCarryingTasks from './HoldFinancialCarryingTasks';
import HoldAssetManagementTasks from './HoldAssetManagementTasks';
import type { AssigneeOption } from '../AssignOrInviteModal';

export interface HoldConversationalEngineProps {
  project: ProjectWorkspace;
  onUpdateProject: (updated: ProjectWorkspace) => void;
  onSwitchToExecutiveView: () => void;
  activeRoster?: AssigneeOption[];
  userTier?: string;
  propertyState?: string;
}

export type HoldConversationalStepId =
  | 'disposition_strategy'
  | 'renovation_tier'
  | 'piti_debt_service'
  | 'maintenance_capex_reserves'
  | 'property_management_utilities'
  | 'marketing_advertising'
  | 'hold_summary';

export default function HoldConversationalEngine({
  project,
  onUpdateProject,
  onSwitchToExecutiveView,
  activeRoster = [],
  userTier = 'Investment Team',
  propertyState = 'TX',
}: HoldConversationalEngineProps) {
  const propertyPrice = Number(project.purchasePrice || project.purchase_price || 485000);
  const grossRent = Number(project.underwriting?.rentRoll?.grossScheduledRent || 3800);
  const targetARV = Number(project.underwriting?.acquisition?.estimatedARV || (project as any).arv || 710000);
  const existingDebt = project.funding?.monthlyDebtService ?? 2450;

  // View Mode: Macro Strategy vs 18 Activities Deep Dive
  const [conversationalMode, setConversationalMode] = useState<'macro' | 'activities'>('macro');
  const [activeActivityPillar, setActiveActivityPillar] = useState<'renovation' | 'financials' | 'management'>('renovation');

  // Active Screen Index in Macro Flow (0 to 6)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Screen 1: Disposition Strategy
  const [dispositionStrategy, setDispositionStrategy] = useState<'RENT' | 'LEASE' | 'SALE'>(() => {
    if (project.holdPhase?.targetDisposition) return project.holdPhase.targetDisposition;
    if (project.exit_strategy?.toLowerCase().includes('flip') || project.exit_strategy?.toLowerCase().includes('sale')) return 'SALE';
    if (project.exit_strategy?.toLowerCase().includes('lease')) return 'LEASE';
    return 'RENT';
  });

  // Screen 2: Renovation Tier & Scope
  const [renovationTier, setRenovationTier] = useState<RenovationTier>(
    project.holdPhase?.renovationTier || 'RENOVATE'
  );
  const [rehabBudget, setRehabBudget] = useState<number>(
    project.holdPhase?.initialRehabBudget || project.rehab_costs || RENOVATION_TIER_DETAILS.RENOVATE.typicalCost
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState<string>(
    project.holdPhase?.targetCompletionDate || '2026-06-30'
  );

  // 18 Core Activities: Structured Data States
  const [sowItems, setSowItems] = useState<SowLineItem[]>(
    project.holdPhase?.sowItems || [
      {
        id: 'sow-1',
        category: 'Demolition & Prep',
        description: 'Interior tear-out, non-load bearing wall removal, dumpster service',
        contractor: 'Apex Demo Services LLC',
        budgetedAmount: 6500,
        actualAmount: 6200,
        completionPct: 100,
        status: 'completed',
        engineeringRequired: false,
      },
      {
        id: 'sow-2',
        category: 'Structural Framing',
        description: 'Open living beam installation, load calculation, subfloor reinforcing',
        contractor: 'Lone Star Framing Co.',
        budgetedAmount: 14000,
        actualAmount: 14500,
        completionPct: 100,
        status: 'completed',
        engineeringRequired: true,
      },
      {
        id: 'sow-3',
        category: 'Mechanicals (MEP)',
        description: 'New 200A electrical panel, PEX repipe, high-efficiency heat pump',
        contractor: 'Austin MEP Solutions',
        budgetedAmount: 22000,
        actualAmount: 16500,
        completionPct: 75,
        status: 'in_progress',
        engineeringRequired: true,
      },
      {
        id: 'sow-4',
        category: 'Finishes & Staging',
        description: 'Quartz counters, shaker cabinets, luxury vinyl plank, designer lighting',
        contractor: 'Granite & Oak Studio',
        budgetedAmount: 18500,
        actualAmount: 4200,
        completionPct: 25,
        status: 'in_progress',
        engineeringRequired: false,
      },
    ]
  );

  const [permits, setPermits] = useState<MunicipalPermit[]>(
    project.holdPhase?.permits || [
      {
        id: 'prm-1',
        permitNumber: 'BP-2026-019482',
        type: 'building',
        jurisdiction: 'City of Austin Development Services',
        appliedDate: '2026-01-15',
        approvedDate: '2026-01-28',
        status: 'approved',
      },
      {
        id: 'prm-2',
        permitNumber: 'EP-2026-004812',
        type: 'electrical',
        jurisdiction: 'City of Austin Development Services',
        appliedDate: '2026-01-18',
        approvedDate: '2026-01-30',
        status: 'approved',
      },
      {
        id: 'prm-3',
        permitNumber: 'PP-2026-008910',
        type: 'plumbing',
        jurisdiction: 'City of Austin Development Services',
        appliedDate: '2026-02-02',
        status: 'under_review',
      },
    ]
  );

  const [contractors, setContractors] = useState<ContractorRecord[]>(
    project.holdPhase?.contractors || [
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
    ]
  );

  const [inspections, setInspections] = useState<QualityControlInspection[]>(
    project.holdPhase?.qualityControlInspections || [
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
    ]
  );

  const [draws, setDraws] = useState<DrawRequest[]>(
    project.holdPhase?.drawRequests || [
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
    ]
  );

  const [groundUpMilestones, setGroundUpMilestones] = useState<GroundUpMilestone[]>(
    project.holdPhase?.groundUpMilestones || [
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
    ]
  );

  // Financial States
  const [debtService, setDebtService] = useState<DebtServiceHoldDetails>(
    project.holdPhase?.debtService || {
      monthlyPayment: existingDebt,
      paymentType: 'interest_only',
      lenderName: project.funding?.lenderName || 'Apex Commercial Lending',
      dueDay: 1,
      autopayEnabled: true,
      lastPaymentDate: '2026-03-01',
    }
  );

  const [propertyTax, setPropertyTax] = useState<PropertyTaxHoldDetails>(
    project.holdPhase?.propertyTax || {
      countyParcelId: 'TCAD-849201',
      annualTaxAmount: 5760,
      monthlyEscrowAmount: 480,
      appealStatus: 'not_applicable',
      nextDueDate: '2026-10-31',
      assessedValue: 470000,
    }
  );

  const [insurance, setInsurance] = useState<InsuranceHoldDetails>(
    project.holdPhase?.insurance || {
      policyType: 'builders_risk',
      carrier: 'Travelers Specialty',
      policyNumber: 'BR-2026-8941',
      annualPremium: 3120,
      monthlyPremium: 260,
      coverageLimit: 600000,
      expirationDate: '2026-09-30',
      transitionReady: false,
    }
  );

  const [utilities, setUtilities] = useState<UtilityHoldItem[]>(
    project.holdPhase?.utilities || [
      { id: 'util-1', type: 'electricity', provider: 'Austin Energy', accountNumber: 'AE-88910', monthlyBudget: 110, meterActive: true },
      { id: 'util-2', type: 'water_sewer', provider: 'Austin Water', accountNumber: 'AW-44102', monthlyBudget: 45, meterActive: true },
      { id: 'util-3', type: 'gas', provider: 'Texas Gas Service', accountNumber: 'TG-19402', monthlyBudget: 40, meterActive: true },
      { id: 'util-4', type: 'trash_dumpster', provider: 'Waste Management (20yd)', accountNumber: 'WM-00914', monthlyBudget: 25, meterActive: true },
    ]
  );

  const [hoa, setHoa] = useState<HoaHoldDetails>(
    project.holdPhase?.hoa || {
      hasHoa: false,
      associationName: '',
      monthlyDues: 0,
      dueDay: 1,
      arcApprovalStatus: 'not_required',
      goodStanding: true,
    }
  );

  const [capexItems, setCapexItems] = useState<CapExHoldItem[]>(
    project.holdPhase?.capexItems || [
      { id: 'cap-1', title: 'Complete Roof Shingle Tear-off & Decking', category: 'roofing', amount: 9800, dateCapitalized: '2026-02-15', recoveryYears: 27.5, isCapitalizedForTax: true },
      { id: 'cap-2', title: 'Carrier 3-Ton 16 SEER Heat Pump HVAC', category: 'hvac', amount: 8200, dateCapitalized: '2026-02-28', recoveryYears: 27.5, isCapitalizedForTax: true },
      { id: 'cap-3', title: 'Stainless Steel Commercial Appliance Suite', category: 'appliance_package', amount: 4500, dateCapitalized: '2026-03-10', recoveryYears: 5, isCapitalizedForTax: true },
    ]
  );

  const [bookkeepingSummary, setBookkeepingSummary] = useState<BookkeepingVarianceSummary>(
    project.holdPhase?.bookkeepingSummary || {
      initialHoldingBudget: 35000,
      actualHoldingSpend: 11400,
      projectedCarryingAtExit: 32000,
      varianceAmount: -3000,
      variancePct: -8.5,
      hasOverrunWarning: false,
    }
  );

  // Asset Management States
  const [stabilization, setStabilization] = useState<StabilizationReadiness>(
    project.holdPhase?.stabilization || {
      punchListRemainingCount: 6,
      certificateOfOccupancyObtained: false,
      deepCleaningCompleted: false,
      stagingCompleted: false,
      readyForMarketing: false,
    }
  );

  const [isSelfManaged, setIsSelfManaged] = useState<boolean>(project.holdPhase?.isSelfManaged ?? false);
  const [propertyManagementFeePct, setPropertyManagementFeePct] = useState<number>(
    project.holdPhase?.propertyManagementFeePct ?? 8.0
  );

  const [propertyManager, setPropertyManager] = useState<PropertyManagerHoldDetails>(
    project.holdPhase?.propertyManagerDetails || {
      isSelfManaged,
      companyName: 'Pioneer Austin Management',
      leadManagerName: 'Elena Rostova',
      feePct: propertyManagementFeePct,
      leaseUpFeeAmount: 1900,
      phone: '(512) 555-0199',
      email: 'elena@pioneeraustin.com',
      contractSigned: true,
    }
  );

  const [siteSecurity, setSiteSecurity] = useState<SiteSecurityHoldDetails>(
    project.holdPhase?.siteSecurity || {
      hasCellularCameras: true,
      hasSmartLockbox: true,
      hasMotionLighting: true,
      lockboxCodeLastRotated: '2026-03-01',
      weeklySiteWalkLogged: true,
      squatterPreventionProtocolActive: true,
    }
  );

  const [routineMaintenance, setRoutineMaintenance] = useState<RoutineMaintenanceHoldItem[]>(
    project.holdPhase?.routineMaintenance || [
      { id: 'maint-1', service: 'lawn_care', provider: 'GreenThumb Pro Landscaping', frequency: 'biweekly', costPerVisit: 85, nextScheduledDate: '2026-03-25', status: 'active' },
      { id: 'maint-2', service: 'pest_control', provider: 'Terminix Commercial Barrier', frequency: 'quarterly', costPerVisit: 140, nextScheduledDate: '2026-04-15', status: 'active' },
      { id: 'maint-3', service: 'hvac_filter_turnover', provider: 'Internal Crew', frequency: 'monthly', costPerVisit: 35, nextScheduledDate: '2026-04-01', status: 'active' },
    ]
  );

  // Marketing & Advertising
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    dispositionStrategy === 'SALE' ? 'MLS / Realtor.com' : 'Zillow',
    'Facebook Marketplace',
  ]);
  const [adSpendTotal, setAdSpendTotal] = useState<number>(250);
  const [inquiriesLogged, setInquiriesLogged] = useState<number>(8);
  const [showingsLogged, setShowingsLogged] = useState<number>(4);

  // Holding Duration & Reserves
  const [daysInHold, setDaysInHold] = useState<number>(project.holdPhase?.daysInHold || 90);
  const [monthlyMaintenance, setMonthlyMaintenance] = useState<number>(
    Math.round((propertyPrice * 0.01) / 12)
  );
  const [monthlyCapEx, setMonthlyCapEx] = useState<number>(
    Math.round(grossRent * 0.08)
  );
  const [monthlyVacancyBuffer, setMonthlyVacancyBuffer] = useState<number>(
    Math.round(grossRent * 0.05)
  );
  const [monthlyMunicipalFees, setMonthlyMunicipalFees] = useState<number>(45);

  // Computed Financials
  const computedManagementFee = isSelfManaged ? 0 : Math.round(grossRent * (propertyManagementFeePct / 100));
  const totalMonthlyUtilities = utilities.reduce((acc, u) => acc + (u.meterActive ? u.monthlyBudget : 0), 0);

  const totalMonthlyBurn = useMemo(() => {
    return (
      debtService.monthlyPayment +
      propertyTax.monthlyEscrowAmount +
      insurance.monthlyPremium +
      monthlyMaintenance +
      monthlyCapEx +
      monthlyVacancyBuffer +
      computedManagementFee +
      totalMonthlyUtilities +
      (hoa.hasHoa ? hoa.monthlyDues : 0) +
      monthlyMunicipalFees
    );
  }, [
    debtService.monthlyPayment,
    propertyTax.monthlyEscrowAmount,
    insurance.monthlyPremium,
    monthlyMaintenance,
    monthlyCapEx,
    monthlyVacancyBuffer,
    computedManagementFee,
    totalMonthlyUtilities,
    hoa.hasHoa,
    hoa.monthlyDues,
    monthlyMunicipalFees,
  ]);

  const dailyBurnRate = Math.round((totalMonthlyBurn * 12) / 365);
  const totalHoldingDrag = Math.round(dailyBurnRate * daysInHold);

  // 50% Rule Operating Ratio (Excluding Debt Service)
  const monthlyOperatingBurn = useMemo(() => {
    return (
      propertyTax.monthlyEscrowAmount +
      insurance.monthlyPremium +
      monthlyMaintenance +
      monthlyCapEx +
      monthlyVacancyBuffer +
      computedManagementFee +
      totalMonthlyUtilities +
      (hoa.hasHoa ? hoa.monthlyDues : 0) +
      monthlyMunicipalFees
    );
  }, [
    propertyTax.monthlyEscrowAmount,
    insurance.monthlyPremium,
    monthlyMaintenance,
    monthlyCapEx,
    monthlyVacancyBuffer,
    computedManagementFee,
    totalMonthlyUtilities,
    hoa.hasHoa,
    hoa.monthlyDues,
    monthlyMunicipalFees,
  ]);

  const max50PctOperatingBudget = Math.round(grossRent * 0.5);
  const operatingExpenseRatioPct = grossRent > 0 ? (monthlyOperatingBurn / grossRent) * 100 : 0;
  const isFiftyPercentPass = operatingExpenseRatioPct <= 50;
  const fiftyPercentVariance = max50PctOperatingBudget - monthlyOperatingBurn;

  // Fix-and-Flip Breakeven Resale Calculations
  const selectedTierDetails = RENOVATION_TIER_DETAILS[renovationTier];
  const estimatedRehabCost = selectedTierDetails?.typicalCost || 45000;
  const buyerClosingCosts = Number(project.funding?.closingCosts || Math.round(propertyPrice * 0.02));
  const dispositionRatePct = 5.0;
  const totalInvestedBasis = propertyPrice + estimatedRehabCost + buyerClosingCosts + totalHoldingDrag;
  const breakevenSellingPrice = Math.round(totalInvestedBasis / (1 - dispositionRatePct / 100));
  const targetNetProfitAtARV = Math.round(targetARV * (1 - dispositionRatePct / 100) - totalInvestedBasis);
  const arvHeadroom = targetARV - breakevenSellingPrice;

  // Macro 7-Step Navigation Config
  const stepsConfig: { id: HoldConversationalStepId; title: string }[] = [
    { id: 'disposition_strategy', title: 'Disposition Strategy' },
    { id: 'renovation_tier', title: 'Renovation Tier & Scope' },
    { id: 'piti_debt_service', title: 'PITI Debt & Taxes' },
    { id: 'maintenance_capex_reserves', title: 'Maintenance & CapEx Reserves' },
    { id: 'property_management_utilities', title: 'Management & Utilities' },
    { id: 'marketing_advertising', title: 'Marketing & Ad Channels' },
    { id: 'hold_summary', title: 'Holding Reconciliation' },
  ];

  const handleNext = () => {
    if (currentStepIndex < stepsConfig.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Synchronize state directly to project.holdPhase
  const handleSyncToProject = () => {
    const constructedHoldingCosts: HoldingCostItem[] = [
      {
        id: 'cc-piti-debt',
        category: 'piti_debt_service',
        name: 'Mortgage Principal & Interest Debt Service',
        frequency: 'monthly',
        monthlyAmount: debtService.monthlyPayment,
        status: 'active',
        notes: 'Monthly debt service schedule',
      },
      {
        id: 'cc-piti-taxes',
        category: 'piti_property_taxes',
        name: 'County Property Taxes Escrow',
        frequency: 'monthly',
        monthlyAmount: propertyTax.monthlyEscrowAmount,
        status: 'active',
        notes: 'Ad valorem property tax escrow',
      },
      {
        id: 'cc-piti-insurance',
        category: 'piti_insurance',
        name: insurance.policyType === 'builders_risk' ? 'Builder Risk Insurance Policy' : 'Landlord Hazard (DP-3)',
        frequency: 'monthly',
        monthlyAmount: insurance.monthlyPremium,
        status: 'active',
        notes: 'Includes builder risk or landlord coverage',
      },
      {
        id: 'cc-maintenance',
        category: 'maintenance_repairs',
        name: 'Routine Maintenance & Repairs',
        frequency: 'monthly',
        monthlyAmount: monthlyMaintenance,
        status: 'active',
        notes: '1% property value per year rule-of-thumb benchmark',
      },
      {
        id: 'cc-capex',
        category: 'capex_reserves',
        name: 'CapEx Reserves Allocation',
        frequency: 'monthly',
        monthlyAmount: monthlyCapEx,
        status: 'active',
        notes: '5% to 10% of gross rental income rule-of-thumb benchmark',
      },
      {
        id: 'cc-vacancy',
        category: 'vacancy_buffer',
        name: 'Vacancy & Turnover Reserve Buffer',
        frequency: 'monthly',
        monthlyAmount: monthlyVacancyBuffer,
        status: 'active',
        notes: 'Uncollected rent and make-ready buffer',
      },
      {
        id: 'cc-management',
        category: 'property_management',
        name: isSelfManaged ? 'Self-Managed Oversight' : 'Professional Property Management',
        frequency: 'monthly',
        monthlyAmount: computedManagementFee,
        status: 'active',
        notes: isSelfManaged ? 'Self-managed by investor ($0/mo)' : `${propertyManagementFeePct}% of collected rent`,
      },
      {
        id: 'cc-utilities',
        category: 'utilities',
        name: 'Landlord Construction Utilities',
        frequency: 'monthly',
        monthlyAmount: totalMonthlyUtilities,
        status: 'active',
        notes: 'Electric, water, gas, and job site dumpster accounts',
      },
      {
        id: 'cc-hoa',
        category: 'hoa_dues',
        name: 'HOA / Condo Association Dues',
        frequency: 'monthly',
        monthlyAmount: hoa.hasHoa ? hoa.monthlyDues : 0,
        status: 'active',
        notes: 'Mandatory community association dues',
      },
      {
        id: 'cc-municipal',
        category: 'municipal_fees_taxes',
        name: 'Municipal Rental Licensing & Inspection Fees',
        frequency: 'monthly',
        monthlyAmount: monthlyMunicipalFees,
        status: 'active',
        notes: 'City registration and periodic safety inspection fees',
      },
    ];

    const constructedListingAds: ListingAdRecord[] = selectedChannels.map((channel, idx) => ({
      id: `ad-conv-${idx + 1}`,
      channel: channel as ListingAdRecord['channel'],
      datePlaced: new Date().toISOString().slice(0, 10),
      spendAmount: Math.round(adSpendTotal / Math.max(1, selectedChannels.length)),
      isRecurring: false,
      status: 'active',
      inquiriesGenerated: Math.round(inquiriesLogged / Math.max(1, selectedChannels.length)),
      showingsScheduled: Math.round(showingsLogged / Math.max(1, selectedChannels.length)),
      applicationsReceived: Math.max(1, Math.round(showingsLogged / 2)),
    }));

    const totalCommittedSow = sowItems.reduce((acc, i) => acc + i.budgetedAmount, 0);
    const totalActualSow = sowItems.reduce((acc, i) => acc + i.actualAmount, 0);

    const updatedHoldPhase: HoldPhaseDetails = {
      targetDisposition: dispositionStrategy,
      renovationTier,
      initialRehabBudget: totalCommittedSow || rehabBudget,
      committedSowBudget: totalCommittedSow || rehabBudget,
      actualRehabSpend: totalActualSow,
      finalProjectedCost: totalCommittedSow || rehabBudget,
      targetCompletionDate,
      daysInHold,
      holdingCosts: constructedHoldingCosts,
      listingAds: constructedListingAds,
      isSelfManaged,
      propertyManagementFeePct,
      propertyManagerName: isSelfManaged ? 'Self-Managed' : propertyManager.companyName,
      targetMarketRent: grossRent,
      targetSaleArv: targetARV,
      reservePolicy: {
        vacancyBufferPct: 5.0,
        maintenanceAnnualPct: 1.0,
        capexGrossRentPct: 8.0,
      },

      // 18 Core Activities Structured Records
      sowItems,
      permits,
      contractors,
      qualityControlInspections: inspections,
      drawRequests: draws,
      groundUpMilestones,
      debtService,
      propertyTax,
      insurance,
      utilities,
      hoa,
      capexItems,
      bookkeepingSummary: {
        initialHoldingBudget: bookkeepingSummary.initialHoldingBudget,
        actualHoldingSpend: totalHoldingDrag,
        projectedCarryingAtExit: totalMonthlyBurn * 6,
        varianceAmount: totalHoldingDrag - bookkeepingSummary.initialHoldingBudget,
        variancePct: bookkeepingSummary.initialHoldingBudget > 0 ? ((totalHoldingDrag - bookkeepingSummary.initialHoldingBudget) / bookkeepingSummary.initialHoldingBudget) * 100 : 0,
        hasOverrunWarning: totalHoldingDrag > bookkeepingSummary.initialHoldingBudget,
      },
      stabilization,
      propertyManagerDetails: propertyManager,
      siteSecurity,
      routineMaintenance,
    };

    onUpdateProject({
      ...project,
      holdPhase: updatedHoldPhase,
    });

    onSwitchToExecutiveView();
  };

  return (
    <div
      className="space-y-6 max-w-full overflow-x-hidden font-sans text-neutral-100"
      data-testid="hold-conversational-engine"
    >
      {/* Top Walkthrough Navigation Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-800 bg-neutral-950 p-3 rounded-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            Hold Phase Conversational Engine
          </span>
          <span className="border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-mono text-neutral-300 rounded-none">
            TurboTax / Clerky Progressive Disclosure
          </span>
        </div>

        <div className="flex items-center border border-neutral-800 bg-neutral-900/80 p-0.5 rounded-none">
          <button
            type="button"
            data-testid="conversational-mode-macro"
            onClick={() => setConversationalMode('macro')}
            className={`min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-none transition ${
              conversationalMode === 'macro'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            Strategic Holding Setup (7 Steps)
          </button>
          <button
            type="button"
            data-testid="conversational-mode-activities"
            onClick={() => setConversationalMode('activities')}
            className={`min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-none transition ${
              conversationalMode === 'activities'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            18 Core Activities Checklist
          </button>
        </div>
      </div>

      {/* 18 Core Activities Deep-Dive Mode */}
      {conversationalMode === 'activities' ? (
        <div className="space-y-6">
          {/* Pillar Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-neutral-800 pb-2">
            <button
              type="button"
              data-testid="pillar-btn-renovation"
              onClick={() => setActiveActivityPillar('renovation')}
              className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-none whitespace-nowrap transition border ${
                activeActivityPillar === 'renovation'
                  ? 'border-amber-400 bg-amber-950/30 text-amber-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
              }`}
            >
              🛠️ 1. Renovation & Development (7 Tasks)
            </button>
            <button
              type="button"
              data-testid="pillar-btn-financials"
              onClick={() => setActiveActivityPillar('financials')}
              className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-none whitespace-nowrap transition border ${
                activeActivityPillar === 'financials'
                  ? 'border-emerald-400 bg-emerald-950/30 text-emerald-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
              }`}
            >
              💰 2. Financial Management & Carrying Costs (7 Tasks)
            </button>
            <button
              type="button"
              data-testid="pillar-btn-management"
              onClick={() => setActiveActivityPillar('management')}
              className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-none whitespace-nowrap transition border ${
                activeActivityPillar === 'management'
                  ? 'border-sky-400 bg-sky-950/30 text-sky-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
              }`}
            >
              📊 3. Asset & Property Management (4 Tasks)
            </button>
          </div>

          {/* Render Active Pillar Component */}
          {activeActivityPillar === 'renovation' && (
            <HoldRenovationDevelopmentTasks
              project={project}
              sowItems={sowItems}
              onUpdateSowItems={setSowItems}
              permits={permits}
              onUpdatePermits={setPermits}
              contractors={contractors}
              onUpdateContractors={setContractors}
              inspections={inspections}
              onUpdateInspections={setInspections}
              draws={draws}
              onUpdateDraws={setDraws}
              groundUpMilestones={groundUpMilestones}
              onUpdateGroundUpMilestones={setGroundUpMilestones}
              userTier={userTier}
              propertyState={propertyState}
              activeRoster={activeRoster}
              onUpdateProject={onUpdateProject}
            />
          )}

          {activeActivityPillar === 'financials' && (
            <HoldFinancialCarryingTasks
              project={project}
              debtService={debtService}
              onUpdateDebtService={setDebtService}
              propertyTax={propertyTax}
              onUpdatePropertyTax={setPropertyTax}
              insurance={insurance}
              onUpdateInsurance={setInsurance}
              utilities={utilities}
              onUpdateUtilities={setUtilities}
              hoa={hoa}
              onUpdateHoa={setHoa}
              capexItems={capexItems}
              onUpdateCapexItems={setCapexItems}
              bookkeepingSummary={bookkeepingSummary}
              onUpdateBookkeepingSummary={setBookkeepingSummary}
              userTier={userTier}
              propertyState={propertyState}
              activeRoster={activeRoster}
              onUpdateProject={onUpdateProject}
            />
          )}

          {activeActivityPillar === 'management' && (
            <HoldAssetManagementTasks
              project={project}
              stabilization={stabilization}
              onUpdateStabilization={setStabilization}
              propertyManager={propertyManager}
              onUpdatePropertyManager={setPropertyManager}
              siteSecurity={siteSecurity}
              onUpdateSiteSecurity={setSiteSecurity}
              routineMaintenance={routineMaintenance}
              onUpdateRoutineMaintenance={setRoutineMaintenance}
              userTier={userTier}
              propertyState={propertyState}
              activeRoster={activeRoster}
              onUpdateProject={onUpdateProject}
            />
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={() => setConversationalMode('macro')}
              className="min-h-[44px] px-4 py-2 border border-neutral-800 text-xs text-neutral-400 hover:text-white transition rounded-none"
            >
              ← Back to Strategic Setup
            </button>
            <button
              type="button"
              onClick={handleSyncToProject}
              className="min-h-[44px] px-6 py-2 bg-emerald-400 text-black font-bold text-xs uppercase hover:bg-emerald-300 transition rounded-none"
            >
              Save & Synchronize All 18 Activities
            </button>
          </div>
        </div>
      ) : (
        /* Macro 7-Step Walkthrough Flow */
        <>
          {/* Step Indicator & Progress */}
          <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                  Holding Strategy Walkthrough
                </span>
                <span className="text-xs font-semibold text-white">
                  Step {currentStepIndex + 1} of 7: {stepsConfig[currentStepIndex].title}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-neutral-400">
                  {Math.round(((currentStepIndex + 1) / 7) * 100)}% Complete
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-900 h-1.5 rounded-none overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / 7) * 100}%` }}
              />
            </div>
          </div>

          {/* SCREEN 1: Disposition Strategy */}
          {currentStepIndex === 0 && (
            <section
              data-testid="screen-disposition-strategy"
              className="border border-neutral-800 bg-neutral-950 p-6 rounded-none space-y-5"
            >
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1">
                  Step 1 of 7: Strategic Horizon
                </span>
                <h2 className="text-lg font-bold text-white">
                  What is your primary exit strategy for this property?
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Your strategy dictates whether your carrying costs are evaluated for long-term cash flow or short-term breakeven resale.
                </p>
              </div>

              {/* Context Box */}
              <div className="border-l-2 border-amber-400 bg-amber-950/20 p-3.5 text-xs text-neutral-300">
                <strong className="text-amber-300 font-semibold block mb-0.5">Why this matters:</strong>
                When holding for a sale, every day the property sits unfinished accrues mortgage interest, taxes, and utility drag that directly erodes net resale profit. When holding for rental, carrying expenses establish your long-term operating cost basis.
              </div>

              {/* Choice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'RENT', label: 'Buy & Hold Rental', testid: 'choice-strategy-rent', desc: 'Long-term tenant occupancy, permanent financing, monthly cash flow and tax depreciation.' },
                  { id: 'LEASE', label: 'Commercial / Pop-Up / Lease', testid: 'choice-strategy-lease', desc: 'Short-to-medium term operational lease, master lease agreement, or event space.' },
                  { id: 'SALE', label: 'Fix & Flip (Sale)', testid: 'choice-strategy-sale', desc: 'Active construction holding period, rapid stabilization, and third-party buyer disposition.' },
                ].map((strat) => {
                  const isSelected = dispositionStrategy === strat.id;
                  return (
                    <button
                      key={strat.id}
                      type="button"
                      data-testid={strat.testid}
                      onClick={() => setDispositionStrategy(strat.id as any)}
                      className={`min-h-[100px] p-4 text-left border rounded-none transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/30 text-white'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-sm text-white block">{strat.label}</span>
                        <p className="text-[11px] text-neutral-400 mt-1">{strat.desc}</p>
                      </div>
                      <span className={`text-[9px] uppercase font-mono font-bold mt-3 block ${isSelected ? 'text-amber-300' : 'text-neutral-500'}`}>
                        {isSelected ? 'Selected' : 'Select Option'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* SCREEN 2: Renovation Tier & Scope */}
          {currentStepIndex === 1 && (
            <section
              data-testid="screen-renovation-tier"
              className="border border-neutral-800 bg-neutral-950 p-6 rounded-none space-y-5"
            >
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1">
                  Step 2 of 7: Renovation Scope
                </span>
                <h2 className="text-lg font-bold text-white">
                  Which renovation tier best describes your planned construction?
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Standardized construction tiers anchor your budget expectations against industry historical norms.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {(['STAGE', 'REFURBISH', 'RENOVATE', 'GUT', 'DEVELOP'] as RenovationTier[]).map((tier) => {
                  const info = RENOVATION_TIER_DETAILS[tier];
                  const isSelected = renovationTier === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      data-testid={`choice-tier-${tier.toLowerCase()}`}
                      onClick={() => {
                        setRenovationTier(tier);
                        setRehabBudget(info.typicalCost);
                      }}
                      className={`min-h-[110px] p-3 text-left border rounded-none transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/30 text-white'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs uppercase text-white block">{tier}</span>
                        <span className="text-[10px] font-mono text-amber-300 block mt-0.5">{info.range}</span>
                        <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">{info.description}</p>
                      </div>
                      <span className={`text-[9px] font-mono uppercase mt-2 ${isSelected ? 'text-amber-300 font-bold' : 'text-neutral-500'}`}>
                        {isSelected ? 'Active Tier' : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-800 pt-4">
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                    Baseline Rehab Budget ($)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={rehabBudget}
                    onChange={(e) => setRehabBudget(Number(e.target.value))}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={targetCompletionDate}
                    onChange={(e) => setTargetCompletionDate(e.target.value)}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
                  />
                </div>
              </div>
            </section>
          )}

          {/* SCREEN 3: PITI Debt & Taxes */}
          {currentStepIndex === 2 && (
            <section
              data-testid="screen-piti-debt-service"
              className="border border-neutral-800 bg-neutral-950 p-6 rounded-none space-y-5"
            >
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1">
                  Step 3 of 7: Debt & Tax Baseline
                </span>
                <h2 className="text-lg font-bold text-white">
                  What are your scheduled monthly mortgage payments and property taxes?
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Principal, Interest, Taxes, and Insurance represent non-negotiable monthly carrying burn.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                    Monthly Principal & Interest ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={debtService.monthlyPayment}
                    onChange={(e) => setDebtService({ ...debtService, monthlyPayment: Number(e.target.value) })}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                    Monthly Property Tax Escrow ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="25"
                    value={propertyTax.monthlyEscrowAmount}
                    onChange={(e) => setPropertyTax({ ...propertyTax, monthlyEscrowAmount: Number(e.target.value) })}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                    Monthly Insurance Premium ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="20"
                    value={insurance.monthlyPremium}
                    onChange={(e) => setInsurance({ ...insurance, monthlyPremium: Number(e.target.value) })}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                </div>
              </div>

              <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white">Monthly Fixed Debt & Tax Outflow</span>
                  <p className="text-[11px] text-neutral-400">Sum of P&I debt service, county property tax escrow, and hazard insurance.</p>
                </div>
                <div className="text-right font-mono font-bold text-base text-white">
                  {formatCurrency(debtService.monthlyPayment + propertyTax.monthlyEscrowAmount + insurance.monthlyPremium)}/mo
                </div>
              </div>
            </section>
          )}

          {/* SCREEN 4: Maintenance & CapEx Reserves */}
          {currentStepIndex === 3 && (
            <section
              data-testid="screen-maintenance-capex-reserves"
              className="border border-neutral-800 bg-neutral-950 p-6 rounded-none space-y-5"
            >
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1">
                  Step 4 of 7: Reserves & Preservation
                </span>
                <h2 className="text-lg font-bold text-white">
                  How are you buffering routine maintenance and long-term capital replacements?
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Budgeting reserves prevents unexpected emergency expenses from forcing sudden cash-in injections.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                    Maintenance Reserve ($/mo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="25"
                    value={monthlyMaintenance}
                    onChange={(e) => setMonthlyMaintenance(Number(e.target.value))}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                    Benchmark: 1% of property value per year (${Math.round((propertyPrice * 0.01) / 12)}/mo)
                  </span>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                    CapEx Reserve ($/mo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="25"
                    value={monthlyCapEx}
                    onChange={(e) => setMonthlyCapEx(Number(e.target.value))}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                    Benchmark: 8% of gross scheduled rent (${Math.round(grossRent * 0.08)}/mo)
                  </span>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                    Vacancy Allowance ($/mo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="25"
                    value={monthlyVacancyBuffer}
                    onChange={(e) => setMonthlyVacancyBuffer(Number(e.target.value))}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                    Benchmark: 5% of gross rent (${Math.round(grossRent * 0.05)}/mo)
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* SCREEN 5: Management & Utilities */}
          {currentStepIndex === 4 && (
            <section
              data-testid="screen-property-management-utilities"
              className="border border-neutral-800 bg-neutral-950 p-6 rounded-none space-y-5"
            >
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1">
                  Step 5 of 7: Operations & Management
                </span>
                <h2 className="text-lg font-bold text-white">
                  Who manages the asset, and what are your holding-period utility expenses?
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Professional management fees and active construction utility meters are recurring holding liabilities.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none">
                  <span className="text-xs font-bold text-white block mb-1">Property Management Policy</span>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      data-testid="btn-toggle-self-managed"
                      onClick={() => setIsSelfManaged(!isSelfManaged)}
                      className={`min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-none border transition ${
                        isSelfManaged
                          ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-300'
                      }`}
                    >
                      {isSelfManaged ? 'Self-Managed ($0/mo)' : 'Third-Party Management'}
                    </button>
                    {!isSelfManaged && (
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={propertyManagementFeePct}
                          onChange={(e) => setPropertyManagementFeePct(Number(e.target.value))}
                          className="w-16 min-h-[44px] border border-neutral-700 bg-neutral-900 px-2 text-white text-center rounded-none"
                        />
                        <span className="text-neutral-400">% ({formatCurrency(computedManagementFee)}/mo)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none">
                  <span className="text-xs font-bold text-white block mb-1">Utilities & Municipal Fees</span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-0.5">Utilities ($/mo)</label>
                      <input
                        type="number"
                        min="0"
                        value={totalMonthlyUtilities}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setUtilities(utilities.map((u) => ({ ...u, monthlyBudget: Math.round(val / 4) })));
                        }}
                        className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 text-xs text-white font-mono rounded-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-0.5">Municipal Fees ($/mo)</label>
                      <input
                        type="number"
                        min="0"
                        value={monthlyMunicipalFees}
                        onChange={(e) => setMonthlyMunicipalFees(Number(e.target.value))}
                        className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 text-xs text-white font-mono rounded-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SCREEN 6: Marketing & Ad Channels */}
          {currentStepIndex === 5 && (
            <section
              data-testid="screen-marketing-advertising"
              className="border border-neutral-800 bg-neutral-950 p-6 rounded-none space-y-5"
            >
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1">
                  Step 6 of 7: Market Exposure
                </span>
                <h2 className="text-lg font-bold text-white">
                  Where are you advertising the property to attract tenants or buyers?
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Multi-channel syndication reduces vacancy days and accelerates tenant placement.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MARKETING_CHANNELS.map((ch) => {
                  const isChecked = selectedChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        setSelectedChannels((prev) =>
                          isChecked ? prev.filter((c) => c !== ch) : [...prev, ch]
                        );
                      }}
                      className={`min-h-[44px] p-3 text-left border rounded-none transition flex items-center justify-between ${
                        isChecked
                          ? 'border-amber-400 bg-amber-950/30 text-white'
                          : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-semibold">{ch}</span>
                      <span className="text-xs">{isChecked ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-neutral-800 pt-4">
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Monthly Ad Budget ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={adSpendTotal}
                    onChange={(e) => setAdSpendTotal(Number(e.target.value))}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Inquiries Generated</label>
                  <input
                    type="number"
                    min="0"
                    value={inquiriesLogged}
                    onChange={(e) => setInquiriesLogged(Number(e.target.value))}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Showings Conducted</label>
                  <input
                    type="number"
                    min="0"
                    value={showingsLogged}
                    onChange={(e) => setShowingsLogged(Number(e.target.value))}
                    className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                  />
                </div>
              </div>
            </section>
          )}

          {/* SCREEN 7: Holding Reconciliation & 18 Activities Scorecard */}
          {currentStepIndex === 6 && (
            <section
              data-testid="screen-hold-summary"
              className="border border-neutral-800 bg-neutral-950 p-6 rounded-none space-y-6"
            >
              <div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1">
                  Step 7 of 7: Executive Reconciliation
                </span>
                <h2 className="text-lg font-bold text-white">
                  Holding Period Reconciliation & 18 Core Activities Audit
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Comprehensive audit of carrying drag, operating expense ratio, and holding tasks readiness.
                </p>
              </div>

              {/* Holding Burn Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Monthly Carrying Burn</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">
                    {formatCurrency(totalMonthlyBurn)}/mo
                  </span>
                </div>
                <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Daily Run Rate</span>
                  <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                    {formatCurrency(dailyBurnRate)}/day
                  </span>
                </div>
                <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Cumulative Holding Drag ({daysInHold}d)</span>
                  <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                    -{formatCurrency(totalHoldingDrag)}
                  </span>
                </div>
              </div>

              {/* 50% Rule Guideline Assessment Card */}
              <div
                data-testid="conversational-fifty-percent-rule"
                className={`p-4 border rounded-none ${
                  isFiftyPercentPass
                    ? 'border-emerald-500/30 bg-emerald-950/20'
                    : 'border-amber-500/30 bg-amber-950/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 block">
                      Institutional Benchmark Assessment
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">
                      The 50% Rule Operating Expense Ratio
                    </h3>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      Non-debt holding expenses total {formatCurrency(monthlyOperatingBurn)}/mo against {formatCurrency(grossRent)} gross rent.
                    </p>
                  </div>
                  <span
                    data-testid="conversational-fifty-percent-rule-badge"
                    className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded-none border ${
                      isFiftyPercentPass
                        ? 'border-emerald-600 bg-emerald-950/60 text-emerald-400'
                        : 'border-amber-600 bg-amber-950/60 text-amber-400'
                    }`}
                  >
                    {isFiftyPercentPass ? 'PASS (≤ 50% Rule)' : 'WARNING (> 50% Rule)'}
                  </span>
                </div>
              </div>

              {/* Fix-and-Flip Breakeven Resale Calculator Card */}
              {dispositionStrategy === 'SALE' && (
                <div
                  data-testid="conversational-breakeven-card"
                  className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-white font-mono">
                      Fix-and-Flip Breakeven Selling Price Target
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Target ARV: {formatCurrency(targetARV)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                    <div className="border border-neutral-800 bg-neutral-950 p-2.5 rounded-none">
                      <span className="text-[10px] text-neutral-400 block uppercase">Total Basis</span>
                      <span className="text-white font-mono font-bold block mt-0.5">{formatCurrency(totalInvestedBasis)}</span>
                    </div>
                    <div className="border border-neutral-800 bg-neutral-950 p-2.5 rounded-none">
                      <span className="text-[10px] text-neutral-400 block uppercase">Breakeven Resale</span>
                      <span className="text-amber-400 font-mono font-bold block mt-0.5">{formatCurrency(breakevenSellingPrice)}</span>
                    </div>
                    <div className="border border-neutral-800 bg-neutral-950 p-2.5 rounded-none">
                      <span className="text-[10px] text-neutral-400 block uppercase">ARV Headroom Cushion</span>
                      <span className="text-emerald-400 font-mono font-bold block mt-0.5">+{formatCurrency(arvHeadroom)}</span>
                    </div>
                    <div className="border border-neutral-800 bg-neutral-950 p-2.5 rounded-none">
                      <span className="text-[10px] text-neutral-400 block uppercase">Net Profit at ARV</span>
                      <span className="text-emerald-400 font-mono font-bold block mt-0.5">{formatCurrency(targetNetProfitAtARV)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 18 Core Activities Summary Scorecard */}
              <div data-testid="hold-18-activities-scorecard" className="border border-neutral-800 bg-neutral-900/40 p-4 rounded-none space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                      18 Core Activities Execution Status
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      All activities across Renovation, Financial Carrying, and Asset Management.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConversationalMode('activities')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 underline"
                  >
                    Open Deep Dive →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="border border-neutral-800 bg-neutral-950 p-3 rounded-none">
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                      🛠️ Renovation (7 Tasks)
                    </span>
                    <ul className="mt-2 space-y-1 text-[11px] text-neutral-300">
                      <li>• SOW Finalization ({sowItems.length} lines)</li>
                      <li>• Municipal Permits ({permits.filter((p) => p.status === 'approved').length}/{permits.length} approved)</li>
                      <li>• Contractor Vetting ({contractors.length} active)</li>
                      <li>• Rehab Trades Execution</li>
                      <li>• Ground-Up Development ({groundUpMilestones.length} milestones)</li>
                      <li>• Quality Walkthroughs ({inspections.length} logged)</li>
                      <li>• Draw Requests ({draws.length} draws)</li>
                    </ul>
                  </div>

                  <div className="border border-neutral-800 bg-neutral-950 p-3 rounded-none">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                      💰 Carrying Costs (7 Tasks)
                    </span>
                    <ul className="mt-2 space-y-1 text-[11px] text-neutral-300">
                      <li>• Debt Service ({formatCurrency(debtService.monthlyPayment)}/mo)</li>
                      <li>• Property Tax ({propertyTax.appealStatus.replace('_', ' ')})</li>
                      <li>• Insurance ({insurance.policyType.replace('_', ' ')})</li>
                      <li>• Site Utilities ({utilities.filter((u) => u.meterActive).length} active meters)</li>
                      <li>• HOA Compliance ({hoa.hasHoa ? 'Governed' : 'None'})</li>
                      <li>• CapEx Tracking ({capexItems.length} capitalized)</li>
                      <li>• Bookkeeping ({bookkeepingSummary.hasOverrunWarning ? 'Alert' : 'On Track'})</li>
                    </ul>
                  </div>

                  <div className="border border-neutral-800 bg-neutral-950 p-3 rounded-none">
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block">
                      📊 Asset Management (4 Tasks)
                    </span>
                    <ul className="mt-2 space-y-1 text-[11px] text-neutral-300">
                      <li>• Stabilization ({stabilization.certificateOfOccupancyObtained ? 'CO Issued' : 'Punch List Active'})</li>
                      <li>• Property Manager ({isSelfManaged ? 'Self-Managed' : propertyManager.companyName})</li>
                      <li>• Job Site Security ({siteSecurity.hasCellularCameras ? 'Cameras Active' : 'Basic'})</li>
                      <li>• Routine Maintenance ({routineMaintenance.length} contracts)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={handleBack}
              className={`min-h-[44px] px-5 py-2 text-xs font-semibold rounded-none transition ${
                currentStepIndex === 0
                  ? 'opacity-40 cursor-not-allowed text-neutral-500'
                  : 'border border-neutral-800 text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              Back
            </button>

            {currentStepIndex < stepsConfig.length - 1 ? (
              <button
                type="button"
                data-testid="conversational-next-btn"
                onClick={handleNext}
                className="min-h-[44px] px-6 py-2 bg-white text-black text-xs font-bold hover:bg-neutral-200 transition rounded-none"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                data-testid="sync-hold-workspace-btn"
                onClick={handleSyncToProject}
                className="min-h-[44px] px-6 py-2 bg-emerald-400 text-black text-xs font-bold hover:bg-emerald-300 transition rounded-none flex items-center gap-1.5"
              >
                <span>Save & Synchronize to Hold Workspace</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

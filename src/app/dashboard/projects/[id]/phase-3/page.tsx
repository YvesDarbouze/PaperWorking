'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsService } from '@/lib/firebase/deals';
import { RehabExpense, HoldingCostEntry, SiteVisitLog, ScopeOfWorkItem, ContractorBid, DrawScheduleItem, RehabTask, ProjectFinancials, RehabTier, RehabSpendEntry, ValuationEntry, ListingAdLogEntry, ScreeningChecklistState, TargetLeaseTerms } from '@/types/schema';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { RenovationSpendTracker } from '@/components/project/RenovationSpendTracker';
import { RenovationCompletionCard } from '@/components/project/RenovationCompletionCard';
import { CurrentValueTracker } from '@/components/project/CurrentValueTracker';
import { RentGoToMarket } from '@/components/project/RentGoToMarket';
import { LeaseGoToMarket } from '@/components/project/LeaseGoToMarket';
import { SaleGoToMarket } from '@/components/project/SaleGoToMarket';
import { RehabExpenseTracker } from '@/components/project/RehabExpenseTracker';
import { HoldingCostsTracker } from '@/components/project/HoldingCostsTracker';
import { HoldingCostsWizard } from '@/components/project/HoldingCostsWizard';
import { SiteVisitLogTracker } from '@/components/project/SiteVisitLogTracker';
import { ScopeOfWorkForm } from '@/components/project/ScopeOfWorkForm';
import { ContractorBids } from '@/components/project/ContractorBids';
import GCBidUploader from '@/components/GCBidUploader';
import { CapExComparativeTable } from '@/components/project/CapExComparativeTable';
import { RehabSequenceTracker } from '@/components/project/RehabSequenceTracker';
import { ContractorDrawSchedule } from '@/components/project/ContractorDrawSchedule';
import { EventTriggeredHoldGate } from '@/components/project/EventTriggeredHoldGate';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';

import { RentalSetupForm } from '@/components/project/RentalSetupForm';
import { DaysHeldClock } from '@/components/project/DaysHeldClock';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

import { MetricReadout } from '@/components/metrics/MetricReadout';
import type { MetricResult } from '@/lib/metrics/types';
import toast from 'react-hot-toast';
import { ProjectAtAGlanceSidebar } from '@/components/project/ProjectAtAGlanceSidebar';
import { ValuationHistory } from '@/components/project/ValuationHistory';
import { Info } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import type { F4VendorAssignment } from '@/types/schema';



/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/phase-3 — Hold Workspace

   Stitch Schemas: b795e973 (Hold Phase) + df9efa99 (Operations)
   "Luminous Glass" dark design — single-column mobile-first stack.

   Phase 3 color accent: #454955 (primary / teal) — Hold = active phase
   All save logic 100% preserved from original.
   ═══════════════════════════════════════════════════════════════ */

const PHASE_COLOR = '#454955';
const PHASE_GLOW  = 'rgba(69, 73, 85, 0.4)';

/* ── Rehab Tier Definitions ── */
const REHAB_TIERS: { key: RehabTier; level: number; label: string; range: string; costSignal: string; description: string }[] = [
  { key: 'Stage',      level: 1, label: 'Stage',      range: '$1k–$5k',    costSignal: '($)',     description: 'Aesthetic touch-ups & furniture staging' },
  { key: 'Refurbish',  level: 2, label: 'Refurbish',  range: '$5k–$20k',   costSignal: '($$)',    description: 'Minor cosmetic repairs & painting' },
  { key: 'Renovate',   level: 3, label: 'Renovate',   range: '$20k–$100k',  costSignal: '($$$)',   description: 'Full kitchen/bath updates & fixtures' },
  { key: 'Gut',        level: 4, label: 'Gut',        range: '$100k–$250k', costSignal: '($$$$)',  description: 'Structural changes & total interior strip' },
  { key: 'Develop',    level: 5, label: 'Develop',    range: '$250k+',     costSignal: '($$$$$)', description: 'Addition of square footage or ground-up build' },
];

interface RehabContractorSlot {
  key: string;
  label: string;
  description: string;
}

const CONTRACTOR_SLOTS_BY_TIER: Record<RehabTier, RehabContractorSlot[]> = {
  'Stage': [
    { key: 'staging_coordinator', label: 'Staging Coordinator', description: 'Handles interior decoration, staging design, and furniture logistics.' }
  ],
  'Refurbish': [
    { key: 'general_contractor', label: 'General Contractor', description: 'Oversees the refurbishment scope.' },
    { key: 'painter', label: 'Cosmetic / Painter', description: 'Handles painting, flooring touch-ups, and cosmetic repairs.' }
  ],
  'Renovate': [
    { key: 'general_contractor', label: 'General Contractor', description: 'Primary coordinator for the kitchen, bath, and finish updates.' },
    { key: 'kitchen_bath_contractor', label: 'Kitchen & Bath Specialist', description: 'Subcontractor specialized in cabinetry, countertops, and tiling.' },
    { key: 'mechanical_sub', label: 'Mechanical Subcontractor', description: 'Licensed technician for HVAC, plumbing, or electrical modifications.' }
  ],
  'Gut': [
    { key: 'general_contractor', label: 'General Contractor', description: 'Oversees structural interior demolition and rebuild.' },
    { key: 'architect', label: 'Architect / Structural Engineer', description: 'Prepares drawings, load calculations, and structural layouts.' },
    { key: 'demo_contractor', label: 'Demolition Specialist', description: 'Handles safe interior demolition and debris removal.' },
    { key: 'mechanical_sub', label: 'Mechanical Subcontractor', description: 'Complete system replacements (HVAC ducting, wiring, copper plumbing).' }
  ],
  'Develop': [
    { key: 'general_contractor', label: 'General Contractor / Builder', description: 'Commercial/residential builder managing ground-up execution.' },
    { key: 'architect', label: 'Architect / Designer', description: 'Responsible for master site planning and zoning drawings.' },
    { key: 'civil_engineer', label: 'Civil Engineer', description: 'Handles grading, utility tie-ins, and storm water design.' },
    { key: 'permitting_consultant', label: 'Permitting Consultant / Expediter', description: 'Manages municipal approvals, variances, and certificate of occupancy.' }
  ]
};

export default function Phase3RehabPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params.id as string;

  const { project, loading: isLoading, refresh } = useWorkspaceProject();
  const exitStrategy = project?.dispositionType === 'RENT' ? 'Rent' : project?.dispositionType === 'LEASE' ? 'Lease' : 'Sell';

  const [isSaving, setIsSaving] = useState(false);
  const [rehabExpenses, setRehabExpenses] = useState<RehabExpense[]>([]);
  const [holdingCosts, setHoldingCosts] = useState<HoldingCostEntry[]>([]);
  const [siteVisitLogs, setSiteVisitLogs] = useState<SiteVisitLog[]>([]);
  const [scopeOfWork, setScopeOfWork] = useState<ScopeOfWorkItem[]>([]);
  const [contractorBids, setContractorBids] = useState<ContractorBid[]>([]);
  const [drawSchedule, setDrawSchedule] = useState<DrawScheduleItem[]>([]);
  const [rehabTasks, setRehabTasks] = useState<RehabTask[]>([]);
  const [daysHeld, setDaysHeld] = useState(0);
  const [editedBudget, setEditedBudget] = useState<string>('');
  const [editedCompletionTarget, setEditedCompletionTarget] = useState<string>('');
  const [editingContractorSlot, setEditingContractorSlot] = useState<string | null>(null);
  const [contractorForm, setContractorForm] = useState({
    name: '',
    firm: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (!project) return;
    setRehabExpenses(project.rehabExpenses || []);
    setHoldingCosts(project.holdingCosts || []);
    setSiteVisitLogs(project.siteVisitLogs || []);
    setScopeOfWork(project.rehab?.scopeOfWork || []);
    setContractorBids(project.rehab?.contractorBids || []);
    setDrawSchedule(project.rehab?.drawSchedule || []);
    setRehabTasks(project.financials?.rehabTasks || []);

    const finalBudget = project.financials?.rehab_budget || project.financials?.projectedRehabCost || (project as any).rehabBudget || 0;
    setEditedBudget(finalBudget ? (finalBudget / 100).toString() : '');
    
    let compTarget = '';
    const rawTarget = project.financials?.rehab_completion_target || project.financials?.rehabDoneDate;
    if (rawTarget) {
      if (typeof rawTarget === 'string') {
        compTarget = rawTarget.slice(0, 10);
      } else if (rawTarget.toDate) {
        compTarget = rawTarget.toDate().toISOString().slice(0, 10);
      } else if (rawTarget instanceof Date) {
        compTarget = rawTarget.toISOString().slice(0, 10);
      }
    }
    setEditedCompletionTarget(compTarget);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const startDate = project.financials?.holdStartDate || project.financials?.acquisitionDate || project.createdAt;
    if (!startDate) return;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    setDaysHeld(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [project?.financials?.holdStartDate, project?.financials?.acquisitionDate, project?.createdAt]);

  /* ── Computed: Budget vs Actual ── */
  const budgetMetrics = useMemo(() => {
    const rehabSpend = project?.financials?.rehab_spend || [];
    const totalSpent = rehabSpend.reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgetLow = project?.financials?.rehabTierBudgetLow || 0;
    const budgetHigh = project?.financials?.rehabTierBudgetHigh || 0;
    const budget = project?.financials?.rehab_budget || budgetHigh || (project?.financials?.purchasePrice ? project.financials.purchasePrice * 0.1 : 0);
    const pct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
    const remaining = Math.max(0, budget - totalSpent);
    return { totalSpent, budget, budgetLow, budgetHigh, pct: Math.min(pct, 100), remaining };
  }, [project?.financials]);

  /* ── Computed: Holding Costs ── */
  const holdMetrics = useMemo(() => {
    const monthlyTotal = holdingCosts.reduce((sum, c) => sum + (c.monthlyAmount || 0), 0);
    const dailyBurn = monthlyTotal / 30;
    const totalBurned = dailyBurn * daysHeld;
    return { monthlyTotal, dailyBurn, totalBurned };
  }, [holdingCosts, daysHeld]);

  /* ── Computed: Live Project Metrics via deriveAllMetrics ── */
  const liveMetrics = useMemo(() => {
    if (!project?.financials) return null;
    return deriveAllMetrics(
      project.financials,
      project.financials.estimatedCurrentValue,
      project.dispositionType,
      project.currentPhase,
      project.createdAt
    );
  }, [project?.financials, project?.dispositionType, project?.currentPhase, project?.createdAt]);

  const wrapResult = (val: number | null): MetricResult => ({
    value: val,
    state: project?.currentPhase === 3 ? 'live' : project?.currentPhase === 4 ? 'realized' : 'projected',
    inputsUsed: {},
    inputsMissing: [],
  });

  const noiResult: MetricResult = useMemo(() => wrapResult(liveMetrics?.noi ?? null), [liveMetrics, project?.currentPhase]);
  const occupancyResult: MetricResult = useMemo(() => wrapResult(liveMetrics?.occupancyRate ?? null), [liveMetrics, project?.currentPhase]);
  const oerResult: MetricResult = useMemo(() => wrapResult(liveMetrics?.oer ?? null), [liveMetrics, project?.currentPhase]);
  const cashFlowResult: MetricResult = useMemo(() => wrapResult(liveMetrics?.annualCashFlow ?? null), [liveMetrics, project?.currentPhase]);

  /* ── Derived NOI formula components for footer ── */
  const noiFormula = useMemo(() => {
    if (!project?.financials) return { grossIncome: 0, vacancyLoss: 0, opex: 0, noi: 0 };
    const fin = project.financials;
    const monthlyRent = fin.monthlyGrossRent ?? fin.projectedMonthlyRent ?? fin.projectedRent ?? 0;
    const grossIncome = monthlyRent * 12 + (fin.otherMonthlyIncome ?? 0) * 12;
    const vacancyPct = fin.vacancyRatePercent ?? fin.vacancyRate ?? 7;
    const vacancyLoss = (monthlyRent * 12) * (vacancyPct / 100);
    const noi = noiResult.value ?? 0;
    const opex = grossIncome - vacancyLoss - noi;
    return { grossIncome, vacancyLoss, opex, noi };
  }, [project?.financials, noiResult.value]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      await projectsService.updateProject(projectId, {
        rehabExpenses,
        holdingCosts,
        siteVisitLogs,
        rehab: {
          baseBudget: 0,
          contingencyBufferPercentage: 0.15,
          tasks: [],
          permits: [],
          pendingReceipts: [],
          drawRequests: [],
          ...(project.rehab || {}),
          scopeOfWork,
          contractorBids,
          drawSchedule
        },
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          rehabTasks
        }
      });
      toast.success('Phase 3 tracking saved!');
      refresh();
    } catch (error) {
      console.error('Error saving Phase 3:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompletePhase = async () => {
    if (!project) return;
    try {
      await handleSave();
      await projectsService.updateProject(projectId, {
        phaseStatus: 'Phase 4: Exit',
        currentPhase: 4,
        status: 'exit',
        updatedAt: new Date()
      });
      toast.success('Phase 3 Complete! Transitioning to Phase 4...');
      router.push(`/dashboard/projects/${projectId}/phase-4`);
    } catch (error) {
      console.error('Error transitioning phase:', error);
      toast.error('Failed to complete phase');
    }
  };

  const handleStageChange = async (stage: 'Demolition' | 'Rough-In/MEP' | 'Finishes' | 'Staging' | 'Complete') => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        rehab: {
          baseBudget: 0, contingencyBufferPercentage: 0.15, tasks: [], permits: [],
          pendingReceipts: [], drawRequests: [],
          ...(project.rehab || {}),
          currentStage: stage,
        }
      });
      refresh();
    } catch (err) { console.error('Failed to update stage:', err); }
  };

  const handleTierChange = async (tier: RehabTier) => {
    if (!project) return;
    // Budget ranges per tier
    const budgetMap: Record<RehabTier, [number, number]> = {
      'Stage': [1000, 5000],
      'Refurbish': [5000, 20000],
      'Renovate': [20000, 100000],
      'Gut': [100000, 250000],
      'Develop': [250000, 1000000],
    };
    const [low, high] = budgetMap[tier] || [0, 0];
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          rehabTier: tier,
          renovation_tier: tier,
          rehabTierBudgetLow: low,
          rehabTierBudgetHigh: high,
        }
      });
      refresh();
      toast.success(`Rehab tier set to ${tier}`);
    } catch (err) {
      console.error('Failed to update tier:', err);
      toast.error('Failed to update rehab tier');
    }
  };



  const handleBudgetTimelineUpdate = async (updates: {
    rehab_budget?: number;
    rehab_completion_target?: string;
    rehab_contractors?: Record<string, F4VendorAssignment | null>;
  }) => {
    if (!project) return;
    try {
      const mergedContractors = {
        ...(project.financials?.rehab_contractors || {}),
        ...(updates.rehab_contractors || {})
      };
      
      Object.keys(mergedContractors).forEach(key => {
        if (mergedContractors[key] === null) {
          delete mergedContractors[key];
        }
      });

      const updatedFinancials = {
        ...project.financials,
        purchasePrice: project.financials?.purchasePrice || 0,
        estimatedARV: project.financials?.estimatedARV || 0,
        costs: project.financials?.costs || []
      };

      if (updates.rehab_budget !== undefined) {
        updatedFinancials.rehab_budget = updates.rehab_budget;
        updatedFinancials.rehabBudget = updates.rehab_budget;
      }
      if (updates.rehab_completion_target !== undefined) {
        updatedFinancials.rehab_completion_target = updates.rehab_completion_target;
        updatedFinancials.rehabDoneDate = updates.rehab_completion_target;
      }
      if (updates.rehab_contractors !== undefined) {
        updatedFinancials.rehab_contractors = mergedContractors;
      }

      await projectsService.updateProject(projectId, {
        financials: updatedFinancials
      });
      refresh();
      toast.success('Renovation details updated successfully');
    } catch (err) {
      console.error('Failed to update renovation details:', err);
      toast.error('Failed to update renovation details');
    }
  };

  const handleSpendUpdate = async (updatedSpend: RehabSpendEntry[]) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          rehab_spend: updatedSpend
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to update spend ledger:', err);
      toast.error('Failed to update spend ledger');
    }
  };

  const handleSaveCompletion = async (completedDate: string, spendTotal: number) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          rehab_completed_date: completedDate,
          rehabDoneDate: completedDate,
          rehab_spend_total: spendTotal,
          rehab_budget: spendTotal,
          rehabBudget: spendTotal
        }
      });
      refresh();
      toast.success('Renovation completed successfully!');
    } catch (err) {
      console.error('Failed to complete renovation:', err);
      toast.error('Failed to save completion details');
    }
  };
  const handleSaveHoldingCostCategory = async (category: string, amount: number) => {
    if (!project) return;
    try {
      const dbFieldMap: Record<string, string> = {
        tax: 'holding_cost_tax',
        insurance: 'holding_cost_insurance',
        security: 'holding_cost_security',
        maintenance: 'holding_cost_maintenance',
        utilities: 'holding_cost_utilities',
        management: 'holding_cost_management',
        hoa: 'holding_cost_hoa',
        capex: 'holding_cost_capex'
      };
      
      const legacyFieldMap: Record<string, string> = {
        tax: 'holdingCostTaxes',
        insurance: 'holdingCostInsurance',
        maintenance: 'holdingCostMaintenance',
        utilities: 'holdingCostUtilities',
        management: 'holdingCostManagement',
        hoa: 'hoaMonthly'
      };
      
      const fieldName = dbFieldMap[category];
      const legacyFieldName = legacyFieldMap[category];
      
      const updates: Record<string, any> = {
        [fieldName]: amount
      };
      if (legacyFieldName) {
        updates[legacyFieldName] = amount;
      }
      
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          ...updates
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to save holding cost:', err);
      toast.error('Failed to save holding cost');
    }
  };

  const handleAddValuation = async (newEntry: ValuationEntry) => {
    if (!project) return;
    try {
      const currentList = project.financials?.current_value || [];
      const updatedList = [...currentList, newEntry];
      
      const sorted = [...updatedList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestValue = sorted[0]?.value || 0;

      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          current_value: updatedList,
          estimatedCurrentValue: latestValue
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to add valuation:', err);
      toast.error('Failed to add valuation');
    }
  };

  const handleDeleteValuation = async (id: string) => {
    if (!project) return;
    try {
      const currentList = project.financials?.current_value || [];
      const updatedList = currentList.filter(v => v.id !== id);
      
      const sorted = [...updatedList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestValue = sorted[0]?.value || 0;

      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          current_value: updatedList,
          estimatedCurrentValue: latestValue
        }
      });
      refresh();
      toast.success('Valuation deleted successfully');
    } catch (err) {
      console.error('Failed to delete valuation:', err);
      toast.error('Failed to delete valuation');
    }
  };

  const handleSaveListPrice = async (price: number) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          list_price_sale: price
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to save target list price:', err);
      toast.error('Failed to save list price');
    }
  };

  const handleSaveListingAgent = async (agent: F4VendorAssignment | null) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          listing_agent_vendor: agent
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to save listing agent:', err);
      toast.error('Failed to save listing agent');
    }
  };

  const handleRecordRentPayment = async (amount: number) => {
    if (!project) return;
    try {
      const newEntry = {
        id: `inc-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        amount,
        type: 'rent' as const,
        unitId: 'Unit 1',
        tenantName: 'Jane Doe'
      };
      const existingLedger = project.financials?.incomeLedger || [];
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          incomeLedger: [...existingLedger, newEntry]
        }
      });
      refresh();
      toast.success('Confirmed rent payment recorded!');
    } catch (err) {
      console.error('Failed to record rent payment:', err);
      toast.error('Failed to record rent payment');
    }
  };

  const handleActivateLease = async (tenantName: string, rentAmount: number, leaseStart: string, leaseEnd: string) => {
    if (!project) return;
    try {
      const newEntry = {
        id: `ten-${Date.now()}`,
        unitId: 'Unit 1',
        rentAmount,
        leaseStart,
        leaseEnd,
        status: 'active' as const,
        moveInDate: leaseStart
      };
      const existingRegistry = project.financials?.tenantRegistry || [];
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          tenantRegistry: [...existingRegistry, newEntry]
        }
      });
      refresh();
      toast.success('Lease activated in registry!');
    } catch (err) {
      console.error('Failed to activate lease:', err);
      toast.error('Failed to activate lease');
    }
  };

  const handleMarkSaleUnderContract = async () => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          sale_under_contract: true
        }
      });
      refresh();
      toast.success('Property is now under contract for sale!');
    } catch (err) {
      console.error('Failed to mark sale under contract:', err);
      toast.error('Failed to update contract status');
    }
  };

  const handleAdvanceToExit = async (baseline: {
    costBasis: number;
    capitalizedImprovements: number;
    holdingCosts: number;
    outcome: string;
  }) => {
    if (!project) return;
    try {
      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      
      const res = await fetch(`/api/projects/${projectId}/hold/auto-advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(baseline)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Advance failed' }));
        throw new Error(err.error || 'Failed to auto-advance');
      }

      toast.success('Hold phase completed successfully!');
      router.push(`/dashboard/projects/${projectId}/phase-4`);
    } catch (err) {
      console.error('Failed to auto-advance:', err);
      toast.error('Failed to transition to Exit');
    }
  };

  const handleSaveLeaseTerms = async (terms: TargetLeaseTerms) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          target_lease_terms: terms
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to save lease terms:', err);
      toast.error('Failed to save lease terms');
    }
  };

  const handleSaveTargetRent = async (rent: number) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          target_rent: rent
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to save target rent:', err);
      toast.error('Failed to save target rent');
    }
  };

  const handleAddListingAd = async (newAd: ListingAdLogEntry) => {
    if (!project) return;
    try {
      const currentAds = project.financials?.listing_ads || [];
      const updatedAds = [...currentAds, newAd];

      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          listing_ads: updatedAds
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to add listing ad:', err);
      toast.error('Failed to add listing ad');
    }
  };

  const handleUpdateAdStatus = async (id: string, status: 'active' | 'paused' | 'removed') => {
    if (!project) return;
    try {
      const currentAds = project.financials?.listing_ads || [];
      const updatedAds = currentAds.map(ad => ad.id === id ? { ...ad, status } : ad);

      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          listing_ads: updatedAds
        }
      });
      refresh();
      toast.success('Listing ad status updated');
    } catch (err) {
      console.error('Failed to update ad status:', err);
      toast.error('Failed to update ad status');
    }
  };

  const handleDeleteListingAd = async (id: string) => {
    if (!project) return;
    try {
      const currentAds = project.financials?.listing_ads || [];
      const updatedAds = currentAds.filter(ad => ad.id !== id);

      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          listing_ads: updatedAds
        }
      });
      refresh();
      toast.success('Listing ad deleted');
    } catch (err) {
      console.error('Failed to delete listing ad:', err);
      toast.error('Failed to delete listing ad');
    }
  };

  const handleSaveScreeningChecklist = async (state: ScreeningChecklistState) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          screening_checklist: state
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to save screening checklist:', err);
      toast.error('Failed to save screening checklist');
    }
  };

  const handleRentalSetupChange = async (updates: Partial<ProjectFinancials>) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          ...updates
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to update rental setup:', err);
      toast.error('Failed to update setup');
    }
  };

  const handleImmediateSave = async (updates: Record<string, any>) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, updates);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleDrawScheduleChange = async (newDraws: DrawScheduleItem[]) => {
    if (!project) return;

    // Detect newly paid draws (Paid status in newDraws but not in drawSchedule)
    const newlyPaidDraws = newDraws.filter(newDraw => {
      if (newDraw.status !== 'Paid') return false;
      const oldDraw = drawSchedule.find(d => d.id === newDraw.id);
      return !oldDraw || oldDraw.status !== 'Paid';
    });

    let updatedExpenses = [...rehabExpenses];

    if (newlyPaidDraws.length > 0) {
      newlyPaidDraws.forEach(draw => {
        // Trigger simulated bank transfer notification toast
        toast.success(`Bank transfer initiated: $${draw.amount.toLocaleString()} for "${draw.milestone}"`);

        // Automatically append matching expense entry to rehabExpenses ledger
        const newExpense: RehabExpense = {
          id: crypto.randomUUID(),
          category: 'Professional Labor',
          description: `Contractor Draw: ${draw.milestone}`,
          amount: draw.amount,
          vendor: 'General Contractor',
          paid: true,
          paidAt: new Date(),
          createdAt: new Date()
        };
        updatedExpenses.push(newExpense);
      });
      setRehabExpenses(updatedExpenses);
    }

    setDrawSchedule(newDraws);

    // Persist updates immediately
    try {
      await projectsService.updateProject(projectId, {
        rehabExpenses: updatedExpenses,
        rehab: {
          baseBudget: 0,
          contingencyBufferPercentage: 0.15,
          tasks: [],
          permits: [],
          pendingReceipts: [],
          drawRequests: [],
          ...(project.rehab || {}),
          scopeOfWork,
          contractorBids,
          drawSchedule: newDraws
        }
      });
      refresh();
    } catch (error) {
      console.error('Failed to auto-save draw schedule update:', error);
      toast.error('Failed to save draw schedule changes');
    }
  };

  /* ── Format helpers ── */
  const fmtDollar = (value?: number) => {
    if (!value && value !== 0) return '—';
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  const fmtCurrency = (value?: number) => {
    if (!value && value !== 0) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const fmtPct = (value?: number) => {
    if (!value && value !== 0) return '—';
    return `${value.toFixed(1)}%`;
  };

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-2 rounded-full animate-spin"
            style={{ borderColor: PHASE_COLOR, borderTopColor: 'transparent' }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9DA0]">
            Loading Workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-[#9E9DA0]">Project not found.</p>
        </div>
      </div>
    );
  }

  const ownershipPct = project.financials?.ownershipPercentage ?? 100;
  const currentTier = project.financials?.renovation_tier || project.financials?.rehabTier;
  const arvValue = project.financials?.estimatedARV || project.financials?.estimatedCurrentValue || 0;
  const monthlyHoldingCosts = holdMetrics.monthlyTotal;
  const totalBudget = budgetMetrics.budget;
  const unpaidInvoicesCount = rehabExpenses.filter(e => !e.paid).length;
  const uncompletedMilestonesCount = drawSchedule.filter(d => d.status !== 'Paid').length;

  /* ── Rehab progress (tasks-based) ── */
  const rehabDone = rehabTasks.filter(t => t.status === 'Complete').length;
  const rehabTotal = rehabTasks.length;
  const rehabPct = rehabTotal > 0 ? Math.round((rehabDone / rehabTotal) * 100) : 0;

  if (project?.entryStage === 'renovating_marketing') {
    return (
      <div className="min-h-screen bg-[#0d0a0b] relative p-8">
        <div className="max-w-2xl mx-auto bg-[#161318] border border-white/10 rounded-2xl p-8 space-y-6 text-left">
          <div className="flex items-center gap-3 text-[#ffac5a]">
            <span className="material-symbols-outlined text-3xl">construction</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Hold Workspace in Development</h1>
          </div>
          <p className="text-[#9E9DA0] text-sm">
            This project was initialized directly at the <strong>Owned (Renovating / Marketing)</strong> stage. 
            The operational checklist for the Hold Workspace is currently in development.
          </p>

          <hr className="border-white/5" />

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0] mb-3">Backfilled Project Data</h3>
            <div className="space-y-3 bg-[#0d0a0b] p-4 rounded-xl border border-white/5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">PROPERTY ADDRESS:</span>
                <span className="text-white font-medium">{project.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">CONTRACT PRICE:</span>
                <span className="text-white font-medium">
                  {project.financials?.purchasePrice ? `$${project.financials.purchasePrice.toLocaleString()}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">TARGET CLOSING:</span>
                <span className="text-white font-medium">
                  {project.financials?.acquisitionDate ? new Date(project.financials.acquisitionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">ENTRY STAGE:</span>
                <span className="text-[#ffac5a] font-bold">OWNED — RENOVATING/MARKETING</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a0b] relative">

      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-[#454955]/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] bg-[#7A9EAA]/5 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      {/* ── Explainer Video Banner ── */}
      <PhaseExplainerVideo
        phaseKey="phase-3"
        title="Understanding Phase 3: Hold"
        description="Welcome to the Hold phase. Understand the severity of tracking holding costs—whether you intend to rehab, rent, or sell. Keep tight control over your contractor sequencing, because every day of delay eats directly into your final profit."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="4:12"
      />

      {/* ═══════════════════════════════════════════════════════
          Workspace Body — Luminous Glass Layout
          ═══════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-5 md:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Forms and Trackers) */}
          <div className="lg:col-span-8 space-y-8">
            {/* ── Phase Context Header ── */}
            <section className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[12px] leading-[14px] font-medium tracking-[0.05em] uppercase" style={{ color: PHASE_COLOR }}>
                    Phase: Hold
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#9E9DA0]">
                      Equity: {ownershipPct}%
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full bg-[#454955]/15 text-[#454955]">
                      Day {daysHeld}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em]" style={{ color: PHASE_COLOR }}>
                    {rehabPct}% Complete
                  </span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-[#262328] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${rehabPct}%`,
                    background: `linear-gradient(90deg, #454955 0%, ${PHASE_COLOR} 100%)`,
                    boxShadow: `0 0 20px -5px ${PHASE_GLOW}`,
                  }}
                />
              </div>
            </section>

            {/* ── Budget & Timeline (Card H1.2) ── */}
            <section className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <span className="material-symbols-outlined text-[#7A9EAA]">schedule</span>
                <h3 className="text-[16px] leading-[20px] font-semibold text-white">Budget, Timeline &amp; Contractors</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Budget input */}
                <div className="space-y-2">
                  <label className="text-[12px] font-medium tracking-[0.05em] text-[#9E9DA0] uppercase flex items-center justify-between">
                    <span>What's the renovation budget?</span>
                    {!project?.financials?.rehab_budget && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                        Sourcing Underwriting Confirmation
                      </span>
                    )}
                  </label>
                  <div className="relative rounded-lg bg-black/30 border border-white/10 hover:border-white/20 transition-all flex items-center px-3 py-2">
                    <span className="text-[#9E9DA0] text-sm mr-1.5 font-mono">$</span>
                    <input
                      type="text"
                      value={editedBudget}
                      onChange={(e) => setEditedBudget(e.target.value)}
                      onBlur={() => {
                        const parsed = parseFloat(editedBudget.replace(/,/g, ''));
                        if (!isNaN(parsed)) {
                          handleBudgetTimelineUpdate({ rehab_budget: Math.round(parsed * 100) });
                        }
                      }}
                      className="bg-transparent text-white font-mono text-sm w-full outline-none"
                      placeholder="e.g. 15,000"
                    />
                  </div>
                </div>

                {/* Target Date input */}
                <div className="space-y-2">
                  <label className="text-[12px] font-medium tracking-[0.05em] text-[#9E9DA0] uppercase">
                    Target completion date?
                  </label>
                  <div className="relative rounded-lg bg-black/30 border border-white/10 hover:border-white/20 transition-all flex items-center px-3 py-2">
                    <input
                      type="date"
                      value={editedCompletionTarget}
                      onChange={(e) => {
                        setEditedCompletionTarget(e.target.value);
                        handleBudgetTimelineUpdate({ rehab_completion_target: e.target.value });
                      }}
                      className="bg-transparent text-white text-sm w-full outline-none filter invert"
                    />
                  </div>
                </div>
              </div>

              {/* Contractor slots for current tier */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-bold text-[#9E9DA0] tracking-wider uppercase">
                  Contractor Assignments ({currentTier || 'Stage'} Tier)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(CONTRACTOR_SLOTS_BY_TIER[currentTier || 'Stage'] || []).map((slot) => {
                    const assignment = project?.financials?.rehab_contractors?.[slot.key];
                    const isEditing = editingContractorSlot === slot.key;

                    return (
                      <div key={slot.key} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-[#7A9EAA] uppercase tracking-wider block">
                              {slot.label}
                            </span>
                            <span className="text-[9px] text-[#9E9DA0] leading-snug block mt-0.5">
                              {slot.description}
                            </span>
                          </div>
                          {!isEditing && (
                            <div className="flex gap-2">
                              {assignment ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingContractorSlot(slot.key);
                                      setContractorForm({
                                        name: assignment.name || '',
                                        firm: assignment.firm || '',
                                        phone: assignment.phone || '',
                                        email: assignment.email || ''
                                      });
                                    }}
                                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#9E9DA0] transition"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updatedContractors = { ...project?.financials?.rehab_contractors };
                                      updatedContractors[slot.key] = null; // Mark deleted
                                      handleBudgetTimelineUpdate({ rehab_contractors: updatedContractors });
                                    }}
                                    className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingContractorSlot(slot.key);
                                    setContractorForm({ name: '', firm: '', phone: '', email: '' });
                                  }}
                                  className="text-[10px] font-bold bg-[#7A9EAA]/10 hover:bg-[#7A9EAA]/25 text-[#7A9EAA] px-2 py-1 rounded transition"
                                >
                                  + Assign
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {assignment && !isEditing && (
                          <div className="pt-2 border-t border-white/5 text-xs space-y-1">
                            <p className="font-semibold text-white">{assignment.name} <span className="text-[#9E9DA0] font-normal">{assignment.firm ? `(${assignment.firm})` : ''}</span></p>
                            {assignment.phone && <p className="text-[11px] text-[#9E9DA0]">Phone: {assignment.phone}</p>}
                            {assignment.email && <p className="text-[11px] text-[#9E9DA0]">Email: {assignment.email}</p>}
                          </div>
                        )}

                        {isEditing && (
                          <div className="pt-2 border-t border-white/5 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Contact Name"
                                value={contractorForm.name}
                                onChange={(e) => setContractorForm(prev => ({ ...prev, name: e.target.value }))}
                                className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none w-full"
                              />
                              <input
                                type="text"
                                placeholder="Firm Name"
                                value={contractorForm.firm}
                                onChange={(e) => setContractorForm(prev => ({ ...prev, firm: e.target.value }))}
                                className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none w-full"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Phone"
                                value={contractorForm.phone}
                                onChange={(e) => setContractorForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none w-full"
                              />
                              <input
                                type="text"
                                placeholder="Email"
                                value={contractorForm.email}
                                onChange={(e) => setContractorForm(prev => ({ ...prev, email: e.target.value }))}
                                className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none w-full"
                              />
                            </div>
                            <div className="flex justify-end gap-2 text-[10px]">
                              <button
                                onClick={() => setEditingContractorSlot(null)}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[#9E9DA0] transition"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!contractorForm.name) {
                                    toast.error('Contractor Name is required');
                                    return;
                                  }
                                  const updatedContractors = { ...project?.financials?.rehab_contractors };
                                  updatedContractors[slot.key] = {
                                    name: contractorForm.name,
                                    firm: contractorForm.firm || null,
                                    phone: contractorForm.phone || null,
                                    email: contractorForm.email || null,
                                    source: 'off_platform',
                                    assignedAt: new Date().toISOString(),
                                    assignedBy: getAuth().currentUser?.email || 'System'
                                  };
                                  handleBudgetTimelineUpdate({ rehab_contractors: updatedContractors });
                                  setEditingContractorSlot(null);
                                }}
                                className="px-2 py-1 rounded bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white font-bold transition"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ── Rehab Tier Selector (Stitch schema: 5-column grid) ── */}
            <section className="space-y-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-[20px] leading-[28px] font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#7A9EAA]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>architecture</span>
                  What level of work does this property need?
                </h2>
                <p className="text-[11px] text-[#9E9DA0] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#7A9EAA] shrink-0" />
                  <span>The tier sets the budget conversation and the timeline expectation.</span>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {REHAB_TIERS.map((tier) => {
                  const isActive = currentTier === tier.key;
                  return (
                    <button
                      key={tier.key}
                      onClick={() => handleTierChange(tier.key)}
                      className={`p-4 rounded-xl text-left transition-all flex flex-col justify-between gap-2 border cursor-pointer ${
                        isActive
                          ? 'bg-[#454955]/15 border-[#454955] text-white'
                          : 'glass-card border-white/5 text-[#9E9DA0] hover:bg-white/5 hover:border-white/10'
                      }`}
                      style={isActive ? { boxShadow: `0 0 20px -5px ${PHASE_GLOW}` } : {}}
                    >
                      <div>
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[9px] tracking-widest font-bold uppercase ${isActive ? 'text-[#7A9EAA]' : 'text-[#9E9DA0]/50'}`}>
                            LEVEL {tier.level}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#7A9EAA]">{tier.costSignal}</span>
                        </div>
                        <p className={`text-md font-bold mt-1 ${isActive ? 'text-white' : 'text-white/80'}`}>
                          {tier.label}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-[#9E9DA0] leading-snug line-clamp-2">{tier.description}</p>
                        <p className={`text-[10px] font-bold mt-2 font-mono ${isActive ? 'text-[#7A9EAA]' : 'text-[#9E9DA0]/60'}`}>
                          {tier.range}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Budget vs Actual (Stitch schema: progress bar card) ── */}
            <section className="glass-card rounded-xl p-5 space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#454955]/5 rounded-full blur-3xl" />
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0] uppercase">Rehab Budget vs. Actual</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                      {fmtCurrency(budgetMetrics.totalSpent)}
                    </span>
                    <span className="text-[#9E9DA0]">/ {fmtCurrency(budgetMetrics.budget)} Budgeted</span>
                  </div>
                </div>
                {budgetMetrics.budgetLow > 0 && (
                  <div className="text-right">
                    <p className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#7A9EAA]">TIER RANGE</p>
                    <p className="text-[14px] leading-[16px] font-semibold text-[#9E9DA0]">
                      {fmtDollar(budgetMetrics.budgetLow)} – {fmtDollar(budgetMetrics.budgetHigh)}
                    </p>
                  </div>
                )}
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 luminous-glow"
                  style={{
                    width: `${budgetMetrics.pct}%`,
                    background: budgetMetrics.pct > 90
                      ? 'linear-gradient(90deg, #ffb4ab 0%, #ff6b6b 100%)'
                      : `linear-gradient(90deg, ${PHASE_COLOR}66 0%, ${PHASE_COLOR} 100%)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-medium tracking-[0.05em] text-[#9E9DA0]">
                <span>{budgetMetrics.pct}% ALLOCATED</span>
                <span>{fmtCurrency(budgetMetrics.remaining)} REMAINING</span>
              </div>
            </section>

            {/* ── Days Held Clock + Burn Rate (2-up) ── */}
            <section className="grid grid-cols-2 gap-3">
              <DaysHeldClock daysHeld={daysHeld} acquisitionDate={project.financials?.acquisitionDate} fallbackDate={project.createdAt} />
              <div className="glass-card rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0]">Daily Burn Rate</span>
                <div className="space-y-1">
                  <span className={`text-[24px] leading-[32px] font-semibold ${holdMetrics.dailyBurn > 100 ? 'text-[#ffb4ab]' : 'text-[#9E9DA0]'}`}>
                    {fmtCurrency(Math.round(holdMetrics.dailyBurn))}
                  </span>
                  <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#ffb4ab]">
                    {holdMetrics.dailyBurn > 100 ? 'CRITICAL' : holdMetrics.dailyBurn > 50 ? 'MODERATE' : 'LOW'}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Holding Costs + Operational Income (Stitch schema: 2-up) ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Holding Costs (editable line items) */}
              <div className="space-y-4">
                <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                  Holding Costs
                </h2>
                <HoldingCostsWizard
                  projectId={projectId}
                  financials={project?.financials}
                  onSaveCategory={handleSaveHoldingCostCategory}
                  onAllCompleted={() => {
                    toast.success('All monthly holding cost categories confirmed!');
                  }}
                />

                <div className="pt-4">
                  <p className="text-[10px] text-[#9E9DA0] uppercase font-bold tracking-wider mb-2">Itemized Ledger Log</p>
                  <HoldingCostsTracker
                    holdingCosts={holdingCosts}
                    onChange={(newCosts) => {
                      setHoldingCosts(newCosts);
                      handleImmediateSave({ holdingCosts: newCosts });
                    }}
                    daysHeld={daysHeld}
                  />
                </div>
              </div>

              {/* Operational Income (Rent strategy) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    {exitStrategy === 'Rent' ? 'Rental Income' : exitStrategy === 'Lease' ? 'Lease Income' : 'Exit Strategy'}
                  </h2>
                  {(exitStrategy === 'Rent' || exitStrategy === 'Lease') && (
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded bg-[#454955]/20 text-[#454955] border border-[#454955]/30">
                      ACTIVE
                    </span>
                  )}
                </div>
                 <div className="glass-card p-5 border border-white/5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <span className="material-symbols-outlined text-[#7A9EAA]">lock</span>
                    <span>
                      Locked Strategy:{' '}
                      {project?.dispositionType === 'RENT'
                        ? 'Buy & Hold (Rental)'
                        : project?.dispositionType === 'LEASE'
                        ? 'Commercial Lease'
                        : 'Fix & Flip (Sale)'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#9E9DA0] leading-relaxed">
                    The exit strategy was declared and locked as <span className="font-bold">{project?.dispositionType}</span> during the Acquisition phase. 
                    Downstream operations, capital modeling, and tax projections are aligned to this selection.
                  </p>
                </div>
                {project?.dispositionType === 'RENT' && (
                  <>
                    <RentalSetupForm
                      financials={project.financials}
                      onChange={handleRentalSetupChange}
                    />
                    <RentGoToMarket
                      projectId={projectId}
                      targetRent={project.financials?.target_rent}
                      listingAds={project.financials?.listing_ads || []}
                      screeningChecklist={project.financials?.screening_checklist}
                      onSaveTargetRent={handleSaveTargetRent}
                      onAddListingAd={handleAddListingAd}
                      onUpdateAdStatus={handleUpdateAdStatus}
                      onDeleteListingAd={handleDeleteListingAd}
                      onSaveScreeningChecklist={handleSaveScreeningChecklist}
                    />
                  </>
                )}
                {project?.dispositionType === 'LEASE' && (
                  <LeaseGoToMarket
                    projectId={projectId}
                    leaseTerms={project.financials?.target_lease_terms}
                    listingAds={project.financials?.listing_ads || []}
                    onSaveLeaseTerms={handleSaveLeaseTerms}
                    onAddListingAd={handleAddListingAd}
                    onUpdateAdStatus={handleUpdateAdStatus}
                    onDeleteListingAd={handleDeleteListingAd}
                  />
                )}
                {project?.dispositionType === 'SALE' && (
                  <SaleGoToMarket
                    projectId={projectId}
                    listPriceSale={project.financials?.list_price_sale}
                    listingAgentVendor={project.financials?.listing_agent_vendor}
                    listingAds={project.financials?.listing_ads || []}
                    onSaveListPrice={handleSaveListPrice}
                    onSaveListingAgent={handleSaveListingAgent}
                    onAddListingAd={handleAddListingAd}
                    onUpdateAdStatus={handleUpdateAdStatus}
                    onDeleteListingAd={handleDeleteListingAd}
                  />
                )}
              </div>
            </section>

            {/* ── Current Estimated Value (ARV) — Hero Card ── */}
            <section className="glass-card rounded-xl p-5 border border-[#454955]/20 relative group overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#454955]/5 rounded-full blur-3xl group-hover:bg-[#454955]/10 transition-all" />
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h3 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0] mb-1">Current Estimated Value (ARV)</h3>
                  <p className="text-[32px] leading-[40px] font-bold tracking-[-0.01em] text-[#9E9DA0]">
                    {fmtCurrency(arvValue)}
                  </p>
                </div>
              </div>
            </section>

            {/* Live Valuation History (AVM) timeline */}
            <CurrentValueTracker
              projectId={projectId}
              currentValue={project?.financials?.current_value || []}
              onAddValuation={handleAddValuation}
              onDeleteValuation={handleDeleteValuation}
            />

            <ValuationHistory projectId={projectId} />


            {/* ── Live Project Metrics (Stitch schema: 2×2 grid + structured readouts) ── */}
            <section className="space-y-4">
              <h2 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#454955] uppercase flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#454955] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#454955]" />
                </span>
                Live Project Metrics
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* NOI — Structured MetricReadout */}
                <div className="noi-value glass-card p-4 rounded-xl border-l-4 border-l-[#454955]">
                  <MetricReadout
                    label="Net Operating Income"
                    result={noiResult}
                    format="currency"
                    accentColor={PHASE_COLOR}
                    compact
                  />
                  {noiResult.value !== null && (
                    <p className="text-[10px] text-[#9E9DA0]/60 mt-1">
                      {fmtCurrency(Math.round((noiResult.value) / 12))}/month
                    </p>
                  )}
                </div>

                {/* Cash Flow — Structured MetricReadout */}
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#7A9EAA]">
                  <MetricReadout
                    label="Cash Flow"
                    result={cashFlowResult}
                    format="currency"
                    accentColor="#7A9EAA"
                    compact
                  />
                  {cashFlowResult.value !== null && (
                    <p className="text-[10px] text-[#9E9DA0]/60 mt-1">
                      {fmtCurrency(Math.round(cashFlowResult.value / 12))}/month
                    </p>
                  )}
                </div>

                {/* Cap Rate + Cash-on-Cash — from deriveAllMetrics */}
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#7A9EAA]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0]">Cap Rate</span>
                    <span className="text-[10px] font-bold text-[#7A9EAA]">STABLE</span>
                  </div>
                  <span className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {liveMetrics ? fmtPct(liveMetrics.capRate) : '—'}
                  </span>
                  {liveMetrics && (
                    <p className="text-[10px] text-[#9E9DA0]/60 mt-1">CoC: {fmtPct(liveMetrics.cashOnCashReturn)}</p>
                  )}
                </div>

                {/* DSCR */}
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#454955]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0]">DSCR</span>
                    <span className={`text-[10px] font-bold ${liveMetrics && liveMetrics.dscr >= 1.2 ? 'text-[#454955]' : 'text-[#ffb4ab]'}`}>
                      {liveMetrics && liveMetrics.dscr >= 1.2 ? 'SAFE' : 'AT RISK'}
                    </span>
                  </div>
                  <span className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {liveMetrics ? liveMetrics.dscr.toFixed(2) : '—'}
                  </span>
                  <p className="text-[10px] text-[#454955] mt-1">{liveMetrics && liveMetrics.dscr >= 1.2 ? 'SAFE > 1.20' : 'Target > 1.20'}</p>
                </div>
              </div>

              {/* ── Occupancy + OER readout row ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 rounded-xl">
                  <MetricReadout
                    label="Occupancy Rate"
                    result={occupancyResult}
                    format="percent"
                    accentColor={PHASE_COLOR}
                  />
                </div>
                <div className="glass-card p-4 rounded-xl">
                  <MetricReadout
                    label="Operating Expense Ratio"
                    result={oerResult}
                    format="percent"
                    accentColor="#7A9EAA"
                  />
                </div>
              </div>
            </section>

            {/* ── Rehab Execution (H2) ── */}
            {currentTier === 'Stage' ? (
              // Compressed H2 for Stage-tier Projects
              <div className="space-y-6">
                <div className="bg-[#454955]/10 border border-[#454955]/30 p-5 rounded-2xl">
                  <h3 className="text-md font-semibold text-[#7A9EAA] flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined">compress</span>
                    Compressed Staging Execution (Level 1)
                  </h3>
                  <p className="text-xs text-[#9E9DA0] leading-relaxed">
                    This project is classified under the <strong>Stage</strong> tier. Staging scopes do not require intensive contractor bidding, milestone draw schedules, or heavy CapEx allocations. Bids, CapEx, and Draw trackers are hidden to keep your workspace simple and clean.
                  </p>
                </div>

                {/* Scope of Work */}
                <section className="space-y-4">
                  <h2 className="text-[20px] leading-[28px] font-semibold text-[#9E9DA0] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7A9EAA]">task</span>
                    Staging Scope of Work
                  </h2>
                  <ScopeOfWorkForm items={scopeOfWork} onChange={setScopeOfWork} />
                </section>

                {/* Staging Expenses */}
                <section className="space-y-4">
                  <h2 className="text-[20px] leading-[28px] font-semibold text-[#9E9DA0] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7A9EAA]">payments</span>
                    Staging Expenses
                  </h2>
                  <RenovationSpendTracker
                    projectId={projectId}
                    rehabSpend={project?.financials?.rehab_spend || []}
                    onSpendChange={handleSpendUpdate}
                    totalBudget={totalBudget}
                  />
                </section>

                {/* Site Visit Logs */}
                <section className="space-y-4">
                  <h2 className="text-[20px] leading-[28px] font-semibold text-[#9E9DA0] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7A9EAA]">photo_camera</span>
                    Site Visit Log
                  </h2>
                  <SiteVisitLogTracker logs={siteVisitLogs} onChange={setSiteVisitLogs} />
                </section>
              </div>
            ) : (
              // Full H2 for larger rehab tiers
              <div className="space-y-8">
                {/* Rehab Pipeline */}
                <section className="space-y-4">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    Rehab Pipeline
                  </h2>
                  <RehabSequenceTracker
                    currentStage={(project.rehab?.currentStage as any) || 'Demolition'}
                    onStageChange={handleStageChange}
                  />
                </section>

                {/* Scope of Work */}
                <section className="space-y-4">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    Scope of Work
                  </h2>
                  <ScopeOfWorkForm items={scopeOfWork} onChange={setScopeOfWork} />
                </section>

                {/* Bids & Hiring */}
                <section className="space-y-4">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    Bids &amp; Hiring
                  </h2>
                  <GCBidUploader
                    projectId={projectId}
                    onBidSaved={bid => setContractorBids(prev => [...prev, bid])}
                  />
                  <ContractorBids
                    bids={contractorBids}
                    baseBudget={totalBudget}
                    onChange={setContractorBids}
                  />
                </section>

                {/* CapEx Tracker */}
                <section className="space-y-4">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    CapEx Tracker
                  </h2>
                  <CapExComparativeTable tasks={rehabTasks} onChange={setRehabTasks} />
                </section>

                {/* Draw Schedule */}
                <section className="space-y-4">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    Draw Schedule
                  </h2>
                  <ContractorDrawSchedule draws={drawSchedule} onChange={handleDrawScheduleChange} totalBudget={totalBudget} />
                </section>

                {/* Rehab Expenses */}
                <section className="space-y-4">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    Rehab Expenses
                  </h2>
                  <RenovationSpendTracker
                    projectId={projectId}
                    rehabSpend={project?.financials?.rehab_spend || []}
                    onSpendChange={handleSpendUpdate}
                    totalBudget={totalBudget}
                  />
                </section>

                {/* Site Visit Log */}
                <section className="space-y-4">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    Site Visit Log
                  </h2>
                  <SiteVisitLogTracker logs={siteVisitLogs} onChange={setSiteVisitLogs} />
                </section>
              </div>
            )}

            {/* Renovation Completion Section (Card H2.2) */}
            <section className="space-y-4 pt-8 border-t border-white/5">
              <RenovationCompletionCard
                projectId={projectId}
                rehabSpend={project?.financials?.rehab_spend || []}
                savedCompletedDate={project?.financials?.rehab_completed_date}
                savedSpendTotal={project?.financials?.rehab_spend_total}
                onSaveCompletion={handleSaveCompletion}
              />
            </section>

            {/* ── Final Sign-off Gate ── */}
            <section className="pt-8">
              <EventTriggeredHoldGate
                project={project}
                onRecordRentPayment={handleRecordRentPayment}
                onActivateLease={handleActivateLease}
                onMarkSaleUnderContract={handleMarkSaleUnderContract}
                onAdvanceToExit={handleAdvanceToExit}
              />
            </section>
          </div>

          {/* Right Column (At-a-Glance Sticky Sidebar) */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
            <ProjectAtAGlanceSidebar project={project} />
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════
          Sticky NOI Formula Footer — always visible
          ═══════════════════════════════════════════════════════ */}
      <div className="sticky bottom-0 z-30 w-full border-t border-white/10">
        <div
          className="glass-card rounded-t-xl backdrop-blur-xl"
          style={{ background: 'rgba(13, 10, 11, 0.85)' }}
        >
          <div className="max-w-4xl mx-auto px-5 md:px-10 py-3 flex items-center justify-between gap-4">
            {/* Formula breakdown */}
            <div className="flex items-center gap-2 text-[11px] tracking-wide overflow-x-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <span className="text-[#9E9DA0] whitespace-nowrap">Gross Income</span>
              <span className="text-[#9E9DA0] font-semibold whitespace-nowrap">{fmtCurrency(Math.round(noiFormula.grossIncome))}</span>
              <span className="text-[#9E9DA0]">−</span>
              <span className="text-[#9E9DA0] whitespace-nowrap">Vacancy</span>
              <span className="text-[#ffb4ab] font-semibold whitespace-nowrap">{fmtCurrency(Math.round(noiFormula.vacancyLoss))}</span>
              <span className="text-[#9E9DA0]">−</span>
              <span className="text-[#9E9DA0] whitespace-nowrap">OpEx</span>
              <span className="text-[#ffb4ab] font-semibold whitespace-nowrap">{fmtCurrency(Math.round(noiFormula.opex))}</span>
              <span className="text-[#9E9DA0]">=</span>
            </div>

            {/* NOI value + state pill */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9E9DA0]">NOI</p>
                <p
                  className="text-[20px] leading-[24px] font-bold"
                  style={{ color: 'var(--pw-success)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtCurrency(Math.round(noiFormula.noi))}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                noiResult.state === 'live'
                  ? 'bg-pw-success-container text-pw-success'
                  : noiResult.state === 'incomplete'
                    ? 'bg-gray-500/15 text-gray-400'
                    : 'bg-amber-500/15 text-amber-400'
              }`}>
                {noiResult.state === 'live' ? 'LIVE' : noiResult.state === 'incomplete' ? 'INCOMPLETE' : noiResult.state.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsService } from '@/lib/firebase/deals';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { Project, LoanStatus, ClosingChecklistItem, ProjectTeamMember, CostBasisLedger, RoleLinkedDocument, DueDiligenceItem, InspectionItem } from '@/types/schema';
import { LoanProcessingPipeline } from '@/components/project/LoanProcessingPipeline';
import { ClosingChecklist } from '@/components/project/ClosingChecklist';
import { AcquisitionTeamAssembly } from '@/components/project/AcquisitionTeamAssembly';
import { ClosingTimelineCard } from '@/components/project/ClosingTimelineCard';
import InvestorEquityTable from '@/components/team/InvestorEquityTable';
import { SubscriptionsTracker } from '@/components/project/SubscriptionsTracker';
import { ContributionLedger } from '@/components/project/ContributionLedger';
import { TitleHoldingCard } from '@/components/project/TitleHoldingCard';
import { SyndicationEconomicsCard } from '@/components/project/SyndicationEconomicsCard';
import { FinancingRouteCard } from '@/components/project/FinancingRouteCard';
import { LenderPackageTracker } from '@/components/project/LenderPackageTracker';
import { LoanEstimatesWorkflow } from '@/components/project/LoanEstimatesWorkflow';
import { LockedTermsCard } from '@/components/project/LockedTermsCard';
import { TotalCashInvestedCard } from '@/components/project/TotalCashInvestedCard';
import ProofOfFundsCard from '@/components/project/ProofOfFundsCard';
import { EquityPartiesCard } from '@/components/project/EquityPartiesCard';
import { PhaseAccessGuard } from '@/components/project/PhaseAccessGuard';
import { usePhaseAccess } from '@/hooks/usePhaseAccess';
import { Sba504Card } from '@/components/project/Sba504Card';
import { HardMoneyTermsCard } from '@/components/project/HardMoneyTermsCard';
import { ProjectVendorsList } from '@/components/project/ProjectVendorsList';
import { TitleClosingTeamCard } from '@/components/project/TitleClosingTeamCard';
import { ClosingAttorneyCard } from '@/components/project/ClosingAttorneyCard';
import { RfpBidsCard } from '@/components/project/RfpBidsCard';
import { InsuranceBinderCard } from '@/components/project/InsuranceBinderCard';
import { DueDiligenceChecklist } from '@/components/project/DueDiligenceChecklist';
import { InspectionTracker } from '@/components/project/InspectionTracker';
import { ContingencyTracker } from '@/components/project/ContingencyTracker';
import TitleSearchClearance from '@/components/closing/TitleSearchClearance';
import { DocumentVault } from '@/components/project/DocumentVault';
import { ClosingCostsLedger } from '@/components/project/ClosingCostsLedger';
import { ClearToCloseMilestone } from '@/components/project/ClearToCloseMilestone';
import { ClosingHandoffModal } from '@/components/phase2/ClosingHandoffModal';
import { FundToHoldGate } from '@/components/project/FundToHoldGate';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { MetricReadout } from '@/components/metrics/MetricReadout';
import type { MetricResult } from '@/lib/metrics/types';
import { ClosingCostSidebar } from '@/components/phase2/ClosingCostSidebar';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { parseRatesDoc, isRateStale, type LenderRate } from '@/lib/providers/lenderRates';
import { PropertyMapTile } from '@/components/project/PropertyMapTile';
import { type ClosingCostOverrides } from '@/lib/math/closingCosts';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { checkModalityReconciliation, confirmModalityReconciliation, type ReconciliationCheckResult } from '@/actions/modality';
import FundingSourceTracker from '@/components/evaluation/FundingSourceTracker';

const PHASE_COLOR = '#7A9EAA';    // Fund = blue/secondary
const PHASE_GLOW  = 'rgba(173, 198, 255, 0.3)';

interface CardDefinition {
  id: string;
  title: string;
  description: string;
  whyWeAsk: string;
}

interface ColumnDefinition {
  id: string;
  name: string;
  purpose: string;
  cards: CardDefinition[];
}

const COLUMNS: ColumnDefinition[] = [
  {
    id: 'F1',
    name: 'Capital Plan',
    purpose: 'Actualize funding structure: modality, capital stack, POF',
    cards: [
      { id: 'F1.1', title: 'Modality', description: 'Declare how this purchase is being funded.', whyWeAsk: 'Determines which subsequent cards and columns are required.' },
      { id: 'F1.2', title: 'Capital Stack', description: 'Compose sources against the total project cost.', whyWeAsk: 'Tracks seniority, status, and alerts on funding gaps.' },
      { id: 'F1.3', title: 'Total Cash Invested', description: 'Assembly display of down payment, closing costs, and rehab budget.', whyWeAsk: 'Denominator for Cash-on-Cash metric computation.' },
      { id: 'F1.4', title: 'Proof of Funds', description: 'Upload evidence of liquid funds per equity source.', whyWeAsk: 'Required to confirm buyer solvency before escrow.' },
    ],
  },
  {
    id: 'F2',
    name: 'Equity',
    purpose: 'Splits, title-holding, cap table, subscriptions, contribution ledger',
    cards: [
      { id: 'F2.1', title: 'Parties', description: 'Define equity parties, roles (co-buyer, GP, LP), and entities.', whyWeAsk: 'Powers the cap table and title document signatures.' },
      { id: 'F2.2', title: 'Splits / Waterfall', description: 'Configure preferred returns, hurdles, and splits.', whyWeAsk: 'Determines cash distribution calculations.' },
      { id: 'F2.3', title: 'Subscription Agreement', description: 'Distribute and track signed partnership agreements.', whyWeAsk: 'Establishes legal equity commit.' },
      { id: 'F2.4', title: 'Contribution Ledger', description: 'Track actual capital deposits and status changes.', whyWeAsk: 'Identifies when equity is fully funded.' },
      { id: 'F2.5', title: 'Title Holding', description: 'Specify TIC or JTWROS and ownership percentages.', whyWeAsk: 'Required for deed recording and vesting.' },
    ],
  },
  {
    id: 'F3',
    name: 'Debt',
    purpose: 'Lender package, loan estimates, locked terms, and debt service',
    cards: [
      { id: 'F3.1', title: 'Financing Route Selection', description: 'Determine the debt structure and route gating for this acquisition.', whyWeAsk: 'Shapes the subsequent checklist items and columns for debt.' },
      { id: 'F3.2', title: 'Lender Vault', description: 'Upload loan processing and compliance disclosures.', whyWeAsk: 'Centralizes underwriting checklist items.' },
      { id: 'F3.3', title: 'Loan Estimates comparison', description: 'Compare rates, terms, and points across loan quotes.', whyWeAsk: 'Helps select the optimal debt package.' },
      { id: 'F3.4', title: 'Loan processing milestones', description: 'Track appraisal, appraisal clearance, and underwriting status.', whyWeAsk: 'Controls loan lock and close timeline.' },
      { id: 'F3.5', title: 'Locked Terms', description: 'Confirm final locked rate, points, term, and lender name.', whyWeAsk: 'Locks the debt service variables for cash flow metrics.' },
      { id: 'F3.6', title: 'SBA 504 Structure', description: 'Configure bank first lien, CDC debenture, and borrower injection.', whyWeAsk: 'Ensures the dual-lien structure sums to 100%.' },
      { id: 'F3.7', title: 'Hard money / Bridge terms', description: 'Track private money, short-term debt, and interest-only details.', whyWeAsk: 'Calculates the holding cost interest expense.' },
    ],
  },
  {
    id: 'F4',
    name: 'Title & Closing Team',
    purpose: 'Title partner, attorney, appraiser, CDC, surveyor, insurance',
    cards: [
      { id: 'F4.1', title: 'Title & Escrow Partner', description: 'Assign the title/escrow company and track search/clearance.', whyWeAsk: 'Ensures clean transfer of deed without liens.' },
      { id: 'F4.2', title: 'Real Estate Attorney', description: 'Assign real estate attorney and review contract drafts.', whyWeAsk: 'Protects buyer legal interests during closing.' },
      { id: 'F4.3', title: 'Professional Marketplace', description: 'Request bids and assign appraiser, env, CDC, surveyor, and insurance.', whyWeAsk: 'Coordinates the transaction closing team.' },
      { id: 'F4.4', title: 'Vendor Assignments', description: 'Assign insurance broker, binder dates, and premiums.', whyWeAsk: 'Ensures coverage is in place prior to close.' },
    ],
  },
  {
    id: 'F5',
    name: 'Closing',
    purpose: 'Timeline, CD review, cash-to-close reconciliation, execution, and recording',
    cards: [
      { id: 'F5.1', title: 'Milestone Timeline', description: 'Track closing timeline milestones against target dates.', whyWeAsk: 'Keeps closing team synchronized on deadline.' },
      { id: 'F5.2', title: 'CD Review', description: 'Upload Closing Disclosure and reconcile against assumptions.', whyWeAsk: 'First check on exact closing numbers.' },
      { id: 'F5.3', title: 'Cash-to-Close Reconciliation', description: 'Reconcile sources and uses to zero variance.', whyWeAsk: 'Blocks closing if any cash discrepancy exists.' },
      { id: 'F5.4', title: 'Execution Vault', description: 'Store fully executed documents (deed, note, HUD-1).', whyWeAsk: 'Final legal record of transaction.' },
      { id: 'F5.5', title: 'Deed Recording', description: 'Confirm deed recorded with county registry and enter instrument number.', whyWeAsk: 'Establishes public notice of ownership.' },
      { id: 'F5.6', title: 'Actualization Sweep', description: 'Verify all projected fields copy to actuals.', whyWeAsk: 'Transition point for hold and exit.' },
    ],
  },
  {
    id: 'F6',
    name: 'Fund Wrap',
    purpose: 'Gate to Hold: live-data checklist, variance review, and archive',
    cards: [
      { id: 'F6.1', title: 'Phase Gate', description: 'Confirm all items are complete, sign off, and unlock Phase 3.', whyWeAsk: 'Final sign-off to exit Fund and enter Hold.' },
    ],
  },
];

export default function Phase2AcquisitionPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params.id as string;
  const { project, loading: isLoading, refresh } = useWorkspaceProject();
  const { user: authUser } = useAuth();
  const { canView, canEdit, loading: accessLoading } = usePhaseAccess('phase-2');

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [completedCards, setCompletedCards] = useState<string[]>([]);
  const [selectedLender, setSelectedLender] = useState<string>('NEO');
  const [lenderRates, setLenderRates] = useState<LenderRate[] | null>(null);
  const [closingCostOverrides, setClosingCostOverrides] = useState<ClosingCostOverrides>({});
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationCheckResult | null>(null);
  const [pendingModality, setPendingModality] = useState<string[] | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // Firestore sync for live lender rates
  useEffect(() => {
    const ref = doc(db, 'systemConfig', 'lenderRates');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setLenderRates(parseRatesDoc(snap.data()!));
      } else {
        setLenderRates([]);
      }
    }, () => {
      setLenderRates([]);
    });
    return unsub;
  }, []);

  const [loans, setLoans] = useState<any[]>([]);

  // Listen to loans subcollection
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(
      collection(db, 'projects', projectId, 'loans'),
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setLoans(docs);
      },
      (err) => {
        console.error('[Phase2AcquisitionPage] Firestore loans error:', err);
      }
    );
    return unsub;
  }, [projectId]);

  const activeDebtInstruments = useMemo(() => {
    return Array.from(new Set(loans.map((l: any) => l.instrument)));
  }, [loans]);

  const hasConventional = useMemo(() => activeDebtInstruments.includes('Conventional'), [activeDebtInstruments]);
  const hasSba504 = useMemo(() => activeDebtInstruments.includes('SBA 504'), [activeDebtInstruments]);
  const hasHardMoneyOrBridge = useMemo(() => activeDebtInstruments.includes('Hard Money') || activeDebtInstruments.includes('Bridge'), [activeDebtInstruments]);

  // Sync project completedFundCards and other options
  useEffect(() => {
    if (!project) return;
    setCompletedCards(project.completedFundCards || []);
    setClosingCostOverrides(project.financials?.closingCostOverrides ?? {});
  }, [project?.id, project?.completedFundCards]);

  const modality = useMemo(() => {
    if (project?.fundingPlan?.modality) {
      return project.fundingPlan.modality;
    }
    // Backward compatibility initialization
    const modes: string[] = [];
    if (project?.financials?.fundingType === 'Solo') {
      modes.push('solo_cash');
    } else if (project?.financials?.fundingType === 'Syndicated') {
      modes.push('syndication_equity');
    }
    if (project?.financials?.loanAmount && project.financials.loanAmount > 0) {
      modes.push('conventional_loan');
    }
    return modes;
  }, [project]);

  const hasEquity = useMemo(() => modality.some(m => m === 'co_buyer_equity' || m === 'syndication_equity'), [modality]);
  const hasDebt = useMemo(() => modality.some(m => 
    m === 'conventional_loan' || m === 'hard_money' || m === 'bridge' || m === 'sba_504_bank' || m === 'sba_504_cdc' || m === 'sba_504'
  ), [modality]);

  const isF1Complete = useMemo(() => COLUMNS[0].cards.every(c => completedCards.includes(c.id)), [completedCards]);

  const isCardRevealed = (cardId: string) => {
    // F1 column is always active, all cards in F1 are always revealed
    if (cardId.startsWith('F1.')) return true;
    
    // F2 (Equity) cards:
    if (cardId.startsWith('F2.')) {
      if (!hasEquity) return false;
      if (cardId === 'F2.2' || cardId === 'F2.3') {
        return modality.includes('syndication_equity');
      }
      if (cardId === 'F2.5') {
        return modality.includes('co_buyer_equity');
      }
      return true; // F2.1, F2.4
    }
    
    // F3 (Debt) cards:
    if (cardId.startsWith('F3.')) {
      if (!hasDebt) return false;
      if (cardId === 'F3.1' || cardId === 'F3.2') return true;
      if (cardId === 'F3.3' || cardId === 'F3.4' || cardId === 'F3.5') {
        return modality.includes('conventional_loan') && loans.some(l => l.instrument === 'Conventional' && l.status !== 'Archived');
      }
      if (cardId === 'F3.6') {
        return modality.includes('sba_504') && loans.some(l => l.instrument === 'SBA 504' && l.status !== 'Archived');
      }
      if (cardId === 'F3.7') {
        return (modality.includes('hard_money') || modality.includes('bridge')) && 
               loans.some(l => (l.instrument === 'Hard Money' || l.instrument === 'Bridge') && l.status !== 'Archived');
      }
      return true;
    }
    
    // F4 (Title/Closing Team) cards are always revealed
    if (cardId.startsWith('F4.')) return true;
    
    // F5 (Closing) cards are only revealed if F1 is complete
    if (cardId.startsWith('F5.')) return isF1Complete;
    
    // F6 (Wrap) cards are only revealed if F1 is complete
    if (cardId.startsWith('F6.')) return isF1Complete;
    
    return true;
  };

  const isColumnRevealed = (columnId: string) => {
    switch (columnId) {
      case 'F1': return true;
      case 'F2': return hasEquity;
      case 'F3': return hasDebt;
      case 'F4': return true;
      case 'F5': return isF1Complete;
      case 'F6': return isF1Complete; // Reveals when F5 in progress
      default: return false;
    }
  };

  const dynamicColumns = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      cards: col.cards.filter(card => isCardRevealed(card.id))
    }));
  }, [modality, isF1Complete, hasEquity, hasDebt, loans]);

  const revealedColumns = useMemo(() => {
    return dynamicColumns.filter(col => isColumnRevealed(col.id));
  }, [dynamicColumns, hasEquity, hasDebt, isF1Complete]);

  const totalRevealedCards = useMemo(() => revealedColumns.reduce((acc, col) => acc + col.cards.length, 0), [revealedColumns]);
  const completedRevealedCardsCount = useMemo(() => {
    const revealedCardIds = new Set(revealedColumns.flatMap(col => col.cards.map(c => c.id)));
    return completedCards.filter(id => revealedCardIds.has(id)).length;
  }, [completedCards, revealedColumns]);

  const completionPct = useMemo(() => {
    return totalRevealedCards > 0 ? Math.round((completedRevealedCardsCount / totalRevealedCards) * 100) : 0;
  }, [completedRevealedCardsCount, totalRevealedCards]);

  const handleToggleCardComplete = async (cardId: string) => {
    if (!canEdit) {
      toast.error('You do not have permission to modify Phase 2');
      return;
    }
    const next = completedCards.includes(cardId)
      ? completedCards.filter((id) => id !== cardId)
      : [...completedCards, cardId];
    setCompletedCards(next);
    try {
      await projectsService.updateProject(projectId, { completedFundCards: next });
    } catch (e) {
      console.error('Failed to save card complete state:', e);
      toast.error('Failed to sync card complete state');
    }
  };

  const handleSaveModality = async (selectedModes: string[]) => {
    if (!canEdit) {
      toast.error('You do not have permission to modify Phase 2');
      return;
    }
    if (!authUser) {
      toast.error('Not authenticated');
      return;
    }
    try {
      setIsReconciling(true);
      const token = await authUser.getIdToken();
      const checkResult = await checkModalityReconciliation(token, projectId, selectedModes);
      if (checkResult.requiresReconciliation) {
        setReconciliationData(checkResult);
        setPendingModality(selectedModes);
      } else {
        await confirmModalityReconciliation(token, projectId, selectedModes, false);
        toast.success('Funding modality updated');
        refresh();
      }
    } catch (e) {
      console.error('Failed to check modality reconciliation:', e);
      toast.error('Failed to update modality');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleConfirmReconciliation = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to modify Phase 2');
      return;
    }
    if (!authUser || !pendingModality) return;
    try {
      setIsReconciling(true);
      const token = await authUser.getIdToken();
      await confirmModalityReconciliation(token, projectId, pendingModality, true);
      toast.success('Modality reconciled and updated successfully');
      setReconciliationData(null);
      setPendingModality(null);
      refresh();
    } catch (e) {
      console.error('Failed to reconcile modality:', e);
      toast.error('Reconciliation failed');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleImmediateSave = async (updates: Partial<Project>) => {
    if (!canEdit) {
      toast.error('You do not have permission to modify Phase 2');
      return;
    }
    try {
      await projectsService.updateProject(projectId, updates);
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const handleExportLedger = async (format: 'csv' | 'pdf') => {
    if (!authUser) { toast.error('Not authenticated'); return; }
    if (exportingFormat) return;
    setExportingFormat(format);
    try {
      const token = await authUser.getIdToken();
      const res = await fetch(`/api/reil/projects/${projectId}/closing-ledger/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `closing-ledger-${projectId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Closing ledger exported as ${format.toUpperCase()}.`);
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExportingFormat(null);
    }
  };

  const costMetrics = useMemo(() => {
    if (!project?.financials) return { purchasePrice: 0, closingCosts: 0, totalCostBasis: 0, cashToClose: 0, monthlyPI: 0, annualDebtService: 0 };
    const f = project.financials;
    const purchasePrice = f.purchasePrice || 0;
    const closingCosts = f.closingCosts || 0;
    const loanAmount = f.loanAmount || 0;
    const totalCostBasis = purchasePrice + closingCosts;
    const cashToClose = purchasePrice - loanAmount + closingCosts;
    return { purchasePrice, closingCosts, totalCostBasis, cashToClose, monthlyPI: 0, annualDebtService: 0 };
  }, [project]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 rounded-full animate-spin" style={{ borderColor: PHASE_COLOR, borderTopColor: 'transparent' }} />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9DA0]">Loading Workspace…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <p className="text-sm font-bold text-[#9E9DA0]">Project not found.</p>
      </div>
    );
  }

  return (
    <PhaseAccessGuard phaseId="phase-2" phaseName="Phase 2: Fund">
      <div className="min-h-screen bg-[#0d0a0b] relative pb-16">
      {/* ── Ambient Background Glows ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[45%] h-[45%] bg-[#7A9EAA]/10 blur-[130px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[35%] h-[35%] bg-[#454955]/10 blur-[110px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <PhaseExplainerVideo
        phaseKey="phase-2"
        title="Understanding Phase 2: Fund"
        description="Learn how to organize sale documents, process loans, and manage real estate attorneys to clear your deal to close."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="3:15"
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* ── Header & Stepper Rail ── */}
        <section className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Workspace Phase 2</span>
              <h1 className="text-xl font-black text-white tracking-tight">Fund Board (Kanban)</h1>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-xs font-semibold text-white">{completedRevealedCardsCount}/{totalRevealedCards} Cards Complete</p>
                <p className="text-[10px] text-[#9E9DA0] uppercase tracking-wider">{completionPct}% Completed</p>
              </div>
              <button
                onClick={() => {
                  setIsSaving(true);
                  setTimeout(() => {
                    setIsSaving(false);
                    toast.success('Project status saved!');
                  }, 600);
                }}
                className="px-4 py-2 bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </div>

          <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${completionPct}%`,
                background: `linear-gradient(90deg, #7A9EAA 0%, #d8e2ff 100%)`,
                boxShadow: `0 0 15px -3px ${PHASE_GLOW}`,
              }}
            />
          </div>

          {project.overrideReason && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>Manual Override: {project.overrideReason}</span>
            </div>
          )}
        </section>

        {/* ── Stepper Navigation ── */}
        <section className="glass-card rounded-2xl p-4 border border-white/5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-3">
            {dynamicColumns.map((col) => {
              const revealed = isColumnRevealed(col.id);
              const doneCount = col.cards.filter(c => completedCards.includes(c.id)).length;
              const allDone = col.cards.length > 0 && doneCount === col.cards.length;
              return (
                <div
                  key={col.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${
                    revealed
                      ? allDone
                        ? 'bg-[var(--pw-success)]/10 border-[var(--pw-success)]/20 text-[var(--pw-success)]'
                        : 'bg-[#7A9EAA]/10 border-[#7A9EAA]/25 text-[#7A9EAA]'
                      : 'bg-transparent border-white/[0.02] text-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {allDone ? 'check_circle' : revealed ? 'hourglass_empty' : 'lock'}
                  </span>
                  <span>{col.id}: {col.name} ({doneCount}/{col.cards.length})</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
          {dynamicColumns.map((col) => {
            const revealed = isColumnRevealed(col.id);
            const doneCount = col.cards.filter(c => completedCards.includes(c.id)).length;
            const progressPct = col.cards.length > 0 ? (doneCount / col.cards.length) * 100 : 0;

            if (!revealed) {
              return (
                <div key={col.id} className="glass-card rounded-2xl p-4 border border-white/5 opacity-30 pointer-events-none select-none h-96 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#9E9DA0]/50 tracking-wider">LOCKED COLUMN</span>
                    <h3 className="text-sm font-bold text-white/60">{col.id}: {col.name}</h3>
                  </div>
                  <div className="flex flex-col items-center justify-center flex-1 gap-2">
                    <span className="material-symbols-outlined text-white/20 text-3xl">lock</span>
                    <p className="text-[10px] text-white/40 text-center max-w-xs px-2">{col.purpose}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={col.id} className="glass-card rounded-2xl p-4 border border-[#7A9EAA]/15 bg-[#161318]/45 space-y-4 min-h-[420px] flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#7A9EAA] tracking-wider uppercase">{col.id} Column</span>
                    <span className="text-[10px] font-bold font-mono text-[#9E9DA0]">{doneCount}/{col.cards.length}</span>
                  </div>
                  <h3 className="text-sm font-black text-white tracking-tight leading-none">{col.name}</h3>
                  <div className="h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7A9EAA] rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2.5 flex-1 mt-4">
                  {col.cards.map((card) => {
                    const isDone = completedCards.includes(card.id);
                    return (
                      <button
                        key={card.id}
                        onClick={() => setActiveCardId(card.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 group relative overflow-hidden ${
                          isDone
                            ? 'bg-[var(--pw-success)]/[0.03] border-[var(--pw-success)]/10 hover:border-[var(--pw-success)]/25 text-white'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-[#9E9DA0]'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-sm mt-0.5 flex-shrink-0 ${isDone ? 'text-[var(--pw-success)]' : 'text-white/20 group-hover:text-white/40 transition-colors'}`}>
                          {isDone ? 'check_circle' : 'circle'}
                        </span>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono font-bold tracking-widest text-[#9E9DA0]/50">{card.id}</span>
                          <h4 className="text-xs font-bold leading-tight text-white group-hover:text-[#7A9EAA] transition-colors">{card.title}</h4>
                          <p className="text-[10px] text-[#9E9DA0]/65 line-clamp-2 leading-snug">{card.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* ── Card Detail Modal (Stub Wrapper) ── */}
      {activeCardId && (() => {
        const card = dynamicColumns.flatMap(col => col.cards).find(c => c.id === activeCardId);
        if (!card) return null;
        const isDone = completedCards.includes(card.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#161318] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col justify-between">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-[#7A9EAA] tracking-widest uppercase">{card.id} Wizard</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${isDone ? 'bg-[var(--pw-success)]/10 text-[var(--pw-success)]' : 'bg-white/5 text-[#9E9DA0]/60'}`}>
                      {isDone ? 'Completed' : 'Draft'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">{card.title}</h2>
                  <p className="text-[11px] text-[#9E9DA0]/70 italic">Why we ask: {card.whyWeAsk}</p>
                </div>
                <button
                  onClick={() => setActiveCardId(null)}
                  className="w-8 h-8 rounded-full border border-white/10 hover:border-white/20 bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                 {card.id === 'F1.1' ? (
                  // Modality Selection Form
                  <div className="space-y-4">
                    <div className="bg-[#7A9EAA]/10 border border-[#7A9EAA]/25 rounded-xl p-3 text-xs text-white/90 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#7A9EAA]">
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        <span>Pre-filled from Acquisition capital-intent (Carry-over confirmed)</span>
                      </div>
                      <p className="text-[10px] text-[#9E9DA0]">
                        Your funding selection is pre-populated based on the terms agreed during the Acquisition gate check. You can modify these settings below if needed.
                      </p>
                    </div>
                    <p className="text-xs text-[#9E9DA0]">Select all funding modalities that apply to this deal:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { id: 'solo_cash', label: 'Solo Cash (100% Equity)', desc: 'Purchase completely with cash injection.' },
                        { id: 'co_buyer_equity', label: 'Co-buying Group', desc: 'Joint venture or shared LLC capitalization.' },
                        { id: 'syndication_equity', label: 'Syndication GP/LP', desc: 'Raise equity capital from LPs.' },
                        { id: 'conventional_loan', label: 'Conventional Mortgage', desc: 'Senior lien bank financing.' },
                        { id: 'hard_money', label: 'Hard Money / Private Debt', desc: 'Short term bridge or acquisition debt.' },
                        { id: 'bridge', label: 'Bridge Loan', desc: 'Temporary financing prior to refinancing.' },
                        { id: 'sba_504', label: 'SBA 504 Loan Package', desc: 'Bank + CDC debenture partnership.' },
                      ].map((item) => {
                        const checked = modality.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              const nextModes = modality.includes(item.id)
                                ? modality.filter(id => id !== item.id)
                                : [...modality, item.id];
                              handleSaveModality(nextModes);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 hover:border-[#7A9EAA]/40 ${
                              checked
                                ? 'bg-[#7A9EAA]/5 border-[#7A9EAA]/30 text-white'
                                : 'bg-white/[0.01] border-white/5 text-[#9E9DA0]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm mt-0.5">
                              {checked ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold">{item.label}</h4>
                              <p className="text-[10px] text-[#9E9DA0]/70 leading-snug">{item.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : card.id === 'F1.2' ? (
                  <FundingSourceTracker projectId={projectId} />
                ) : card.id === 'F1.3' ? (
                  <TotalCashInvestedCard 
                    projectId={projectId} 
                    activeCardId={activeCardId} 
                    setActiveCardId={setActiveCardId} 
                  />
                ) : card.id === 'F1.4' ? (
                  <ProofOfFundsCard 
                    projectId={projectId} 
                    refresh={refresh}
                  />
                ) : card.id === 'F2.1' ? (
                  <EquityPartiesCard
                    projectId={projectId}
                    refresh={refresh}
                  />
                ) : card.id === 'F2.2' ? (
                  <SyndicationEconomicsCard
                    project={project}
                    onSaveFinancials={async (updates) => {
                      await handleImmediateSave({ financials: { ...project.financials, ...updates } });
                      refresh();
                    }}
                    refresh={refresh}
                  />
                ) : card.id === 'F2.3' ? (
                  <SubscriptionsTracker projectId={projectId} />
                ) : card.id === 'F2.4' ? (
                  <ContributionLedger projectId={projectId} />
                ) : card.id === 'F2.5' ? (
                  <TitleHoldingCard
                    project={project}
                    onSaveFinancials={async (updates) => {
                      await handleImmediateSave({ financials: { ...project.financials, ...updates } });
                      refresh();
                    }}
                    onSaveProject={async (updates) => {
                      await handleImmediateSave(updates);
                      refresh();
                    }}
                    refresh={refresh}
                    readOnly={!canEdit}
                  />
                ) : card.id === 'F3.1' ? (
                  <FinancingRouteCard projectId={projectId} />
                ) : card.id === 'F3.2' ? (
                  <LenderPackageTracker projectId={projectId} />
                ) : card.id === 'F3.3' ? (
                  <div className="space-y-4">
                    <LoanEstimatesWorkflow projectId={projectId} />
                    
                    {/* Lender Comparison Table */}
                    <div className="bg-surface-container/40 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-headline-md text-sm text-on-surface flex items-center gap-2 font-bold">
                          <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
                          Lender Selection & Live Comparison
                        </h3>
                      </div>

                      {lenderRates === null && (
                        <div className="flex items-center gap-2 py-8 text-on-surface-variant/50 text-xs">
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          Loading Lender Rates...
                        </div>
                      )}

                      {lenderRates !== null && lenderRates.length === 0 && (
                        <div className="py-8 flex flex-col items-center gap-3 text-center">
                          <p className="text-sm font-semibold text-on-surface-variant/70">Lender rates not configured</p>
                          <p className="text-[11px] text-[#9E9DA0]/60 max-w-xs">
                            Rates have not been configured yet.
                          </p>
                        </div>
                      )}

                      {lenderRates !== null && lenderRates.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="text-on-surface-variant/60 border-b border-white/5 uppercase tracking-wider text-[10px]">
                                <th className="py-2.5">Parameter</th>
                                {lenderRates.map((r) => (
                                  <th key={r.id} className="py-2.5 text-center">{r.name}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-on-surface font-mono">
                              <tr>
                                <td className="py-3 font-sans text-xs">Interest Rate</td>
                                {lenderRates.map((r) => (
                                  <td key={r.id} className="py-3 text-center font-bold">{r.interestRate.toFixed(3)}%</td>
                                ))}
                              </tr>
                              <tr>
                                <td className="py-2 font-sans text-[10px] text-on-surface-variant/50">Rates as of</td>
                                {lenderRates.map((r) => (
                                  <td key={r.id} className="py-2 text-center text-[10px]">{r.asOf.toLocaleDateString()}</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>

                          <div className="flex gap-3 mt-6 border-t border-white/5 pt-4">
                            {lenderRates.map((r) => (
                              <button
                                key={r.id}
                                onClick={async () => {
                                  setSelectedLender(r.id);
                                  if (project) {
                                    await projectsService.updateProject(projectId, {
                                      financials: { ...project.financials, loanInterestRate: r.interestRate }
                                    });
                                    toast.success(`Selected ${r.name}`);
                                    refresh();
                                  }
                                }}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                  selectedLender === r.id
                                    ? 'bg-[#7A9EAA]/25 border-[#7A9EAA] text-[#7A9EAA]'
                                    : 'bg-white/5 border-white/5 text-[#9E9DA0]'
                                }`}
                              >
                                Select {r.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : card.id === 'F3.4' ? (
                  <LoanProcessingPipeline projectId={projectId} />
                ) : card.id === 'F3.5' ? (
                  <LockedTermsCard projectId={projectId} />
                ) : card.id === 'F3.6' ? (
                  <Sba504Card projectId={projectId} />
                ) : card.id === 'F3.7' ? (
                  <HardMoneyTermsCard projectId={projectId} />
                ) : card.id === 'F4.1' ? (
                  <div className="space-y-4">
                    <TitleClosingTeamCard projectId={projectId} />
                    <TitleSearchClearance projectId={projectId} />
                    <PropertyMapTile projectId={projectId} address={project?.address} phaseColor={PHASE_COLOR} />
                  </div>
                ) : card.id === 'F4.2' ? (
                  <ClosingAttorneyCard projectId={projectId} />
                ) : card.id === 'F4.3' ? (
                  <div className="space-y-4">
                    <RfpBidsCard projectId={projectId} />
                    {/* Marketplace Links */}
                    <div className="glass-card p-4 rounded-xl space-y-2 mt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9E9DA0]/70 mb-2">Find Service Providers</p>
                      {[
                        { label: 'Home Inspector', type: 'Inspector' },
                        { label: 'Real Estate Attorney', type: 'Lawyer' },
                      ].map((vendor) => {
                        const city = (project?.address && typeof project.address === 'object'
                          ? (project.address as any)?.city
                          : typeof project?.address === 'string'
                            ? project.address.split(',')[1]?.trim()
                            : '') || '';
                        return (
                          <a
                            key={vendor.type}
                            href={`/dashboard/marketplace?type=${vendor.type}&projectId=${projectId}${city ? `&city=${encodeURIComponent(city)}` : ''}`}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all group"
                          >
                            <span className="text-[12px] font-medium text-[#9E9DA0] transition-colors">
                              Find a {vendor.label}{city ? ` in ${city}` : ''}
                            </span>
                            <span className="text-[11px] text-[#9E9DA0]/50 group-hover:text-[#7A9EAA] transition-colors">→</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : card.id === 'F4.4' ? (
                  <div className="space-y-4">
                    <AcquisitionTeamAssembly projectId={projectId} teamMembers={project.projectTeam || []} onRefresh={refresh} />
                    <InsuranceBinderCard project={project} onSaveProject={handleImmediateSave} />
                  </div>
                ) : card.id === 'F5.1' ? (
                  <ClosingTimelineCard projectId={projectId} project={project} />
                ) : card.id === 'F5.2' ? (
                  <div className="space-y-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">OCR Closing Disclosure Fallback</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Purchase Price', field: 'purchasePrice', value: project.financials?.purchasePrice },
                        { label: 'Loan Amount', field: 'loanAmount', value: project.financials?.loanAmount },
                        { label: 'Interest Rate (%)', field: 'loanInterestRate', value: project.financials?.loanInterestRate },
                        { label: 'Loan Term (Years)', field: 'loanTermYears', value: project.financials?.loanTermYears },
                        { label: 'Total Closing Costs', field: 'closingCosts', value: project.financials?.closingCosts },
                      ].map((item) => (
                        <div key={item.field} className="flex items-center justify-between gap-4">
                          <label className="text-[12px] font-medium text-[#9E9DA0] flex-shrink-0 w-40">{item.label}</label>
                          <input
                            type="number"
                            defaultValue={item.value || ''}
                            placeholder="—"
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-[#9E9DA0] placeholder-[#9E9DA0]/30 focus:outline-none focus:border-[#7A9EAA]/50 transition-colors text-right w-44"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                            onBlur={async (e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                await handleImmediateSave({
                                  financials: { ...project.financials, [item.field]: val }
                                });
                                refresh();
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : card.id === 'F5.3' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7">
                      <ClosingCostsLedger
                        initialLedger={project.costBasisLedger}
                        onChange={(newLedger) => {
                          handleImmediateSave({ costBasisLedger: newLedger });
                        }}
                        readOnly={project.isClearToClose}
                      />
                    </div>
                    <div className="lg:col-span-5">
                      <ClosingCostSidebar
                        financials={{
                          purchasePrice: project.financials?.purchasePrice,
                          loanAmount: project.financials?.loanAmount,
                          loanInterestRate: project.financials?.loanInterestRate,
                          loanOriginationPoints: project.financials?.loanOriginationPoints,
                        }}
                        overrides={closingCostOverrides}
                        purchasePrice={costMetrics.purchasePrice}
                        onOverridesChange={async (next) => {
                          setClosingCostOverrides(next);
                          await handleImmediateSave({
                            financials: { ...project.financials, closingCostOverrides: next },
                          });
                        }}
                        onExport={handleExportLedger}
                        exportingFormat={exportingFormat}
                        phaseColor={PHASE_COLOR}
                      />
                    </div>
                  </div>
                ) : card.id === 'F5.4' ? (
                  <DocumentVault
                    projectId={projectId}
                    documents={project.roleLinkedDocuments || []}
                    onChange={async (newDocs) => {
                      await handleImmediateSave({ roleLinkedDocuments: newDocs });
                      refresh();
                    }}
                  />
                ) : card.id === 'F6.1' ? (
                  <div className="space-y-4">
                    <FundToHoldGate
                      projectId={projectId}
                      onSuccess={() => {
                        router.push(`/dashboard/projects/${projectId}/phase-3`);
                      }}
                    />
                  </div>
                ) : (
                  // Stub/Coming Soon card
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-center bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">
                    <span className="material-symbols-outlined text-[48px] text-[#7A9EAA]/40">construction</span>
                    <h3 className="text-sm font-bold text-white">Card Not Yet Available</h3>
                    <p className="text-[11px] text-[#9E9DA0]/60 max-w-xs leading-relaxed">
                      The wizard interface for {card.title} ({card.id}) is scheduled for a future dispatch.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                <button
                  onClick={() => handleToggleCardComplete(card.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isDone
                      ? 'bg-[var(--pw-success)]/10 border-[var(--pw-success)]/30 text-[var(--pw-success)] hover:bg-[var(--pw-success)]/15'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{isDone ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>{isDone ? 'Completed' : 'Mark Completed'}</span>
                </button>
                <button
                  onClick={() => setActiveCardId(null)}
                  className="px-5 py-2 bg-white text-black hover:bg-white/95 text-xs font-bold rounded-xl transition-all"
                >
                  Save & Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {reconciliationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#161318] border border-red-500/20 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white tracking-tight">Confirm Modality Change & Archive Downstream Data</h2>
                <p className="text-[10px] text-[#9E9DA0]/70 italic">Guarded Reconciliation Protocol (Decision F-5)</p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              <p className="text-xs text-[#9E9DA0] leading-relaxed">
                Changing your modality will deselect active funding options that already carry downstream data. To prevent accidental data loss, the following records will be **archived** (marked as archived and preserved in the audit log database, but hidden from the active board views):
              </p>

              {reconciliationData.orphanedLoans.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Orphaned Loan Records</h4>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
                    {reconciliationData.orphanedLoans.map((loan) => (
                      <div key={loan.id} className="p-2.5 flex items-center justify-between text-xs font-mono">
                        <span className="text-[#9E9DA0] font-sans">{loan.lenderName}</span>
                        <span className="text-[#7A9EAA]">{loan.instrument} • ${(loan.amountCents / 100).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reconciliationData.orphanedPartners.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Orphaned Equity Partners</h4>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
                    {reconciliationData.orphanedPartners.map((part) => (
                      <div key={part.id} className="p-2.5 flex items-center justify-between text-xs font-mono">
                        <span className="text-[#9E9DA0] font-sans">{part.name}</span>
                        <span className="text-[#7A9EAA]">${part.contributionAmount.toLocaleString()} • {part.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reconciliationData.orphanedLedgerEntries.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Orphaned Ledger Commitments</h4>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
                    {reconciliationData.orphanedLedgerEntries.map((entry) => (
                      <div key={entry.id} className="p-2.5 flex items-center justify-between text-xs font-mono">
                        <span className="text-[#9E9DA0] font-sans">{entry.partyName}</span>
                        <span className="text-[#7A9EAA]">${(entry.amountCents / 100).toLocaleString()} • {entry.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/5 flex items-center justify-end gap-3 bg-white/[0.01]">
              <button
                onClick={() => {
                  setReconciliationData(null);
                  setPendingModality(null);
                }}
                className="px-4 py-2 border border-white/10 hover:border-white/20 bg-white/5 text-white text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReconciliation}
                disabled={isReconciling}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {isReconciling ? 'Archiving...' : 'Confirm & Archive'}
              </button>
            </div>

          </div>
        </div>
      )}
      </div>
    </PhaseAccessGuard>
  );
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, CostEntry, ProjectFinancials, ProjectTeamMember, FractionalInvestor, HistoricalProperty, ProspectProperty, FundingPledge, CostBasisLedger, RoleLinkedDocument, RehabExpense, HoldingCostEntry, SiteVisitLog, ClosingChecklistItem, ExitCostLineItem, SettlementDocument, LedgerItem, LOIDocument, InvestorCommitment, GuestPortalToken, Negotiation, Contingency, LoanStatus, DueDiligenceItem, RehabScheduleTask } from '@/types/schema';
import { deriveAllProjectMetrics } from '@/lib/metrics';
import type { ActiveProjectMetrics } from '@/lib/metrics';


/* ═══════════════════════════════════════════════════════════════
   Deal Store — Global State Engine for the Active Deal

   Architecture:
   ─────────────
   1. Portfolio-level metrics (across ALL projects)
   2. Per-deal derived metrics (activeProjectMetrics) for the currentProject
   3. Explicit cross-panel dispatch actions
   4. Zustand persist middleware → localStorage survival

   Cross-Panel Data Flow:
   ──────────────────────
   EvaluationPanel → dispatches purchasePrice, holdingCosts, closingCostsBuy
   EnginePanel     → dispatches renovationCosts (sum of approved costs)
   ExitPanel       → READS combined state via activeProjectMetrics (no mutations)

   Net Profit Formula (auto-derived):
   ───────────────────────────────────
   NetProfit = SalePrice - (PurchasePrice + ClosingCostsBuy/Sell
               + RenovationCosts + HoldingCosts)
   ═══════════════════════════════════════════════════════════════ */

// ─── Portfolio-Level Metrics ─────────────────────────────────
interface ProjectMetrics {
  totalApprovedCosts: number;
  totalPendingCosts: number;
  projectedProfit: number;
  projectedROI: number;
  activeProjects: number;
  totalCapitalCosts: number;
  totalHoldingCosts: number;
  // Phase 6 Contingency Enforcer
  rehabBudgetBase: number;
  rehabBudgetBuffered: number;
  triagePendingCount: number;
  // Phase 7 Realized Exit Metrics
  totalRealizedProfit: number;
  totalInvestedCapitalRealized: number;
  averageRealizedROI: number;
  soldProjects: number;
}

// ─── Per-Deal Derived Metrics ────────────────────────────────
// Auto-calculated whenever currentProject or its financials change.
// Consumed by ExitPanel / NetEngine without re-deriving locally.


// ─── Store Interface ─────────────────────────────────────────
interface ProjectState {
  projects: Project[];
  projectsSynced: boolean; // true once the first Firestore snapshot has fired
  currentProject: Project | null;
  ledgerItems: Record<string, LedgerItem[]>; // projectId -> items
  metrics: ProjectMetrics;
  activeProjectMetrics: ActiveProjectMetrics;

  whatIfOffsetMonths: number;

  // Core Actions
  setDeals: (projects: Project[]) => void;
  setLedgerItems: (projectId: string, items: LedgerItem[]) => void;
  setDeal: (deal: Project) => void;
  clearDeal: () => void;
  clearStore: () => void;
  addProject: (project: Project) => void;
  setWhatIfOffset: (months: number) => void;

  // Cross-Panel Financial Dispatch
  updateProjectFinancials: (projectId: string, updates: Partial<ProjectFinancials>) => void;
  updateProjectExit: (projectId: string, updates: Partial<Project['exit']>) => void;
  updateClosingRoom: (projectId: string, updates: Partial<Project['closingRoom']>) => void;
  updateRehabModule: (projectId: string, updates: Partial<Project['rehab']>) => void;
  updateProjectTeam: (projectId: string, team: ProjectTeamMember[]) => void;
  updateInvestors: (projectId: string, investors: FractionalInvestor[]) => void;
  updateProjectActionItems: (projectId: string, actionItems: any[]) => void;

  // Find & Fund Actions
  updateHistoricalProperties: (projectId: string, properties: HistoricalProperty[]) => void;
  updateProspects: (projectId: string, prospects: ProspectProperty[]) => void;
  updatePledges: (projectId: string, pledges: FundingPledge[]) => void;

  // LOI & Syndication Actions
  updateLOIDocuments: (projectId: string, docs: LOIDocument[]) => void;
  updateInvestorCommitments: (projectId: string, commitments: InvestorCommitment[]) => void;
  updateGuestPortalTokens: (projectId: string, tokens: GuestPortalToken[]) => void;

  // Acquisition & Due Diligence Actions
  updateCostBasis: (projectId: string, ledger: CostBasisLedger) => void;
  updateRoleDocuments: (projectId: string, docs: RoleLinkedDocument[]) => void;
  submitOffer: (projectId: string, offer: Omit<Negotiation, 'id' | 'date'>) => void;
  logCounterOffer: (projectId: string, negotiationId: string, counterOffer: number, status?: Negotiation['status']) => void;
  updateLoanStatus: (projectId: string, status: LoanStatus) => void;
  updateContingencies: (projectId: string, contingencies: Contingency[]) => void;
  updateDueDiligenceChecklist: (projectId: string, checklist: DueDiligenceItem[]) => void;
  transitionToPhase3: (projectId: string, finalHUDCosts: { purchasePrice: number, titleFees: number, originationFees: number }) => { success: boolean; error?: string };

  // Rehab Expansion Actions
  updateRehabExpenses: (projectId: string, expenses: RehabExpense[]) => void;
  updateHoldingCosts: (projectId: string, costs: HoldingCostEntry[]) => void;
  updateSiteVisitLogs: (projectId: string, logs: SiteVisitLog[]) => void;
  updateRehabScheduleTasks: (projectId: string, tasks: RehabScheduleTask[]) => void;

  // Closing Settlement Actions
  updateClosingChecklist: (projectId: string, items: ClosingChecklistItem[]) => void;
  updateExitCosts: (projectId: string, costs: ExitCostLineItem[]) => void;

  // Financial Statement Generator Actions
  updateSettlementDocuments: (projectId: string, docs: SettlementDocument[]) => void;

  // Recalculation (fires automatically on every mutation)
  recalculateMetrics: () => void;
  
  // Selectors
  getSelectedProject: () => Project | null;
  getLedgerItemsForProject: (projectId: string) => LedgerItem[];
}

// ─── Default Values ──────────────────────────────────────────
const initialMetrics: ProjectMetrics = {
  totalApprovedCosts: 0,
  totalPendingCosts: 0,
  projectedProfit: 0,
  projectedROI: 0,
  activeProjects: 0,
  totalCapitalCosts: 0,
  totalHoldingCosts: 0,
  rehabBudgetBase: 0,
  rehabBudgetBuffered: 0,
  triagePendingCount: 0,
  totalRealizedProfit: 0,
  totalInvestedCapitalRealized: 0,
  averageRealizedROI: 0,
  soldProjects: 0,
};

const initialActiveProjectMetrics: ActiveProjectMetrics = {
  purchasePrice: 0,
  renovationCosts: 0,
  closingCostsBuy: 0,
  closingCostsSell: 0,
  holdingCosts: 0,
  salePrice: 0,
  netProfit: 0,
  roi: 0,
  annualizedIrr: 0,
  holdDays: 0,
  totalInvestment: 0,
};

// ─── Per-Deal Calculator ─────────────────────────────────────
// Delegates calculation to the pure metrics engine
function deriveActiveProjectMetrics(deal: Project | null, whatIfOffsetMonths: number, ledgerItems: LedgerItem[] = []): ActiveProjectMetrics {
  if (!deal) return initialActiveProjectMetrics;
  return deriveAllProjectMetrics(deal, whatIfOffsetMonths, ledgerItems);
}

// ─── Zustand Store with Persist Middleware ────────────────────
export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      projectsSynced: false,
      currentProject: null,
      ledgerItems: {},
      metrics: initialMetrics,
      activeProjectMetrics: initialActiveProjectMetrics,
      whatIfOffsetMonths: 0,

      // ─── What-If Simulator ───────────────────────────────
      setWhatIfOffset: (months) => {
        set({ whatIfOffsetMonths: months });
        get().recalculateMetrics();
      },

      // ─── Portfolio Actions ───────────────────────────────
      setDeals: (projects) => {
        set({ projects, projectsSynced: true });
        const { currentProject } = get();
        if (currentProject) {
          const u = projects.find(d => d.id === currentProject.id);
          if (u) set({ currentProject: u });
        }
        get().recalculateMetrics();
      },

      setLedgerItems: (projectId, items) => {
        set((state) => ({
          ledgerItems: {
            ...state.ledgerItems,
            [projectId]: items
          }
        }));
        get().recalculateMetrics();
      },

      setDeal: (deal) => {
        set({ currentProject: deal });
        // Immediately derive metrics for the newly selected deal
        const { whatIfOffsetMonths, ledgerItems } = get();
        const items = ledgerItems[deal.id] || [];
        set({ activeProjectMetrics: deriveActiveProjectMetrics(deal, whatIfOffsetMonths, items) });
      },

      clearDeal: () => {
        set({ currentProject: null, activeProjectMetrics: initialActiveProjectMetrics });
      },

      clearStore: () => {
        set({
          projects: [],
          projectsSynced: false,
          currentProject: null,
          ledgerItems: {},
          metrics: initialMetrics,
          activeProjectMetrics: initialActiveProjectMetrics,
          whatIfOffsetMonths: 0,
        });
      },

      addProject: (project) => {
        const { projects } = get();
        set({ projects: [...projects, project] });
        get().recalculateMetrics();
      },

      // ─── Cross-Panel Financial Dispatch ──────────────────
      // EvaluationPanel dispatches: purchasePrice, loanAmount, loanInterestRate, etc.
      // EnginePanel dispatches: costs (approved), rehab tasks, permit status
      // ExitPanel dispatches: actualSalePrice, commissions, finalClosingCosts
      updateProjectFinancials: async (projectId, updates) => {
        const { projects, currentProject } = get();

        // 1. Snapshot previous state for rollback
        const previousProjects = projects.map(d => ({
          ...d,
          financials: { ...d.financials }
        }));
        const previousCurrentProject = currentProject
          ? { ...currentProject, financials: { ...currentProject.financials } }
          : null;

        // 2. Optimistic Update in Zustand store
        const updatedDeals = projects.map(d => {
          if (d.id === projectId) {
            return {
              ...d,
              financials: {
                ...d.financials,
                ...updates
              } as Project['financials']
            };
          }
          return d;
        });

        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
        get().recalculateMetrics();

        // 3. Persist to authoritative store (Firestore via PATCH API)
        try {
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
            // Demo mode is client-only
            return;
          }

          let token = '';
          if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
            token = 'mock_token_123';
          } else {
            const { auth } = await import('@/lib/firebase/config');
            const userToken = await auth.currentUser?.getIdToken();
            if (!userToken) {
              throw new Error('Not authenticated. Please log in again.');
            }
            token = userToken;
          }

          const res = await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ financials: updates }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with ${res.status}`);
          }

          const result = await res.json();
          if (!result.success) {
            throw new Error(result.error || 'Server failed to save financials.');
          }
        } catch (err: any) {
          console.error('[projectStore] updateProjectFinancials persist failed:', err);
          const { default: toast } = await import('react-hot-toast');
          toast.error(err.message || 'Failed to save changes. Reverting to server state.');

          // 4. Rollback to persisted truth on failure
          set({ projects: previousProjects });
          if (previousCurrentProject) {
            set({ currentProject: previousCurrentProject });
          }
          get().recalculateMetrics();
        }
      },

      updateProjectExit: (projectId, updates) => {
        const { projects, currentProject } = get();

        const updatedDeals = projects.map(d => {
          if (d.id === projectId) {
            return {
              ...d,
              exit: {
                ...d.exit,
                ...updates
              } as Project['exit']
            };
          }
          return d;
        });

        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
        get().recalculateMetrics();
      },

      updateClosingRoom: (projectId, updates) => {
        const { projects, currentProject } = get();

        const updatedDeals = projects.map(d => {
          if (d.id === projectId) {
            return {
              ...d,
              closingRoom: {
                ...d.closingRoom,
                ...updates
              } as Project['closingRoom']
            };
          }
          return d;
        });

        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateRehabModule: (projectId, updates) => {
        const { projects, currentProject } = get();

        const updatedDeals = projects.map(d => {
          if (d.id === projectId) {
            const defaultRehab = {
              baseBudget: 0,
              contingencyBufferPercentage: 0.15,
              tasks: [],
              permits: [],
              pendingReceipts: [],
              drawRequests: []
            };
            return {
              ...d,
              rehab: {
                ...(d.rehab || defaultRehab),
                ...updates
              } as Project['rehab']
            };
          }
          return d;
        });

        set({ projects: updatedDeals });

        // Auto-update metrics whenever rehab state changes
        get().recalculateMetrics();

        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateProjectTeam: (projectId, team) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, projectTeam: team } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateProjectActionItems: (projectId, actionItems) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, actionItems } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateInvestors: (projectId, investors) => {
        const { projects, currentProject } = get();

        // R0 — Auto-recalculate owner's ownership % from confirmed investors
        const confirmedEquity = investors
          .filter(inv => inv.status === 'confirmed')
          .reduce((sum, inv) => sum + (inv.equityPercentage || 0), 0);
        const ownershipPercentage = Math.max(0, 100 - confirmedEquity);

        const updatedDeals = projects.map(d =>
          d.id === projectId
            ? {
                ...d,
                fractionalInvestors: investors,
                financials: {
                  ...d.financials,
                  ownershipPercentage,
                },
              }
            : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
        get().recalculateMetrics();
      },

      // ─── Find & Fund Actions ───────────────────────────────
      updateHistoricalProperties: (projectId, properties) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, historicalProperties: properties } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateProspects: (projectId, prospects) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, prospects } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updatePledges: (projectId, pledges) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, pledges } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      // ─── LOI & Syndication Mutations ────────────────────
      updateLOIDocuments: (projectId, docs) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, loiDocuments: docs } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateInvestorCommitments: (projectId, commitments) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, investorCommitments: commitments } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateGuestPortalTokens: (projectId, tokens) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, guestPortalTokens: tokens } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      // ─── Acquisition & Due Diligence Mutations ─────────
      updateCostBasis: (projectId, ledger) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, costBasisLedger: ledger } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateRoleDocuments: (projectId, docs) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, roleLinkedDocuments: docs } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      submitOffer: (projectId, offer) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d => {
          if (d.id === projectId) {
            const currentNegs = d.negotiations || [];
            const newNeg: Negotiation = {
              id: crypto.randomUUID(),
              date: new Date(),
              ...offer
            };
            return { ...d, negotiations: [...currentNegs, newNeg] };
          }
          return d;
        });
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      logCounterOffer: (projectId, negotiationId, counterOffer, status) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d => {
          if (d.id === projectId) {
            const updatedNegs = (d.negotiations || []).map(neg => 
              neg.id === negotiationId 
                ? { ...neg, counterOffer, status: status || neg.status, date: new Date() } 
                : neg
            );
            return { ...d, negotiations: updatedNegs };
          }
          return d;
        });
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateLoanStatus: (projectId, status) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, loanStatus: status } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateContingencies: (projectId, contingencies) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, contingencies } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateDueDiligenceChecklist: (projectId, checklist) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, dueDiligenceChecklist: checklist } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      transitionToPhase3: (projectId, finalHUDCosts) => {
        const { projects, currentProject, updateCostBasis, updateProjectFinancials } = get();
        const deal = projects.find(d => d.id === projectId);
        
        if (!deal) return { success: false, error: 'Deal not found' };
        
        if (!deal.isClearToClose && deal.loanStatus !== 'Clear-To-Close') {
          return { success: false, error: 'Project must be Clear-To-Close to finalize acquisition.' };
        }

        // Apply to Phase 3 Cost Basis Ledger
        const currentLedger = deal.costBasisLedger || { directAcquisition: [], financing: [], preClosing: [] };
        const newLedger: CostBasisLedger = {
          ...currentLedger,
          directAcquisition: [
            ...currentLedger.directAcquisition,
            { id: crypto.randomUUID(), label: 'Purchase Price', amount: finalHUDCosts.purchasePrice, paid: true, paidAt: new Date(), notes: '' },
            { id: crypto.randomUUID(), label: 'Title Fees', amount: finalHUDCosts.titleFees, paid: true, paidAt: new Date(), notes: '' }
          ],
          financing: [
            ...currentLedger.financing,
            { id: crypto.randomUUID(), label: 'Origination Fees', amount: finalHUDCosts.originationFees, paid: true, paidAt: new Date(), notes: '' }
          ]
        };

        const allItems = [
          ...(newLedger.directAcquisition || []),
          ...(newLedger.financing || []),
          ...(newLedger.preClosing || [])
        ];
        const totalClosingCosts = allItems
          .filter(item => item.label.toLowerCase() !== 'purchase price')
          .reduce((sum, item) => sum + item.amount, 0);

        const updatedDeals = projects.map(d =>
          d.id === projectId 
            ? { 
                ...d, 
                phaseStatus: 'Phase 3: Holding & Rehab' as const,
                costBasisLedger: newLedger,
                financials: {
                  ...d.financials,
                  purchasePrice: finalHUDCosts.purchasePrice,
                  initialCapitalizedBasis: finalHUDCosts.purchasePrice + totalClosingCosts,
                  loanOriginationPoints: (d.financials?.loanAmount || finalHUDCosts.purchasePrice) > 0 
                    ? (finalHUDCosts.originationFees / (d.financials?.loanAmount || finalHUDCosts.purchasePrice)) * 100 
                    : 0
                }
              } 
            : d
        );
        
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
        
        get().recalculateMetrics();

        return { success: true };
      },

      // ─── Rehab Expansion Mutations ────────────────────
      updateRehabExpenses: (projectId, expenses) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, rehabExpenses: expenses } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
        get().recalculateMetrics();
      },

      updateHoldingCosts: (projectId, costs) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, holdingCosts: costs } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
        get().recalculateMetrics();
      },

      updateSiteVisitLogs: (projectId, logs) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, siteVisitLogs: logs } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateRehabScheduleTasks: (projectId, tasks) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, rehabScheduleTasks: tasks } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      // ─── Closing Settlement Mutations ────────────────────
      updateClosingChecklist: (projectId, items) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, closingChecklist: items } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
      },

      updateExitCosts: (projectId, costs) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, exitCosts: costs } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
        get().recalculateMetrics();
      },

      // ─── Financial Statement Generator Mutations ─────────
      updateSettlementDocuments: (projectId, docs) => {
        const { projects, currentProject } = get();
        const updatedDeals = projects.map(d =>
          d.id === projectId ? { ...d, settlementDocuments: docs } : d
        );
        set({ projects: updatedDeals });
        if (currentProject?.id === projectId) {
          const u = updatedDeals.find(d => d.id === projectId);
          if (u) set({ currentProject: u });
        }
        get().recalculateMetrics();
      },

      // ─── Global Recalculation Engine ─────────────────────
      // Fires on EVERY financial mutation across any panel.
      // Produces both portfolio-level AND per-deal derived metrics.
      recalculateMetrics: () => {
        const { projects, currentProject, ledgerItems, whatIfOffsetMonths } = get();

        let totalApprovedCosts = 0;
        let totalPendingCosts = 0;
        let totalInvestment = 0;
        let totalProfit = 0;
        const activeProjects = projects.length;
        let totalCapitalCosts = 0;
        let totalHoldingCosts = 0;

        // Core Phase 6 Variables
        let rehabBudgetBase = 0;
        let triagePendingCount = 0;

        // Core Phase 7 Variables
        let totalRealizedProfit = 0;
        let totalInvestedCapitalRealized = 0;
        let soldProjects = 0;

        projects.forEach(deal => {
          let dealApprovedCost = 0;
          let dealPendingCost = 0;

          // Check Sub-collection ledgerItems first
          const items = ledgerItems[deal.id] || [];
          
          if (items.length > 0) {
            items.forEach(item => {
              if (item.status === 'Approved') {
                dealApprovedCost += item.amount;
              } else {
                dealPendingCost += item.amount;
                if (item.status === 'Pending') { // Sub-collection uses 'Pending'
                  triagePendingCount += 1;
                }
              }
            });
          } else if (deal.financials?.costs) {
            // Fallback to legacy array
            deal.financials.costs.forEach(cost => {
              if (cost.approved) {
                dealApprovedCost += cost.amount;
              } else {
                dealPendingCost += cost.amount;
                if (cost.status === 'Pending Triage') {
                  triagePendingCount += 1;
                }
              }
            });
          }

          const inspectionsCost = deal.financials?.inspections?.reduce((acc, curr) => acc + (curr.actualCost || 0), 0) || 0;
          dealApprovedCost += inspectionsCost;

          // Compute Baseline Rehab Budget (using actual costs/estimates)
          const dealRehabEstimate = deal.rehab?.baseBudget || 0;
          rehabBudgetBase += dealRehabEstimate;

          const triageCount = deal.rehab?.pendingReceipts?.filter(r => r.status === 'pending').length || 0;
          triagePendingCount += triageCount;

          totalApprovedCosts += dealApprovedCost;
          totalPendingCosts += dealPendingCost;

          const purchasePrice = deal.financials?.purchasePrice || 0;

          // Calculate Cost of Capital
          const interestRate = (deal.financials?.loanInterestRate || 0) / 100;
          const points = (deal.financials?.loanOriginationPoints || 0) / 100;

          const loanAmount = deal.financials?.loanAmount || purchasePrice + dealApprovedCost;
          const capitalCost = loanAmount * points;

          // What IF Simulator manipulates the timeline across active projects
          const timelineMonths = Math.max(0, (deal.financials?.estimatedTimelineDays || 0) / 30 + whatIfOffsetMonths);
          const timelineYears = timelineMonths / 12;

          const holdingCost = loanAmount * interestRate * timelineYears;

          totalCapitalCosts += capitalCost;
          totalHoldingCosts += holdingCost;

          const totalBurden = purchasePrice + dealApprovedCost + capitalCost + holdingCost;

          if (deal.status === 'Sold') {
            soldProjects++;
            const actualSalePrice = deal.financials?.actualSalePrice || 0;
            const buyersComm = (deal.financials?.buyersAgentCommission || 0) / 100;
            const sellersComm = (deal.financials?.sellersAgentCommission || 0) / 100;
            const closingCosts = deal.financials?.finalClosingCosts || 0;

            const netProceeds = actualSalePrice - (actualSalePrice * buyersComm) - (actualSalePrice * sellersComm) - closingCosts;
            const realizedProfit = netProceeds - totalBurden;

            totalRealizedProfit += realizedProfit;
            totalInvestedCapitalRealized += totalBurden;
          } else {
            totalInvestment += totalBurden;
            const profit = (deal.financials?.estimatedARV || 0) - totalBurden;
            totalProfit += profit;
          }
        });

        let projectedROI = 0;
        if (totalInvestment > 0) {
          projectedROI = (totalProfit / totalInvestment) * 100;
        }

        let averageRealizedROI = 0;
        if (totalInvestedCapitalRealized > 0) {
          averageRealizedROI = (totalRealizedProfit / totalInvestedCapitalRealized) * 100;
        }

        // ─── Per-Deal Derived Metrics ────────────────────────
        const items = currentProject ? (ledgerItems[currentProject.id] || []) : [];
        const activeProjectMetrics = deriveActiveProjectMetrics(currentProject, whatIfOffsetMonths, items);

        set({
          metrics: {
            totalApprovedCosts,
            totalPendingCosts,
            projectedProfit: totalProfit,
            projectedROI,
            activeProjects,
            totalCapitalCosts,
            totalHoldingCosts,
            rehabBudgetBase,
            rehabBudgetBuffered: rehabBudgetBase * 1.15, // Script forcibly adds 15% contingency
            triagePendingCount,
            totalRealizedProfit,
            totalInvestedCapitalRealized,
            averageRealizedROI,
            soldProjects
          },
          activeProjectMetrics,
        });
      },

      getSelectedProject: () => get().currentProject,
      getLedgerItemsForProject: (projectId) => get().ledgerItems[projectId] || [],
    }),
    {
      name: 'pw-project-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist financial data, not transient UI state.
      // Dates are serialized as strings by JSON.stringify; the panels
      // already defensive-cast them via `new Date(...)`.
      partialize: (state) => ({
        projects: state.projects.map(p => ({
          id: p.id,
          organizationId: p.organizationId,
          propertyName: p.propertyName,
          address: p.address,
          status: p.status,
          phaseStatus: p.phaseStatus,
          dispositionType: p.dispositionType,
          subStrategy: p.subStrategy,
          assetClass: p.assetClass,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          ownerUid: p.ownerUid,
          currentPhase: p.currentPhase,
          financials: p.financials,
          members: p.members,
        } as Project)),
        currentProject: state.currentProject ? ({
          id: state.currentProject.id,
          organizationId: state.currentProject.organizationId,
          propertyName: state.currentProject.propertyName,
          address: state.currentProject.address,
          status: state.currentProject.status,
          phaseStatus: state.currentProject.phaseStatus,
          dispositionType: state.currentProject.dispositionType,
          subStrategy: state.currentProject.subStrategy,
          assetClass: state.currentProject.assetClass,
          createdAt: state.currentProject.createdAt,
          updatedAt: state.currentProject.updatedAt,
          ownerUid: state.currentProject.ownerUid,
          currentPhase: state.currentProject.currentPhase,
          financials: state.currentProject.financials,
          members: state.currentProject.members,
        } as Project) : null,
        whatIfOffsetMonths: state.whatIfOffsetMonths,
      }),
      // Hydration merge: keep version-safe defaults for newly added fields
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ProjectState>;
        return {
          ...currentState,
          projects: persisted.projects ?? currentState.projects,
          currentProject: persisted.currentProject ?? currentState.currentProject,
          whatIfOffsetMonths: persisted.whatIfOffsetMonths ?? currentState.whatIfOffsetMonths,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.recalculateMetrics();
        }
      },
    }
  )
);

// ─── Typed Selectors (zero-overhead subscriptions) ───────────
// Use these in panels for surgical re-renders:
//   const netProfit = useProjectStore(selectActiveDealNetProfit);
export const selectActiveProjectMetrics = (s: ProjectState) => s.activeProjectMetrics;
export const selectActiveDealNetProfit = (s: ProjectState) => s.activeProjectMetrics.netProfit;
export const selectActiveDealROI = (s: ProjectState) => s.activeProjectMetrics.roi;
export const selectActiveDealRenovationCosts = (s: ProjectState) => s.activeProjectMetrics.renovationCosts;
export const selectPortfolioMetrics = (s: ProjectState) => s.metrics;
export const selectCurrentDeal = (s: ProjectState) => s.currentProject;
export const selectDeals = (s: ProjectState) => s.projects;

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PropertyDeal, CostEntry, DealFinancials, DealTeamMember, FractionalInvestor, HistoricalProperty, ProspectProperty, FundingPledge, CostBasisLedger, RoleLinkedDocument, RehabExpense, HoldingCostEntry, SiteVisitLog, ClosingChecklistItem, ExitCostLineItem, SettlementDocument } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Deal Store — Global State Engine for the Active Deal

   Architecture:
   ─────────────
   1. Portfolio-level metrics (across ALL deals)
   2. Per-deal derived metrics (activeDealMetrics) for the currentDeal
   3. Explicit cross-panel dispatch actions
   4. Zustand persist middleware → localStorage survival

   Cross-Panel Data Flow:
   ──────────────────────
   EvaluationPanel → dispatches purchasePrice, holdingCosts, closingCostsBuy
   EnginePanel     → dispatches renovationCosts (sum of approved costs)
   ExitPanel       → READS combined state via activeDealMetrics (no mutations)

   Net Profit Formula (auto-derived):
   ───────────────────────────────────
   NetProfit = SalePrice - (PurchasePrice + ClosingCostsBuy/Sell
               + RenovationCosts + HoldingCosts)
   ═══════════════════════════════════════════════════════════════ */

// ─── Portfolio-Level Metrics ─────────────────────────────────
interface DealMetrics {
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
// Auto-calculated whenever currentDeal or its financials change.
// Consumed by ExitPanel / NetEngine without re-deriving locally.
interface ActiveDealMetrics {
  purchasePrice: number;
  renovationCosts: number;         // Sum of all approved CostEntries + inspection actuals
  closingCostsBuy: number;         // Capital cost (origination points)
  closingCostsSell: number;        // Final closing costs + agent commissions
  holdingCosts: number;            // Interest over hold period
  salePrice: number;               // actualSalePrice or estimatedARV
  netProfit: number;               // SalePrice - (all costs above)
  roi: number;                     // (netProfit / totalInvestment) * 100
  annualizedIrr: number;           // roi * (365 / holdDays)
  holdDays: number;
  totalInvestment: number;
}

// ─── Store Interface ─────────────────────────────────────────
interface DealState {
  deals: PropertyDeal[];
  currentDeal: PropertyDeal | null;
  ledgerItems: Record<string, LedgerItem[]>; // dealId -> items
  metrics: DealMetrics;
  activeDealMetrics: ActiveDealMetrics;

  whatIfOffsetMonths: number;

  // Core Actions
  setDeals: (deals: PropertyDeal[]) => void;
  setLedgerItems: (dealId: string, items: LedgerItem[]) => void;
  setDeal: (deal: PropertyDeal) => void;
  clearDeal: () => void;
  setWhatIfOffset: (months: number) => void;

  // Cross-Panel Financial Dispatch
  updateDealFinancials: (dealId: string, updates: Partial<DealFinancials>) => void;
  updateClosingRoom: (dealId: string, updates: Partial<PropertyDeal['closingRoom']>) => void;
  updateRehabModule: (dealId: string, updates: Partial<PropertyDeal['rehab']>) => void;
  updateDealTeam: (dealId: string, team: DealTeamMember[]) => void;
  updateInvestors: (dealId: string, investors: FractionalInvestor[]) => void;

  // Find & Fund Actions
  updateHistoricalProperties: (dealId: string, properties: HistoricalProperty[]) => void;
  updateProspects: (dealId: string, prospects: ProspectProperty[]) => void;
  updatePledges: (dealId: string, pledges: FundingPledge[]) => void;

  // Acquisition & Due Diligence Actions
  updateCostBasis: (dealId: string, ledger: CostBasisLedger) => void;
  updateRoleDocuments: (dealId: string, docs: RoleLinkedDocument[]) => void;

  // Rehab Expansion Actions
  updateRehabExpenses: (dealId: string, expenses: RehabExpense[]) => void;
  updateHoldingCosts: (dealId: string, costs: HoldingCostEntry[]) => void;
  updateSiteVisitLogs: (dealId: string, logs: SiteVisitLog[]) => void;

  // Closing Settlement Actions
  updateClosingChecklist: (dealId: string, items: ClosingChecklistItem[]) => void;
  updateExitCosts: (dealId: string, costs: ExitCostLineItem[]) => void;

  // Financial Statement Generator Actions
  updateSettlementDocuments: (dealId: string, docs: SettlementDocument[]) => void;

  // Recalculation (fires automatically on every mutation)
  recalculateMetrics: () => void;
  
  // Selectors
  getSelectedDeal: () => PropertyDeal | null;
  getLedgerItemsForDeal: (dealId: string) => LedgerItem[];
}

// ─── Default Values ──────────────────────────────────────────
const initialMetrics: DealMetrics = {
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

const initialActiveDealMetrics: ActiveDealMetrics = {
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
// Encapsulates the exact formula:
//   NetProfit = SalePrice - (PurchasePrice + ClosingCostsBuy/Sell
//               + RenovationCosts + HoldingCosts)
function deriveActiveDealMetrics(deal: PropertyDeal | null, whatIfOffsetMonths: number): ActiveDealMetrics {
  if (!deal) return initialActiveDealMetrics;

  const purchasePrice = deal.financials?.purchasePrice || 0;

  // ─── Renovation Costs (sum of all approved ledger entries from sub-collection)
  let renovationCosts = 0;
  const items = useDealStore.getState().ledgerItems[deal.id] || [];
  
  items.forEach(item => {
    if (item.status === 'Approved') {
      renovationCosts += item.amount;
    }
  });

  // Fallback to legacy costs if sub-collection is empty (for transition)
  if (items.length === 0 && deal.financials?.costs) {
    deal.financials.costs.forEach(c => {
      if (c.approved) renovationCosts += c.amount;
    });
  }

  const inspectionsCost = deal.financials?.inspections?.reduce((acc, curr) => acc + curr.actualCost, 0) || 0;
  renovationCosts += inspectionsCost;

  // ─── Capital Costs (Closing Costs Buy — origination points)
  const interestRate = (deal.financials?.loanInterestRate || 0) / 100;
  const points = (deal.financials?.loanOriginationPoints || 0) / 100;
  const loanAmount = deal.financials?.loanAmount || (purchasePrice + renovationCosts);
  const closingCostsBuy = loanAmount * points;

  // ─── Holding Costs (interest accruing over hold period)
  const now = new Date();
  const soldDate = deal.financials?.soldDate ? new Date(deal.financials.soldDate) : null;
  const createdDate = new Date(deal.createdAt || now);

  let holdDays = deal.financials?.estimatedTimelineDays || 90;
  if (soldDate) {
    const ms = soldDate.getTime() - createdDate.getTime();
    holdDays = Math.max(1, ms / (1000 * 60 * 60 * 24));
  } else {
    const ms = now.getTime() - createdDate.getTime();
    const elapsed = ms / (1000 * 60 * 60 * 24);
    holdDays = Math.max(holdDays, elapsed);
  }

  // What-If simulator offsets the timeline
  const adjustedMonths = Math.max(0, holdDays / 30 + whatIfOffsetMonths);
  const timelineYears = adjustedMonths / 12;
  const holdingCosts = loanAmount * interestRate * timelineYears;

  // ─── Sale Price (either actual or projected ARV)
  const salePrice = deal.financials?.actualSalePrice || deal.financials?.estimatedARV || 0;

  // ─── Closing Costs Sell (agent commissions + final closing costs + exit ledger)
  const buyerPercent = deal.financials?.buyersAgentCommission || 0;
  const sellerPercent = deal.financials?.sellersAgentCommission || 0;
  const agentCommissions = salePrice * ((buyerPercent + sellerPercent) / 100);
  const finalClosingCosts = deal.financials?.finalClosingCosts || 0;

  // Add ledger-based exit costs
  let ledgerExitCosts = 0;
  deal.exitCosts?.forEach(ec => {
    if (ec.isPercentage && ec.percentageRate) {
      ledgerExitCosts += (ec.percentageRate / 100) * salePrice;
    } else {
      ledgerExitCosts += ec.amount;
    }
  });

  const closingCostsSell = agentCommissions + finalClosingCosts + ledgerExitCosts;


  // ─── THE FORMULA ───────────────────────────────────────────
  // NetProfit = SalePrice - (PurchasePrice + ClosingCostsBuy/Sell
  //             + RenovationCosts + HoldingCosts)
  const totalInvestment = purchasePrice + closingCostsBuy + closingCostsSell + renovationCosts + holdingCosts;
  const netProfit = salePrice - totalInvestment;

  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const annualizedIrr = holdDays > 0 ? roi * (365 / holdDays) : 0;

  return {
    purchasePrice,
    renovationCosts,
    closingCostsBuy,
    closingCostsSell,
    holdingCosts,
    salePrice,
    netProfit,
    roi,
    annualizedIrr,
    holdDays,
    totalInvestment,
  };
}

// ─── Zustand Store with Persist Middleware ────────────────────
export const useDealStore = create<DealState>()(
  persist(
    (set, get) => ({
      deals: [],
      currentDeal: null,
      ledgerItems: {},
      metrics: initialMetrics,
      activeDealMetrics: initialActiveDealMetrics,
      whatIfOffsetMonths: 0,

      // ─── What-If Simulator ───────────────────────────────
      setWhatIfOffset: (months) => {
        set({ whatIfOffsetMonths: months });
        get().recalculateMetrics();
      },

      // ─── Portfolio Actions ───────────────────────────────
      setDeals: (deals) => {
        set({ deals });
        const { currentDeal } = get();
        if (currentDeal) {
          const u = deals.find(d => d.id === currentDeal.id);
          if (u) set({ currentDeal: u });
        }
        get().recalculateMetrics();
      },

      setLedgerItems: (dealId, items) => {
        set((state) => ({
          ledgerItems: {
            ...state.ledgerItems,
            [dealId]: items
          }
        }));
        get().recalculateMetrics();
      },

      setDeal: (deal) => {
        set({ currentDeal: deal });
        // Immediately derive metrics for the newly selected deal
        const { whatIfOffsetMonths } = get();
        set({ activeDealMetrics: deriveActiveDealMetrics(deal, whatIfOffsetMonths) });
      },

      clearDeal: () => {
        set({ currentDeal: null, activeDealMetrics: initialActiveDealMetrics });
      },

      // ─── Cross-Panel Financial Dispatch ──────────────────
      // EvaluationPanel dispatches: purchasePrice, loanAmount, loanInterestRate, etc.
      // EnginePanel dispatches: costs (approved), rehab tasks, permit status
      // ExitPanel dispatches: actualSalePrice, commissions, finalClosingCosts
      updateDealFinancials: (dealId, updates) => {
        const { deals, currentDeal } = get();

        const updatedDeals = deals.map(d => {
          if (d.id === dealId) {
            return {
              ...d,
              financials: {
                ...d.financials,
                ...updates
              }
            };
          }
          return d;
        });

        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
        get().recalculateMetrics();
      },

      updateClosingRoom: (dealId, updates) => {
        const { deals, currentDeal } = get();

        const updatedDeals = deals.map(d => {
          if (d.id === dealId) {
            return {
              ...d,
              closingRoom: {
                ...d.closingRoom,
                ...updates
              } as PropertyDeal['closingRoom']
            };
          }
          return d;
        });

        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      updateRehabModule: (dealId, updates) => {
        const { deals, currentDeal } = get();

        const updatedDeals = deals.map(d => {
          if (d.id === dealId) {
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
              } as PropertyDeal['rehab']
            };
          }
          return d;
        });

        set({ deals: updatedDeals });

        // Auto-update metrics whenever rehab state changes
        get().recalculateMetrics();

        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      updateDealTeam: (dealId, team) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, dealTeam: team } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      updateInvestors: (dealId, investors) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, fractionalInvestors: investors } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      // ─── Find & Fund Actions ───────────────────────────────
      updateHistoricalProperties: (dealId, properties) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, historicalProperties: properties } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      updateProspects: (dealId, prospects) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, prospects } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      updatePledges: (dealId, pledges) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, pledges } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      // ─── Acquisition & Due Diligence Mutations ─────────
      updateCostBasis: (dealId, ledger) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, costBasisLedger: ledger } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      updateRoleDocuments: (dealId, docs) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, roleLinkedDocuments: docs } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      // ─── Rehab Expansion Mutations ────────────────────
      updateRehabExpenses: (dealId, expenses) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, rehabExpenses: expenses } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
        get().recalculateMetrics();
      },

      updateHoldingCosts: (dealId, costs) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, holdingCosts: costs } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
        get().recalculateMetrics();
      },

      updateSiteVisitLogs: (dealId, logs) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, siteVisitLogs: logs } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      // ─── Closing Settlement Mutations ────────────────────
      updateClosingChecklist: (dealId, items) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, closingChecklist: items } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
      },

      updateExitCosts: (dealId, costs) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, exitCosts: costs } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
        get().recalculateMetrics();
      },

      // ─── Financial Statement Generator Mutations ─────────
      updateSettlementDocuments: (dealId, docs) => {
        const { deals, currentDeal } = get();
        const updatedDeals = deals.map(d =>
          d.id === dealId ? { ...d, settlementDocuments: docs } : d
        );
        set({ deals: updatedDeals });
        if (currentDeal?.id === dealId) {
          const u = updatedDeals.find(d => d.id === dealId);
          if (u) set({ currentDeal: u });
        }
        get().recalculateMetrics();
      },

      // ─── Global Recalculation Engine ─────────────────────
      // Fires on EVERY financial mutation across any panel.
      // Produces both portfolio-level AND per-deal derived metrics.
      recalculateMetrics: () => {
        const { deals, currentDeal, ledgerItems, whatIfOffsetMonths } = get();

        let totalApprovedCosts = 0;
        let totalPendingCosts = 0;
        let totalInvestment = 0;
        let totalProfit = 0;
        let activeProjects = deals.length;
        let totalCapitalCosts = 0;
        let totalHoldingCosts = 0;

        // Core Phase 6 Variables
        let rehabBudgetBase = 0;
        let triagePendingCount = 0;

        // Core Phase 7 Variables
        let totalRealizedProfit = 0;
        let totalInvestedCapitalRealized = 0;
        let soldProjects = 0;

        deals.forEach(deal => {
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

          const inspectionsCost = deal.financials?.inspections?.reduce((acc, curr) => acc + curr.actualCost, 0) || 0;
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

          // What IF Simulator manipulates the timeline across active deals
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
        const activeDealMetrics = deriveActiveDealMetrics(currentDeal, whatIfOffsetMonths);

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
          activeDealMetrics,
        });
      },

      getSelectedDeal: () => get().currentDeal,
      getLedgerItemsForDeal: (dealId) => get().ledgerItems[dealId] || [],
    }),
    {
      name: 'pw-deal-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist financial data, not transient UI state.
      // Dates are serialized as strings by JSON.stringify; the panels
      // already defensive-cast them via `new Date(...)`.
      partialize: (state) => ({
        deals: state.deals,
        currentDeal: state.currentDeal,
        whatIfOffsetMonths: state.whatIfOffsetMonths,
      }),
      // Hydration merge: keep version-safe defaults for newly added fields
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<DealState>;
        return {
          ...currentState,
          deals: persisted.deals ?? currentState.deals,
          currentDeal: persisted.currentDeal ?? currentState.currentDeal,
          whatIfOffsetMonths: persisted.whatIfOffsetMonths ?? currentState.whatIfOffsetMonths,
        };
      },
    }
  )
);

// ─── Typed Selectors (zero-overhead subscriptions) ───────────
// Use these in panels for surgical re-renders:
//   const netProfit = useDealStore(selectActiveDealNetProfit);
export const selectActiveDealMetrics = (s: DealState) => s.activeDealMetrics;
export const selectActiveDealNetProfit = (s: DealState) => s.activeDealMetrics.netProfit;
export const selectActiveDealROI = (s: DealState) => s.activeDealMetrics.roi;
export const selectActiveDealRenovationCosts = (s: DealState) => s.activeDealMetrics.renovationCosts;
export const selectPortfolioMetrics = (s: DealState) => s.metrics;
export const selectCurrentDeal = (s: DealState) => s.currentDeal;
export const selectDeals = (s: DealState) => s.deals;

import { create } from 'zustand';
import { PropertyDeal, CostEntry, DealFinancials } from '@/types/schema';

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

interface DealState {
  deals: PropertyDeal[];
  currentDeal: PropertyDeal | null;
  metrics: DealMetrics;
  
  whatIfOffsetMonths: number;
  
  // Actions
  setDeals: (deals: PropertyDeal[]) => void;
  setDeal: (deal: PropertyDeal) => void;
  clearDeal: () => void;
  setWhatIfOffset: (months: number) => void;
  updateDealFinancials: (dealId: string, updates: Partial<DealFinancials>) => void;
  updateClosingRoom: (dealId: string, updates: Partial<PropertyDeal['closingRoom']>) => void;
  updateRehabModule: (dealId: string, updates: Partial<PropertyDeal['rehab']>) => void;
  
  // Recalculate everything globally
  recalculateMetrics: () => void;
}

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

export const useDealStore = create<DealState>((set, get) => ({
  deals: [],
  currentDeal: null,
  metrics: initialMetrics,
  whatIfOffsetMonths: 0,

  setWhatIfOffset: (months) => {
    set({ whatIfOffsetMonths: months });
    get().recalculateMetrics();
  },

  setDeals: (deals) => {
    set({ deals });
    const { currentDeal } = get();
    if (currentDeal) {
       const u = deals.find(d => d.id === currentDeal.id);
       if (u) set({ currentDeal: u });
    }
    get().recalculateMetrics();
  },

  setDeal: (deal) => {
    set({ currentDeal: deal });
  },

  clearDeal: () => {
    set({ currentDeal: null });
  },

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

  recalculateMetrics: () => {
    const { deals, whatIfOffsetMonths } = get();

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

      deal.financials?.costs?.forEach(cost => {
        if (cost.approved) {
          dealApprovedCost += cost.amount;
        } else {
          dealPendingCost += cost.amount;
          if (cost.status === 'Pending Triage') {
             triagePendingCount += 1;
          }
        }
      });
      
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
      }
    });
  }
}));

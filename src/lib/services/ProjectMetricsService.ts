import { Project, ProjectFinancials } from '@/types/schema';

/**
 * 📊 ProjectMetricsService
 * 
 * Provides high-precision financial and operational analytics for Real Estate Projects.
 * Centralizes standard industry formulas (70% Rule, ROI, GPM, etc.)
 */

export const ProjectMetricsService = {
  
  /**
   * Acquisition Metrics
   */
  getAcquisitionMetrics(project: Project) {
    const financials = project.financials;
    const arv = financials.estimatedARV || 0;
    const rehab = financials.projectedRehabCost || 0;
    const sqft = project.squareFootage || 0;
    
    // 70% Rule (Maximum Purchase Price)
    const mpp = (arv * 0.7) - rehab;
    
    // Price per square foot
    const pricePerSqft = sqft > 0 ? (financials.purchasePrice || 0) / sqft : 0;
    
    return {
      arv,
      mpp,
      pricePerSqft,
      isUnder70PercentRule: (financials.purchasePrice || 0) <= mpp
    };
  },

  /**
   * Operational Metrics
   */
  getOperationalMetrics(project: Project) {
    const financials = project.financials;
    const sqft = project.squareFootage || 0;
    
    const actualRenovCosts = (financials.costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
    const estimatedRenovCosts = financials.projectedRehabCost || 1; // Avoid div by zero
    
    const renovCostPerSqft = sqft > 0 ? actualRenovCosts / sqft : 0;
    const budgetVariance = (actualRenovCosts - (financials.projectedRehabCost || 0)) / estimatedRenovCosts;
    
    // Time to Flip (TTF)
    let ttfDays = 0;
    if (project.createdAt && financials.soldDate) {
      const start = new Date(project.createdAt).getTime();
      const end = new Date(financials.soldDate).getTime();
      ttfDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
    }

    return {
      renovCostPerSqft,
      budgetVariance,
      ttfDays,
      totalActualCosts: actualRenovCosts
    };
  },

  /**
   * Financial Metrics (SaaS Style)
   */
  getFinancialMetrics(project: Project) {
    const financials = project.financials;
    const purchase = financials.purchasePrice || 0;
    const sale = financials.actualSalePrice || 0;
    const actualCosts = (financials.costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
    const closing = financials.finalClosingCosts || 0;
    
    const totalBasis = purchase + actualCosts + closing;
    const netProfit = sale > 0 ? sale - totalBasis : 0;
    
    const gpm = sale > 0 ? netProfit / sale : 0;
    const roi = totalBasis > 0 ? netProfit / totalBasis : 0;
    
    return {
      totalBasis,
      netProfit,
      gpm, // Gross Profit Margin
      roi, // Return on Investment
      burnRate: actualCosts / 1, // Monthly burn calculation would require timestamp logic
    };
  },

  /**
   * Market Risk Metrics
   */
  getRiskMetrics(project: Project) {
    const financials = project.financials;
    const purchase = financials.purchasePrice || 0;
    const actualCosts = (financials.costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalBasis = purchase + actualCosts;
    
    const loanAmount = financials.loanAmount || 0;
    const ltc = totalBasis > 0 ? loanAmount / totalBasis : 0;
    
    return {
      ltc, // Loan-to-Cost
      dom: 0, // Days on Market (requires listing timestamp)
    };
  }
};

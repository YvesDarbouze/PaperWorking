'use client';

import React from 'react';
import { AlertTriangle, Home, ArrowRight } from 'lucide-react';
import { formatCentsToDollars, calculateNetProfit } from '@/lib/calculations/financials';
import { Project } from '@/types/schema';

interface LossMitigationWidgetProps {
  projects: Project[];
  onNavigateToDeal: (id: string) => void;
}

/**
 * Loss Mitigation Dashboard Widget
 * Highlights projects where current costs exceed projected exit profit.
 */
const LossMitigationWidget: React.FC<LossMitigationWidgetProps> = ({ 
  projects, 
  onNavigateToDeal 
}) => {
  
  // Filter for projects in negative profit territory
  const criticalDeals = projects.filter(deal => {
    // Basic logic: SalePrice - (Purchase + Total Approved Costs) < 0
    const totalCosts = (deal.financials.costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
    const projectedProfit = calculateNetProfit(
      deal.financials.estimatedARV || 0,
      deal.financials.purchasePrice || 0,
      deal.financials.finalClosingCosts || 0,
      totalCosts,
      0 // Holding costs could be added here if defined in financials
    );
    return projectedProfit < 0;
  });

  if (criticalDeals.length === 0) return null;

  return (
    <div className="ag-card bg-bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.02)] border border-border-accent/10 p-10 flex flex-col h-full min-h-[500px]">
      <div className="flex items-center space-x-5 mb-10">
        <div className="w-12 h-12 rounded-full bg-pw-black text-white flex items-center justify-center shadow-lg shadow-pw-black/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="ag-label opacity-60">Field Triage</p>
          <h2 className="text-3xl font-light text-text-primary tracking-tighter">
            Mitigation Required
          </h2>
        </div>
      </div>

      <p className="text-sm text-text-secondary font-normal mb-8 leading-relaxed">
        {criticalDeals.length} Deal{criticalDeals.length > 1 ? 's' : ''} currently operating with negative projected yields. Execute immediate budget audit.
      </p>

      <div className="space-y-4 flex-1">
        {criticalDeals.map(deal => {
          const totalCosts = (deal.financials.costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
          const deficit = (deal.financials.estimatedARV || 0) - (deal.financials.purchasePrice + totalCosts);

          return (
            <div 
              key={deal.id}
              onClick={() => onNavigateToDeal(deal.id)}
              className="flex items-center justify-between bg-bg-primary/30 border border-border-accent/10 p-6 rounded-[32px] hover:bg-bg-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-5">
                <div className="w-10 h-10 rounded-full bg-bg-surface border border-border-accent/10 flex items-center justify-center text-text-secondary group-hover:bg-pw-black group-hover:text-pw-white transition-all duration-500 shadow-sm">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-base font-medium text-text-primary tracking-tight leading-none mb-1">
                    {deal.propertyName}
                  </p>
                  <p className="text-xs text-text-secondary opacity-60 font-medium">
                    {deal.address.split(',')[0]}
                  </p>
                </div>
              </div>
              
              <div className="text-right flex items-center space-x-6">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] mb-1 opacity-40 text-right">Deficit</p>
                  <p className="text-lg font-medium text-text-primary tracking-tighter">
                    {formatCentsToDollars(Math.abs(deficit))}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-secondary opacity-20 group-hover:opacity-100 group-hover:text-text-primary transition-all" />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-10 pt-8 border-t border-border-accent/10 flex justify-between items-center text-xs">
        <span className="text-text-secondary font-medium opacity-60">Action Required: Audit line-items.</span>
        <button className="text-text-primary font-bold uppercase tracking-widest text-[9px] hover:underline transition-all">
          Audit Full Stack
        </button>
      </div>
    </div>
  );
};

export default LossMitigationWidget;

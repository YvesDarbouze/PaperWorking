'use client';

import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RuleOf70Warning() {
  const currentProject = useProjectStore(state => state.currentProject);
  
  if (!currentProject?.financials) return null;

  const { purchasePrice, estimatedARV, costs } = currentProject.financials;
  
  const estimatedRepairs = costs.reduce((sum, cost) => sum + cost.amount, 0); // we sum up costs, ideally this would be isolated estimated repair cost
  const maxAllowableOffer = (estimatedARV * 0.70) - estimatedRepairs;

  const isOverLeveraged = purchasePrice > maxAllowableOffer;

  if (isOverLeveraged) {
    return (
      <div className="bg-[var(--pw-glass-bg)] backdrop-blur-xl border border-[var(--pw-border)] border-l-4 border-l-[var(--color-error)] p-4 rounded-[var(--radius-lg)] shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-[var(--color-error)]" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-[var(--color-error)]">70% Rule Violation Detected</h3>
            <div className="mt-2 text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
              <p>Your Purchase Price (${purchasePrice.toLocaleString()}) exceeds the Maximum Allowable Offer (${maxAllowableOffer.toLocaleString()}). Proceeding drastically increases risk profile.</p>
              <p className="mt-1.5 font-mono text-[10px] opacity-80">(ARV: ${estimatedARV.toLocaleString()} * 0.7) - Repairs: ${estimatedRepairs.toLocaleString()} = ${maxAllowableOffer.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--pw-glass-bg)] backdrop-blur-xl border border-[var(--pw-border)] border-l-4 border-l-[var(--color-secondary-container)] p-4 rounded-[var(--radius-lg)] shadow-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <CheckCircle2 className="h-5 w-5 text-pw-forest dark:text-pw-minty" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-bold text-pw-forest dark:text-pw-minty">70% Rule Compliant</h3>
          <div className="mt-1 text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
            <p>Your Purchase Price is within the MAO threshold (${maxAllowableOffer.toLocaleString()}). Sound structural margins.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

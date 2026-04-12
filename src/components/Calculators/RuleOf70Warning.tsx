'use client';

import React from 'react';
import { useDealStore } from '@/store/dealStore';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RuleOf70Warning() {
  const currentDeal = useDealStore(state => state.currentDeal);
  
  if (!currentDeal?.financials) return null;

  const { purchasePrice, estimatedARV, costs } = currentDeal.financials;
  
  const estimatedRepairs = costs.reduce((sum, cost) => sum + cost.amount, 0); // we sum up costs, ideally this would be isolated estimated repair cost
  const maxAllowableOffer = (estimatedARV * 0.70) - estimatedRepairs;

  const isOverLeveraged = purchasePrice > maxAllowableOffer;

  if (isOverLeveraged) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">70% Rule Violation Detected</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Your Purchase Price (${purchasePrice.toLocaleString()}) exceeds the Maximum Allowable Offer (${maxAllowableOffer.toLocaleString()}). Proceeding drastically increases risk profile.</p>
              <p className="mt-1 font-mono text-xs opacity-80">(ARV: ${estimatedARV.toLocaleString()} * 0.7) - Repairs: ${estimatedRepairs.toLocaleString()} = ${maxAllowableOffer.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">70% Rule Compliant</h3>
          <div className="mt-1 text-sm text-green-700">
            <p>Your Purchase Price is within the MAO threshold (${maxAllowableOffer.toLocaleString()}). Sound structural margins.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

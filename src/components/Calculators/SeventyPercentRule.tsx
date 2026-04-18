'use client';

import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { calculateSeventyPercentRule } from '@/lib/math/calculatorUtils';

export default function SeventyPercentRule() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateProjectFinancials = useProjectStore((state) => state.updateProjectFinancials);

  if (!currentProject?.financials) return null;

  const arv = currentProject.financials.estimatedARV || 0;
  
  // Rehab Costs
  let rehabCosts = 0;
  currentProject.financials.costs?.forEach(cost => rehabCosts += cost.amount);
  const inspectionsCost = currentProject.financials.inspections?.reduce((acc, curr) => acc + curr.estimatedCost, 0) || 0;
  rehabCosts += inspectionsCost;

  const purchasePrice = currentProject.financials.purchasePrice || 0;
  
  const { MAO: maximumAllowableOffer, isSetup, isOverbought, variance } = calculateSeventyPercentRule(arv, rehabCosts, purchasePrice);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-2 border-b pb-4 mb-4 text-gray-900">
        <Calculator className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold">70% Rule Engine</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm">
           <span className="text-gray-500">Estimated ARV:</span>
           <span className="font-medium text-gray-900">${arv.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
           <span className="text-gray-500">x 0.70 Threshold:</span>
           <span className="font-medium text-gray-900">${(arv * 0.70).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b pb-2 text-red-600">
           <span>- Est. Repairs:</span>
           <span>-${rehabCosts.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-end pt-2">
           <div className="flex-1">
              <span className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Max Allowable Offer (MAO)</span>
              <span className="text-3xl font-bold text-gray-900">${isSetup ? Math.max(0, maximumAllowableOffer).toLocaleString() : '---'}</span>
           </div>
        </div>

        {isSetup && (
          <div className={`mt-4 p-4 rounded-lg flex items-start space-x-3 ${isOverbought ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
            {isOverbought ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />}
            <div>
              <p className="font-semibold text-sm">
                 {isOverbought ? 'Threshold Exceeded' : 'Under MAO Threshold'}
              </p>
              <p className="text-xs mt-1 opacity-90">
                 {isOverbought 
                    ? `Warning: Your intended purchase price exceeds the standard 70% rule target by $${Math.abs(variance).toLocaleString()}. You are eroding margin.` 
                    : `Excellent. Your intended purchase price is $${variance.toLocaleString()} below the threshold target limit.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Users, AlertCircle, DollarSign, Wallet } from 'lucide-react';
import { calculateEquityPayout } from '@/lib/math/calculatorUtils';

export default function EquityPayoutManager() {
  const projects = useProjectStore(state => state.projects);
  const [selectedDealId, setSelectedDealId] = useState<string>('');

  const deal = projects.find(d => d.id === selectedDealId);

  const { isSold, targetProfit, calculationStatus, payouts, investors } = calculateEquityPayout(deal);

  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
           <h3 className="text-lg font-bold text-text-primary flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600"/> Equity Payout Automation</h3>
           <p className="text-sm text-text-secondary mt-1">Cross-references the crowdfunding database to distribute net escrow proceeds.</p>
        </div>
        
        <select 
           value={selectedDealId}
           onChange={(e) => setSelectedDealId(e.target.value)}
           className="border border-border-accent rounded-lg text-sm p-2 bg-bg-primary focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[200px]"
         >
           <option value="" disabled>Select Property...</option>
           {projects.map(d => (
              <option key={d.id} value={d.id}>{d.propertyName} ({d.status})</option>
           ))}
         </select>
      </div>

      {!deal ? (
         <div className="py-8 text-center bg-bg-primary rounded-lg border border-dashed border-border-accent text-text-secondary text-sm">
            Please select a property from the dropdown to load the capital stack.
         </div>
      ) : (
         <div className="space-y-4">
            {/* Banner Status */}
            <div className={`p-4 rounded-lg flex items-center justify-between border ${isSold ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
               <div className="flex items-center gap-3">
                  {isSold ? <DollarSign className={`w-6 h-6 ${targetProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`} /> : <AlertCircle className="w-6 h-6 text-blue-500" />}
                  <div>
                    <p className={`text-xs font-bold tracking-widest uppercase ${isSold ? (targetProfit >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-blue-600'}`}>
                       {calculationStatus}
                    </p>
                    <p className={`text-2xl font-light ${isSold ? (targetProfit >= 0 ? 'text-emerald-900' : 'text-red-900') : 'text-blue-900'}`}>
                        ${targetProfit.toLocaleString()}
                    </p>
                  </div>
               </div>
               {!isSold && (
                 <div className="text-right ml-4">
                    <p className="text-sm text-blue-700 font-medium tracking-tight">Property has not liquidated yet.</p>
                    <p className="text-xs text-blue-500">Amounts shown are projections.</p>
                 </div>
               )}
            </div>

            {/* Investor List */}
            {(investors?.length ?? 0) === 0 ? (
               <div className="py-6 text-center text-sm text-text-secondary bg-bg-primary rounded-lg border border-border-accent">
                  No fractional investors found on the cap table for this asset. Operating 100% Sponsor Equity.
               </div>
            ) : (
               <div className="border border-border-accent rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-bg-primary">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Investor Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Equity Share</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Disbursement Amt</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-bg-surface divide-y divide-gray-200">
                       {investors?.map(inv => {
                         const pTarget = payouts.find(p => p.investorId === inv.id);
                         const payoutAmount = pTarget ? pTarget.amount : 0;

                         return (
                           <tr key={inv.id}>
                             <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                {inv.name}
                             </td>
                             <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                {inv.equityPercentage.toFixed(1)}%
                             </td>
                             <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-text-primary">
                                ${payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </td>
                             <td className="px-4 py-4 whitespace-nowrap text-center">
                                <button
                                  disabled={!isSold || targetProfit <= 0 || payoutAmount <= 0}
                                  className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-full text-xs font-bold transition"
                                >
                                   <Wallet className="w-3 h-3" /> Execute Wire
                                </button>
                             </td>
                           </tr>
                         )
                       })}
                    </tbody>
                  </table>
               </div>
            )}
         </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Calculator } from 'lucide-react';

export default function CostOfCapitalCalculator() {
  const currentProject = useProjectStore(state => state.currentProject);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  const [loanAmount, setLoanAmount] = useState(currentProject?.financials?.loanAmount || 0);
  const [interestRate, setInterestRate] = useState(currentProject?.financials?.loanInterestRate || 0);
  const [points, setPoints] = useState(currentProject?.financials?.loanOriginationPoints || 0);

  if (!currentProject) return <div className="text-sm text-text-secondary">Please select a deal to calculate capital costs.</div>;

  const handleCalculate = () => {
    updateProjectFinancials(currentProject.id, {
      loanAmount: Number(loanAmount),
      loanInterestRate: Number(interestRate),
      loanOriginationPoints: Number(points)
    });
  };

  const upfrontCost = (Number(loanAmount) * (Number(points) / 100));

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
      <div className="flex items-center space-x-2 mb-4">
         <Calculator className="w-5 h-5 text-text-primary" />
         <h3 className="text-lg font-medium tracking-tight text-text-primary">Cost of Capital Calculator</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary uppercase">Loan Amount ($)</label>
          <input 
             type="number" 
             value={loanAmount || ''} 
             onChange={e => setLoanAmount(Number(e.target.value))}
             className="mt-1 block w-full px-3 py-2 bg-bg-primary border border-border-accent rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary uppercase">Interest Rate (%)</label>
            <input 
               type="number" 
               step="0.1"
               value={interestRate || ''} 
               onChange={e => setInterestRate(Number(e.target.value))}
               className="mt-1 block w-full px-3 py-2 bg-bg-primary border border-border-accent rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary uppercase">Origination Points</label>
            <input 
               type="number" 
               step="0.5"
               value={points || ''} 
               onChange={e => setPoints(Number(e.target.value))}
               className="mt-1 block w-full px-3 py-2 bg-bg-primary border border-border-accent rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-900 rounded-lg flex items-center justify-between text-white">
          <div>
             <p className="text-xs text-text-secondary uppercase tracking-widest">Total Upfront Cost</p>
             <p className="text-xl font-light">${upfrontCost.toLocaleString()}</p>
          </div>
          <button onClick={handleCalculate} className="px-4 py-2 bg-bg-surface text-text-primary text-sm font-semibold rounded hover:bg-bg-primary transition">
             Sync to Ledger
          </button>
        </div>
      </div>
    </div>
  );
}

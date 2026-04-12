'use client';

import React, { useState } from 'react';
import { useDealStore } from '@/store/dealStore';
import { Calculator } from 'lucide-react';

export default function CostOfCapitalCalculator() {
  const currentDeal = useDealStore(state => state.currentDeal);
  const updateDealFinancials = useDealStore(state => state.updateDealFinancials);

  const [loanAmount, setLoanAmount] = useState(currentDeal?.financials?.loanAmount || 0);
  const [interestRate, setInterestRate] = useState(currentDeal?.financials?.loanInterestRate || 0);
  const [points, setPoints] = useState(currentDeal?.financials?.loanOriginationPoints || 0);

  if (!currentDeal) return <div className="text-sm text-gray-500">Please select a deal to calculate capital costs.</div>;

  const handleCalculate = () => {
    updateDealFinancials(currentDeal.id, {
      loanAmount: Number(loanAmount),
      loanInterestRate: Number(interestRate),
      loanOriginationPoints: Number(points)
    });
  };

  const upfrontCost = (Number(loanAmount) * (Number(points) / 100));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
         <Calculator className="w-5 h-5 text-gray-700" />
         <h3 className="text-lg font-medium tracking-tight text-gray-900">Cost of Capital Calculator</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase">Loan Amount ($)</label>
          <input 
             type="number" 
             value={loanAmount || ''} 
             onChange={e => setLoanAmount(Number(e.target.value))}
             className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase">Interest Rate (%)</label>
            <input 
               type="number" 
               step="0.1"
               value={interestRate || ''} 
               onChange={e => setInterestRate(Number(e.target.value))}
               className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase">Origination Points</label>
            <input 
               type="number" 
               step="0.5"
               value={points || ''} 
               onChange={e => setPoints(Number(e.target.value))}
               className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-900 rounded-lg flex items-center justify-between text-white">
          <div>
             <p className="text-xs text-gray-400 uppercase tracking-widest">Total Upfront Cost</p>
             <p className="text-xl font-light">${upfrontCost.toLocaleString()}</p>
          </div>
          <button onClick={handleCalculate} className="px-4 py-2 bg-white text-gray-900 text-sm font-semibold rounded hover:bg-gray-100 transition">
             Sync to Ledger
          </button>
        </div>
      </div>
    </div>
  );
}

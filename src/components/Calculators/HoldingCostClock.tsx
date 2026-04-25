'use client';

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Clock } from 'lucide-react';

export default function HoldingCostClock() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const [burnedToday, setBurnedToday] = useState<number>(0);
  const [dailyBurn, setDailyBurn] = useState<number>(0);

  useEffect(() => {
    if (!currentProject?.financials) return;
    
    // Calculate daily burn based on loan amount & interest rate
    let dealApprovedCost = 0;
    currentProject.financials.costs?.forEach(cost => {
      if (cost.approved) dealApprovedCost += cost.amount;
    });
    
    const inspectionsCost = currentProject.financials.inspections?.reduce((acc, curr) => acc + curr.actualCost, 0) || 0;
    dealApprovedCost += inspectionsCost;

    const purchasePrice = currentProject.financials.purchasePrice || 0;
    const interestRate = (currentProject.financials.loanInterestRate || 0) / 100;

    const loanAmount = purchasePrice + dealApprovedCost;
    const costPerYear = loanAmount * interestRate;
    const costPerDay = costPerYear / 365;
    
    setDailyBurn(costPerDay);

    // Initial burn today based on time elapsed since midnight
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const secondsSinceMidnight = (now.getTime() - midnight.getTime()) / 1000;
    
    const costPerSecond = costPerDay / 86400;
    setBurnedToday(secondsSinceMidnight * costPerSecond);

    const interval = setInterval(() => {
      setBurnedToday(prev => prev + costPerSecond);
    }, 1000);

    return () => clearInterval(interval);

  }, [currentProject]);

  if (!currentProject) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl text-white relative overflow-hidden">
      {/* Decorative pulse background */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>

      <div className="flex items-center space-x-2 pb-4 mb-2 border-b border-gray-800 relative z-10">
        <Clock className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-100 tracking-wide">Holding Cost Clock</h3>
      </div>
      
      <div className="flex flex-col space-y-4 relative z-10 mt-4">
        <div>
           <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">Burned Today</p>
           <p className="text-5xl font-light text-red-400 font-mono">
              ${burnedToday.toFixed(4)}
           </p>
        </div>
        
        <div className="flex justify-between items-end border-t border-gray-800 pt-4 mt-2">
           <div>
              <p className="text-xs text-text-secondary uppercase tracking-widest mb-1">Daily Run Rate</p>
              <p className="text-xl font-medium text-gray-300">
                 ${dailyBurn.toFixed(2)}<span className="text-sm font-normal text-text-secondary">/day</span>
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

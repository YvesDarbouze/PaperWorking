'use client';

import React, { useState, useEffect } from 'react';
import { useDealStore } from '@/store/dealStore';
import { Percent, Banknote } from 'lucide-react';

export default function CostOfCapital() {
  const currentDeal = useDealStore((state) => state.currentDeal);
  const updateDealFinancials = useDealStore((state) => state.updateDealFinancials);

  // Local state for responsive input buffering
  const [interestRate, setInterestRate] = useState<string>('');
  const [points, setPoints] = useState<string>('');
  const [timeline, setTimeline] = useState<string>('');

  useEffect(() => {
    if (currentDeal?.financials) {
      setInterestRate(currentDeal.financials.loanInterestRate?.toString() || '');
      setPoints(currentDeal.financials.loanOriginationPoints?.toString() || '');
      setTimeline(currentDeal.financials.estimatedTimelineDays?.toString() || '');
    }
  }, [currentDeal]);

  const handleSave = () => {
    if (!currentDeal) return;
    updateDealFinancials(currentDeal.id, {
      loanInterestRate: parseFloat(interestRate) || 0,
      loanOriginationPoints: parseFloat(points) || 0,
      estimatedTimelineDays: parseFloat(timeline) || 0,
    });
  };

  if (!currentDeal) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-2 border-b pb-4 mb-4 text-gray-900">
        <Banknote className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold">Cost of Capital Terms</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (Annual)
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="number"
              className="block w-full rounded-md border-gray-300 pl-3 pr-8 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border"
              placeholder="e.g. 12"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              onBlur={handleSave}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 sm:text-sm">%</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loan Points
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="number"
              className="block w-full rounded-md border-gray-300 pl-3 pr-8 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border"
              placeholder="e.g. 2"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              onBlur={handleSave}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 sm:text-sm">pts</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Projected Timeline
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="number"
              className="block w-full rounded-md border-gray-300 pl-3 pr-16 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border"
              placeholder="e.g. 6"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              onBlur={handleSave}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 sm:text-sm">months</span>
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-4 leading-relaxed">
        * Entering terms here computes the upfront origination fee and standardizes the burn rate used by the Holding Cost clock.
      </p>
    </div>
  );
}

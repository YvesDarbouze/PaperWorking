'use client';

import React, { useEffect } from 'react';
import { useDealStore } from '@/store/dealStore';
import CostOfCapitalCalculator from '@/components/Calculators/CostOfCapitalCalculator';
import HoldingCostClock from '@/components/Calculators/HoldingCostClock';
import RuleOf70Warning from '@/components/Calculators/RuleOf70Warning';
import WhatIfSimulator from '@/components/Calculators/WhatIfSimulator';
import LenderVault from '@/components/LenderVault/LenderVault';
import InspectionChecklist from '@/components/Inspection/InspectionChecklist';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PropertyDeal } from '@/types/schema';

export default function CapitalEvaluationPage() {
  const currentDeal = useDealStore(state => state.currentDeal);
  const setDeal = useDealStore(state => state.setDeal);

  // If no deal is selected, we forcefully mock a deal so the user can test the UI immediately.
  useEffect(() => {
    if (!currentDeal) {
      const mockDeal: PropertyDeal = {
        id: 'mock_eval_deal',
        organizationId: 'mock_org',
        propertyName: 'SFH 123 Evaluated St',
        address: '123 Evaluated St',
        status: 'Lead',
        members: {},
        ownerUid: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        financials: {
          purchasePrice: 155000,
          estimatedARV: 260000,
          costs: [
            { id: '1', amount: 35000, description: 'Mock Repairs', addedBy: 'sys', approved: true, createdAt: new Date(), category: 'Other' }
          ],
          loanAmount: 200000,
          loanInterestRate: 10,
          loanOriginationPoints: 2,
        }
      };
      setDeal(mockDeal);
    }
  }, [currentDeal, setDeal]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 max-w-6xl mx-auto pb-20">
      
      <div className="flex items-center space-x-4">
        <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">Capital & Evaluation</h1>
          <p className="text-gray-500 mt-1">Mathematical engines and financing portal for {currentDeal?.propertyName || 'Target Property'}</p>
        </div>
      </div>

      {/* Constraints & Urgency Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HoldingCostClock />
        <div className="space-y-4">
           {/* If ARV * 0.70 - Costs is breached, warning shows */}
           <RuleOf70Warning />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Math & Financing */}
        <div className="lg:col-span-5 space-y-6">
          <CostOfCapitalCalculator />
          <WhatIfSimulator />
        </div>

        {/* Right Column: Deep Inspections & Documents */}
        <div className="lg:col-span-7 space-y-6">
          <InspectionChecklist />
          <LenderVault />
        </div>

      </div>

    </div>
  );
}

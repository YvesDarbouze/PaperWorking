'use client';

import React, { useState, useEffect } from 'react';
import { useDealStore } from '@/store/dealStore';
import { ShieldAlert, FileText, Banknote, ListOrdered, Scale, ChevronRight, ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import { useAllDealsSync } from '@/hooks/useAllDealsSync';

// Phase 4 Components
import CostOfCapital from '@/components/calculators/CostOfCapital';
import HoldingCostClock from '@/components/calculators/HoldingCostClock';
import SeventyPercentRule from '@/components/calculators/SeventyPercentRule';
import VirtualInspection from '@/components/calculators/VirtualInspection';
import WhatIfSimulator from '@/components/calculators/WhatIfSimulator';
import LenderVault from '@/components/financing/LenderVault';

// Phase 8 Components
import VarianceReportChart from '@/components/reporting/VarianceReportChart';
import EquityPayoutManager from '@/components/reporting/EquityPayoutManager';
import LenderPackagePdf from '@/components/reporting/LenderPackagePdf';
import TaxExportCsvButton from '@/components/reporting/TaxExportCsvButton';

// Phase 6 Components
import TriageQueue from '@/components/rehab/TriageQueue';

type Tab = 'cash' | 'triage' | 'ledger' | 'compliance' | 'valuation';

export default function EngineRoomPage() {
  useAllDealsSync();
  
  const userRole = 'Lead Investor'; // MOCK: Should pull from AuthContext
  const isFinanceTeam = userRole === 'Lead Investor' || userRole === 'Accountant';
  const isContractor = userRole === 'Subcontractor' || userRole === 'General Contractor';
  
  const [activeTab, setActiveTab] = useState<Tab>(isFinanceTeam ? 'cash' : 'triage');
  const [expandedLedgerProperties, setExpandedLedgerProperties] = useState<Record<string, boolean>>({});
  
  const metrics = useDealStore(state => state.metrics);
  const deals = useDealStore(state => state.deals);
  const currentDeal = useDealStore(state => state.currentDeal);
  const setDeal = useDealStore(state => state.setDeal);

  // Auto-select first deal if none is selected to ensure calculators work smoothly
  useEffect(() => {
    if (deals.length > 0 && !currentDeal) {
      setDeal(deals[0]);
    }
  }, [deals, currentDeal, setDeal]);

  if (!isFinanceTeam && !isContractor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-gray-500 mt-2">The Engine Room is restricted.</p>
      </div>
    );
  }

  // Flatten costs from all deals to render the master ledger
  const masterLedger = deals.flatMap(deal => 
    deal.financials?.costs?.map(cost => ({
       ...cost,
       propertyName: deal.propertyName
    })) || []
  ).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Group ledger for progressive disclosure
  const groupedLedger = masterLedger.reduce((acc, entry) => {
    if (!acc[entry.propertyName]) {
      acc[entry.propertyName] = {
        property: entry.propertyName,
        entries: [],
        totalApproved: 0,
        totalPending: 0
      };
    }
    acc[entry.propertyName].entries.push(entry);
    if (entry.approved) {
      acc[entry.propertyName].totalApproved += entry.amount;
    } else {
      acc[entry.propertyName].totalPending += entry.amount;
    }
    return acc;
  }, {} as Record<string, { property: string, entries: typeof masterLedger, totalApproved: number, totalPending: number }>);

  const togglePropertyLedger = (property: string) => {
    setExpandedLedgerProperties(prev => ({ ...prev, [property]: !prev[property] }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-gray-900">The Engine Room</h1>
        <p className="text-gray-500 mt-1">Centralized financial command and compliance hub. (Live Matrix)</p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          
          {isFinanceTeam && (
          <button
            onClick={() => setActiveTab('cash')}
            className={`flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'cash' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Banknote className="mr-2 h-4 w-4" /> Cash Management (ROI)
          </button>
          )}
          
          {/* Phase 6: Triage Queue Entry */}
          <button
            onClick={() => setActiveTab('triage')}
            className={`flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition ${
              activeTab === 'triage' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <ShieldAlert className={`mr-2 h-4 w-4 ${metrics.triagePendingCount > 0 ? 'text-orange-500 animate-pulse' : ''}`} /> 
            Triage & Tasks 
            {metrics.triagePendingCount > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-800 py-0.5 px-2 rounded-full text-xs font-bold">{metrics.triagePendingCount}</span>
            )}
          </button>

          {isFinanceTeam && (
            <>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === 'ledger' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <ListOrdered className="mr-2 h-4 w-4" /> Digital Ledger
              </button>
              <button
                onClick={() => setActiveTab('compliance')}
                className={`flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === 'compliance' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <FileText className="mr-2 h-4 w-4" /> Compliance & Reporting
              </button>
            </>
          )}
          {isFinanceTeam && (
          <button
            onClick={() => setActiveTab('valuation')}
            className={`flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'valuation' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Scale className="mr-2 h-4 w-4" /> Evaluation & Financing
          </button>
          )}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
        
        {activeTab === 'cash' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Liquidity Overview</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 uppercase tracking-widest">Available Cash</p>
                <p className="text-2xl font-light text-gray-900">$1,250,000</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 uppercase tracking-widest">Total Approved Costs</p>
                <p className="text-2xl font-light text-gray-900">${metrics.totalApprovedCosts.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-sm text-orange-600 uppercase tracking-widest">Pending AP (GC Receipts)</p>
                <p className="text-2xl font-light text-orange-700">${metrics.totalPendingCosts.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm text-green-600 uppercase tracking-widest">Realized PnL ({metrics.soldProjects})</p>
                <p className="text-2xl font-light text-green-700">${metrics.totalRealizedProfit.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="mt-8">
               <WhatIfSimulator />
            </div>
          </div>
        )}

        {/* Phase 6: Triage Dashboard Injection */}
        {activeTab === 'triage' && (
           <TriageQueue />
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-8">
            <VarianceReportChart />
            
            <div className="flex justify-between items-center mt-6">
               <div>
                  <h3 className="text-lg font-medium text-gray-900">Global Accounts Payable Ledger</h3>
                  <p className="text-sm text-gray-500">Consolidated overview of all processed and pending accounts payable.</p>
               </div>
               <TaxExportCsvButton />
            </div>
            
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
               {Object.keys(groupedLedger).length === 0 ? (
                  <div className="p-12 text-center text-sm text-gray-400 bg-gray-50">
                     No ledger entries generated yet. Use the GC Hook to upload a receipt!
                  </div>
               ) : (
                  <div className="divide-y divide-gray-200">
                     {Object.values(groupedLedger).map((group) => (
                        <div key={group.property} className="bg-white">
                           {/* High-level summary row */}
                           <div 
                              onClick={() => togglePropertyLedger(group.property)}
                              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                           >
                              <div className="flex items-center space-x-3">
                                 {expandedLedgerProperties[group.property] ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                 ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                 )}
                                 <h4 className="text-sm font-medium text-gray-900">{group.property}</h4>
                              </div>
                              <div className="flex space-x-6 text-sm">
                                 <div className="text-right">
                                    <span className="text-gray-500 text-xs block">Approved YTD</span>
                                    <span className="font-medium text-gray-900">${group.totalApproved.toLocaleString()}</span>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-gray-500 text-xs block">Pending</span>
                                    <span className="font-medium text-orange-600">${group.totalPending.toLocaleString()}</span>
                                 </div>
                              </div>
                           </div>
                           
                           {/* Granular detail row shown optionally */}
                           {expandedLedgerProperties[group.property] && (
                              <div className="bg-gray-50 border-t border-gray-100 overflow-x-auto p-4">
                                 <table className="min-w-full divide-y divide-gray-200 bg-white rounded shadow-sm border border-gray-200">
                                    <thead className="bg-gray-50">
                                       <tr>
                                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                          <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category / Description</th>
                                          <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                          <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                       {group.entries.map((entry) => (
                                          <tr key={entry.id} className="hover:bg-gray-50">
                                             <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                                {new Date(entry.createdAt).toLocaleDateString()}
                                             </td>
                                             <td className="px-4 py-3 text-xs text-gray-900">
                                                <div className="font-medium text-gray-700">{entry.category || 'Rehab Expense'}</div>
                                                <div className="text-gray-400">{entry.description}</div>
                                             </td>
                                             <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-900 text-right">
                                                ${entry.amount.toLocaleString()}
                                             </td>
                                             <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 border rounded text-[10px] font-medium uppercase tracking-wider ${entry.approved ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                                   {entry.approved ? <><CheckCircle2 className="w-3 h-3 mr-1 text-gray-400" /> Cleared</> : <><Clock className="w-3 h-3 mr-1 text-orange-500" /> Pending</>}
                                                </span>
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-8">
            <LenderPackagePdf />
            
            <EquityPayoutManager />

            <div>
              <h3 className="text-lg font-medium">Compliance & Universal Document Hub</h3>
              <p className="text-sm text-gray-500">Auto-generated Google Drive directories linked to verified deals.</p>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              {deals.map(deal => (
                 <div key={deal.id} className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{deal.propertyName}</p>
                      <p className="text-xs text-gray-500">Folder ID: {deal.documentHubFolderId || 'Not Linked'}</p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium" disabled={!deal.documentHubFolderId}>Open in Drive &rarr;</button>
                 </div>
              ))}
              {deals.length === 0 && (
                  <div className="col-span-2 p-4 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50 mt-4 text-gray-400">
                    No active property environments detected.
                  </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'valuation' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Property Analysis & Financing</h3>
                  <p className="text-sm text-gray-500">Advanced forecasting, lending credentials, and virtual inspection logs.</p>
                </div>
                
                {deals.length > 0 && (
                  <select 
                     className="border border-gray-300 rounded-md text-sm py-2 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
                     value={currentDeal?.id || ''}
                     onChange={(e) => {
                        const target = deals.find(d => d.id === e.target.value);
                        if (target) setDeal(target);
                     }}
                  >
                     <option value="" disabled>Select Target Property...</option>
                     {deals.map(d => (
                       <option key={d.id} value={d.id}>{d.propertyName} ({d.status})</option>
                     ))}
                  </select>
                )}
             </div>

             {deals.length === 0 ? (
                <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                   No active properties available to analyze. Add a property lead to begin.
                </div>
             ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                   {/* Left Column */}
                   <div className="space-y-6">
                      <CostOfCapital />
                      <SeventyPercentRule />
                      <VirtualInspection />
                   </div>
                   
                   {/* Right Column */}
                   <div className="space-y-6">
                      <HoldingCostClock />
                      <LenderVault />
                   </div>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}

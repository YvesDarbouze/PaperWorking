'use client';

import React from 'react';
import { PropertyDeal } from '@/types/schema';
import { ArrowRight } from 'lucide-react';
import DealFolder from './DealFolder';

/* ═══════════════════════════════════════════════════════
   DealListInline — Lightweight deal list for Pipeline panel

   Shows active deals in a simple table-like layout.
   The full board overlay is rendered at the layout level.
   ═══════════════════════════════════════════════════════ */

interface DealListInlineProps {
  deals: PropertyDeal[];
  onSelectDeal: (dealId: string) => void;
}

const getStatusBadge = (status: string) => {
  const base = "px-2.5 py-1 rounded-sm text-[11px] font-mono uppercase tracking-widest border";
  return `${base} bg-gray-50 border-gray-200 text-gray-600`;
};

export default function DealListInline({ deals, onSelectDeal }: DealListInlineProps) {
  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-end mb-6 px-2">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-gray-900">Active Pipeline</h2>
          <p className="text-sm text-gray-500 mt-1">Select a property to enter the Lifecycle Framework.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-lg">
        {deals.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No active deals found. Add a target property.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {deals.map((deal) => {
              const purchase = deal.financials?.purchasePrice || 0;
              const isRent = deal.financials?.exitStrategyType === 'Rent';

              return (
                <button
                  key={deal.id}
                  onClick={() => onSelectDeal(deal.id)}
                  className="group flex items-center justify-between w-full p-3 sm:p-4 hover:bg-gray-50/80 transition-colors text-left"
                >
                  {/* ── Standardized Deal Folder ── */}
                  <DealFolder
                    deal={deal}
                    size="md"
                    className="border-0 bg-transparent p-0 flex-1 min-w-0"
                  />

                  {/* ── Right-side metadata ── */}
                  <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0 ml-4">
                    <span className={getStatusBadge(deal.status)}>{deal.status}</span>
                    {purchase > 0 && (
                      <span className="text-sm font-light text-gray-700 hidden sm:inline">
                        {isRent && deal.financials.projectedMonthlyRent
                          ? `$${deal.financials.projectedMonthlyRent.toLocaleString()}/mo`
                          : `$${(deal.financials?.estimatedARV || purchase).toLocaleString()}`}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


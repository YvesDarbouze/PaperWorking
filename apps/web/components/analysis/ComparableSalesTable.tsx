'use client';

import React from 'react';
import { Clock, CheckCircle } from '@phosphor-icons/react';
import type { PropertyComparableSale } from '@/lib/calculator/property-types';

export interface ComparableSalesTableProps {
  propertyData: {
    configured?: boolean;
    requiresCredentials?: boolean;
    provider?: string;
    message?: string;
    comps?: PropertyComparableSale[];
    source?: string;
    as_of?: string;
    asOf?: string;
    stale?: boolean;
    isStale?: boolean;
  } | null;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

export function ComparableSalesTable({ propertyData }: ComparableSalesTableProps) {
  const comps = propertyData?.comps || [];

  return (
    <div data-testid="comps-section" className="rounded-none border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Comparable Sales (Live Public Records)
        </h2>
        <span className="text-[11px] font-mono text-neutral-400">
          {comps.length} comps loaded
        </span>
      </div>

      {!propertyData ? (
        <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-center text-xs text-neutral-400">
          Click &ldquo;Lookup Property Data&rdquo; to pull real public record comparables, or enter valuation directly.
        </div>
      ) : comps.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="comps-table">
            <thead>
              <tr className="border-b border-neutral-800 text-[10px] uppercase font-mono text-neutral-400">
                <th className="pb-2 font-medium">Address</th>
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium text-right">Sale Price</th>
                <th className="pb-2 font-medium text-right">SqFt</th>
                <th className="pb-2 font-medium text-right">Distance</th>
                <th className="pb-2 font-medium text-right">Status / As-Of</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {comps.map((comp, idx) => {
                const isStale = Boolean(comp.isStale || propertyData?.stale || propertyData?.isStale);
                const asOfDate = comp.asOf || comp.sale_date || propertyData?.asOf || propertyData?.as_of;
                const formattedDate = asOfDate ? new Date(asOfDate).toLocaleDateString() : 'recent';
                const sourceName = comp.source || propertyData?.source || propertyData?.provider || 'rentcast';

                return (
                  <tr key={idx} className="hover:bg-neutral-800/40" data-testid={`comp-row-${idx}`}>
                    <td className="py-2 text-white truncate max-w-[170px]">{comp.address}</td>
                    <td className="py-2">
                      <span
                        data-testid="comp-source-tag"
                        className="inline-block rounded-none bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-neutral-300"
                      >
                        {sourceName}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-white">
                      {formatCurrency(comp.sale_price)}
                    </td>
                    <td className="py-2 text-right text-neutral-300">{comp.sqft ? `${comp.sqft}` : '—'}</td>
                    <td className="py-2 text-right text-neutral-400">{comp.distance !== undefined ? `${comp.distance} mi` : '—'}</td>
                    <td className="py-2 text-right">
                      {isStale ? (
                        <span
                          data-testid="comp-staleness-badge"
                          className="inline-flex items-center gap-1 rounded-none bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono"
                        >
                          <Clock className="h-3 w-3 text-amber-400" />
                          Stale (as of {formattedDate})
                        </span>
                      ) : (
                        <span
                          data-testid="comp-fresh-badge"
                          className="inline-flex items-center gap-1 rounded-none bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 text-[10px] font-bold text-white font-mono"
                        >
                          <CheckCircle className="h-3 w-3 text-white" />
                          Fresh (as of {formattedDate})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : propertyData.requiresCredentials ? (
        <div
          data-testid="no-comps-credentials"
          className="rounded-none border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs font-mono text-amber-300"
        >
          no comp data — REQUIRES CREDENTIALS
        </div>
      ) : (
        <div
          data-testid="no-comps-found"
          className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-center text-xs font-mono text-neutral-400"
        >
          no recent comps found
        </div>
      )}
    </div>
  );
}
export default ComparableSalesTable;

'use client';

import React from 'react';
import { X, Table, Database, ArrowRight, ExternalLink } from 'lucide-react';
import { getKPILineage } from '@/lib/kpi/lineage';
import { DataFreshnessPill } from '@/components/kpi/DataFreshnessPill';

export interface ContributingRecord {
  id: string;
  propertyName: string;
  phase: string;
  value: number;
  contributionPercent?: number;
  projectUrl: string;
}

export interface KPIDrillDownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  metricId: string;
  metricName?: string;
  displayedValue: number | null;
  unit?: string;
  records?: ContributingRecord[];
  lastComputedAt?: string | Date;
}

export function KPIDrillDownDrawer({
  isOpen,
  onClose,
  metricId,
  metricName,
  displayedValue,
  unit = 'currency',
  records = [],
  lastComputedAt
}: KPIDrillDownDrawerProps) {
  if (!isOpen) return null;

  const lineage = getKPILineage(metricId);
  const title = metricName || lineage.label;

  const totalRecordValue = records.reduce((sum, r) => sum + r.value, 0);

  const formatVal = (val: number | null) => {
    if (val === null || isNaN(val)) return '—';
    if (unit === 'currency' || lineage.category === 'Financial Performance') {
      return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    }
    if (unit === 'percent') return `${val.toFixed(1)}%`;
    if (unit === 'ratio') return `${val.toFixed(2)}`;
    return `${val.toFixed(1)}`;
  };

  return (
    <div
      data-testid="kpi-drilldown-drawer"
      className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl bg-[#121014] border-l border-white/10 h-full flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-white/[0.02]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300">
                Lineage Provenance
              </span>
              <DataFreshnessPill lastComputedAt={lastComputedAt} />
            </div>
            <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
              {title}
            </h2>
            <p className="text-xs text-slate-400 max-w-md">{lineage.description}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Summary Callout */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Displayed KPI Aggregate
              </span>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-0.5" data-testid="kpi-drawer-aggregate">
                {displayedValue !== null ? formatVal(displayedValue) : '—'}
              </p>
            </div>
            {records.length > 0 && (
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Contributing Records Sum
                </span>
                <p className="text-2xl font-bold text-white tabular-nums mt-0.5" data-testid="kpi-drawer-records-sum">
                  {formatVal(totalRecordValue)}
                </p>
              </div>
            )}
          </div>

          {/* Machine-Readable Lineage Spec */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Machine-Readable Lineage Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">KPI ID</span>
                <p className="font-mono text-slate-200 mt-0.5">{lineage.kpiId}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Category</span>
                <p className="text-slate-200 mt-0.5">{lineage.category}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Source Tables</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {lineage.sourceTables.map((tbl) => (
                    <span key={tbl} className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300">
                      {tbl}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Mathematical Formula</span>
                <p className="font-mono text-emerald-300 bg-emerald-950/40 p-2.5 rounded border border-emerald-500/20 mt-1">
                  {lineage.formula}
                </p>
              </div>
            </div>
          </div>

          {/* Contributing Records Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-400" />
                Contributing Property Records ({records.length})
              </h3>
            </div>

            {records.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-xl text-slate-400 text-xs">
                No active property records contributed to this metric yet.
              </div>
            ) : (
              <div className="border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Property</th>
                      <th className="p-3">Phase</th>
                      <th className="p-3 text-right">Value</th>
                      <th className="p-3 text-right">Share</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {records.map((rec) => {
                      const sharePct = totalRecordValue > 0 ? (rec.value / totalRecordValue) * 100 : 0;
                      return (
                        <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-semibold text-white">{rec.propertyName}</td>
                          <td className="p-3 text-slate-400">{rec.phase}</td>
                          <td className="p-3 text-right font-mono font-medium text-emerald-300">
                            {formatVal(rec.value)}
                          </td>
                          <td className="p-3 text-right text-slate-400">{sharePct.toFixed(1)}%</td>
                          <td className="p-3 text-center">
                            <a
                              href={rec.projectUrl}
                              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                            >
                              Inspect <ArrowRight className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

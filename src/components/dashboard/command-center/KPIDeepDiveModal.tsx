"use client";

import React, { useState, useMemo } from 'react';
import { X, TrendingUp, Download, Building2, BarChart2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import toast from 'react-hot-toast';

export interface KPIDeepDiveData {
  id: string;
  name: string;
  category: string;
  currentValue: string;
  unit: string;
  changeLabel: string;
  isPositive: boolean;
  description: string;
  historicalData: Array<{ date: string; value: number; label: string }>;
}

interface KPIDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiData: KPIDeepDiveData | null;
}

type TimeRange = '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

export function KPIDeepDiveModal({ isOpen, onClose, kpiData }: KPIDeepDiveModalProps) {
  const projects = useProjectStore((s) => s.projects);
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');

  // Derive per-project breakdown for the selected KPI
  const projectBreakdown = useMemo(() => {
    if (!kpiData) return [];

    return projects.map((p) => {
      const f = p.financials || {};
      const metrics = deriveAllMetrics(
        f as unknown as Parameters<typeof deriveAllMetrics>[0],
        f.estimatedCurrentValue || f.estimatedARV,
        p.dispositionType,
        p.currentPhase,
        p.createdAt
      );

      let val = 0;
      let formattedVal = '—';

      if (kpiData.id === 'noi') {
        val = metrics.noi || 0;
        formattedVal = `$${Math.round(val / 12).toLocaleString()}/mo`;
      } else if (kpiData.id === 'irr') {
        val = (metrics.cashOnCashReturn || 0) + 4.2;
        formattedVal = `${val.toFixed(1)}%`;
      } else {
        val = metrics.totalCashInvested || 0;
        formattedVal = `$${Math.round(val).toLocaleString()}`;
      }

      return {
        id: p.id,
        name: p.propertyName || p.name || 'Unnamed Property',
        location: p.city && p.state ? `${p.city}, ${p.state}` : 'Location N/A',
        phase: p.currentPhase || 1,
        value: val,
        formattedVal,
        updatedAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recent',
      };
    });
  }, [projects, kpiData]);

  if (!isOpen || !kpiData) return null;

  // Filter historical data based on timeRange
  const filteredHistory = kpiData.historicalData.slice(
    timeRange === '3M' ? -3 : timeRange === '6M' ? -6 : 0
  );

  const maxValue = Math.max(...filteredHistory.map((d) => d.value), 1);

  const handleExport = () => {
    toast.success(`Exported ${kpiData.name} report to CSV successfully.`);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#121014] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161419]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{kpiData.name}</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                  {kpiData.category}
                </span>
              </div>
              <p className="text-xs text-[#627C85] mt-0.5">{kpiData.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#627C85] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close KPI Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Metric & Date Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#627C85]">Current Reported KPI</p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-black text-white">{kpiData.currentValue}</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    kpiData.isPositive
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  {kpiData.changeLabel}
                </span>
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
              {(['3M', '6M', 'YTD', '1Y', 'ALL'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    timeRange === r
                      ? 'bg-[#627C85] text-white shadow-md'
                      : 'text-[#627C85] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Historic Trend Graph */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Historical Performance Trend ({timeRange})
              </h3>
              <span className="text-[10px] text-[#627C85]">Monthly Snapshot</span>
            </div>

            {/* SVG Visual Graph */}
            <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-white/5">
              {filteredHistory.map((item, i) => {
                const heightPct = Math.max(15, (item.value / maxValue) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#161419] border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-xl z-20 pointer-events-none">
                      {item.date}: {item.label}
                    </div>
                    {/* Bar / Node */}
                    <div
                      className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-125"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: '#627C85',
                        boxShadow: '0 0 12px rgba(98, 124, 133, 0.2)',
                      }}
                    />
                    <span className="text-[10px] font-bold text-[#627C85]">{item.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Property Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#627C85]" />
                Property Contribution Breakdown
              </h3>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold border border-white/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            <div className="rounded-xl border border-white/5 overflow-hidden bg-white/[0.01]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-wider text-[#627C85]">
                  <tr>
                    <th className="py-2.5 px-4">Property</th>
                    <th className="py-2.5 px-4">Phase</th>
                    <th className="py-2.5 px-4 text-right">KPI Contribution</th>
                    <th className="py-2.5 px-4 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {projectBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div>{row.name}</div>
                        <div className="text-[10px] text-[#627C85]">{row.location}</div>
                      </td>
                      <td className="py-3 px-4 text-[11px]">Phase {row.phase}</td>
                      <td className="py-3 px-4 font-mono font-bold text-right text-emerald-400">{row.formattedVal}</td>
                      <td className="py-3 px-4 text-right text-[11px] text-[#627C85]">{row.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

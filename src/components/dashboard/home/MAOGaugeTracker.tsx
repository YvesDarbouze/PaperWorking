'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { Gauge, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   MAOGaugeTracker — Acquisition Strategy Sentinel
   
   Monitors compliance with the "70% Rule".
   MAO = (ARV × 0.70) − Repair Costs.
   Aesthetics: Status-colored progress bars, mono values, high-contrast labels.
   ═══════════════════════════════════════════════════════════════ */

interface DealMAO {
  id: string;
  address: string;
  arv: number;
  repairCosts: number;
  actualCost: number;
  mao: number;
  delta: number;
  pct: number;
  status: 'within' | 'approaching' | 'exceeded';
}

function shortAddress(addr: string): string {
  if (!addr) return 'Unnamed Property';
  const comma = addr.indexOf(',');
  return comma > 0 ? addr.slice(0, comma) : addr;
}

function formatCurrency(val: number): string {
  if (val === 0) return '—';
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(0)}k`;
  return `${sign}$${absVal.toLocaleString()}`;
}

const STATUS_CONFIG = {
  within:      { bgBar: 'bg-[#F2F2F2]',   fillBar: 'bg-[#595959]',  icon: CheckCircle2,  color: 'text-[#595959]',  label: 'COMPLIANT' },
  approaching: { bgBar: 'bg-[#F2F2F2]',   fillBar: 'bg-[#7F7F7F]', icon: AlertCircle,    color: 'text-[#7F7F7F]',  label: 'RISK' },
  exceeded:    { bgBar: 'bg-[#CCCCCC]',      fillBar: 'bg-[#1A1A1A]',   icon: AlertTriangle,  color: 'text-[#1A1A1A]',    label: 'VIOLATION' },
};

interface MAOGaugeTrackerProps {
  projects: Project[];
}

export default function MAOGaugeTracker({ projects }: MAOGaugeTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const [rulePercent, setRulePercent] = useState<70 | 75>(70);
  
  const deals = useMemo(() => {
    return projects
      .filter(d => d.status !== 'Sold' && d.financials?.estimatedARV && d.financials.estimatedARV > 0)
      .map(deal => {
        const metrics = deriveAllMetrics(
          deal.financials!,
          undefined,
          deal.dispositionType,
          deal.currentPhase,
          deal.createdAt,
          undefined,
          { ...deal, rulePercent }
        );

        const arv = deal.financials?.estimatedARV || 0;
        const purchasePrice = deal.financials?.purchasePrice || 0;
        const repairCosts = metrics.rehab?.totalRehab || deal.financials?.projectedRehabCost || 0;
        
        const mao = metrics.mao ?? 0;
        const actualCost = purchasePrice;
        const delta = mao - actualCost;
        const pct = mao > 0 ? (actualCost / mao) * 100 : 999;

        let status: DealMAO['status'] = 'within';
        if (pct >= 100) status = 'exceeded';
        else if (pct >= 85) status = 'approaching';

        return {
          id: deal.id,
          address: deal.address || deal.propertyName,
          arv,
          repairCosts,
          actualCost,
          mao: Math.max(0, mao),
          delta,
          pct: Math.min(pct, 200),
          status,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [projects, rulePercent]);

  const withinCount = deals.filter(d => d.status === 'within').length;
  const approachingCount = deals.filter(d => d.status === 'approaching').length;
  const exceededCount = deals.filter(d => d.status === 'exceeded').length;

  return (
    <div className="w-full h-full p-6 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F2F2F2]/50 flex items-center justify-center text-[#7F7F7F] group-hover:bg-[#1A1A1A] group-hover:text-[#FFFFFF] transition-all duration-500 shadow-sm border border-[#A5A5A5]/5">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <p className="ag-label opacity-40 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-[0.25em] text-[9px] text-[#1A1A1A]">
              Acquisition Sentinel
            </p>
            <h3 className="text-2xl font-normal text-[#1A1A1A] tracking-tighter">{rulePercent}% Rule</h3>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-[#F2F2F2]/50 p-1 rounded-xl border border-[#A5A5A5]/5 shadow-inner">
          <button
            onClick={() => setRulePercent(70)}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${rulePercent === 70 ? 'bg-[#1A1A1A] text-[#FFFFFF] shadow-lg' : 'text-[#7F7F7F] hover:text-[#1A1A1A]'}`}
          >
            70%
          </button>
          <button
            onClick={() => setRulePercent(75)}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${rulePercent === 75 ? 'bg-[#1A1A1A] text-[#FFFFFF] shadow-lg' : 'text-[#7F7F7F] hover:text-[#1A1A1A]'}`}
          >
            75%
          </button>
        </div>
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-[#7F7F7F] opacity-30">
          <Info className="w-10 h-10 mb-3 stroke-[1px]" />
          <p className="text-sm font-bold uppercase tracking-widest text-[10px]">Insufficient Data</p>
          <p className="text-[10px] mt-1 opacity-50 text-center max-w-[200px]">Add ARV and Purchase Price to track compliance.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Portfolio Summary Summary */}
          <div className="flex gap-4 p-1 bg-[#F2F2F2]/30 rounded-2xl border border-[#A5A5A5]/5">
            <div className="flex-1 text-center py-5 rounded-xl bg-[#FFFFFF]/50 backdrop-blur-sm border border-[#A5A5A5]/10 shadow-sm">
              <p className="text-2xl font-normal text-[#1A1A1A] tracking-tighter font-mono">{withinCount}</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#595959] font-black mt-2">Within</p>
            </div>
            <div className="flex-1 text-center py-5 rounded-xl bg-[#FFFFFF]/50 backdrop-blur-sm border border-[#A5A5A5]/10 shadow-sm">
              <p className="text-2xl font-normal text-[#7F7F7F] tracking-tighter font-mono">{approachingCount}</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#7F7F7F] font-black mt-2">Warning</p>
            </div>
            <div className="flex-1 text-center py-5 rounded-xl bg-[#FFFFFF]/50 backdrop-blur-sm border border-[#A5A5A5]/10 shadow-sm">
              <p className="text-2xl font-normal text-[#1A1A1A] tracking-tighter font-mono">{exceededCount}</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#1A1A1A] font-black mt-2">Over</p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-[#F2F2F2]/50 hover:bg-[#F2F2F2] transition-all group/expand border border-[#A5A5A5]/5 shadow-sm"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7F7F7F] group-hover/expand:text-[#1A1A1A] transition-colors">
                {expanded ? 'Hide Deal Breakdown' : 'View Detailed Compliance'}
              </span>
              <div className={`p-1 rounded-full bg-[#FFFFFF]/80 transition-transform duration-500 ${expanded ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4 text-[#7F7F7F]" />
              </div>
            </button>

            {/* Per-Deal Breakdown */}
            {expanded && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                {deals.map(deal => {
                  const cfg = STATUS_CONFIG[deal.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={deal.id} className="group/item space-y-4 pb-8 border-b border-[#A5A5A5]/5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${cfg.bgBar} ${cfg.color} bg-opacity-20`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-[#1A1A1A] tracking-tight truncate max-w-[200px]">
                            {shortAddress(deal.address)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={`text-[8px] font-black tracking-[0.2em] px-2.5 py-1 rounded-full ${cfg.bgBar} ${cfg.color} bg-opacity-30`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-[#7F7F7F] font-mono font-bold">
                            {Math.round(deal.pct)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="relative h-2.5 rounded-full bg-[#F2F2F2] overflow-hidden shadow-inner border border-[#A5A5A5]/5">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full ${cfg.fillBar} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.1)]`}
                          style={{ width: `${Math.min(deal.pct, 100)}%` }}
                        />
                        <div className="absolute left-[70%] top-0 w-px h-full bg-[#FFFFFF]/60 z-10" />
                      </div>

                      <div className="flex justify-between text-[10px] text-[#7F7F7F] font-bold uppercase tracking-widest">
                        <div className="flex gap-4">
                          <span className="opacity-40">MAO: <span className="text-[#1A1A1A] font-mono opacity-100 ml-1">{formatCurrency(deal.mao)}</span></span>
                          <span className="opacity-40">ACTUAL: <span className="text-[#1A1A1A] font-mono opacity-100 ml-1">{formatCurrency(deal.actualCost)}</span></span>
                        </div>
                        <span className={`${deal.delta >= 0 ? 'text-[#595959]' : 'text-[#1A1A1A]'} font-mono text-[11px]`}>
                          {deal.delta >= 0 ? '+' : ''} {formatCurrency(deal.delta)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


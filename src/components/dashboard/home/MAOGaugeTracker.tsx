'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { Gauge, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   MAOGaugeTracker — The 70% Rule Compliance Tracker

   MAO = (ARV × 0.70) − Repair Costs
   Compares actual (purchasePrice + renovationCosts) vs MAO threshold.
   Shows portfolio-level aggregate + per-deal breakdown on expand.
   ═══════════════════════════════════════════════════════════════ */

interface DealMAO {
  id: string;
  address: string;
  arv: number;
  repairCosts: number;
  actualCost: number;
  mao: number;
  delta: number;       // positive = under threshold (good), negative = exceeded
  pct: number;         // % of MAO used (actualCost / mao * 100)
  status: 'within' | 'approaching' | 'exceeded';
}

function computeMAOMetrics(projects: Project[]): DealMAO[] {
  return projects
    .filter(d => d.status !== 'Sold' && d.financials?.arv && d.financials.arv > 0)
    .map(deal => {
      const arv = deal.financials?.arv || 0;
      const purchasePrice = deal.financials?.purchasePrice || 0;
      let repairCosts = 0;
      deal.financials?.rehabTasks?.forEach(task => {
        repairCosts += task.estimatedCost || 0;
      });
      deal.financials?.costs?.forEach(c => {
        if (c.approved) repairCosts += c.amount;
      });

      const mao = (arv * 0.70) - repairCosts;
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
}

function shortAddress(addr: string): string {
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
  within:      { bgBar: 'bg-pw-muted/20', fillBar: 'bg-pw-muted',  icon: CheckCircle2,  color: 'text-pw-muted' },
  approaching: { bgBar: 'bg-amber-100',   fillBar: 'bg-amber-400', icon: AlertCircle,    color: 'text-amber-500' },
  exceeded:    { bgBar: 'bg-red-100',      fillBar: 'bg-red-400',   icon: AlertTriangle,  color: 'text-red-500' },
};

interface MAOGaugeTrackerProps {
  projects: Project[];
}

export default function MAOGaugeTracker({ projects }: MAOGaugeTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const deals = useMemo(() => computeMAOMetrics(projects), [projects]);

  const withinCount = deals.filter(d => d.status === 'within').length;
  const approachingCount = deals.filter(d => d.status === 'approaching').length;
  const exceededCount = deals.filter(d => d.status === 'exceeded').length;

  return (
    <div className="ag-card bg-pw-surface border border-pw-border/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center">
            <Gauge className="w-5 h-5 text-pw-muted" />
          </div>
          <div>
            <p className="ag-label opacity-60">70% Rule</p>
            <h3 className="text-2xl font-light text-pw-black tracking-tighter">MAO Tracker</h3>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-8 h-8 rounded-full bg-pw-bg flex items-center justify-center text-pw-muted hover:bg-pw-black hover:text-pw-white transition-all"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Portfolio Summary */}
      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-pw-muted opacity-30">
          <Gauge className="w-10 h-10 mb-3 stroke-1" />
          <p className="text-sm font-medium">No active deals with ARV data</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-pw-bg/50 rounded-2xl px-4 py-3 border border-pw-border/10 text-center">
              <p className="text-2xl font-light text-pw-black tracking-tighter">{withinCount}</p>
              <p className="text-[9px] uppercase tracking-widest text-pw-muted opacity-50 font-bold mt-0.5">Within</p>
            </div>
            <div className="flex-1 bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100 text-center">
              <p className="text-2xl font-light text-amber-600 tracking-tighter">{approachingCount}</p>
              <p className="text-[9px] uppercase tracking-widest text-amber-400 font-bold mt-0.5">Warning</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-2xl px-4 py-3 border border-red-100 text-center">
              <p className="text-2xl font-light text-red-600 tracking-tighter">{exceededCount}</p>
              <p className="text-[9px] uppercase tracking-widest text-red-400 font-bold mt-0.5">Over</p>
            </div>
          </div>

          {/* Per-Deal Breakdown */}
          {expanded && (
            <div className="space-y-4 pt-4 border-t border-pw-border/10">
              {deals.map(deal => {
                const cfg = STATUS_CONFIG[deal.status];
                const Icon = cfg.icon;
                return (
                  <div key={deal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className="text-sm font-medium text-pw-black tracking-tight truncate max-w-[200px]">
                          {shortAddress(deal.address)}
                        </span>
                      </div>
                      <span className="text-[10px] text-pw-muted opacity-50 font-medium">
                        {formatCurrency(deal.actualCost)} / {formatCurrency(deal.mao)} MAO
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className={`h-2 rounded-full ${cfg.bgBar} overflow-hidden`}>
                      <div
                        className={`h-full rounded-full ${cfg.fillBar} transition-all duration-700`}
                        style={{ width: `${Math.min(deal.pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-pw-muted opacity-40">
                      <span>ARV: {formatCurrency(deal.arv)}</span>
                      <span>Repairs: {formatCurrency(deal.repairCosts)}</span>
                      <span className={deal.delta >= 0 ? '' : 'text-red-400 opacity-100'}>
                        Delta: {formatCurrency(deal.delta)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

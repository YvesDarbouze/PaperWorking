'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { Wallet, ArrowRight, TrendingUp } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   HoldingCostTicker — Financial Drain Sentinel
   
   Tracks the non-productive capital leakage per active deal.
   Includes taxes, insurance, utilities, and debt service.
   Aesthetics: Structured list items, high-contrast values, 
   and clean status indicators.
   ═══════════════════════════════════════════════════════════════ */

interface DealHoldingCost {
  id: string;
  address: string;
  monthlyTotal: number;
  dailyRate: number;
  daysHeld: number;
  projectedRemainingCost: number;
  breakdown: { label: string; amount: number }[];
}

function shortAddress(addr: string): string {
  if (!addr) return 'Unnamed Property';
  const comma = addr.indexOf(',');
  return comma > 0 ? addr.slice(0, comma) : addr;
}

function computeHoldingCosts(projects: Project[], maxDOM: number): DealHoldingCost[] {
  const now = new Date();

  return projects
    .filter(d => d.status !== 'Sold' && d.status !== 'Lead')
    .map(deal => {
      const baseDate = deal.financials?.listingDate
        ? new Date(deal.financials.listingDate)
        : new Date(deal.createdAt);
      const daysHeld = Math.max(1, Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));

      let monthlyTotal = 0;
      const breakdown: { label: string; amount: number }[] = [];

      if (deal.holdingCosts && Array.isArray(deal.holdingCosts)) {
        deal.holdingCosts.forEach(hc => {
          const amt = hc.monthlyAmount || 0;
          monthlyTotal += amt;
          breakdown.push({ label: hc.type || 'Other', amount: amt });
        });
      }

      // Fallback: estimate from deal costs if no explicit holding costs
      if (monthlyTotal === 0 && deal.financials?.costs) {
        deal.financials.costs
          .filter(c => c.approved)
          .forEach(c => {
            const monthly = c.amount / Math.max(1, 6); // rough monthly estimate
            monthlyTotal += monthly;
            breakdown.push({ label: c.description || c.category || 'Holding', amount: monthly });
          });
      }

      const dailyRate = monthlyTotal / 30;
      const daysRemaining = Math.max(0, maxDOM - daysHeld);
      const projectedRemainingCost = dailyRate * daysRemaining;

      return {
        id: deal.id,
        address: shortAddress(deal.address || deal.propertyName),
        monthlyTotal,
        dailyRate,
        daysHeld,
        projectedRemainingCost,
        breakdown,
      };
    })
    .filter(d => d.monthlyTotal > 0)
    .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
}

function formatCurrency(val: number): string {
  if (val < 1) return '—';
  return `$${Math.round(val).toLocaleString()}`;
}

interface HoldingCostTickerProps {
  projects: Project[];
  maxDOM?: number;
}

export default function HoldingCostTicker({ projects, maxDOM = 160 }: HoldingCostTickerProps) {
  const deals = useMemo(() => computeHoldingCosts(projects, maxDOM), [projects, maxDOM]);

  return (
    <div className="space-y-6">
      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-secondary opacity-30">
          <Wallet className="w-8 h-8 mb-2 stroke-[1px]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-center">No Holding Costs Tracked</p>
        </div>
      ) : (
        deals.map(deal => (
          <div key={deal.id} className="group/item p-4 rounded-xl bg-bg-surface border border-border-accent/10 shadow-sm hover:border-pw-black/20 transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-text-primary tracking-tight truncate max-w-[150px]">
                {deal.address}
              </span>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-text-primary tracking-tight font-mono">
                  {formatCurrency(deal.monthlyTotal)}
                </span>
                <span className="text-[9px] uppercase tracking-[0.1em] text-text-secondary opacity-40 font-black">
                  Monthly Burn
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-y border-border-accent/5">
              <div className="flex-1">
                <p className="text-[9px] uppercase tracking-widest text-text-secondary opacity-40 mb-0.5">Daily Rate</p>
                <p className="text-xs font-mono text-text-primary font-bold">{formatCurrency(deal.dailyRate)}</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[9px] uppercase tracking-widest text-text-secondary opacity-40 mb-0.5">Days Held</p>
                <p className="text-xs font-mono text-text-primary font-bold">{deal.daysHeld}d</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-red-500/60" />
                <span className="text-[10px] text-text-secondary opacity-60">Est. Remaining Exposure</span>
              </div>
              <span className="text-xs font-bold text-red-600 font-mono">
                {formatCurrency(deal.projectedRemainingCost)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { Wallet, ArrowRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   HoldingCostTicker — Per-Deal Monthly Holding Costs

   Aggregates holding costs (taxes, insurance, utilities, interest)
   and shows cost per day + projected remaining cost.
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

      // Aggregate holding costs from deal.holdingCosts[] or financials
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
    <div className="space-y-3">
      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-pw-muted opacity-30">
          <Wallet className="w-8 h-8 mb-2 stroke-1" />
          <p className="text-xs font-medium">No holding costs tracked</p>
        </div>
      ) : (
        deals.map(deal => (
          <div key={deal.id} className="px-4 py-3 rounded-2xl bg-pw-bg/40 border border-pw-border/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-pw-black tracking-tight truncate max-w-[150px]">
                {deal.address}
              </span>
              <span className="text-base font-light text-pw-black tracking-tight">
                {formatCurrency(deal.monthlyTotal)}
                <span className="text-[9px] ml-1 opacity-40">/mo</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-pw-muted opacity-50">
              <span>{formatCurrency(deal.dailyRate)}/day</span>
              <ArrowRight className="w-2.5 h-2.5" />
              <span>~{formatCurrency(deal.projectedRemainingCost)} remaining</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

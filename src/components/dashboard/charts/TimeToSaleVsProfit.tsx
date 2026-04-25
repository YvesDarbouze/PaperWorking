'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from 'recharts';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Chart 3 — Time-to-Sale vs. Profit (Scatter Plot)

   X-Axis: Days on Market (DOM)
   Y-Axis: Final Net Profit ($)
   Objective: Visualize the correlation between holding time
              and profit decay — does longer hold = less profit?
   ═══════════════════════════════════════════════════════════════ */

interface ScatterPoint {
  dom: number;
  profit: number;
  name: string;
  salePrice: number;
}

function buildScatterData(projects: Project[]): ScatterPoint[] {
  return projects
    .filter((d: Project) => d.status === 'Sold' && d.financials?.soldDate)
    .map((deal: Project) => {
      const fin = deal.financials;
      const pp = fin.purchasePrice || 0;
      const grossSalePrice = fin.actualSalePrice || fin.estimatedARV || 0;

      // Renovation costs
      let renovationCosts = 0;
      fin.costs?.forEach((c) => { if (c.approved) renovationCosts += c.amount; });
      fin.inspections?.forEach((i) => { renovationCosts += i.actualCost; });
      deal.rehabExpenses?.forEach((e) => { renovationCosts += e.amount; });

      // Sourcing & Closing
      let sourcingClosingCosts = 0;
      if (fin.loanAmount && fin.loanOriginationPoints) {
        sourcingClosingCosts += fin.loanAmount * (fin.loanOriginationPoints / 100);
      }
      if (deal.costBasisLedger) {
        [
          ...(deal.costBasisLedger.directAcquisition || []),
          ...(deal.costBasisLedger.financing || []),
          ...(deal.costBasisLedger.preClosing || []),
        ].forEach((item) => { sourcingClosingCosts += item.amount; });
      }

      // Holding costs
      let holdingCosts = 0;
      deal.holdingCosts?.forEach((hc) => {
        holdingCosts += hc.monthlyAmount * hc.monthsPaid;
      });

      // Sell-side
      let sellClosing = fin.finalClosingCosts || 0;
      sellClosing += grossSalePrice * ((fin.buyersAgentCommission || 0) / 100);
      sellClosing += grossSalePrice * ((fin.sellersAgentCommission || 0) / 100);
      deal.exitCosts?.forEach((ec) => {
        sellClosing += ec.isPercentage && ec.percentageRate
          ? grossSalePrice * (ec.percentageRate / 100)
          : ec.amount;
      });

      const totalCosts = pp + renovationCosts + sourcingClosingCosts + holdingCosts + sellClosing;
      const netProfit = grossSalePrice - totalCosts;

      // DOM
      const created = new Date(deal.createdAt);
      const sold = new Date(fin.soldDate!);
      const holdDays = Math.max(1, Math.round((sold.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
      const rehabDays = fin.estimatedTimelineDays || Math.round(holdDays * 0.7);
      const dom = Math.max(1, holdDays - rehabDays);

      return {
        dom,
        profit: Math.round(netProfit),
        name: deal.propertyName.split(' ').slice(0, 2).join(' '),
        salePrice: grossSalePrice,
      };
    });
}

/* ─── Custom Tooltip ─── */
function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: ScatterPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-text-primary font-medium mb-1.5">{d.name}</p>
      <div className="space-y-0.5">
        <p className="flex justify-between gap-4">
          <span className="text-text-secondary">Days on Market:</span>
          <span className="font-mono font-medium text-text-primary">{d.dom}d</span>
        </p>
        <p className="flex justify-between gap-4">
          <span className="text-text-secondary">Net Profit:</span>
          <span className={`font-mono font-semibold ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {d.profit >= 0 ? '+' : '-'}${Math.abs(d.profit).toLocaleString()}
          </span>
        </p>
        <p className="flex justify-between gap-4">
          <span className="text-text-secondary">Sale Price:</span>
          <span className="font-mono text-text-primary">${d.salePrice.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}

/* ─── Custom Dot ─── */
function CustomDot(props: { cx?: number; cy?: number; payload?: ScatterPoint }) {
  const { cx = 0, cy = 0, payload } = props;
  const isPositive = (payload?.profit || 0) >= 0;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={isPositive ? '#111827' : '#ef4444'}
      stroke="#fff"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.15))' }}
    />
  );
}

interface TimeToSaleVsProfitProps {
  projects: Project[];
}

export default function TimeToSaleVsProfit({ projects }: TimeToSaleVsProfitProps) {
  const data = useMemo(() => buildScatterData(projects), [projects]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-xs">
        No completed sales to plot.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            type="number"
            dataKey="dom"
            name="Days on Market"
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Days on Market', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#9ca3af' }}
          />
          <YAxis
            type="number"
            dataKey="profit"
            name="Net Profit"
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
              return `$${v}`;
            }}
          />
          <ZAxis range={[80, 80]} />
          <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#d1d5db' }} />
          <Scatter data={data} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

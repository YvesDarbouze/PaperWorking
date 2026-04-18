'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Chart 2 — Profitability by Project (Bar Chart)

   X-Axis: Project Name / Address
   Y-Axis: Net Profit ($)
   Data:   Bar graph comparing final profit of every flip
           completed within the selected calendar year.
   ═══════════════════════════════════════════════════════════════ */

interface ProfitBarData {
  name: string;
  profit: number;
  projectId: string;
}

function computeProfitByProject(projects: Project[], year?: number): ProfitBarData[] {
  const soldDeals = projects.filter((d: Project) => {
    if (d.status !== 'Sold' || !d.financials?.soldDate) return false;
    if (year) {
      const soldYear = new Date(d.financials.soldDate).getFullYear();
      return soldYear === year;
    }
    return true;
  });

  return soldDeals.map((deal: Project) => {
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

    // Shorter display name
    const nameParts = deal.propertyName.split(' ');
    const shortName = nameParts.length > 3
      ? nameParts.slice(0, 2).join(' ')
      : deal.propertyName;

    return {
      name: shortName,
      profit: Math.round(netProfit),
      projectId: deal.id,
    };
  }).sort((a: ProfitBarData, b: ProfitBarData) => b.profit - a.profit);
}

/* ─── Custom Tooltip ─── */
function ProfitTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: ProfitBarData }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-gray-900 font-medium mb-1">{d.payload.name}</p>
      <p className="flex items-center gap-2">
        <span className="text-gray-500">Net Profit:</span>
        <span className={`font-mono font-semibold ${d.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {d.value >= 0 ? '+' : '-'}${Math.abs(d.value).toLocaleString()}
        </span>
      </p>
    </div>
  );
}

interface ProfitabilityByProjectProps {
  projects: Project[];
  year?: number;
}

export default function ProfitabilityByProject({ projects, year }: ProfitabilityByProjectProps) {
  const data = useMemo(() => computeProfitByProject(projects, year), [projects, year]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-xs">
        No completed flips {year ? `in ${year}` : ''} to chart.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
              return `$${v}`;
            }}
          />
          <Tooltip content={<ProfitTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
          <Bar dataKey="profit" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry: ProfitBarData, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.profit >= 0 ? '#111827' : '#ef4444'}
                opacity={entry.profit >= 0 ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

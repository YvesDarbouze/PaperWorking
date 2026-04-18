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
  Legend,
} from 'recharts';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Chart 4 — Monthly Burn Rate (Stacked Bar Chart)

   X-Axis: Months of the year
   Y-Axis: Dollar amount
   Data:   Stacked bars showing:
           Bottom → Fixed Business Expenses (holding costs,
                    management fees, loan interest)
           Top    → Net Profit generated that month (from
                    projects sold in that month)
   ═══════════════════════════════════════════════════════════════ */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyBurnData {
  month: string;
  fixedExpenses: number;
  netProfit: number;
}

function buildMonthlyBurn(projects: Project[], year: number): MonthlyBurnData[] {
  const monthlyData: MonthlyBurnData[] = MONTH_LABELS.map((m: string) => ({
    month: m,
    fixedExpenses: 0,
    netProfit: 0,
  }));

  projects.forEach((deal: Project) => {
    const fin = deal.financials;

    // === Fixed Expenses (burn) distributed across months deal was active ===
    // Determine active months for this deal
    const created = new Date(deal.createdAt);
    const ended = deal.financials?.soldDate
      ? new Date(deal.financials.soldDate)
      : new Date(); // Still active

    // Monthly holding costs
    const monthlyHolding = (deal.holdingCosts || []).reduce(
      (sum: number, hc) => sum + (hc.monthlyAmount || 0), 0
    );

    // Additional monthly fixed costs
    let monthlyFixed = monthlyHolding;
    if (fin?.propertyManagementFee) monthlyFixed += fin.propertyManagementFee;
    if (fin?.maintenanceReserves) monthlyFixed += fin.maintenanceReserves;
    if (fin?.longTermMortgagePayment) monthlyFixed += fin.longTermMortgagePayment;

    // Loan interest per month: (loanAmount * interestRate%) / 12
    if (fin?.loanAmount && fin?.loanInterestRate) {
      monthlyFixed += (fin.loanAmount * (fin.loanInterestRate / 100)) / 12;
    }

    // Distribute fixed costs to each month the deal was active in the selected year
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m + 1, 0); // Last day of month

      // Was the deal active during this month?
      if (created <= monthEnd && ended >= monthStart) {
        monthlyData[m].fixedExpenses += Math.round(monthlyFixed);
      }
    }

    // === Net Profit (credited to the month of sale) ===
    if (deal.status === 'Sold' && fin?.soldDate) {
      const soldDate = new Date(fin.soldDate);
      if (soldDate.getFullYear() === year) {
        const soldMonth = soldDate.getMonth();
        const pp = fin.purchasePrice || 0;
        const grossSalePrice = fin.actualSalePrice || fin.estimatedARV || 0;

        let renovationCosts = 0;
        fin.costs?.forEach((c) => { if (c.approved) renovationCosts += c.amount; });
        fin.inspections?.forEach((i) => { renovationCosts += i.actualCost; });
        deal.rehabExpenses?.forEach((e) => { renovationCosts += e.amount; });

        let sourcingClosing = 0;
        if (fin.loanAmount && fin.loanOriginationPoints) {
          sourcingClosing += fin.loanAmount * (fin.loanOriginationPoints / 100);
        }
        if (deal.costBasisLedger) {
          [
            ...(deal.costBasisLedger.directAcquisition || []),
            ...(deal.costBasisLedger.financing || []),
            ...(deal.costBasisLedger.preClosing || []),
          ].forEach((item) => { sourcingClosing += item.amount; });
        }

        let holdingCosts = 0;
        deal.holdingCosts?.forEach((hc) => {
          holdingCosts += hc.monthlyAmount * hc.monthsPaid;
        });

        let sellClosing = fin.finalClosingCosts || 0;
        sellClosing += grossSalePrice * ((fin.buyersAgentCommission || 0) / 100);
        sellClosing += grossSalePrice * ((fin.sellersAgentCommission || 0) / 100);
        deal.exitCosts?.forEach((ec) => {
          sellClosing += ec.isPercentage && ec.percentageRate
            ? grossSalePrice * (ec.percentageRate / 100)
            : ec.amount;
        });

        const totalCosts = pp + renovationCosts + sourcingClosing + holdingCosts + sellClosing;
        monthlyData[soldMonth].netProfit += Math.round(grossSalePrice - totalCosts);
      }
    }
  });

  return monthlyData;
}

/* ─── Custom Tooltip ─── */
function BurnTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-gray-500 font-medium mb-1.5">{label}</p>
      {payload.map((entry, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">
            {entry.dataKey === 'fixedExpenses' ? 'Fixed Expenses' : 'Net Profit'}:
          </span>
          <span className={`font-mono font-medium ${
            entry.dataKey === 'netProfit' && entry.value >= 0
              ? 'text-emerald-600'
              : entry.dataKey === 'netProfit' && entry.value < 0
                ? 'text-red-600'
                : 'text-gray-900'
          }`}>
            ${Math.abs(entry.value).toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

interface MonthlyBurnRateProps {
  projects: Project[];
  year?: number;
}

export default function MonthlyBurnRate({ projects, year }: MonthlyBurnRateProps) {
  const currentYear = year || new Date().getFullYear();
  const data = useMemo(() => buildMonthlyBurn(projects, currentYear), [projects, currentYear]);

  const hasData = data.some((d: MonthlyBurnData) => d.fixedExpenses > 0 || d.netProfit !== 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-xs">
        No expense or profit data for {currentYear}.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="month"
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
          <Tooltip content={<BurnTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 10, fontFamily: 'Inter', paddingTop: 8 }}
          />
          <Bar
            dataKey="fixedExpenses"
            stackId="stack"
            fill="#e5e7eb"
            name="Fixed Expenses"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="netProfit"
            stackId="stack"
            fill="#111827"
            name="Net Profit"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

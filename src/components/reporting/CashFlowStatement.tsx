'use client';

import React, { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, TrendingDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Cash Flow Statement — Monthly Money In / Money Out
   ─────────────────────────────────────────────────────
   Tracks liquidity to ensure the user doesn't run out
   of cash mid-rehab. Red flags negative balance months.
   ═══════════════════════════════════════════════════════ */

interface MonthBucket {
  key: string;           // "2026-01"
  label: string;         // "Jan 2026"
  inflows: number;       // Money coming in
  outflows: number;      // Money going out
  netCashFlow: number;   // inflows - outflows
  cumulativeBalance: number;
  inflowDetails: { label: string; amount: number }[];
  outflowDetails: { label: string; amount: number }[];
}

function formatCurrency(val: number): string {
  const neg = val < 0;
  return `${neg ? '-' : ''}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getMonthKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export default function CashFlowStatement() {
  const projects = useProjectStore(s => s.projects);

  const monthlyData = useMemo(() => {
    const buckets: Record<string, { inflows: number; outflows: number; inflowDetails: { label: string; amount: number }[]; outflowDetails: { label: string; amount: number }[] }> = {};

    const ensureBucket = (key: string) => {
      if (!buckets[key]) buckets[key] = { inflows: 0, outflows: 0, inflowDetails: [], outflowDetails: [] };
    };

    projects.forEach(deal => {
      const fin = deal.financials;
      if (!fin) return;
      const propName = deal.propertyName;

      // Outflow — Purchase Price (at deal creation)
      if (deal.createdAt) {
        const key = getMonthKey(deal.createdAt);
        ensureBucket(key);
        const pp = fin.purchasePrice || 0;
        if (pp > 0) {
          buckets[key].outflows += pp;
          buckets[key].outflowDetails.push({ label: `Purchase: ${propName}`, amount: pp });
        }
      }

      // Outflow — Approved Cost Entries (rehab)
      fin.costs?.forEach(cost => {
        if (!cost.approved || !cost.createdAt) return;
        const key = getMonthKey(cost.createdAt);
        ensureBucket(key);
        buckets[key].outflows += cost.amount;
        buckets[key].outflowDetails.push({ label: `${cost.category || 'Rehab'}: ${cost.description}`, amount: cost.amount });
      });

      // Outflow — Rehab Expenses
      deal.rehabExpenses?.forEach(exp => {
        if (!exp.paid || !exp.createdAt) return;
        const key = getMonthKey(exp.createdAt);
        ensureBucket(key);
        buckets[key].outflows += exp.amount;
        buckets[key].outflowDetails.push({ label: `${exp.category}: ${exp.description}`, amount: exp.amount });
      });

      // Outflow — Holding Costs (spread over months)
      deal.holdingCosts?.forEach(hc => {
        // Distribute across months from deal start
        const startDate = new Date(deal.createdAt || new Date());
        for (let m = 0; m < hc.monthsPaid; m++) {
          const mDate = new Date(startDate);
          mDate.setMonth(mDate.getMonth() + m);
          const key = getMonthKey(mDate);
          ensureBucket(key);
          buckets[key].outflows += hc.monthlyAmount;
          buckets[key].outflowDetails.push({ label: `${hc.type}: ${propName}`, amount: hc.monthlyAmount });
        }
      });

      // Inflow — Sale Proceeds
      if (deal.status === 'Sold' && fin.actualSalePrice && fin.soldDate) {
        const key = getMonthKey(fin.soldDate);
        ensureBucket(key);
        buckets[key].inflows += fin.actualSalePrice;
        buckets[key].inflowDetails.push({ label: `Sale: ${propName}`, amount: fin.actualSalePrice });
      }

      // Inflow — Investor Pledges (confirmed)
      deal.pledges?.forEach(pledge => {
        if (pledge.status !== 'confirmed' || !pledge.pledgedAt) return;
        const key = getMonthKey(pledge.pledgedAt);
        ensureBucket(key);
        buckets[key].inflows += pledge.pledgeAmount;
        buckets[key].inflowDetails.push({ label: `Pledge: ${pledge.investorName}`, amount: pledge.pledgeAmount });
      });
    });

    // Sort by month key and compute cumulative
    const sortedKeys = Object.keys(buckets).sort();
    let cumulative = 0;
    const result: MonthBucket[] = sortedKeys.map(key => {
      const b = buckets[key];
      const net = b.inflows - b.outflows;
      cumulative += net;
      return {
        key,
        label: getMonthLabel(key),
        inflows: b.inflows,
        outflows: b.outflows,
        netCashFlow: net,
        cumulativeBalance: cumulative,
        inflowDetails: b.inflowDetails,
        outflowDetails: b.outflowDetails,
      };
    });

    return result;
  }, [projects]);

  const totalInflows = monthlyData.reduce((s, m) => s + m.inflows, 0);
  const totalOutflows = monthlyData.reduce((s, m) => s + m.outflows, 0);
  const negativeMonths = monthlyData.filter(m => m.cumulativeBalance < 0);

  // Expanded month detail state
  const [expandedMonth, setExpandedMonth] = React.useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-2">
        <h4 className="text-sm font-bold tracking-widest uppercase text-gray-900">
          Cash Flow Statement
        </h4>
        <p className="text-xs text-gray-400 mt-0.5">
          Portfolio — Monthly Liquidity Tracker · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Cash Crunch Warning */}
      {negativeMonths.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Liquidity Warning</p>
            <p className="text-xs text-red-600 mt-0.5">
              {negativeMonths.length} month{negativeMonths.length > 1 ? 's' : ''} show negative cumulative balance.
              Cash reserves may be insufficient during active rehab periods.
            </p>
          </div>
        </div>
      )}

      {/* Summary Tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-emerald-50 rounded-lg text-center border border-emerald-100">
          <ArrowDownCircle className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
          <p className="text-xs uppercase tracking-widest text-emerald-600">Total Inflows</p>
          <p className="text-lg font-light text-emerald-800">{formatCurrency(totalInflows)}</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg text-center border border-red-100">
          <ArrowUpCircle className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <p className="text-xs uppercase tracking-widest text-red-600">Total Outflows</p>
          <p className="text-lg font-light text-red-700">{formatCurrency(totalOutflows)}</p>
        </div>
        <div className={`p-3 rounded-lg text-center border ${totalInflows - totalOutflows >= 0 ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'}`}>
          <TrendingDown className="w-4 h-4 text-gray-500 mx-auto mb-1" />
          <p className="text-xs uppercase tracking-widest text-gray-500">Net Cash Flow</p>
          <p className={`text-lg font-light ${totalInflows - totalOutflows >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatCurrency(totalInflows - totalOutflows)}
          </p>
        </div>
      </div>

      {/* Monthly Table */}
      {monthlyData.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          No transaction data available. Add projects with financial entries to populate the cash flow.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm" id="cashflow-statement-table">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500">Month</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-emerald-600">Inflows</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-500">Outflows</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500">Net Cash</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyData.map(month => (
                <React.Fragment key={month.key}>
                  <tr
                    onClick={() => setExpandedMonth(expandedMonth === month.key ? null : month.key)}
                    className={`cursor-pointer transition-colors ${
                      month.cumulativeBalance < 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">{month.label}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                      {month.inflows > 0 ? formatCurrency(month.inflows) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-600">
                      {month.outflows > 0 ? `(${formatCurrency(month.outflows)})` : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono ${month.netCashFlow >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {formatCurrency(month.netCashFlow)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${month.cumulativeBalance >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
                      {formatCurrency(month.cumulativeBalance)}
                      {month.cumulativeBalance < 0 && (
                        <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />
                      )}
                    </td>
                  </tr>
                  {/* Expanded detail */}
                  {expandedMonth === month.key && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-semibold text-emerald-700 mb-1">Inflow Details</p>
                            {month.inflowDetails.length === 0 ? (
                              <p className="text-gray-400 italic">No inflows this month</p>
                            ) : (
                              month.inflowDetails.map((d, i) => (
                                <div key={i} className="flex justify-between py-0.5">
                                  <span className="text-gray-600">{d.label}</span>
                                  <span className="font-mono text-emerald-700">{formatCurrency(d.amount)}</span>
                                </div>
                              ))
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-red-600 mb-1">Outflow Details</p>
                            {month.outflowDetails.length === 0 ? (
                              <p className="text-gray-400 italic">No outflows this month</p>
                            ) : (
                              month.outflowDetails.map((d, i) => (
                                <div key={i} className="flex justify-between py-0.5">
                                  <span className="text-gray-600 truncate mr-2">{d.label}</span>
                                  <span className="font-mono text-red-600">{formatCurrency(d.amount)}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

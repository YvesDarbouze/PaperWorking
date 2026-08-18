import React from 'react';
import Link from 'next/link';

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <header className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Portfolio Reports & Tax Export</h1>
          <p className="text-sm text-slate-400">Generate executive performance reports and export IRS compliant documents</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['monthly', 'quarterly', 'yearly', 'overall'].map(type => (
          <div key={type} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">{type} Report</h3>
            <p className="text-xs text-slate-400">Includes Executive Summary, 10 Scorecard KPIs, 24 Insights, and Tax Summary.</p>
            <div className="flex gap-2 pt-2">
              <form action="/api/reports/generate" method="POST" target="_blank" className="flex-1">
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="format" value="pdf" />
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                >
                  Download PDF
                </button>
              </form>
              <form action="/api/reports/generate" method="POST" target="_blank" className="flex-1">
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="format" value="csv" />
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  Export CSV
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

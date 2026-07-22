'use client';

import React from 'react';
import { Download, ArrowDown, MoreHorizontal, Filter, Receipt, Verified } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Reports & Tax Intelligence
   Features:
     - NOI Waterfall Chart (CSS-based)
     - Implied Cap Rate Sparkline (SVG)
     - Cash Flow Analysis (Diverging bars)
     - Tax-Ready Export Table
   ═══════════════════════════════════════════════════════════════ */

export function ReportsTaxIntelligence() {
  return (
    <div className="flex-1 flex flex-col gap-6 max-w-[1600px] w-full text-[var(--text-primary)]">
      {/* ── Bento Grid Main Visualizations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* NOI Waterfall Chart (Spans 2 columns on lg) */}
        <div 
          className="rounded-xl p-6 lg:col-span-2 flex flex-col relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(34, 43, 50, 0.7) 0%, rgba(22, 19, 24, 0.4) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#454955]/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-6 z-10">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white">Net Operating Income (NOI) Waterfall</h3>
              <p className="text-sm text-[#9E9DA0] mt-1">Q3 2023 vs Q4 2023 Variance Analysis</p>
            </div>
            <button className="text-[#9E9DA0] hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 min-h-[300px] flex items-end justify-between gap-2 z-10 pt-8 pb-4 border-b border-white/5 relative">
            {/* Y Axis Labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[#6B6870]/80 text-[10px] pb-4 font-bold tracking-wider uppercase">
              <span>$1.5M</span>
              <span>$1.0M</span>
              <span>$0.5M</span>
              <span>$0</span>
            </div>
            <div className="w-8 ml-8"></div> {/* Spacer for axis */}
            
            {/* Waterfall Bars (CSS Simulation) */}
            <div className="w-full flex justify-between items-end h-full gap-1">
              <div className="flex flex-col items-center w-1/6 group">
                <div className="w-full bg-[#262328]/80 border border-white/10 rounded-t-sm h-[60%] relative group-hover:bg-slate-600 transition-colors">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-bold tabular-nums">$1.2M</div>
                </div>
                <span className="text-[10px] text-[#9E9DA0] mt-2 text-center font-bold tracking-wider uppercase leading-tight">Starting<br/>NOI</span>
              </div>
              <div className="flex flex-col items-center w-1/6 group self-start mt-[40%]">
                <div className="w-full bg-[#454955]/80 border border-[#6E7480]/50 rounded-sm h-[15%] relative shadow-[0_0_10px_rgba(69, 73, 85,0.2)]">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-[#6E7480] opacity-0 group-hover:opacity-100 transition-opacity font-bold tabular-nums">+$300k</div>
                </div>
                <span className="text-[10px] text-[#9E9DA0] mt-2 text-center font-bold tracking-wider uppercase leading-tight">Rental<br/>Income</span>
              </div>
              <div className="flex flex-col items-center w-1/6 group self-start mt-[25%]">
                <div className="w-full bg-red-400/80 border border-red-400/50 rounded-sm h-[5%] relative">
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold tabular-nums">-$100k</div>
                </div>
                <span className="text-[10px] text-[#9E9DA0] mt-2 text-center font-bold tracking-wider uppercase leading-tight">OpEx<br/>Increase</span>
              </div>
              <div className="flex flex-col items-center w-1/6 group self-start mt-[30%]">
                <div className="w-full bg-red-400/80 border border-red-400/50 rounded-sm h-[8%] relative">
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold tabular-nums">-$150k</div>
                </div>
                <span className="text-[10px] text-[#9E9DA0] mt-2 text-center font-bold tracking-wider uppercase leading-tight">Tax<br/>Adjustment</span>
              </div>
              <div className="flex flex-col items-center w-1/6 group">
                <div className="w-full bg-[#6E7480] border border-[#8a8e9a]/50 rounded-t-sm h-[62%] relative shadow-[0_0_15px_rgba(69, 73, 85,0.3)]">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-[#8a8e9a] opacity-0 group-hover:opacity-100 transition-opacity font-bold tabular-nums">$1.25M</div>
                </div>
                <span className="text-[10px] text-[#6E7480] mt-2 text-center font-bold tracking-wider uppercase leading-tight">Ending<br/>NOI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cap Rate Trend Line */}
        <div 
          className="rounded-xl p-6 flex flex-col relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(34, 43, 50, 0.7) 0%, rgba(22, 19, 24, 0.4) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="flex justify-between items-start mb-6 z-10">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white">Implied Cap Rate</h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-[#6E7480] tabular-nums">5.24%</span>
                <span className="text-sm font-bold text-[#454955] flex items-center">
                  <ArrowDown className="w-3 h-3 mr-1" /> 12bps
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[200px] relative z-10 flex items-end">
            {/* SVG Sparkline Simulation */}
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 50">
              <defs>
                <linearGradient id="capRateGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(69, 73, 85, 0.3)"></stop>
                  <stop offset="100%" stopColor="rgba(69, 73, 85, 0)"></stop>
                </linearGradient>
              </defs>
              <path d="M0,50 L0,30 C10,25 20,35 30,20 C40,5 50,15 60,10 C70,5 80,25 90,15 C95,10 100,5 100,5 L100,50 Z" fill="url(#capRateGradient)"></path>
              <path d="M0,30 C10,25 20,35 30,20 C40,5 50,15 60,10 C70,5 80,25 90,15 C95,10 100,5 100,5" fill="none" stroke="#454955" strokeLinecap="round" strokeWidth="1.5"></path>
              {/* Data Point */}
              <circle cx="100" cy="5" fill="#0d0a0b" r="2" stroke="#00DD94" strokeWidth="1.5"></circle>
            </svg>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-[#6B6870] font-bold uppercase tracking-wider">
            <span>Jan</span>
            <span>Apr</span>
            <span>Jul</span>
            <span>Oct</span>
          </div>
        </div>
      </div>

      {/* ── Diverging Cash Flow & Tax Export Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Diverging Cash Flow */}
        <div 
          className="rounded-xl p-6 lg:col-span-5 flex flex-col"
          style={{ 
            background: 'linear-gradient(135deg, rgba(34, 43, 50, 0.7) 0%, rgba(22, 19, 24, 0.4) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white">Cash Flow Analysis</h3>
              <p className="text-sm text-[#9E9DA0] mt-1">Inflows vs Outflows (TTM)</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-6 py-4">
            {/* Bar 1: Operations */}
            <div className="flex items-center gap-3 w-full">
              <span className="w-20 text-xs font-bold uppercase tracking-wider text-[#9E9DA0] text-right">Operations</span>
              <div className="flex-1 flex h-4 rounded-full overflow-hidden bg-[#1e1b20] border border-white/5">
                <div className="w-1/2 flex justify-end">
                  <div className="h-full bg-red-400/60 w-[30%]"></div>
                </div>
                <div className="w-1/2 flex justify-start border-l border-white/10">
                  <div className="h-full bg-[#454955]/80 w-[80%]"></div>
                </div>
              </div>
            </div>
            {/* Bar 2: Financing */}
            <div className="flex items-center gap-3 w-full">
              <span className="w-20 text-xs font-bold uppercase tracking-wider text-[#9E9DA0] text-right">Financing</span>
              <div className="flex-1 flex h-4 rounded-full overflow-hidden bg-[#1e1b20] border border-white/5">
                <div className="w-1/2 flex justify-end">
                  <div className="h-full bg-red-400/60 w-[70%]"></div>
                </div>
                <div className="w-1/2 flex justify-start border-l border-white/10">
                  <div className="h-full bg-[#454955]/80 w-[20%]"></div>
                </div>
              </div>
            </div>
            {/* Bar 3: CapEx */}
            <div className="flex items-center gap-3 w-full">
              <span className="w-20 text-xs font-bold uppercase tracking-wider text-[#9E9DA0] text-right">CapEx</span>
              <div className="flex-1 flex h-4 rounded-full overflow-hidden bg-[#1e1b20] border border-white/5">
                <div className="w-1/2 flex justify-end">
                  <div className="h-full bg-red-400/60 w-[90%]"></div>
                </div>
                <div className="w-1/2 flex justify-start border-l border-white/10">
                  <div className="h-full bg-[#454955]/80 w-[0%]"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400/60"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Outflows</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#454955]/80"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Inflows</span>
            </div>
          </div>
        </div>

        {/* Tax-Ready Export Table */}
        <div 
          className="rounded-xl p-0 lg:col-span-7 flex flex-col overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgba(34, 43, 50, 0.7) 0%, rgba(22, 19, 24, 0.4) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#454955]/10 text-[#6E7480] border border-[#454955]/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white">Tax-Ready Export</h3>
                <p className="text-xs text-[#9E9DA0] mt-1 flex items-center gap-1">
                  <Verified className="w-3 h-3 text-[#6E7480]" /> Data pre-organized for CPA processing
                </p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg font-bold text-sm bg-[#454955] text-[#FDFFFC] flex items-center gap-2 hover:bg-[#6E7480] transition-colors shadow-[0_0_20px_-5px_rgba(69, 73, 85,0.5)]">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1e1b20]/30 text-[#9E9DA0] text-[11px] font-bold uppercase tracking-widest border-b border-white/10">
                  <th className="px-6 py-4">Schedule Category</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4 text-right">Amount (YTD)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                <tr className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-white font-medium">Sch. E - Depreciation</td>
                  <td className="px-6 py-4 text-[#9E9DA0]">Alpha Fund II, LLC</td>
                  <td className="px-6 py-4 text-white text-right font-mono text-xs tabular-nums">$452,100.00</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#454955]/10 text-[#6E7480] border border-[#454955]/20">Reconciled</span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-white font-medium">Sch. K-1 - Ordinary Income</td>
                  <td className="px-6 py-4 text-[#9E9DA0]">Beta Properties LP</td>
                  <td className="px-6 py-4 text-white text-right font-mono text-xs tabular-nums">$1,204,550.00</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#454955]/10 text-[#6E7480] border border-[#454955]/20">Reconciled</span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-white font-medium">1099-INT - Interest Inc.</td>
                  <td className="px-6 py-4 text-[#9E9DA0]">Alpha Fund II, LLC</td>
                  <td className="px-6 py-4 text-white text-right font-mono text-xs tabular-nums">$34,220.00</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1e1b20] text-[#9E9DA0] border border-white/10">Pending Doc</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}

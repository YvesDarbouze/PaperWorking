'use client';

import React from 'react';
import { 
  Download, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  PlusCircle, 
  Clock,
  Activity,
  HardHat,
  MoreVertical,
  Check,
  Verified
} from 'lucide-react';

export default function RehabOperationsTracker() {
  return (
    <div className="bg-surface-container-lowest text-on-surface font-sans overflow-x-hidden selection:bg-primary/30 selection:text-primary min-h-screen">
      <main className="pt-8 pb-32 px-5 lg:px-8 max-w-[1600px] mx-auto">
        {/* Title & Status */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">Active Rehab</span>
              <span className="text-on-surface-variant text-sm font-mono">ID: PW-8842-OPS</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-on-surface tracking-tight">Rehab & Operations Tracker</h1>
            <p className="text-on-surface-variant font-sans text-sm md:text-base mt-1">1248 Oakwood Avenue Development – Phase 2</p>
          </div>
          <div className="flex gap-3">
            <button className="glass-card px-4 py-2 rounded-lg text-sm font-semibold text-on-surface hover:bg-white/10 transition-colors flex items-center gap-2 border border-white/10">
              <Download className="w-4 h-4" /> Export Ledger
            </button>
            <button className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 active:scale-95 transition-all luminous-glow flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> New Entry
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {/* KPI 1 */}
          <div className="glass-card p-5 rounded-xl border-l-4 border-l-primary flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Total Approved</span>
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-mono text-2xl text-on-surface font-bold">$1,450,000.00</div>
              <div className="text-[10px] text-primary mt-1 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +5.2% FROM EST.
              </div>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Deployed Capital</span>
              <Wallet className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <div className="font-mono text-2xl text-on-surface font-bold">$842,500.24</div>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-primary h-full w-[58%]" style={{ boxShadow: '0 0 10px rgba(87, 241, 219, 0.4)' }}></div>
              </div>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="glass-card p-5 rounded-xl border-l-4 border-l-error flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Remaining Contingency</span>
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <div>
              <div className="font-mono text-2xl text-error font-bold">$42,350.00</div>
              <div className="text-[10px] text-error mt-1 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 12% OF TOTAL REMAINING
              </div>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Burn Rate (Weekly)</span>
              <Activity className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <div className="font-mono text-2xl text-on-surface font-bold">$28,400.00</div>
              <div className="text-[10px] text-on-surface-variant mt-1 font-semibold">ON TRACK FOR Q3 COMPLETION</div>
            </div>
          </div>
        </div>

        {/* Main Layout: Table + Sidebar */}
        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-8 items-start">
          
          {/* Wide Data Table */}
          <div className="xl:col-span-9 glass-card rounded-2xl overflow-hidden w-full border border-white/5">
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-display font-bold text-on-surface">Budget Breakdown</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-on-surface-variant cursor-pointer hover:bg-white/10 transition-colors">Materials Only</span>
                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-on-surface-variant cursor-pointer hover:bg-white/10 transition-colors">Labor Only</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Resource</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Estimated</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Actual</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Variance</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-sm">
                  <tr className="hover:bg-white/[0.05] transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-bold text-on-surface font-sans">Structural Refinement</td>
                    <td className="px-6 py-4 text-on-surface-variant italic font-sans">Labor / Steel</td>
                    <td className="px-6 py-4 text-right">$240,000.00</td>
                    <td className="px-6 py-4 text-right">$238,420.00</td>
                    <td className="px-6 py-4 text-right text-primary">-$1,580.00</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-sans">SETTLED</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.05] transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-bold text-on-surface font-sans">HVAC Infrastructure</td>
                    <td className="px-6 py-4 text-on-surface-variant italic font-sans">Materials / Mech</td>
                    <td className="px-6 py-4 text-right">$85,000.00</td>
                    <td className="px-6 py-4 text-right">$92,300.00</td>
                    <td className="px-6 py-4 text-right text-error">+$7,300.00</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-bold font-sans">ALERT</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.05] transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-bold text-on-surface font-sans">Foundation Sealant</td>
                    <td className="px-6 py-4 text-on-surface-variant italic font-sans">Chemical / Labor</td>
                    <td className="px-6 py-4 text-right">$45,000.00</td>
                    <td className="px-6 py-4 text-right">$45,000.00</td>
                    <td className="px-6 py-4 text-right text-on-surface-variant">$0.00</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-on-surface-variant text-[10px] font-bold font-sans">STABLE</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.05] transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-bold text-on-surface font-sans">Electrical Rough-in</td>
                    <td className="px-6 py-4 text-on-surface-variant italic font-sans">Labor</td>
                    <td className="px-6 py-4 text-right">$112,000.00</td>
                    <td className="px-6 py-4 text-right">$108,000.00</td>
                    <td className="px-6 py-4 text-right text-primary">-$4,000.00</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold font-sans">SETTLED</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.05] transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-bold text-on-surface font-sans">Millwork & Custom Cabinets</td>
                    <td className="px-6 py-4 text-on-surface-variant italic font-sans">Materials</td>
                    <td className="px-6 py-4 text-right">$195,000.00</td>
                    <td className="px-6 py-4 text-right">$208,000.00</td>
                    <td className="px-6 py-4 text-right text-error">+$13,000.00</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-bold font-sans">OVERAGE</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.05] transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-bold text-on-surface font-sans">Landscaping & Exterior</td>
                    <td className="px-6 py-4 text-on-surface-variant italic font-sans">Mixed</td>
                    <td className="px-6 py-4 text-right">$60,000.00</td>
                    <td className="px-6 py-4 text-right">$0.00</td>
                    <td className="px-6 py-4 text-right text-on-surface-variant">$0.00</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase font-sans">PENDING</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span className="text-on-surface-variant text-xs italic">Last synchronized: 14:02 UTC</span>
              <div className="flex gap-4">
                <span className="font-mono text-xs"><span className="text-on-surface-variant font-sans text-[10px] mr-1">SUBTOTAL EST:</span> $737,000.00</span>
                <span className="font-mono text-xs"><span className="text-on-surface-variant font-sans text-[10px] mr-1">SUBTOTAL ACT:</span> $691,720.00</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Draw Schedule & Vendor Oversight */}
          <div className="xl:col-span-3 space-y-6 w-full">
            
            {/* Draw Schedule */}
            <div className="glass-card p-6 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-on-surface flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Draw Schedule
                </h3>
                <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <div className="relative space-y-8 pl-2">
                {/* Vertical Line */}
                <div className="absolute left-[13px] top-2 bottom-2 w-[1px] bg-white/10"></div>
                
                {/* Draw 1 */}
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center luminous-glow z-10 text-on-primary">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Draw #1 - COMPLETED</p>
                    <h4 className="font-bold text-on-surface text-sm">Site Prep & Demolition</h4>
                    <p className="text-xs text-on-surface-variant mt-1 font-mono">$325,000.00 • JUN 12</p>
                  </div>
                </div>

                {/* Draw 2 */}
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center luminous-glow z-10 text-on-primary">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Draw #2 - COMPLETED</p>
                    <h4 className="font-bold text-on-surface text-sm">Rough Plumbing/Electrical</h4>
                    <p className="text-xs text-on-surface-variant mt-1 font-mono">$280,000.00 • JUL 28</p>
                  </div>
                </div>

                {/* Draw 3 */}
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-surface-container border-2 border-primary rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Draw #3 - IN PROGRESS</p>
                    <h4 className="font-bold text-on-surface text-sm">Sheetrock & Insulations</h4>
                    <p className="text-xs text-on-surface-variant mt-1 font-mono">$245,000.00 • AUG 30 (EST)</p>
                    
                    <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5">
                      <p className="text-[10px] text-on-surface-variant uppercase mb-1">Verification Status</p>
                      <div className="flex items-center gap-2">
                        <Verified className="w-3 h-3 text-primary" />
                        <span className="text-xs">Inspector on-site</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Draw 4 */}
                <div className="relative pl-10 opacity-50">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-surface-container border-2 border-white/10 rounded-full flex items-center justify-center z-10"></div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Draw #4 - PENDING</p>
                    <h4 className="font-bold text-on-surface text-sm">Finishes & Landscaping</h4>
                    <p className="text-xs text-on-surface-variant mt-1 font-mono">$185,000.00 • OCT 15 (EST)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Oversight */}
            <div className="glass-card p-6 rounded-2xl overflow-hidden relative border border-white/5">
              <div className="absolute top-0 right-0 p-4">
                <HardHat className="w-10 h-10 text-primary/10" />
              </div>
              <h4 className="font-bold text-on-surface mb-2">Vendor Oversight</h4>
              <div className="space-y-4 mt-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-on-surface">JC</div>
                    <div className="text-sm font-semibold">J. Carlson Framing</div>
                  </div>
                  <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded font-bold border border-primary/20">PAID</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-on-surface">LE</div>
                    <div className="text-sm font-semibold">Lunar Electric</div>
                  </div>
                  <span className="text-[10px] font-mono text-error bg-error/10 px-2 py-0.5 rounded font-bold border border-error/20">PENDING</span>
                </div>
              </div>
              <button className="w-full mt-6 py-2 border border-white/10 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-white/5 transition-colors relative z-10">
                View All Vendors
              </button>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Hammer, Key, DollarSign, AlertTriangle, Calendar, Video } from 'lucide-react';
import { calculateHoldingCost } from '@/lib/phase-engine';
import ExplainerVideoModal from './ExplainerVideoModal';

export default function HoldPanel() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [daysHeld, setDaysHeld] = useState(45);
  const [rehabCosts, setRehabCosts] = useState({ labor: 22000, materials: 18000, permits: 5000 });
  const [monthlyCosts, setMonthlyCosts] = useState({
    mortgage: 1850,
    insurance: 150,
    taxes: 420,
    utilities: 180,
    hoa: 0,
    maintenance: 200,
  });

  const [rentalSpecs, setRentalSpecs] = useState({
    monthlyRent: 3200,
    vacancyRatePct: 5,
    leaseStartDate: '2026-09-01',
    mgmtFeePct: 8,
  });

  const totalRehab = rehabCosts.labor + rehabCosts.materials + rehabCosts.permits;
  const holdingCalc = calculateHoldingCost(420000, totalRehab, daysHeld, monthlyCosts);

  // Net monthly cash flow calculation for rental
  const grossIncome = rentalSpecs.monthlyRent;
  const vacancyLoss = (grossIncome * rentalSpecs.vacancyRatePct) / 100;
  const mgmtFee = (grossIncome * rentalSpecs.mgmtFeePct) / 100;
  const monthlyExpenses = (monthlyCosts.mortgage || 0) + (monthlyCosts.insurance || 0) + (monthlyCosts.taxes || 0) + (monthlyCosts.utilities || 0) + (monthlyCosts.hoa || 0) + (monthlyCosts.maintenance || 0) + mgmtFee + vacancyLoss;
  const netCashFlow = Math.round(grossIncome - monthlyExpenses);

  return (
    <section data-testid="hold-panel" id="hold-panel" className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6 text-white backdrop-blur-md">
      {/* Top Banner & Video Trigger */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            Hold Phase & Rehab Operations
          </h2>
          <p className="text-xs text-slate-300">Renovation tracking, holding costs, lease management, & cash flow optimization.</p>
        </div>

        <button
          onClick={() => setIsVideoOpen(true)}
          data-testid="hold-video-btn"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600/30 border border-amber-400/40 text-amber-300 text-xs font-semibold hover:bg-amber-600/40 transition"
        >
          <Video className="w-4 h-4" />
          <span>Watch Explainer</span>
        </button>
      </div>

      {/* DAILY HOLDING COST ALERT BANNER */}
      <div data-testid="holding-cost-alert-banner" className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
        <div className="text-xs sm:text-sm">
          <p className="font-extrabold text-amber-300">
            Your daily holding cost is ${holdingCalc.dailyHoldingCost}. Every day you hold costs ${holdingCalc.dailyHoldingCost}.
          </p>
          <p className="text-slate-300 mt-0.5">
            Total cumulative holding cost over {daysHeld} days: <strong className="text-white">${holdingCalc.totalHoldingCost.toLocaleString()}</strong>.
          </p>
        </div>
      </div>

      {/* KPI Header Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Daily Holding Cost</span>
          <span className="text-xl font-bold text-amber-400">${holdingCalc.dailyHoldingCost}/day</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Total Rehab Cost</span>
          <span className="text-xl font-bold text-white">${totalRehab.toLocaleString()}</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Days Held</span>
          <span className="text-xl font-bold text-white">{daysHeld} Days</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Projected Cash Flow</span>
          <span className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${netCashFlow.toLocaleString()}/mo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rehab Tracker */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Hammer className="w-4 h-4 text-amber-400" />
            Rehab Cost Breakdown & Timeline
          </h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-slate-400 block">Labor ($)</label>
              <input type="number" value={rehabCosts.labor} onChange={e => setRehabCosts({ ...rehabCosts, labor: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Materials ($)</label>
              <input type="number" value={rehabCosts.materials} onChange={e => setRehabCosts({ ...rehabCosts, materials: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Permits ($)</label>
              <input type="number" value={rehabCosts.permits} onChange={e => setRehabCosts({ ...rehabCosts, permits: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between text-xs">
            <span className="text-slate-400">Total Rehab Investment:</span>
            <strong className="text-white">${totalRehab.toLocaleString()}</strong>
          </div>
        </div>

        {/* Rental & Lease Tracker */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            Rental & Tenant Management
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block">Monthly Rent ($)</label>
              <input type="number" value={rentalSpecs.monthlyRent} onChange={e => setRentalSpecs({ ...rentalSpecs, monthlyRent: Number(e.target.value) })} className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Vacancy Rate (%)</label>
              <input type="number" value={rentalSpecs.vacancyRatePct} onChange={e => setRentalSpecs({ ...rentalSpecs, vacancyRatePct: Number(e.target.value) })} className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Lease Start Date</label>
              <input type="date" value={rentalSpecs.leaseStartDate} onChange={e => setRentalSpecs({ ...rentalSpecs, leaseStartDate: e.target.value })} className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Property Mgmt Fee (%)</label>
              <input type="number" value={rentalSpecs.mgmtFeePct} onChange={e => setRentalSpecs({ ...rentalSpecs, mgmtFeePct: Number(e.target.value) })} className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Holding Cost Calculator Grid */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-400" />
          Monthly Holding Cost Inputs
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="text-slate-400 block">Mortgage ($)</label>
            <input type="number" value={monthlyCosts.mortgage} onChange={e => setMonthlyCosts({ ...monthlyCosts, mortgage: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
          </div>
          <div>
            <label className="text-slate-400 block">Insurance ($)</label>
            <input type="number" value={monthlyCosts.insurance} onChange={e => setMonthlyCosts({ ...monthlyCosts, insurance: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
          </div>
          <div>
            <label className="text-slate-400 block">Prop Taxes ($)</label>
            <input type="number" value={monthlyCosts.taxes} onChange={e => setMonthlyCosts({ ...monthlyCosts, taxes: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
          </div>
          <div>
            <label className="text-slate-400 block">Utilities ($)</label>
            <input type="number" value={monthlyCosts.utilities} onChange={e => setMonthlyCosts({ ...monthlyCosts, utilities: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
          </div>
          <div>
            <label className="text-slate-400 block">HOA ($)</label>
            <input type="number" value={monthlyCosts.hoa} onChange={e => setMonthlyCosts({ ...monthlyCosts, hoa: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
          </div>
          <div>
            <label className="text-slate-400 block">Maint Reserve ($)</label>
            <input type="number" value={monthlyCosts.maintenance} onChange={e => setMonthlyCosts({ ...monthlyCosts, maintenance: Number(e.target.value) })} className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1" />
          </div>
        </div>
      </div>

      <ExplainerVideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        title="Rehab Management & Holding Costs"
        videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
      />
    </section>
  );
}

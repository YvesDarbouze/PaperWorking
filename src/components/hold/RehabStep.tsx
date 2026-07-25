'use client';

import React, { useState, useMemo } from 'react';
import { Settings, CheckSquare, Square, DollarSign, Plus, Award, AlertTriangle, Upload, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface RehabStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  isFlip?: boolean;
  onComplete?: () => Promise<void>;
}

const DEFAULT_SCOPE = [
  { room: 'Kitchen', item: 'Cabinets & Counters', estimate: 8000, actual: 0, status: 'Not Started' },
  { room: 'Kitchen', item: 'Appliances & Flooring', estimate: 4500, actual: 0, status: 'Not Started' },
  { room: 'Bathrooms', item: 'Fixtures & Vanity', estimate: 3000, actual: 0, status: 'Not Started' },
  { room: 'Bathrooms', item: 'Tile & Surrounds', estimate: 2500, actual: 0, status: 'Not Started' },
  { room: 'Exterior', item: 'Roof & Siding', estimate: 12000, actual: 0, status: 'Not Started' },
  { room: 'Exterior', item: 'Landscaping & Paint', estimate: 4000, actual: 0, status: 'Not Started' },
  { room: 'Systems', item: 'HVAC Replacement', estimate: 6500, actual: 0, status: 'Not Started' },
  { room: 'Systems', item: 'Electrical & Plumbing', estimate: 5000, actual: 0, status: 'Not Started' },
];

export default function RehabStep({
  initialData,
  onSave,
  isFlip,
  onComplete,
}: RehabStepProps) {
  const f = initialData?.financials || {};
  
  const [tier, setTier] = useState(f.renovationTier || 'Renovate');
  const [scope, setScope] = useState<any[]>(() => {
    return f.rehabScope || DEFAULT_SCOPE;
  });

  // Mock Contractor bids list
  const [bids, setBids] = useState<any[]>(() => {
    return [
      { id: 'bid_1', contractor: 'Atlanta Pro Construction', amount: 42000, notes: 'Full room-by-room scope included', status: 'Pending' },
      { id: 'bid_2', contractor: 'Custom Renovations LLC', amount: 48500, notes: 'Premium finishes package', status: 'Pending' },
    ];
  });

  // Mock Change orders
  const [changeOrders, setChangeOrders] = useState<any[]>(() => {
    return f.changeOrders || [
      { id: 'co_1', description: 'Drywall repairs from plumbing leak', requested: 1200, approved: 1200, status: 'Approved' },
      { id: 'co_2', description: 'Kitchen cabinet upgrade request', requested: 2500, approved: 0, status: 'Pending' },
    ];
  });

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setScope(
      scope.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAwardBid = (bidId: string) => {
    setBids(bids.map((b) => (b.id === bidId ? { ...b, status: 'Accepted' } : { ...b, status: 'Declined' })));
    toast.success('Bid awarded! Milestone created.');
  };

  const handleApproveChangeOrder = (coId: string) => {
    setChangeOrders(
      changeOrders.map((co) => {
        if (co.id !== coId) return co;
        toast.success('Change order approved.');
        return { ...co, approved: co.requested, status: 'Approved' };
      })
    );
  };

  // Sum calculations
  const totals = useMemo(() => {
    const estSum = scope.reduce((acc, curr) => acc + (curr.estimate || 0), 0);
    const actSum = scope.reduce((acc, curr) => acc + (curr.actual || 0), 0);
    const coSum = changeOrders
      .filter((co) => co.status === 'Approved')
      .reduce((acc, curr) => acc + (curr.approved || 0), 0);

    const revisedBudget = estSum + coSum;
    const isOverBudget = actSum > revisedBudget * 1.1;

    return {
      estSum,
      actSum,
      coSum,
      revisedBudget,
      isOverBudget,
    };
  }, [scope, changeOrders]);

  const handleContinue = async () => {
    const payload = {
      financials: {
        ...f,
        renovationTier: tier,
        rehabScope: scope,
        changeOrders,
        projectedRehabCost: totals.revisedBudget * 100, // Sync to cents
        actualRehabSpend: totals.actSum * 100,
      },
    };
    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 1: Rehab Management</h3>
        <p className="text-xs text-slate-400">Set renovation scope, compare contractor estimates, track change orders, and monitor budget actuals.</p>
      </div>

      {/* Tier Selector */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Renovation Tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
        >
          <option value="Stage" className="bg-[#181315]">Stage — Cosmetic/Clean-up Only</option>
          <option value="Refurbish" className="bg-[#181315]">Refurbish — Minor paint & carpets</option>
          <option value="Renovate" className="bg-[#181315]">Renovate — Kitchens & baths remodels</option>
          <option value="Gut" className="bg-[#181315]">Gut — Full studs remodels</option>
          <option value="Develop" className="bg-[#181315]">Develop — ground-up additions</option>
        </select>
      </div>

      {/* Scope Table Checklist */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Renovation Items Ledger</span>
        <div className="space-y-2.5 max-h-[250px] overflow-y-auto scrollbar-none pr-1">
          {scope.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-xl items-center"
            >
              <div className="sm:col-span-4 text-xs font-bold text-white leading-tight">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block">{item.room}</span>
                {item.item}
              </div>

              {/* Estimate Cost */}
              <div className="sm:col-span-2.5 space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Estimate ($)</label>
                <input
                  type="number"
                  value={item.estimate || ''}
                  onChange={(e) => handleUpdateItem(index, 'estimate', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
                />
              </div>

              {/* Actual Cost */}
              <div className="sm:col-span-2.5 space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Actual ($)</label>
                <input
                  type="number"
                  value={item.actual || ''}
                  onChange={(e) => handleUpdateItem(index, 'actual', Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
                />
              </div>

              {/* Status */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Status</label>
                <select
                  value={item.status}
                  onChange={(e) => handleUpdateItem(index, 'status', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
                >
                  <option value="Not Started" className="bg-[#181315]">Not Started</option>
                  <option value="In Progress" className="bg-[#181315]">In Progress</option>
                  <option value="Complete" className="bg-[#181315]">Complete</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contractor Bids */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contractor Proposals & Award Bids</h4>
        <div className="space-y-2">
          {bids.map((b) => (
            <div key={b.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{b.contractor}</p>
                <p className="text-[9px] text-slate-400">{b.notes} • <span className="font-semibold text-sky-400">${b.amount.toLocaleString()}</span></p>
              </div>
              <button
                type="button"
                onClick={() => handleAwardBid(b.id)}
                disabled={b.status === 'Accepted'}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                  b.status === 'Accepted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" /> {b.status === 'Accepted' ? 'Awarded ✓' : 'Award Bid'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Change Orders */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Change Orders Tracker</h4>
        <div className="space-y-2">
          {changeOrders.map((co) => (
            <div key={co.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{co.description}</p>
                <p className="text-[9px] text-slate-400">Requested: ${co.requested.toLocaleString()} • Approved: ${co.approved.toLocaleString()}</p>
              </div>
              {co.status === 'Pending' ? (
                <button
                  type="button"
                  onClick={() => handleApproveChangeOrder(co.id)}
                  className="px-3 py-1.5 bg-[#7A9EAA] text-black text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all"
                >
                  Approve
                </button>
              ) : (
                <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">Approved ✓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Budget vs Actual Variance bar chart (CSS visual representation) */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Budget vs. Actual Variance Chart</h4>
        
        <div className="space-y-3 text-xs">
          {/* Estimated budget vs actuals */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase">
              <span>Original Estimate: ${totals.estSum.toLocaleString()}</span>
              <span>Actual: ${totals.actSum.toLocaleString()}</span>
            </div>
            
            <div className="w-full h-4 bg-white/5 rounded-md overflow-hidden relative flex">
              <div
                className="h-full bg-slate-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.estSum / Math.max(1, totals.revisedBudget)) * 100)}%` }}
              />
              <div
                className={`h-full absolute top-0 left-0 transition-all duration-300 opacity-60 ${
                  totals.isOverBudget ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (totals.actSum / Math.max(1, totals.revisedBudget)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {totals.isOverBudget && (
          <div className="p-3 border border-rose-500/20 bg-rose-500/5 text-rose-400 rounded-lg flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Over Budget Warning</p>
              <p className="opacity-80">Renovations are exceeding the revised budget by more than 10%. Review actual expenses.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <div className="flex gap-2">
          {isFlip && onComplete && (
            <button
              onClick={async () => {
                await handleContinue();
                await onComplete();
              }}
              className="px-6 py-2.5 bg-emerald-500 text-black hover:opacity-90 font-extrabold uppercase tracking-wider text-[11px] rounded-lg transition-opacity flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              Rehab Complete: Move to Exit <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleContinue}
            className="px-6 py-2.5 bg-[#7A9EAA] text-[#0d0a0b] hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

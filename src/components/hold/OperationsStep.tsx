'use client';

import React, { useState, useMemo } from 'react';
import { ShieldCheck, Wrench, Calendar, Landmark, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface OperationsStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  onComplete: () => Promise<void>;
}

export default function OperationsStep({
  initialData,
  onSave,
  onComplete,
}: OperationsStepProps) {
  const f = initialData?.financials || {};

  // Budget vs actual expenses (from Plaid or manual)
  const [expenses, setExpenses] = useState<any[]>(() => {
    return f.operatingExpenses || [
      { category: 'Property Tax', budget: 350, actual: 350 },
      { category: 'Insurance', budget: 120, actual: 120 },
      { category: 'HOA', budget: 50, actual: 50 },
      { category: 'Maintenance', budget: 150, actual: 40 },
      { category: 'Utilities', budget: 100, actual: 125 }, // Over budget!
      { category: 'Management', budget: 180, actual: 180 },
    ];
  });

  // Maintenance Requests log
  const [maintenance, setMaintenance] = useState<any[]>(() => {
    return f.maintenanceRequests || [
      { id: 'm_1', desc: 'Leaky kitchen sink replacement', priority: 'High', vendor: 'PlumbRight Services', cost: 180, status: 'Completed' },
      { id: 'm_2', desc: 'HVAC filter replacement service', priority: 'Low', vendor: 'AirCare Pros', cost: 75, status: 'Completed' },
    ];
  });

  // Rent roll history - past 12 months status
  const [rentRoll, setRentRoll] = useState<any[]>(() => {
    return f.rentRoll || [
      { month: 'June 2026', due: 1800, collected: 1800, status: 'Paid' },
      { month: 'May 2026', due: 1800, collected: 1800, status: 'Paid' },
      { month: 'April 2026', due: 1800, collected: 1800, status: 'Paid' },
    ];
  });

  // Occupancy metrics
  const [totalUnits, setTotalUnits] = useState<number>(f.totalUnits || 1);
  const [occupiedUnits, setOccupiedUnits] = useState<number>(f.occupiedUnits || 1);

  const occupancyRate = useMemo(() => {
    if (totalUnits <= 0) return 0;
    return (occupiedUnits / totalUnits) * 100;
  }, [totalUnits, occupiedUnits]);

  // Check if stabilized criteria is satisfied
  // Rehab completed, Lease signed, Rent connection active
  const isStabilizedReady = useMemo(() => {
    const rehabDone = f.rehabScope ? f.rehabScope.every((s: any) => s.status === 'Complete') : true;
    const leaseSigned = !!f.leaseLeaseSigned;
    const rentSetup = !!f.rentConnectionSetup;
    return rehabDone && leaseSigned && rentSetup;
  }, [f]);

  const handleUpdateExpense = (index: number, actual: number) => {
    setExpenses(expenses.map((exp, i) => (i === index ? { ...exp, actual } : exp)));
  };

  const handleMarkRentPaid = (index: number) => {
    setRentRoll(
      rentRoll.map((r, i) => (i === index ? { ...r, collected: r.due, status: 'Paid' } : r))
    );
    toast.success('Rent marked as Paid manually.');
  };

  const handleAddMaintenance = () => {
    const desc = prompt('Enter maintenance request description:');
    if (!desc) return;
    const priority = prompt('Priority (Low, Med, High):') || 'Low';
    const newReq = {
      id: `m_${Date.now()}`,
      desc,
      priority,
      vendor: 'Assigned from Marketplace',
      cost: 0,
      status: 'Pending',
    };
    setMaintenance([newReq, ...maintenance]);
    toast.success('Maintenance request logged.');
  };

  const handleSaveProgress = async () => {
    const payload = {
      financials: {
        ...f,
        operatingExpenses: expenses,
        maintenanceRequests: maintenance,
        rentRoll,
        totalUnits,
        occupiedUnits,
      },
    };
    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 4: Ongoing Operations</h3>
        <p className="text-xs text-slate-400">Track monthly expense variances, log tenant maintenance tickets, check rent rolls, and view occupancy rates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Expenses and Occupancy */}
        <div className="space-y-4">
          {/* Expense variance list */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operating Expenses (Budget vs Actual)</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {expenses.map((exp, index) => {
                const variance = exp.actual - exp.budget;
                const isOver = exp.actual > exp.budget * 1.1;
                return (
                  <div key={exp.category} className="flex justify-between items-center text-xs p-1">
                    <span className="text-slate-400 font-medium">{exp.category}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Budget: ${exp.budget}</span>
                        <input
                          type="number"
                          value={exp.actual || ''}
                          onChange={(e) => handleUpdateExpense(index, Number(e.target.value))}
                          className="w-16 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-right text-white text-xs"
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {variance > 0 ? `+$${variance}` : `-$${Math.abs(variance)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Occupancy tracker */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[8px] uppercase tracking-wider text-slate-500">Total Units</p>
              <input
                type="number"
                value={totalUnits}
                onChange={(e) => setTotalUnits(Math.max(1, Number(e.target.value)))}
                className="w-12 text-center bg-white/5 border border-white/10 rounded text-xs text-white mt-1"
              />
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-wider text-slate-500">Occupied Units</p>
              <input
                type="number"
                value={occupiedUnits}
                onChange={(e) => setOccupiedUnits(Math.max(0, Number(e.target.value)))}
                className="w-12 text-center bg-white/5 border border-white/10 rounded text-xs text-white mt-1"
              />
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-wider text-slate-500">Occupancy %</p>
              <p className="text-sm font-bold text-[#7A9EAA] mt-1">{occupancyRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        {/* Maintenance and Rent rolls */}
        <div className="space-y-4">
          
          {/* Maintenance Ticket Log */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Maintenance Request Log</h4>
              <button
                type="button"
                onClick={handleAddMaintenance}
                className="px-2 py-0.5 bg-white/10 hover:bg-white/15 text-white text-[9px] font-bold uppercase rounded"
              >
                Log Request
              </button>
            </div>
            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
              {maintenance.map((m) => (
                <div key={m.id} className="p-2 bg-white/[0.01] border border-white/5 rounded-lg flex justify-between items-center text-[10px]">
                  <div>
                    <span className="font-bold text-white block">{m.desc}</span>
                    <span className="text-[8px] text-slate-500">Vendor: {m.vendor} • Priority: {m.priority}</span>
                  </div>
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{m.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rent Roll Log */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">12 Month Collection Ledger</h4>
            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
              {rentRoll.map((r, index) => (
                <div key={r.month} className="flex justify-between items-center text-xs p-1">
                  <div>
                    <span className="font-bold text-white block">{r.month}</span>
                    <span className="text-[9px] text-slate-500">Collected: ${r.collected} / Due: ${r.due}</span>
                  </div>
                  {r.status === 'Paid' ? (
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">Paid</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMarkRentPaid(index)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white text-[9px] font-bold rounded"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <div className="flex gap-2">
          <button
            onClick={handleSaveProgress}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[11px] rounded-lg transition-colors"
          >
            Save Progress
          </button>
          
          <button
            onClick={async () => {
              await handleSaveProgress();
              await onComplete();
            }}
            disabled={!isStabilizedReady}
            className="px-6 py-2.5 bg-emerald-500 text-black hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none font-extrabold uppercase tracking-wider text-[11px] rounded-lg transition-opacity flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            Property is Stabilized <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

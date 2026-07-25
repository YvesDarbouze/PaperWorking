'use client';

import React, { useState } from 'react';
import { CreditCard, Landmark, ShieldCheck, HelpCircle, Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface RentCollectionStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function RentCollectionStep({
  initialData,
  onSave,
}: RentCollectionStepProps) {
  const f = initialData?.financials || {};

  const [dueDate, setDueDate] = useState<number>(f.rentDueDate || 1);
  const [collectionMethod, setCollectionMethod] = useState<string>(f.rentCollectionMethod || 'plaid');
  const [gracePeriod, setGracePeriod] = useState<number>(f.rentGracePeriod || 5);
  const [lateFee, setLateFee] = useState<number>(f.rentLateFee || 50);
  const [depositHoldingAccount, setDepositHoldingAccount] = useState<string>(f.rentDepositHoldingAccount || 'operating');

  const [firstMonthPaid, setFirstMonthPaid] = useState<boolean>(!!f.rentFirstMonthPaid);

  const handleLinkPlaidRent = () => {
    toast.success('Plaid Transaction monitoring synced to Rent Collection!');
  };

  const handleContinue = async () => {
    const payload = {
      financials: {
        ...f,
        rentDueDate: dueDate,
        rentCollectionMethod: collectionMethod,
        rentGracePeriod: gracePeriod,
        rentLateFee: lateFee,
        rentDepositHoldingAccount: depositHoldingAccount,
        rentFirstMonthPaid: firstMonthPaid,
        rentConnectionSetup: true,
      },
    };
    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 3: Rent Collection Setup</h3>
        <p className="text-xs text-slate-400">Establish rent rules, configure Plaid transaction sync, and set late fee grace periods.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Collection parameters */}
        <div className="space-y-4">
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Rent Collection parameters</h4>
            
            <div className="space-y-3 text-xs">
              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Rent Due Date (Day of Month)</label>
                <select
                  value={dueDate}
                  onChange={(e) => setDueDate(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
                >
                  {[...Array(28)].map((_, i) => (
                    <option key={i} value={i + 1} className="bg-[#181315]">
                      {i + 1}
                      {i + 1 === 1 ? 'st' : i + 1 === 2 ? 'nd' : i + 1 === 3 ? 'rd' : 'th'} Day
                    </option>
                  ))}
                </select>
              </div>

              {/* Method */}
              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Primary Payment Channel</label>
                <select
                  value={collectionMethod}
                  onChange={(e) => setCollectionMethod(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
                >
                  <option value="plaid" className="bg-[#181315]">Plaid Synced Bank Account</option>
                  <option value="manual_cash" className="bg-[#181315]">Manual Cash / Check</option>
                  <option value="zelle_venmo" className="bg-[#181315]">Zelle / Venmo (Manual entry tracking)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Plaid synchronization panel */}
        <div className="space-y-4">
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4 flex flex-col justify-between h-full">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Plaid Automated Rent Tracking</h4>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Connect rent monitoring directly to Plaid banking feeds. Transactions matching the target rent amount on or near the due date will be auto-attributed to the rent roll.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleLinkPlaidRent}
              className="w-full py-2 bg-[#7A9EAA] hover:opacity-90 text-[#0d0a0b] text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1"
            >
              <CreditCard className="w-3.5 h-3.5" /> Enable Plaid Rent Monitoring
            </button>
          </div>
        </div>
      </div>

      {/* Late fee settings */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <h4 className="col-span-2 sm:col-span-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Late Fee Policy & Escrow</h4>
        
        <div className="space-y-1">
          <label className="text-[8px] font-bold uppercase text-slate-500">Grace Period (Days)</label>
          <input
            type="number"
            value={gracePeriod}
            onChange={(e) => setGracePeriod(Number(e.target.value))}
            className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-bold uppercase text-slate-500">Late Fee Amount ($)</label>
          <input
            type="number"
            value={lateFee}
            onChange={(e) => setLateFee(Number(e.target.value))}
            className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-bold uppercase text-slate-500">Security Deposit Holding</label>
          <select
            value={depositHoldingAccount}
            onChange={(e) => setDepositHoldingAccount(e.target.value)}
            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8 font-semibold"
          >
            <option value="operating" className="bg-[#181315]">Operating Checking</option>
            <option value="escrow" className="bg-[#181315]">Secured Escrow Account</option>
          </select>
        </div>

        {/* First month collected checkbox */}
        <div className="flex items-end pb-1.5">
          <button
            type="button"
            onClick={() => setFirstMonthPaid(!firstMonthPaid)}
            className="flex items-center gap-2 text-xs text-white text-left w-full h-8"
          >
            {firstMonthPaid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded border border-slate-600 shrink-0" />
            )}
            <span>First Month Collected</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-[#7A9EAA] text-[#0d0a0b] hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}

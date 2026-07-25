'use client';

import React, { useState, useMemo } from 'react';
import { FileText, Percent, Info, ExternalLink, UserPlus, FileCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface LeaseUpStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function LeaseUpStep({
  initialData,
  onSave,
}: LeaseUpStepProps) {
  const f = initialData?.financials || {};
  const beds = initialData?.beds ?? f.beds ?? 3;
  const baths = initialData?.baths ?? f.baths ?? 2;
  const address = initialData?.addressLine || initialData?.address || 'Property';

  // Checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    return f.leaseChecklist || {
      rehabComplete: false,
      utilitiesActive: false,
      cleaningDone: false,
      photosReady: false,
      rentAmountSet: false,
    };
  });

  // Rent
  const rentCastEstimate = 1850; // mock market estimate from RentCast
  const [targetRent, setTargetRent] = useState<number>(f.leaseTargetRent || 1800);

  // Marketing templates & description
  const features = useMemo(() => {
    const scope = f.rehabScope || [];
    const completed = scope.filter((s: any) => s.status === 'Complete').map((s: any) => s.item.toLowerCase());
    return completed.length > 0 ? completed.slice(0, 3).join(', ') : 'modern cabinetry and updated features';
  }, [f.rehabScope]);

  const generatedDescription = `Beautiful ${beds} Bed / ${baths} Bath home in ${address.split(',')[1] || 'prime location'}. Recently renovated with ${features}. Spacious living layout, ready to move in.`;

  const [platforms, setPlatforms] = useState<Record<string, boolean>>({
    zillow: false,
    apartments: false,
    facebook: false,
    craigslist: false,
  });

  // Tenant screening applicant list
  const [applicants, setApplicants] = useState<any[]>(() => {
    return f.leaseApplicants || [
      { id: 'app_1', name: 'John Doe', income: 6200, credit: 710, status: 'Pending' },
      { id: 'app_2', name: 'Sarah Connor', income: 7500, credit: 740, status: 'Lease Signed' },
    ];
  });

  // Lease parameters
  const [startDate, setStartDate] = useState(f.leaseStartDate || '');
  const [endDate, setEndDate] = useState(f.leaseEndDate || '');
  const [securityDeposit, setSecurityDeposit] = useState(f.leaseSecurityDeposit || 1800);

  const variancePct = useMemo(() => {
    return ((targetRent - rentCastEstimate) / rentCastEstimate) * 100;
  }, [targetRent, rentCastEstimate]);

  const toggleChecklist = (key: string) => {
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  const handleLaunchPlatform = (key: string, url: string) => {
    setPlatforms({ ...platforms, [key]: true });
    window.open(url, '_blank');
    toast.success('Listing template copied to clipboard. Launching platform...');
  };

  const handleUpdateApplicantStatus = (id: string, status: string) => {
    setApplicants(applicants.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(`Applicant status updated to ${status}.`);
  };

  const handleContinue = async () => {
    // Save checklist, targetRent, applicants, and lease variables
    const leaseSigned = applicants.some((a) => a.status === 'Lease Signed');

    const payload = {
      financials: {
        ...f,
        leaseChecklist: checklist,
        leaseTargetRent: targetRent,
        leaseApplicants: applicants,
        leaseStartDate: startDate,
        leaseEndDate: endDate,
        leaseSecurityDeposit: securityDeposit,
        leaseLeaseSigned: leaseSigned,
        grossRent: targetRent * 100, // Cents
      },
    };
    await onSave(payload);
  };

  // Expiration countdown
  const daysUntilLeaseEnd = useMemo(() => {
    if (!endDate) return 365;
    const diffTime = new Date(endDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [endDate]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 2: Lease-Up</h3>
        <p className="text-xs text-slate-400">Validate property readiness checklist, generate listing templates, track tenant screenings, and save lease terms.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Left Side: Readiness & Rent Settings */}
        <div className="space-y-4">
          
          {/* Property Readiness */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Readiness checklist</h4>
            <div className="space-y-2 text-xs">
              {Object.keys(checklist).map((key) => {
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleChecklist(key)}
                    className="flex items-center gap-2 text-left text-white w-full"
                  >
                    {checklist[key] ? (
                      <CheckCircle2 className="w-4 h-4 text-[#7A9EAA] shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rent setup */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rent setting vs. RentCast comps</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-500">Target Monthly Rent ($)</label>
                <input
                  type="number"
                  value={targetRent || ''}
                  onChange={(e) => setTargetRent(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
                />
              </div>

              <div className="bg-white/5 p-2 rounded-xl text-center flex flex-col justify-center">
                <p className="text-[8px] uppercase tracking-wider text-slate-500">RentCast Market Estimate</p>
                <p className="text-sm font-bold text-white">${rentCastEstimate}/mo</p>
                <span className={`text-[9px] mt-0.5 ${variancePct >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}% Variance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Marketing Description & Checklist */}
        <div className="space-y-4">
          
          {/* Listing Generator */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Listing Template Description</h4>
            <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
              {generatedDescription}
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLaunchPlatform('zillow', 'https://zillow.com/rental-manager')}
                className="py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-bold uppercase flex items-center justify-center gap-1 transition-all"
              >
                Zillow <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleLaunchPlatform('facebook', 'https://facebook.com/marketplace')}
                className="py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-bold uppercase flex items-center justify-center gap-1 transition-all"
              >
                Facebook <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant screening tracker */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Tenant Screening Pipeline</h4>
        <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-none pr-1">
          {applicants.map((a) => (
            <div key={a.id} className="p-2.5 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white block">{a.name}</span>
                <span className="text-[9px] text-slate-500">Income: ${a.income.toLocaleString()}/mo • Credit: {a.credit || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={a.status}
                  onChange={(e) => handleUpdateApplicantStatus(a.id, e.target.value)}
                  className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-[10px] font-semibold"
                >
                  <option value="Pending" className="bg-[#181315]">Pending</option>
                  <option value="Approved" className="bg-[#181315]">Approved</option>
                  <option value="Rejected" className="bg-[#181315]">Rejected</option>
                  <option value="Lease Signed" className="bg-[#181315]">Lease Signed ✓</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lease Terms Inputs */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <h4 className="col-span-2 sm:col-span-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Lease Terms Agreement</h4>
        
        <div className="space-y-1">
          <label className="text-[8px] font-bold uppercase text-slate-500">Lease Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-bold uppercase text-slate-500">Lease End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-bold uppercase text-slate-500">Security Deposit ($)</label>
          <input
            type="number"
            value={securityDeposit || ''}
            onChange={(e) => setSecurityDeposit(Number(e.target.value))}
            className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
          />
        </div>

        <div className="bg-white/5 p-2 rounded-xl text-center flex flex-col justify-center text-xs">
          <p className="text-[8px] uppercase tracking-wider text-slate-500">Days Until Expiration</p>
          <p className="text-sm font-bold text-white">{daysUntilLeaseEnd} Days</p>
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

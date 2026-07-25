'use client';

import React, { useState } from 'react';
import { UserCheck, CheckCircle2, FileText, AlertCircle, Clock, Upload } from 'lucide-react';
import { useMarketplaceVendors } from '@/hooks/useMarketplaceVendors';
import toast from 'react-hot-toast';

interface VendorAssignmentStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function VendorAssignmentStep({
  initialData,
  onSave,
}: VendorAssignmentStepProps) {
  const f = initialData?.financials || {};

  // Vendor assignment states
  const [titleVendorId, setTitleVendorId] = useState(f.diligenceTitleVendorId || '');
  const [attorneyVendorId, setAttorneyVendorId] = useState(f.diligenceAttorneyVendorId || '');
  const [appraiserVendorId, setAppraiserVendorId] = useState(f.diligenceAppraiserVendorId || '');
  const [insuranceVendorId, setInsuranceVendorId] = useState(f.diligenceInsuranceVendorId || '');
  const [inspectorVendorId, setInspectorVendorId] = useState(f.diligenceInspectionVendorId || '');

  // Status pipelines
  const [titleStatus, setTitleStatus] = useState<string>(f.vendorTitleStatus || 'Title search ordered');
  const [attorneyStatus, setAttorneyStatus] = useState<string>(f.vendorAttorneyStatus || 'Engagement letter signed');
  const [appraiserStatus, setAppraiserStatus] = useState<string>(f.vendorAppraiserStatus || 'Ordered');
  const [insuranceStatus, setInsuranceStatus] = useState<string>(f.vendorInsuranceStatus || 'Quote requested');

  // Load Marketplace Vendors using slots
  const { vendors: titleAgencies } = useMarketplaceVendors('f4TitleEscrowVendor');
  const { vendors: closingAttorneys } = useMarketplaceVendors('f4ClosingAttorneyVendor');
  const { vendors: appraisers } = useMarketplaceVendors('f4AppraiserVendor');
  const { vendors: insuranceBrokers } = useMarketplaceVendors('f4InsuranceBrokerVendor');
  const { vendors: inspectors } = useMarketplaceVendors('f4EnvironmentalVendor');

  // Countdown calculations
  const closingDate = f.loiTargetClosingDate || initialData?.closingDate;
  const daysRemaining = closingDate
    ? Math.max(0, Math.ceil((new Date(closingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 30;

  const handleContinue = async () => {
    // Require Title and Closing Attorney to be assigned as per anti-pattern constraints
    if (!titleVendorId || !attorneyVendorId) {
      toast.error('Title Partner and Closing Attorney assignments are mandatory.');
      return;
    }

    const payload = {
      financials: {
        ...f,
        diligenceTitleVendorId: titleVendorId,
        diligenceAttorneyVendorId: attorneyVendorId,
        diligenceAppraisalVendorId: appraiserVendorId,
        diligenceInsuranceVendorId: insuranceVendorId,
        diligenceInspectionVendorId: inspectorVendorId,
        vendorTitleStatus: titleStatus,
        vendorAttorneyStatus: attorneyStatus,
        vendorAppraiserStatus: appraiserStatus,
        vendorInsuranceStatus: insuranceStatus,
      },
    };
    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 3: Vendor Assignment & Deliverables</h3>
        <p className="text-xs text-slate-400">Assign transaction professionals and track document deliverables timelines.</p>
      </div>

      {/* Due date header countdown */}
      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex justify-between items-center text-xs">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">Estimated Closing Window</span>
        <span className="text-[#7A9EAA] font-bold uppercase tracking-wider flex items-center gap-1">
          <Clock className="w-4 h-4 text-sky-400" /> {daysRemaining} Days Until Target Closing
        </span>
      </div>

      <div className="space-y-4">
        {/* Vendor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Title & Escrow Partner */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-400" /> Title & Escrow Partner <span className="text-rose-500 text-xs">*</span>
            </h4>
            <div className="space-y-2">
              <select
                value={titleVendorId}
                onChange={(e) => setTitleVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
              >
                <option value="" className="bg-[#181315]">Select Title Agency...</option>
                {titleAgencies.map((v) => (
                  <option key={v.uid} value={v.uid} className="bg-[#181315]">{v.companyName}</option>
                ))}
              </select>

              <select
                value={titleStatus}
                onChange={(e) => setTitleStatus(e.target.value)}
                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
              >
                <option value="Title search ordered" className="bg-[#181315]">Title search ordered</option>
                <option value="Preliminary title received" className="bg-[#181315]">Preliminary title received</option>
                <option value="Title cleared" className="bg-[#181315]">Title cleared ✓</option>
              </select>
            </div>
          </div>

          {/* Real Estate Closing Attorney */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-400" /> Real Estate Attorney <span className="text-rose-500 text-xs">*</span>
            </h4>
            <div className="space-y-2">
              <select
                value={attorneyVendorId}
                onChange={(e) => setAttorneyVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
              >
                <option value="" className="bg-[#181315]">Select Attorney...</option>
                {closingAttorneys.map((v) => (
                  <option key={v.uid} value={v.uid} className="bg-[#181315]">{v.companyName}</option>
                ))}
              </select>

              <select
                value={attorneyStatus}
                onChange={(e) => setAttorneyStatus(e.target.value)}
                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
              >
                <option value="Engagement letter signed" className="bg-[#181315]">Engagement letter signed</option>
                <option value="Closing docs drafted" className="bg-[#181315]">Closing docs drafted</option>
                <option value="Docs reviewed" className="bg-[#181315]">Docs reviewed ✓</option>
              </select>
            </div>
          </div>

          {/* Appraiser Partner */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-400" /> Certified Appraiser
            </h4>
            <div className="space-y-2">
              <select
                value={appraiserVendorId}
                onChange={(e) => setAppraiserVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
              >
                <option value="" className="bg-[#181315]">Select Appraiser...</option>
                {appraisers.map((v) => (
                  <option key={v.uid} value={v.uid} className="bg-[#181315]">{v.companyName}</option>
                ))}
              </select>

              <select
                value={appraiserStatus}
                onChange={(e) => setAppraiserStatus(e.target.value)}
                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
              >
                <option value="Ordered" className="bg-[#181315]">Ordered</option>
                <option value="Inspection complete" className="bg-[#181315]">Inspection complete</option>
                <option value="Report received" className="bg-[#181315]">Report received ✓</option>
              </select>
            </div>
          </div>

          {/* Insurance Broker */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-400" /> Insurance Broker
            </h4>
            <div className="space-y-2">
              <select
                value={insuranceVendorId}
                onChange={(e) => setInsuranceVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
              >
                <option value="" className="bg-[#181315]">Select Broker...</option>
                {insuranceBrokers.map((v) => (
                  <option key={v.uid} value={v.uid} className="bg-[#181315]">{v.companyName}</option>
                ))}
              </select>

              <select
                value={insuranceStatus}
                onChange={(e) => setInsuranceStatus(e.target.value)}
                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
              >
                <option value="Quote requested" className="bg-[#181315]">Quote requested</option>
                <option value="Bound" className="bg-[#181315]">Bound</option>
                <option value="Policy issued" className="bg-[#181315]">Policy issued ✓</option>
              </select>
            </div>
          </div>
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

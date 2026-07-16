'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DollarSign, Percent, Sparkles, Receipt, HelpCircle, Upload, X, ShieldAlert, Check } from 'lucide-react';
import type { Project } from '@/types/schema';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

interface ExpenseAssumptionsCardProps {
  project: Project;
  phaseColor?: string;
  onSave: (updates: any) => Promise<void>;
}

type ExpenseMode = 'flat' | 'percent';

export function ExpenseAssumptionsCard({
  project,
  phaseColor = '#ffac5a',
  onSave,
}: ExpenseAssumptionsCardProps) {
  const monthlyRent = project.financials?.gross_rent_per_unit || 0;

  // State for flat monthly dollar inputs
  const [tax, setTax] = useState<string>('');
  const [insurance, setInsurance] = useState<string>('');
  const [security, setSecurity] = useState<string>('');
  const [utilities, setUtilities] = useState<string>('');
  const [HOA, setHOA] = useState<string>('');
  const [capex, setCapex] = useState<string>('');

  // Management mode and values
  const [mgmtMode, setMgmtMode] = useState<ExpenseMode>('flat');
  const [management, setManagement] = useState<string>('');
  const [managementPct, setManagementPct] = useState<string>('8'); // Default 8%

  // Maintenance mode and values
  const [maintMode, setMaintMode] = useState<ExpenseMode>('flat');
  const [maintenance, setMaintenance] = useState<string>('');
  const [maintenancePct, setMaintenancePct] = useState<string>('5'); // Default 5%

  // Attachments state
  const [taxBillUrl, setTaxBillUrl] = useState<string>('');
  const [t12Url, setT12Url] = useState<string>('');
  const [taxBillName, setTaxBillName] = useState<string>('');
  const [t12Name, setT12Name] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<'taxBill' | 't12' | null>(null);

  const taxFileInputRef = useRef<HTMLInputElement>(null);
  const t12FileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with project data on load / project change
  useEffect(() => {
    const f = project.financials;
    setTax(f?.tax !== undefined && f?.tax !== null ? f.tax.toString() : '');
    setInsurance(f?.insurance !== undefined && f?.insurance !== null ? f.insurance.toString() : '');
    setSecurity(f?.security !== undefined && f?.security !== null ? f.security.toString() : '');
    setUtilities(f?.utilities !== undefined && f?.utilities !== null ? f.utilities.toString() : '');
    setHOA(f?.HOA !== undefined && f?.HOA !== null ? f.HOA.toString() : '');
    setCapex(f?.capex !== undefined && f?.capex !== null ? f.capex.toString() : '');

    // Management
    if (f?.management_pct !== undefined && f?.management_pct !== null) {
      setMgmtMode('percent');
      setManagementPct(f.management_pct.toString());
      setManagement('');
    } else {
      setMgmtMode('flat');
      setManagement(f?.management !== undefined && f?.management !== null ? f.management.toString() : '');
      setManagementPct('8');
    }

    // Maintenance
    if (f?.maintenance_pct !== undefined && f?.maintenance_pct !== null) {
      setMaintMode('percent');
      setMaintPct(f.maintenance_pct.toString());
      setMaintenance('');
    } else {
      setMaintMode('flat');
      setMaintenance(f?.maintenance !== undefined && f?.maintenance !== null ? f.maintenance.toString() : '');
      setMaintPct('5');
    }

    // Attachments
    setTaxBillUrl(f?.taxBillUrl || '');
    setT12Url(f?.t12Url || '');
    setTaxBillName(f?.taxBillUrl ? f.taxBillUrl.split('/').pop() || 'Tax Bill' : '');
    setT12Name(f?.t12Url ? f.t12Url.split('/').pop() || 'T-12 Report' : '');
  }, [project.id]);

  // Backward compatibility wrapper for maintenance percentage set
  const setMaintPct = (val: string) => {
    setMaintenancePct(val);
  };

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'taxBill' | 't12') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingType(type);
    
    // Simulate upload in E2E test mode
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockUrl = `/mock_uploads/${file.name}`;
      if (type === 'taxBill') {
        setTaxBillUrl(mockUrl);
        setTaxBillName(file.name);
      } else {
        setT12Url(mockUrl);
        setT12Name(file.name);
      }
      setUploadingType(null);
      toast.success(`${file.name} uploaded successfully (Mock)`);
      return;
    }

    // Real Firebase Storage upload
    try {
      const storageRef = ref(storage, `projects/${project.id}/financials/${type}_${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('Upload failed:', error);
          toast.error('File upload failed');
          setUploadingType(null);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (type === 'taxBill') {
            setTaxBillUrl(downloadUrl);
            setTaxBillName(file.name);
          } else {
            setT12Url(downloadUrl);
            setT12Name(file.name);
          }
          setUploadingType(null);
          toast.success(`${file.name} uploaded successfully!`);
        }
      );
    } catch (err) {
      console.error('Upload initiation error:', err);
      toast.error('File upload failed');
      setUploadingType(null);
    }
  };

  const removeAttachment = (type: 'taxBill' | 't12') => {
    if (type === 'taxBill') {
      setTaxBillUrl('');
      setTaxBillName('');
      if (taxFileInputRef.current) taxFileInputRef.current.value = '';
    } else {
      setT12Url('');
      setT12Name('');
      if (t12FileInputRef.current) t12FileInputRef.current.value = '';
    }
  };

  // Calculations (must match reiMetrics.ts exactly)
  const calculatedExpenses = useMemo(() => {
    const t = parseFloat(tax) || 0;
    const ins = parseFloat(insurance) || 0;
    const sec = parseFloat(security) || 0;
    const util = parseFloat(utilities) || 0;
    const h = parseFloat(HOA) || 0;
    const cap = parseFloat(capex) || 0;

    let mgmt = 0;
    let mgmtP = null;
    let mgmtFlat = null;
    if (mgmtMode === 'percent') {
      mgmtP = parseFloat(managementPct) || 0;
      mgmt = monthlyRent * (mgmtP / 100);
    } else {
      mgmt = parseFloat(management) || 0;
      mgmtFlat = mgmt;
    }

    let maint = 0;
    let maintP = null;
    let maintFlat = null;
    if (maintMode === 'percent') {
      maintP = parseFloat(maintenancePct) || 0;
      maint = monthlyRent * (maintP / 100);
    } else {
      maint = parseFloat(maintenance) || 0;
      maintFlat = maint;
    }

    const monthlyTotal = t + ins + sec + util + h + cap + mgmt + maint;
    const annualTotal = monthlyTotal * 12;
    const oer = monthlyRent > 0 ? (monthlyTotal / monthlyRent) * 100 : 0;

    return {
      tax: t,
      insurance: ins,
      security: sec,
      utilities: util,
      HOA: h,
      capex: cap,
      management: mgmtFlat,
      management_pct: mgmtP,
      maintenance: maintFlat,
      maintenance_pct: maintP,
      monthlyTotal,
      annualTotal,
      oer,
    };
  }, [tax, insurance, security, utilities, HOA, capex, mgmtMode, management, managementPct, maintMode, maintenance, maintenancePct, monthlyRent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        'financials.tax': calculatedExpenses.tax,
        'financials.insurance': calculatedExpenses.insurance,
        'financials.security': calculatedExpenses.security,
        'financials.utilities': calculatedExpenses.utilities,
        'financials.HOA': calculatedExpenses.HOA,
        'financials.capex': calculatedExpenses.capex,
        // Management fields: write null to clear the inactive slot
        'financials.management': calculatedExpenses.management,
        'financials.management_pct': calculatedExpenses.management_pct,
        // Maintenance fields: write null to clear the inactive slot
        'financials.maintenance': calculatedExpenses.maintenance,
        'financials.maintenance_pct': calculatedExpenses.maintenance_pct,
        // Attachments
        'financials.taxBillUrl': taxBillUrl || null,
        'financials.t12Url': t12Url || null,
      };

      await onSave(updates);
      toast.success('Expense assumptions saved successfully!');
    } catch (err) {
      console.error('Failed to save expense assumptions:', err);
      toast.error('Failed to save expense assumptions');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-white/5 bg-[#161217] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
            <Receipt className="h-4 w-4 text-[#ffac5a]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Expense Assumptions</h4>
            <p className="text-[9px] text-[#9E9DA0]">Projected property operating expenses (Annual & Monthly)</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1 rounded bg-[#241e26] border border-white/10 hover:bg-white/5 text-white text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Expenses'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Input Forms */}
          <div className="space-y-4">
            {/* Tax Input */}
            <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
              <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Tax (Monthly)</span>
              <div className="relative w-[130px]">
                <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="Annual Property Taxes"
                  className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                />
              </div>
            </div>

            {/* Insurance Input with estimate warning */}
            <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="block text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Insurance (Monthly)</span>
                  <span className="block text-[8px] text-yellow-400/80 font-mono mt-0.5">
                    estimate — a real quote replaces this in Due Diligence.
                  </span>
                </div>
                <div className="relative w-[130px] shrink-0">
                  <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                  <input
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    placeholder="Annual Homeowners Insurance"
                    className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                  />
                </div>
              </div>
            </div>

            {/* Security Input */}
            <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
              <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Security (Monthly)</span>
              <div className="relative w-[130px]">
                <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                <input
                  type="number"
                  value={security}
                  onChange={(e) => setSecurity(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                />
              </div>
            </div>

            {/* Utilities Input */}
            <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
              <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Utilities (Monthly)</span>
              <div className="relative w-[130px]">
                <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                <input
                  type="number"
                  value={utilities}
                  onChange={(e) => setUtilities(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                />
              </div>
            </div>

            {/* HOA Input */}
            <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
              <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">HOA (Monthly)</span>
              <div className="relative w-[130px]">
                <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                <input
                  type="number"
                  value={HOA}
                  onChange={(e) => setHOA(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                />
              </div>
            </div>

            {/* CapEx Reserve Input */}
            <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
              <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">CapEx (Monthly)</span>
              <div className="relative w-[130px]">
                <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                <input
                  type="number"
                  value={capex}
                  onChange={(e) => setCapex(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                />
              </div>
            </div>

            {/* Management Fee with basis % support */}
            <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Management</span>
                <div className="flex rounded bg-[#161217] p-0.5 border border-white/10">
                  <button
                    onClick={() => setMgmtMode('flat')}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${mgmtMode === 'flat' ? 'bg-[#ffac5a] text-black' : 'text-[#9E9DA0] hover:text-white'}`}
                  >
                    Flat ($)
                  </button>
                  <button
                    onClick={() => setMgmtMode('percent')}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${mgmtMode === 'percent' ? 'bg-[#ffac5a] text-black' : 'text-[#9E9DA0] hover:text-white'}`}
                  >
                    Basis (%)
                  </button>
                </div>
              </div>

              {mgmtMode === 'flat' ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[8px] text-[#9E9DA0]">Flat monthly management cost</span>
                  <div className="relative w-[130px]">
                    <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                    <input
                      type="number"
                      value={management}
                      onChange={(e) => setManagement(e.target.value)}
                      placeholder="0"
                      className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-[#9E9DA0] font-bold uppercase tracking-wider">Management fee %</span>
                    <span className="text-[8px] text-green-400 font-bold mt-0.5">% of gross scheduled rent</span>
                  </div>
                  <div className="relative w-[90px]">
                    <input
                      type="number"
                      value={managementPct}
                      onChange={(e) => setManagementPct(e.target.value)}
                      placeholder="8"
                      className="w-full pr-6 pl-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                    />
                    <Percent className="absolute right-2.5 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                  </div>
                </div>
              )}
            </div>

            {/* Maintenance Cost with basis % support */}
            <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Maintenance</span>
                <div className="flex rounded bg-[#161217] p-0.5 border border-white/10">
                  <button
                    onClick={() => setMaintMode('flat')}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${maintMode === 'flat' ? 'bg-[#ffac5a] text-black' : 'text-[#9E9DA0] hover:text-white'}`}
                  >
                    Flat ($)
                  </button>
                  <button
                    onClick={() => setMaintMode('percent')}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${maintMode === 'percent' ? 'bg-[#ffac5a] text-black' : 'text-[#9E9DA0] hover:text-white'}`}
                  >
                    Basis (%)
                  </button>
                </div>
              </div>

              {maintMode === 'flat' ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[8px] text-[#9E9DA0]">Flat monthly maintenance reserve</span>
                  <div className="relative w-[130px]">
                    <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                    <input
                      type="number"
                      value={maintenance}
                      onChange={(e) => setMaintenance(e.target.value)}
                      placeholder="0"
                      className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-[#9E9DA0] font-bold uppercase tracking-wider">Maintenance fee %</span>
                    <span className="text-[8px] text-green-400 font-bold mt-0.5">% of gross scheduled rent</span>
                  </div>
                  <div className="relative w-[90px]">
                    <input
                      type="number"
                      value={maintenancePct}
                      onChange={(e) => setMaintPct(e.target.value)}
                      placeholder="5"
                      className="w-full pr-6 pl-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                    />
                    <Percent className="absolute right-2.5 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Attachments & Rollups */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Optional Attachments Section */}
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-lg space-y-4">
              <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold">Document Attachments (Optional)</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tax Bill attachment */}
                <div className="border border-dashed border-white/10 hover:border-white/20 rounded-lg p-3 text-center transition-colors relative">
                  {taxBillUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center text-green-400">
                        <Check className="h-5 w-5" />
                      </div>
                      <span className="block text-[8px] text-white/70 font-mono truncate max-w-[120px] mx-auto">{taxBillName}</span>
                      <button
                        onClick={() => removeAttachment('taxBill')}
                        className="text-[8px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider flex items-center justify-center gap-1 mx-auto"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block space-y-2">
                      <Upload className="h-4 w-4 text-[#9E9DA0] mx-auto opacity-60" />
                      <span className="block text-[9px] text-[#9E9DA0] font-bold uppercase tracking-wider">
                        {uploadingType === 'taxBill' ? 'Uploading...' : 'Tax Bill'}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => handleFileUpload(e, 'taxBill')}
                        disabled={uploadingType !== null}
                        className="hidden"
                        ref={taxFileInputRef}
                      />
                    </label>
                  )}
                </div>

                {/* T-12 statement attachment */}
                <div className="border border-dashed border-white/10 hover:border-white/20 rounded-lg p-3 text-center transition-colors relative">
                  {t12Url ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center text-green-400">
                        <Check className="h-5 w-5" />
                      </div>
                      <span className="block text-[8px] text-white/70 font-mono truncate max-w-[120px] mx-auto">{t12Name}</span>
                      <button
                        onClick={() => removeAttachment('t12')}
                        className="text-[8px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider flex items-center justify-center gap-1 mx-auto"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block space-y-2">
                      <Upload className="h-4 w-4 text-[#9E9DA0] mx-auto opacity-60" />
                      <span className="block text-[9px] text-[#9E9DA0] font-bold uppercase tracking-wider">
                        {uploadingType === 't12' ? 'Uploading...' : 'T-12 Statement'}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,image/*,.xls,.xlsx,.csv"
                        onChange={(e) => handleFileUpload(e, 't12')}
                        disabled={uploadingType !== null}
                        className="hidden"
                        ref={t12FileInputRef}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Live OpEx rollups & indicators */}
            <div className="bg-white/[0.02] border border-white/10 p-5 rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#9E9DA0] tracking-wider">Operating Expenses (Monthly)</span>
                  <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Model total monthly outlays</span>
                </div>
                <span className="text-sm font-mono font-bold text-white">
                  {formatCurrency(calculatedExpenses.monthlyTotal)} / mo
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#9E9DA0] tracking-wider">Operating Expenses (Annual)</span>
                  <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Model total annualized operating cost</span>
                </div>
                <span className="text-sm font-mono font-semibold text-white">
                  {formatCurrency(calculatedExpenses.annualTotal)} / yr
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#ffac5a] tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Operating Expense Ratio (OER)
                  </span>
                  <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Based on scheduled monthly rent ({formatCurrency(monthlyRent)})</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-mono font-bold text-[#ffac5a] block">
                    {calculatedExpenses.oer.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

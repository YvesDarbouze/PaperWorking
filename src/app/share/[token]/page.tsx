'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { 
  Download, 
  FileText, 
  Percent, 
  AlertCircle, 
  Loader2, 
  Lock,
  Building,
  CheckCircle
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import toast, { Toaster } from 'react-hot-toast';

const DISCLAIMER = "This is not tax advice. Review with a licensed tax professional before filing. PaperWorking does not file taxes on your behalf.";

interface SchedEPreview {
  projectId: string;
  propertyName: string;
  physicalAddress: string;
  propertyType: number;
  activeMonths: number;
  grossRents: number;
  advertising: number;
  autoTravel: number;
  cleaning: number;
  commissions: number;
  insurance: number;
  legalProfessional: number;
  managementFees: number;
  mortgageInterest: number;
  otherInterest: number;
  repairs: number;
  supplies: number;
  taxes: number;
  utilities: number;
  depreciation: number;
  other: number;
  totalExpenses: number;
  netIncome: number;
}

interface PLReport {
  projectId: string;
  propertyName: string;
  taxYear: number;
  activeMonths: number;
  rentalIncome: number;
  otherIncome: number;
  grossRevenue: number;
  propertyTaxes: number;
  insurance: number;
  utilities: number;
  managementFees: number;
  repairsMaintenance: number;
  hoaFees: number;
  otherExpenses: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  mortgageInterest: number;
  mortgagePrincipal: number;
  capitalizedImprovements: number;
  depreciation: number;
  netTaxableIncome: number;
  netCashFlow: number;
  isSold: boolean;
  salePrice: number;
  sellingCosts: number;
  netProceeds: number;
  realizedGainLoss: number;
}

interface AggregatedSchedE {
  [key: string]: any;
  activeMonths: number;
  grossRents: number;
  advertising: number;
  autoTravel: number;
  cleaning: number;
  commissions: number;
  insurance: number;
  legalProfessional: number;
  managementFees: number;
  mortgageInterest: number;
  otherInterest: number;
  repairs: number;
  supplies: number;
  taxes: number;
  utilities: number;
  depreciation: number;
  other: number;
  totalExpenses: number;
  netIncome: number;
}

interface AggregatedPL {
  [key: string]: any;
  taxYear: number;
  activePropertiesCount: number;
  totalActiveMonths: number;
  rentalIncome: number;
  otherIncome: number;
  grossRevenue: number;
  propertyTaxes: number;
  insurance: number;
  utilities: number;
  managementFees: number;
  repairsMaintenance: number;
  hoaFees: number;
  otherExpenses: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  mortgageInterest: number;
  mortgagePrincipal: number;
  capitalizedImprovements: number;
  depreciation: number;
  netTaxableIncome: number;
  netCashFlow: number;
  propertiesSold: number;
  totalSalePrice: number;
  totalSellingCosts: number;
  totalNetProceeds: number;
  totalRealizedGainLoss: number;
}

export default function CPASharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schedE' | 'pl'>('schedE');
  const [exporting, setExporting] = useState(false);

  // Computed data from token
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [previews, setPreviews] = useState<SchedEPreview[]>([]);
  const [aggregatedSchedE, setAggregatedSchedE] = useState<AggregatedSchedE | null>(null);
  const [plReports, setPlReports] = useState<PLReport[]>([]);
  const [aggregatedPL, setAggregatedPL] = useState<AggregatedPL | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadShareData = async () => {
      try {
        const response = await fetch(`/api/tax/share/${token}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'This share link is invalid, expired, or has been revoked.');
        }
        const data = await response.json();
        setTaxYear(data.taxYear);
        setPreviews(data.previews || []);
        setAggregatedSchedE(data.aggregatedSchedE || null);
        setPlReports(data.plReports || []);
        setAggregatedPL(data.aggregatedPL || null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadShareData();
  }, [token]);

  // Handle Tax Pack ZIP download
  const handleDownloadTaxPack = async () => {
    setExporting(true);
    const loadToast = toast.loading('Compiling year-end ZIP bundle...');
    try {
      const response = await fetch('/api/tax/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareToken: token }),
      });

      if (!response.ok) {
        throw new Error('Failed to download ZIP Tax Pack');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PaperWorking_TaxPack_${taxYear}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('ZIP Tax Pack downloaded successfully!', { id: loadToast });
    } catch (err: any) {
      toast.error(err.message || 'Download failed', { id: loadToast });
    } finally {
      setExporting(false);
    }
  };

  const fmtCurrency = (v: number) => {
    return v >= 0 
      ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : `-$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Loading state
  if (loading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center text-on-surface"
        style={{ background: 'linear-gradient(135deg, #0d0a0b 0%, #0f1922 40%, #0d0a0b 100%)' }}
      >
        <Loader2 className="w-10 h-10 animate-spin text-[#6E7480] mb-4" />
        <p className="text-sm font-semibold text-[#9E9DA0]">Loading secure tax data...</p>
      </div>
    );
  }

  // Error / Expired state
  if (error) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-6 text-on-surface"
        style={{ background: 'linear-gradient(135deg, #0d0a0b 0%, #0f1922 40%, #0d0a0b 100%)' }}
      >
        <div className="w-full max-w-md border border-white/10 rounded-2xl p-8 space-y-6 text-center shadow-2xl bg-white/[0.02]" style={{ backdropFilter: 'blur(20px)' }}>
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Access Expired or Revoked</h1>
            <p className="text-sm text-[#9E9DA0] leading-relaxed">
              This tax professional sharing link has expired, been revoked by the owner, or is invalid.
            </p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-[#6B6870]">Contact the property owner to request a new secure sharing link.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col text-on-surface pb-12"
      style={{ background: 'linear-gradient(135deg, #0d0a0b 0%, #0f1922 40%, #0d0a0b 100%)' }}
    >
      <Toaster position="top-right" />
      
      {/* ── Navbar Header ── */}
      <header className="border-b border-white/5 bg-black/25 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Logo size="md" theme="dark" />
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#6E7480] bg-[#454955]/10 border border-[#454955]/20 rounded-full px-3 py-1">
            Secure CPA Portal
          </span>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6 flex-1 w-full">
        {/* Title area */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Tax Portfolio Review — FY {taxYear}</h2>
            <p className="text-xs text-[#9E9DA0] mt-1">Read-only access to Schedule E and Profit & Loss statements shared for accountant review.</p>
          </div>
          <button
            onClick={handleDownloadTaxPack}
            disabled={exporting}
            className="flex items-center justify-center gap-2 bg-[#454955] hover:bg-[#6E7480] text-black px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-200 shadow-lg shadow-[#454955]/10 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling ZIP...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Tax Pack (ZIP)
              </>
            )}
          </button>
        </div>

        {/* Disclaimer Alert */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 text-xs md:text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            <span className="font-bold text-red-300 uppercase mr-1">Disclaimer:</span>
            {DISCLAIMER}
          </p>
        </div>

        {/* Tabs Control */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('schedE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'schedE'
                ? 'bg-[#454955] text-black'
                : 'text-[#9E9DA0] hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Schedule E Preview
          </button>
          <button
            onClick={() => setActiveTab('pl')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'pl'
                ? 'bg-[#454955] text-black'
                : 'text-[#9E9DA0] hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Profit & Loss Summary
          </button>
        </div>

        {/* Shared Properties list */}
        <div className="rounded-2xl border border-white/10 p-5 space-y-3" style={{ background: 'rgba(13,10,11,0.3)', backdropFilter: 'blur(20px)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0] flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-[#6E7480]" />
            Properties in this share ({previews.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {previews.map((p, idx) => (
              <div 
                key={p.projectId} 
                className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs font-semibold text-white flex items-center gap-2"
              >
                <span className="w-4 h-4 rounded bg-[#454955]/10 text-[#6E7480] flex items-center justify-center text-[10px] font-bold">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{p.propertyName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab 1: Schedule E Preview */}
        {activeTab === 'schedE' && aggregatedSchedE && (
          <div className="rounded-2xl border border-white/10 p-6 space-y-6" style={{ background: 'rgba(13,10,11,0.3)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Schedule E (Form 1040) Preview</h3>
              <span className="text-[10px] font-bold text-[#6E7480] border border-[#454955]/20 bg-[#454955]/5 px-2 py-0.5 rounded-full uppercase tracking-wider">IRS Form 1040</span>
            </div>

            <div className="overflow-x-auto border border-white/5 rounded-xl">
              <table className="w-full text-xs text-left min-w-[800px]">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-4 py-3 font-bold text-[#9E9DA0] uppercase tracking-widest text-[9px]">Schedule E Item</th>
                    <th className="px-4 py-3 font-bold text-[#6E7480] uppercase tracking-widest text-[9px] bg-[#454955]/5">Portfolio Total</th>
                    {previews.map((p, idx) => (
                      <th key={p.projectId} className="px-4 py-3 font-bold text-[#C0BEC2] uppercase tracking-widest text-[9px]">
                        {String.fromCharCode(65 + idx)}) {p.propertyName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    { label: '3. Rents received', key: 'grossRents' },
                    { label: '5. Advertising', key: 'advertising' },
                    { label: '6. Auto and travel', key: 'autoTravel' },
                    { label: '7. Cleaning and maintenance', key: 'cleaning' },
                    { label: '8. Commissions', key: 'commissions' },
                    { label: '9. Insurance', key: 'insurance' },
                    { label: '10. Legal & professional fees', key: 'legalProfessional' },
                    { label: '11. Management fees', key: 'managementFees' },
                    { label: '12. Mortgage interest (banks)', key: 'mortgageInterest' },
                    { label: '13. Other interest', key: 'otherInterest' },
                    { label: '14. Repairs', key: 'repairs' },
                    { label: '15. Supplies', key: 'supplies' },
                    { label: '16. Taxes', key: 'taxes' },
                    { label: '17. Utilities', key: 'utilities' },
                    { label: '18. Depreciation expense', key: 'depreciation' },
                    { label: '19. Other expenses', key: 'other' },
                    { label: 'Total Expenses (5-19)', key: 'totalExpenses', isBold: true },
                    { label: 'Net Income / Loss (3-Total)', key: 'netIncome', isBold: true, isHighlight: true }
                  ].map((row) => {
                    const isNet = row.key === 'netIncome';
                    return (
                      <tr 
                        key={row.key} 
                        className={`${row.isBold ? 'bg-white/[0.02] font-semibold' : ''} ${isNet ? 'bg-white/[0.04]' : ''}`}
                      >
                        <td className="px-4 py-2.5 font-medium text-[#C0BEC2]">{row.label}</td>
                        <td className={`px-4 py-2.5 tabular-nums bg-[#454955]/5 font-bold ${isNet ? (aggregatedSchedE.netIncome >= 0 ? 'text-[#6E7480]' : 'text-red-400') : 'text-[#8a8e9a]'}`}>
                          {fmtCurrency((aggregatedSchedE as any)[row.key])}
                        </td>
                        {previews.map((p) => {
                          const val = (p as any)[row.key];
                          return (
                            <td 
                              key={p.projectId} 
                              className={`px-4 py-2.5 tabular-nums ${isNet ? (val >= 0 ? 'text-[#6E7480]' : 'text-red-400') : 'text-[#9E9DA0]'}`}
                            >
                              {fmtCurrency(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Profit & Loss Summary */}
        {activeTab === 'pl' && aggregatedPL && (
          <div className="rounded-2xl border border-white/10 p-6 space-y-6" style={{ background: 'rgba(13,10,11,0.3)', backdropFilter: 'blur(20px)' }}>
            <div>
              <h3 className="text-base font-bold text-white">Profit & Loss Statements</h3>
              <p className="text-xs text-[#9E9DA0] mt-0.5">Operating income statement and tax summaries.</p>
            </div>

            <div className="overflow-x-auto border border-white/5 rounded-xl">
              <table className="w-full text-xs text-left min-w-[800px]">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-4 py-3 font-bold text-[#9E9DA0] uppercase tracking-widest text-[9px]">Financial Metric</th>
                    <th className="px-4 py-3 font-bold text-[#6E7480] uppercase tracking-widest text-[9px] bg-[#454955]/5">Portfolio Total</th>
                    {plReports.map((p, idx) => (
                      <th key={p.projectId} className="px-4 py-3 font-bold text-[#C0BEC2] uppercase tracking-widest text-[9px]">
                        {String.fromCharCode(65 + idx)}) {p.propertyName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    // Revenues
                    { label: 'OPERATING INCOME', isSection: true },
                    { label: 'Rental Income', key: 'rentalIncome' },
                    { label: 'Other Operating Income', key: 'otherIncome' },
                    { label: 'Gross Operating Revenue', key: 'grossRevenue', isSubtotal: true },
                    
                    // Operating Expenses
                    { label: 'OPERATING EXPENSES', isSection: true },
                    { label: 'Property Taxes', key: 'propertyTaxes' },
                    { label: 'Property Insurance', key: 'insurance' },
                    { label: 'Utilities', key: 'utilities' },
                    { label: 'Management Fees', key: 'managementFees' },
                    { label: 'Repairs & Maintenance', key: 'repairsMaintenance' },
                    { label: 'HOA Fees', key: 'hoaFees' },
                    { label: 'Other Expenses', key: 'otherExpenses' },
                    { label: 'Total Operating Expenses', key: 'totalOperatingExpenses', isSubtotal: true },
                    
                    // NOI
                    { label: 'NET OPERATING INCOME (NOI)', key: 'netOperatingIncome', isTotal: true },
                    
                    // Deductions & Capital Items
                    { label: 'DEDUCTIONS & CAPITAL FLOWS', isSection: true },
                    { label: 'Mortgage Interest paid', key: 'mortgageInterest' },
                    { label: 'Mortgage Principal paid', key: 'mortgagePrincipal' },
                    { label: 'Capitalized Improvements', key: 'capitalizedImprovements' },
                    { label: 'Depreciation Expense', key: 'depreciation' },
                    
                    // Results
                    { label: 'NET TAXABLE INCOME / RESULT', key: 'netTaxableIncome', isTotal: true, isHighlight: true },
                    { label: 'NET CASH FLOW', key: 'netCashFlow', isTotal: true, isHighlight: true }
                  ].map((row) => {
                    if (row.isSection) {
                      return (
                        <tr key={row.label} className="bg-white/[0.02]">
                          <td colSpan={2 + plReports.length} className="px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#6B6870]">
                            {row.label}
                          </td>
                        </tr>
                      );
                    }

                    const isSub = row.isSubtotal;
                    const isTot = row.isTotal;
                    const isHighlight = row.isHighlight;
                    const fontClass = isTot ? 'font-bold text-white' : isSub ? 'font-semibold text-slate-200' : 'text-[#C0BEC2]';
                    const bgClass = isTot ? 'bg-white/[0.03]' : isSub ? 'bg-white/[0.01]' : '';

                    return (
                      <tr key={row.key} className={`${fontClass} ${bgClass}`}>
                        <td className="px-4 py-2.5 pl-6 font-medium">{row.label}</td>
                        <td className={`px-4 py-2.5 tabular-nums bg-[#454955]/5 font-bold ${isHighlight ? (aggregatedPL[row.key!] >= 0 ? 'text-[#6E7480]' : 'text-red-400') : 'text-[#8a8e9a]'}`}>
                          {fmtCurrency(aggregatedPL[row.key!])}
                        </td>
                        {plReports.map((p) => {
                          const val = (p as any)[row.key!];
                          return (
                            <td 
                              key={p.projectId} 
                              className={`px-4 py-2.5 tabular-nums ${isHighlight ? (val >= 0 ? 'text-[#6E7480]' : 'text-red-400') : 'text-[#9E9DA0]'}`}
                            >
                              {fmtCurrency(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

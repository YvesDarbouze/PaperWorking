'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { computeScheduleE, ScheduleEPreview } from '@/lib/tax/scheduleE';
import { computeProjectProfitAndLoss, ProjectProfitAndLoss } from '@/lib/tax/profitAndLoss';
import { aggregatePortfolioProfitAndLoss, aggregateScheduleE } from '@/lib/tax/portfolioSummary';
import { 
  Download, 
  Share2, 
  Trash2, 
  Copy, 
  Calendar, 
  CheckSquare, 
  Square,
  AlertCircle,
  FileText,
  Percent,
  CheckCircle,
  Loader2,
  Clock,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const DISCLAIMER = "This is not tax advice. Review with a licensed tax professional before filing. PaperWorking does not file taxes on your behalf.";

interface ShareLink {
  id: string;
  userId: string;
  organizationId: string;
  taxYear: number;
  projectIds: string[];
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  isExpired: boolean;
}

export default function TaxDashboardPage() {
  // Sync all projects and their ledgers into store
  useAllDealsSync();

  const { user } = useAuth();
  const projects = useProjectStore((state) => state.projects);
  const ledgerItemsMap = useProjectStore((state) => state.ledgerItems);

  // Filter out archived projects
  const activeProjects = useMemo(() => {
    return projects.filter((p) => (p.status as string) !== 'Archived');
  }, [projects]);

  // States
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear() - 1); // Defaults to previous year
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'schedE' | 'pl' | 'share'>('schedE');
  const [exporting, setExporting] = useState(false);

  // CPA Share form states
  const [cpaEmail, setCpaEmail] = useState('');
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [generatingShare, setGeneratingShare] = useState(false);
  const [fetchingShares, setFetchingShares] = useState(false);

  // Select all by default when active projects load
  useEffect(() => {
    if (activeProjects.length > 0 && selectedProjectIds.length === 0) {
      setSelectedProjectIds(activeProjects.map((p) => p.id));
    }
  }, [activeProjects, selectedProjectIds]);

  // Toggle Project selection
  const handleToggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Toggle All
  const handleToggleAll = () => {
    if (selectedProjectIds.length === activeProjects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(activeProjects.map((p) => p.id));
    }
  };

  // Compute previews based on selected projects & tax year
  const taxData = useMemo(() => {
    const selectedProjects = activeProjects.filter((p) => selectedProjectIds.includes(p.id));

    const previews = selectedProjects.map((p) => {
      const ledgers = ledgerItemsMap[p.id] || [];
      return computeScheduleE(p, ledgers, taxYear);
    });

    const plReports = selectedProjects.map((p) => {
      const ledgers = ledgerItemsMap[p.id] || [];
      return computeProjectProfitAndLoss(p, ledgers, taxYear);
    });

    const aggregatedSchedE = aggregateScheduleE(previews, taxYear);
    const aggregatedPL = aggregatePortfolioProfitAndLoss(plReports, taxYear);

    // Detect projects missing data required for a complete report
    const incompleteProjects = selectedProjects
      .map((p, i) => {
        const missing: string[] = [];
        const f = p.financials ?? {};
        if (!f.acquisitionDate) missing.push('Acquisition date');
        if (!f.purchasePrice)   missing.push('Purchase price');
        if (!p.address)         missing.push('Property address');
        // activeMonths === 0 means the date range produced no overlap
        if (previews[i]?.activeMonths === 0 && f.acquisitionDate) {
          missing.push(`No activity in ${taxYear}`);
        }
        return missing.length > 0 ? { name: p.name || p.address || p.id, missing } : null;
      })
      .filter(Boolean) as { name: string; missing: string[] }[];

    return {
      previews,
      aggregatedSchedE,
      plReports,
      aggregatedPL,
      hasData: selectedProjects.length > 0,
      incompleteProjects,
    };
  }, [activeProjects, selectedProjectIds, ledgerItemsMap, taxYear]);

  // Fetch created share links
  const fetchShares = useCallback(async () => {
    if (!user) return;
    setFetchingShares(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/tax/share', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch share links:', err);
    } finally {
      setFetchingShares(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  // Handle Tax Pack export / compilation
  const handleGenerateTaxPack = async () => {
    if (selectedProjectIds.length === 0) {
      toast.error('Please select at least one property to export');
      return;
    }

    setExporting(true);
    const loadToast = toast.loading('Compiling year-end PDFs, transactions, and receipts...');
    
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/tax/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ taxYear, projectIds: selectedProjectIds }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate tax pack ZIP');
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
      toast.error(err.message || 'Export failed', { id: loadToast });
    } finally {
      setExporting(false);
    }
  };

  // Create share link
  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProjectIds.length === 0) {
      toast.error('Select at least one property to share');
      return;
    }

    setGeneratingShare(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/tax/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ taxYear, projectIds: selectedProjectIds, cpaEmail: cpaEmail.trim() || undefined }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create share link');
      }

      const data = await response.json();
      toast.success('CPA Share Link created!');
      setCpaEmail('');
      fetchShares();
      
      // Copy to clipboard
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast.success('Link copied to clipboard!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create link');
    } finally {
      setGeneratingShare(false);
    }
  };

  // Revoke share link
  const handleRevokeShareLink = async (token: string) => {
    try {
      const authToken = await user?.getIdToken();
      const response = await fetch('/api/tax/share/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to revoke link');
      }

      toast.success('Share link revoked');
      fetchShares();
    } catch (err: any) {
      toast.error(err.message || 'Revoke failed');
    }
  };

  const fmtCurrency = (v: number) => {
    return v >= 0 
      ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : `-$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="min-h-full px-4 md:px-8 py-8 space-y-6 text-on-surface">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Tax Center</h1>
          <p className="text-sm text-[#9E9DA0] mt-1">Generate Schedule E, P&Ls, year-end Tax Packs, and share secure access with your accountant.</p>
        </div>
        <button
          onClick={handleGenerateTaxPack}
          disabled={exporting || !taxData.hasData}
          className="flex items-center justify-center gap-2 bg-[#454955] hover:bg-[#6E7480] text-black px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-200 shadow-lg shadow-[#454955]/10 disabled:opacity-50"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Compiling...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate Tax Pack (ZIP)
            </>
          )}
        </button>
      </div>

      {/* ── Disclaimer Alert ── */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 text-xs md:text-sm">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          <span className="font-bold text-red-300 uppercase mr-1">Important:</span>
          {DISCLAIMER}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Left Sidebar Filter Control ── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Year selector */}
          <div className="rounded-2xl border border-white/10 p-5 space-y-3" style={{ background: 'rgba(13,10,11,0.4)', backdropFilter: 'blur(20px)' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#6E7480]" />
              Tax Calendar Year
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[2024, 2025, 2026].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setTaxYear(yr)}
                  className={`py-2 rounded-lg text-xs font-bold tabular-nums transition-all border ${
                    taxYear === yr
                      ? 'border-[#454955] bg-[#454955]/10 text-[#6E7480] shadow-inner'
                      : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:text-slate-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Properties multi-select */}
          <div className="rounded-2xl border border-white/10 p-5 space-y-3" style={{ background: 'rgba(13,10,11,0.4)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0]">Included Properties</h2>
              <button
                onClick={handleToggleAll}
                className="text-[10px] font-bold uppercase tracking-widest text-[#6E7480] hover:text-[#8a8e9a] transition-colors"
              >
                {selectedProjectIds.length === activeProjects.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            {activeProjects.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {activeProjects.map((p) => {
                  const isChecked = selectedProjectIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleToggleProject(p.id)}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all duration-200"
                      style={{
                        background: isChecked ? 'rgba(255,255,255,0.03)' : 'transparent',
                        borderColor: isChecked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <span className="mt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#6E7480]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#6B6870]" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.propertyName || p.address}</p>
                        <p className="text-[10px] text-[#9E9DA0] truncate mt-0.5">{p.address || 'No Address'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#6B6870]">No properties available. Create one to see tax reports.</p>
            )}
          </div>
        </div>

        {/* ── Main Tabbed Preview Area ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Navigation Tabs */}
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
            <button
              onClick={() => setActiveTab('share')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'share'
                  ? 'bg-[#454955] text-black'
                  : 'text-[#9E9DA0] hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              CPA Share Links
            </button>
          </div>

          {/* Tab 1: Schedule E Preview */}
          {activeTab === 'schedE' && (
            <div className="rounded-2xl border border-white/10 p-6 space-y-6" style={{ background: 'rgba(13,10,11,0.4)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Schedule E (Form 1040) Preview</h3>
                  <p className="text-xs text-[#9E9DA0] mt-0.5">Aggregated portfolio and property-by-property IRS-ready mapping for {taxYear}.</p>
                </div>
                <span className="text-[10px] font-bold text-[#6E7480] border border-[#454955]/20 bg-[#454955]/5 px-2 py-0.5 rounded-full uppercase tracking-wider">IRS Form 1040</span>
              </div>

              {!taxData.hasData ? (
                <div className="py-12 text-center text-xs text-[#6B6870]">
                  Select one or more properties in the sidebar to load the Schedule E preview.
                </div>
              ) : taxData.incompleteProjects.length > 0 ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-amber-400 text-xl shrink-0 mt-0.5 select-none">warning</span>
                      <div>
                        <p className="text-sm font-semibold text-amber-300">Incomplete project data — partial report only</p>
                        <p className="text-xs text-amber-300/70 mt-0.5">
                          The following properties are missing required fields. Fill them in on the project workspace to generate a complete Schedule E.
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2 pl-9">
                      {taxData.incompleteProjects.map((proj) => (
                        <li key={proj.name} className="text-xs text-amber-200/80">
                          <span className="font-semibold">{proj.name}</span>
                          {' — missing: '}
                          <span className="text-amber-300">{proj.missing.join(', ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-white/5 rounded-xl">
                  <table className="w-full text-xs text-left min-w-[800px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-4 py-3 font-bold text-[#9E9DA0] uppercase tracking-widest text-[9px]">Schedule E Item</th>
                        <th className="px-4 py-3 font-bold text-[#6E7480] uppercase tracking-widest text-[9px] bg-[#454955]/5">Portfolio Total</th>
                        {taxData.previews.map((p, idx) => (
                          <th key={p.projectId} className="px-4 py-3 font-bold text-[#C0BEC2] uppercase tracking-widest text-[9px] max-w-[150px] truncate">
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
                            <td className={`px-4 py-2.5 tabular-nums bg-[#454955]/5 font-bold ${isNet ? (taxData.aggregatedSchedE.netIncome >= 0 ? 'text-[#6E7480]' : 'text-red-400') : 'text-[#8a8e9a]'}`}>
                              {fmtCurrency((taxData.aggregatedSchedE as any)[row.key])}
                            </td>
                            {taxData.previews.map((p) => {
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
              )}
            </div>
          )}

          {/* Tab 2: Profit & Loss Summary */}
          {activeTab === 'pl' && (
            <div className="rounded-2xl border border-white/10 p-6 space-y-6" style={{ background: 'rgba(13,10,11,0.4)', backdropFilter: 'blur(20px)' }}>
              <div>
                <h3 className="text-base font-bold text-white">Profit & Loss Statements</h3>
                <p className="text-xs text-[#9E9DA0] mt-0.5">Operating and capital financials breakdown for {taxYear}.</p>
              </div>

              {!taxData.hasData ? (
                <div className="py-12 text-center text-xs text-[#6B6870]">
                  Select one or more properties in the sidebar to load P&L reports.
                </div>
              ) : (
                <div className="overflow-x-auto border border-white/5 rounded-xl">
                  <table className="w-full text-xs text-left min-w-[800px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-4 py-3 font-bold text-[#9E9DA0] uppercase tracking-widest text-[9px]">Financial Metric</th>
                        <th className="px-4 py-3 font-bold text-[#6E7480] uppercase tracking-widest text-[9px] bg-[#454955]/5">Portfolio Total</th>
                        {taxData.plReports.map((p, idx) => (
                          <th key={p.projectId} className="px-4 py-3 font-bold text-[#C0BEC2] uppercase tracking-widest text-[9px] max-w-[150px] truncate">
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
                      ].map((row, rIdx) => {
                        if (row.isSection) {
                          return (
                            <tr key={row.label} className="bg-white/[0.02]">
                              <td colSpan={2 + taxData.plReports.length} className="px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#6B6870]">
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
                            <td className={`px-4 py-2.5 tabular-nums bg-[#454955]/5 font-bold ${isHighlight ? ((taxData.aggregatedPL as any)[row.key!] >= 0 ? 'text-[#6E7480]' : 'text-red-400') : 'text-[#8a8e9a]'}`}>
                              {fmtCurrency((taxData.aggregatedPL as any)[row.key!])}
                            </td>
                            {taxData.plReports.map((p) => {
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
              )}
            </div>
          )}

          {/* Tab 3: CPA Share Portal */}
          {activeTab === 'share' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to generate new link */}
              <div className="lg:col-span-1 rounded-2xl border border-white/10 p-6 space-y-4 h-fit" style={{ background: 'rgba(13,10,11,0.4)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Share2 className="w-4 h-4 text-[#6E7480]" />
                  <h3 className="text-sm font-bold text-white">Share with Accountant</h3>
                </div>
                
                <p className="text-xs text-[#9E9DA0] leading-relaxed">
                  Generates a secure, read-only dashboard link for your CPA. The link includes live tax previews and downloads for this tax year and the selected properties.
                </p>

                <form onSubmit={handleCreateShareLink} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
                      Tax Year
                    </label>
                    <div className="text-sm font-bold text-white bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
                      {taxYear} Calendar Year
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
                      Properties Shared
                    </label>
                    <div className="text-xs font-semibold text-[#6E7480] bg-[#454955]/10 border border-[#454955]/20 px-3 py-2 rounded-lg">
                      {selectedProjectIds.length} properties selected
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="cpaEmail" className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
                      CPA Email (optional)
                    </label>
                    <input
                      id="cpaEmail"
                      name="cpaEmail"
                      type="email"
                      value={cpaEmail}
                      onChange={(e) => setCpaEmail(e.target.value)}
                      placeholder="accountant@firm.com"
                      className="w-full text-sm text-white bg-white/5 border border-white/10 px-3 py-2 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#454955] focus:border-[#454955]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={generatingShare || selectedProjectIds.length === 0}
                    className="w-full py-2.5 rounded-lg bg-[#454955] hover:bg-[#6E7480] text-black text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {generatingShare ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        Generate Link
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Share links list */}
              <div className="lg:col-span-2 rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: 'rgba(13,10,11,0.4)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Clock className="w-4 h-4 text-[#6E7480]" />
                  <h3 className="text-sm font-bold text-white">Active Share Links</h3>
                </div>

                {fetchingShares ? (
                  <div className="py-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#6E7480]" />
                  </div>
                ) : shares.length > 0 ? (
                  <div className="space-y-3">
                    {shares.map((share) => {
                      const isRevoked = share.revoked;
                      const isExpired = share.isExpired;
                      const isActive = !isRevoked && !isExpired;
                      const linkUrl = `${window.location.origin}/share/${share.id}`;

                      return (
                        <div 
                          key={share.id} 
                          className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white tabular-nums">FY {share.taxYear}</span>
                              <span className="text-[10px] font-semibold text-[#9E9DA0]">• {share.projectIds.length} properties</span>
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                isActive ? 'bg-[#454955]/10 text-[#6E7480] border border-[#454955]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                              </span>
                            </div>
                            
                            {isActive && (
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(linkUrl);
                                  toast.success('Link copied!');
                                }}
                                className="flex items-center gap-1.5 text-[11px] text-[#9E9DA0] hover:text-[#6E7480] transition-colors w-full text-left font-mono truncate"
                              >
                                <Copy className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{linkUrl}</span>
                              </button>
                            )}

                            <div className="text-[10px] text-[#6B6870]">
                              Created: {new Date(share.createdAt).toLocaleDateString()} · Expires: {new Date(share.expiresAt).toLocaleDateString()}
                            </div>
                          </div>

                          {isActive && (
                            <button
                              onClick={() => handleRevokeShareLink(share.id)}
                              className="px-3 py-1.5 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Revoke
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B6870] py-8 text-center">No share links created yet. Use the form on the left to generate one.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

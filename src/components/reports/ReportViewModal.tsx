'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Calendar,
  Building2,
  Layers,
  Clock,
  ShieldAlert,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  generatePLStatement,
  generateBalanceSheet,
  generateCashFlowStatement,
  generateRentRollReport,
  generateSREOReport,
  generateTaxWorksheet1040ES,
  generateQuarterlyBudgetVsActuals,
  generateCapExTrackerReport,
  exportSREOCSV,
  exportCapExCSV,
  exportReportPDF,
  formatCurrency,
  formatPercent,
  TAX_DISCLAIMER,
  type ReportOptions,
} from '@/lib/reports/reportEngine';
import {
  generateScheduleEReport,
  generateDepreciationSchedule,
  generateClosingDocumentIndex,
  generateForm1099Summary,
  generateLogBooks,
  generateOneClickCPAPackage,
  exportCPAPackagePDF,
  SCHEDULE_E_LINE_NAMES,
  IRS_1099_THRESHOLD,
  type ScheduleELineKey,
} from '@/lib/reports/cpaPackageEngine';
import toast from 'react-hot-toast';

export interface ReportViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId:
    | 'PL'
    | 'BALANCE_SHEET'
    | 'CASH_FLOW'
    | 'RENT_ROLL'
    | 'SREO'
    | 'TAX_1040ES'
    | 'BUDGET_VS_ACTUALS'
    | 'SCHEDULE_E'
    | 'DEPRECIATION_SCHEDULE'
    | 'FORM_1099_SUMMARY'
    | 'LOG_BOOKS'
    | 'CLOSING_DOCS_INDEX'
    | 'CPA_PACKAGE_BUNDLE'
    | 'CAPEX_TRACKER';
  projects: any[];
}

function renderValueOrUnrecorded(val: number | null | undefined) {
  if (val === null || val === undefined) {
    return <span className="text-amber-500/90 font-mono italic font-normal text-xs">Unrecorded Input</span>;
  }
  return formatCurrency(val);
}

export function ReportViewModal({ isOpen, onClose, reportId, projects }: ReportViewModalProps) {
  const [scope, setScope] = useState<'portfolio' | 'project'>('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [period, setPeriod] = useState<'Monthly' | 'Quarterly' | 'Annual' | 'YTD' | 'Custom'>('Annual');

  if (!isOpen) return null;

  const options: ReportOptions = {
    scope,
    projectId: selectedProjectId,
    period,
  };

  const plData = reportId === 'PL' ? generatePLStatement(projects, options) : null;
  const bsData = reportId === 'BALANCE_SHEET' ? generateBalanceSheet(projects, options) : null;
  const cfData = reportId === 'CASH_FLOW' ? generateCashFlowStatement(projects, options) : null;
  const rrData = reportId === 'RENT_ROLL' ? generateRentRollReport(projects, options) : null;
  const sreoData = reportId === 'SREO' ? generateSREOReport(projects) : null;
  const taxData = reportId === 'TAX_1040ES' ? generateTaxWorksheet1040ES(projects, options) : null;
  const bvaData = reportId === 'BUDGET_VS_ACTUALS' ? generateQuarterlyBudgetVsActuals(projects, options) : null;
  const capexData = reportId === 'CAPEX_TRACKER' ? generateCapExTrackerReport(projects, options) : null;
  const schedEData = reportId === 'SCHEDULE_E' ? generateScheduleEReport(projects, 2025) : null;
  const depData = reportId === 'DEPRECIATION_SCHEDULE' ? generateDepreciationSchedule(projects, 2025) : null;
  const docsData = reportId === 'CLOSING_DOCS_INDEX' ? generateClosingDocumentIndex(projects, 2025) : null;
  const form1099Data = reportId === 'FORM_1099_SUMMARY' ? generateForm1099Summary(projects, 2025) : null;
  const logData = reportId === 'LOG_BOOKS' ? generateLogBooks(projects, 2025) : null;
  const cpaBundleData = reportId === 'CPA_PACKAGE_BUNDLE' ? generateOneClickCPAPackage(projects, 'PaperWorkingInvestor Account', 2025) : null;

  const dataThroughDate = new Date().toISOString().split('T')[0];

  const handleExportPDF = () => {
    try {
      const dataMap: Record<string, any> = {
        PL: plData,
        BALANCE_SHEET: bsData,
        CASH_FLOW: cfData,
        RENT_ROLL: rrData,
        SREO: sreoData,
        TAX_1040ES: taxData,
        BUDGET_VS_ACTUALS: bvaData,
        CAPEX_TRACKER: capexData,
        SCHEDULE_E: schedEData,
        DEPRECIATION_SCHEDULE: depData,
        FORM_1099_SUMMARY: form1099Data,
        LOG_BOOKS: logData,
        CLOSING_DOCS_INDEX: docsData,
        CPA_PACKAGE_BUNDLE: cpaBundleData,
      };
      const filename = exportReportPDF(reportId, dataMap[reportId]);
      toast.success(`Exported ${filename}`);
    } catch (e) {
      console.error('PDF export error:', e);
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      if (reportId === 'SREO' && sreoData) {
        const csv = exportSREOCSV(sreoData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `SREO_Report_${dataThroughDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Exported SREO_Report.csv');
        return;
      }
      if (reportId === 'CAPEX_TRACKER' && capexData) {
        const csv = exportCapExCSV(capexData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `CapEx_Tracker_${dataThroughDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Exported CapEx_Tracker.csv');
        return;
      }
    } catch (e) {
      toast.error('Failed to export CSV');
    }
  };


  return (
    <div
      data-testid="report-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl my-8 rounded-2xl bg-white dark:bg-[#16141a] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
          <div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800/10 text-slate-300 border border-slate-700/20">
              Report Engine
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {plData?.title || bsData?.title || cfData?.title || rrData?.title || sreoData?.title}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Data through: <strong>{dataThroughDate}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Toggle */}
            <div className="flex rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 p-0.5 border border-slate-200 dark:border-white/10">
              <button
                type="button"
                data-testid="scope-portfolio-btn"
                onClick={() => setScope('portfolio')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  scope === 'portfolio'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Portfolio
              </button>
              <button
                type="button"
                data-testid="scope-project-btn"
                onClick={() => setScope('project')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  scope === 'project'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Project
              </button>
            </div>

            {/* Project Select Dropdown */}
            {scope === 'project' && (
              <select
                data-testid="reports-project-select"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-950">
                    {p.propertyName || p.name || 'Unnamed Property'}
                  </option>
                ))}
              </select>
            )}

            {/* Period Selector */}
            <select
              data-testid="reports-period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="Monthly" className="dark:bg-slate-950">Monthly</option>
              <option value="Quarterly" className="dark:bg-slate-950">Quarterly</option>
              <option value="Annual" className="dark:bg-slate-950">Annual</option>
              <option value="YTD" className="dark:bg-slate-950">YTD</option>
            </select>

            {/* Export PDF CTA */}
            <button
              type="button"
              data-testid="export-report-pdf-btn"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>

            {/* Export CSV CTA */}
            {(reportId === 'SREO' || reportId === 'CAPEX_TRACKER') && (
              <button
                type="button"
                data-testid="export-report-csv-btn"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              aria-label="Close report modal"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Report Tables */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-white font-sans">
          {/* P&L Statement View */}
          {reportId === 'PL' && plData && (
            <div className="space-y-6" data-testid="pl-report-view">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Gross Rental Income
                </h3>
                <p className="text-2xl font-bold font-mono text-slate-300 mt-1">
                  {formatCurrency(plData.grossRentalIncome)}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  Operating Expenses
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Utilities</span>
                    <span className="font-mono font-semibold">{formatCurrency(plData.operatingExpenses.utilities)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Repairs & Maintenance</span>
                    <span className="font-mono font-semibold">{formatCurrency(plData.operatingExpenses.repairsAndMaintenance)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Management Fees</span>
                    <span className="font-mono font-semibold">{formatCurrency(plData.operatingExpenses.managementFees)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Property Taxes</span>
                    <span className="font-mono font-semibold">{formatCurrency(plData.operatingExpenses.propertyTaxes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Insurance</span>
                    <span className="font-mono font-semibold">{formatCurrency(plData.operatingExpenses.insurance)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-white/20 pt-2">
                    <span>Total Operating Expenses</span>
                    <span className="font-mono">{formatCurrency(plData.totalOperatingExpenses)}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/10 border border-slate-700/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300">
                    Net Operating Income (NOI)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Gross Rental Income minus Total Operating Expenses
                  </p>
                </div>
                <p className="text-3xl font-extrabold font-mono text-slate-300">
                  {formatCurrency(plData.netOperatingIncome)}
                </p>
              </div>
            </div>
          )}

          {/* Balance Sheet View */}
          {reportId === 'BALANCE_SHEET' && bsData && (
            <div className="space-y-6" data-testid="balance-sheet-view">
              {/* Assets Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  Assets
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Cash & Equivalents</span>
                    <span className="font-mono font-semibold">{formatCurrency(bsData.assets.cashAndEquivalents)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Real Estate Assets (ARV Basis)</span>
                    <span className="font-mono font-semibold">{formatCurrency(bsData.assets.realEstateValue)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-white/20">
                    <span>Total Assets</span>
                    <span className="font-mono">{formatCurrency(bsData.assets.totalAssets)}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  Liabilities
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Mortgage Debt / Loans Payable</span>
                    <span className="font-mono font-semibold">{formatCurrency(bsData.liabilities.mortgageDebt)}</span>
                  </div>

                  {/* DISTINCT LIABILITY LINE ASSERTION */}
                  <div
                    data-testid="security-deposit-liability-line"
                    className="flex justify-between py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold"
                  >
                    <span>Security Deposit Liabilities (Distinct Line)</span>
                    <span className="font-mono">{formatCurrency(bsData.liabilities.securityDepositLiabilities)}</span>
                  </div>

                  <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-white/20">
                    <span>Total Liabilities</span>
                    <span className="font-mono">{formatCurrency(bsData.liabilities.totalLiabilities)}</span>
                  </div>
                </div>
              </div>

              {/* Equity Section */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Owner's Equity
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Total Assets minus Total Liabilities</p>
                </div>
                <p className="text-2xl font-bold font-mono text-slate-300">
                  {formatCurrency(bsData.equity.ownersEquity)}
                </p>
              </div>
            </div>
          )}

          {/* Cash Flow Statement View */}
          {reportId === 'CASH_FLOW' && cfData && (
            <div className="space-y-6" data-testid="cash-flow-view">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Net Operating Income (NOI)</span>
                <span className="text-xl font-bold font-mono text-slate-300">{formatCurrency(cfData.netOperatingIncome)}</span>
              </div>

              {/* Separate Debt Principal Paydown breakout */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  Debt Service Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-300">Interest Expense</span>
                    <span className="font-mono">{formatCurrency(cfData.debtService.interestExpense)}</span>
                  </div>
                  <div
                    data-testid="cashflow-principal-paydown-line"
                    className="flex justify-between py-2 px-3 rounded-lg bg-slate-800/10 text-slate-300 dark:text-slate-300 font-bold"
                  >
                    <span>Loan Principal Paydown (Broken Out Separately)</span>
                    <span className="font-mono">{formatCurrency(cfData.debtService.principalPaydown)}</span>
                  </div>
                </div>
              </div>

              {/* Separate CapEx breakout */}
              <div
                data-testid="cashflow-capex-line"
                className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex justify-between items-center font-bold"
              >
                <span>Capital Expenditures (CapEx - Broken Out Separately)</span>
                <span className="font-mono text-rose-500">{formatCurrency(cfData.capitalExpenditures)}</span>
              </div>

              {/* Distributable Cash Result */}
              <div className="p-5 rounded-xl bg-slate-800/10 border border-slate-700/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Net Distributable Cash Flow
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Real spendable cash after Principal & CapEx</p>
                </div>
                <p className="text-3xl font-extrabold font-mono text-slate-300">
                  {formatCurrency(cfData.netDistributableCash)}
                </p>
              </div>
            </div>
          )}

          {/* Rent Roll & Delinquency View */}
          {reportId === 'RENT_ROLL' && rrData && (
            <div className="space-y-6" data-testid="rent-roll-view">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">{formatPercent(rrData.occupancyRatePct)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Units (Occupied / Total)</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{rrData.occupiedUnits} / {rrData.totalUnits}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Rent Roll</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">{formatCurrency(rrData.totalMonthlyRent)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Tracking</span>
                  <p className="text-xs font-bold mt-2 text-amber-500">
                    {rrData.isPaymentTrackingConnected ? 'Connected (Live)' : 'payment tracking not connected'}
                  </p>
                </div>
              </div>

              {/* Units Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    <tr>
                      <th className="p-3">Unit</th>
                      <th className="p-3">Tenant</th>
                      <th className="p-3">Rent</th>
                      <th className="p-3">Deposit</th>
                      <th className="p-3">Delinquency Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {rrData.units.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{u.unitName}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{u.tenantName}</td>
                        <td className="p-3 font-mono font-semibold">{formatCurrency(u.monthlyRent)}</td>
                        <td className="p-3 font-mono">{formatCurrency(u.securityDeposit)}</td>
                        <td className="p-3" data-testid="delinquency-status-badge">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.delinquencyStatus === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : u.delinquencyStatus === 'payment tracking not connected'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}
                          >
                            {u.delinquencyStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SREO Report View */}
          {reportId === 'SREO' && sreoData && (
            <div className="space-y-6" data-testid="sreo-report-view">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    <tr>
                      <th className="p-3">Property</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Market Value</th>
                      <th className="p-3">Mortgage Balance</th>
                      <th className="p-3">Equity</th>
                      <th className="p-3">Annual NOI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {sreoData.properties.map((p) => (
                      <tr key={p.projectId} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.propertyName}</td>
                        <td className="p-3 text-slate-500">{p.propertyType}</td>
                        <td className="p-3 font-mono font-semibold">{formatCurrency(p.marketValue)}</td>
                        <td className="p-3 font-mono">{formatCurrency(p.mortgageBalance)}</td>
                        <td className="p-3 font-mono text-slate-300 font-bold">{formatCurrency(p.equity)}</td>
                        <td className="p-3 font-mono text-slate-300">{formatCurrency(p.noi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 1040-ES Quarterly Tax Voucher View */}
          {reportId === 'TAX_1040ES' && taxData && (
            <div className="space-y-6" data-testid="tax-1040es-view">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">YTD Net Income</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{formatCurrency(taxData.ytdPortfolioNetIncome)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Annualized Income</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{formatCurrency(taxData.annualizedNetIncome)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Effective Tax Rate</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{taxData.estimatedEffectiveTaxRatePct}%</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/10 border border-slate-700/30">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Quarterly Payment</span>
                  <p className="text-2xl font-extrabold font-mono text-slate-300 mt-1">{formatCurrency(taxData.estimatedQuarterlyPayment)}</p>
                </div>
              </div>

              {/* Property Active vs Passive Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  Property Active vs. Passive Income Classification
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">Property</th>
                        <th className="p-3">YTD Net Income</th>
                        <th className="p-3">Activity Classification</th>
                        <th className="p-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {taxData.properties.map((p) => (
                        <tr key={p.projectId} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.propertyName}</td>
                          <td className="p-3 font-mono font-semibold">{formatCurrency(p.ytdNetIncome)}</td>
                          <td className="p-3 font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${p.activityType === 'Active' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800/10 text-slate-300 border border-slate-700/20'}`}>
                              {p.activityType} Income
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{p.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MANDATORY CPA DISCLAIMER BANNER */}
              <div data-testid="cpa-disclaimer-notice" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div className="text-xs">
                  <strong className="font-bold">MANDATORY DISCLAIMER:</strong> {TAX_DISCLAIMER}
                </div>
              </div>
            </div>
          )}

          {/* Quarterly Budget vs Actuals View */}
          {reportId === 'BUDGET_VS_ACTUALS' && bvaData && (
            <div className="space-y-6" data-testid="budget-vs-actuals-view">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Rent Variance</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {bvaData.portfolioGrossRent.variancePercent > 0 ? '+' : ''}{bvaData.portfolioGrossRent.variancePercent}%
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expenses Variance</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {bvaData.portfolioExpenses.variancePercent > 0 ? '+' : ''}{bvaData.portfolioExpenses.variancePercent}%
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">NOI Variance</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">
                    {bvaData.portfolioNOI.variancePercent > 0 ? '+' : ''}{bvaData.portfolioNOI.variancePercent}%
                  </p>
                </div>
              </div>

              {/* Property Variance Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  Per-Property Budget Baseline Variance
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">Property</th>
                        <th className="p-3">Actual NOI</th>
                        <th className="p-3">Baseline NOI</th>
                        <th className="p-3">Variance $</th>
                        <th className="p-3">Variance %</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {bvaData.properties.map((p) => (
                        <tr key={p.projectId} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.propertyName}</td>
                          <td className="p-3 font-mono font-semibold">{formatCurrency(p.noi.actual)}</td>
                          <td className="p-3 font-mono">{formatCurrency(p.noi.baseline)}</td>
                          <td className="p-3 font-mono">{formatCurrency(p.noi.varianceAmount)}</td>
                          <td className="p-3 font-mono font-bold">{p.noi.variancePercent}%</td>
                          <td className="p-3 font-bold" data-testid="variance-status-badge">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${p.noi.status === 'green' ? 'bg-slate-800/10 text-slate-300 border border-slate-700/20' : p.noi.status === 'amber' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                              {p.noi.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Schedule E View */}
          {reportId === 'SCHEDULE_E' && schedEData && (
            <div className="space-y-6" data-testid="schedule-e-view">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Line 3 Total Rents Received</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">{renderValueOrUnrecorded(schedEData.totalIncome)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Schedule E Expenses</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{renderValueOrUnrecorded(schedEData.totalExpenses)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Schedule E Income</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">{renderValueOrUnrecorded(schedEData.netIncome)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  IRS 1040 Schedule E Itemized Lines
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">IRS Line</th>
                        <th className="p-3">Line Description</th>
                        <th className="p-3">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                      {Object.entries(schedEData.lineTotals).map(([lineKey, amount]) => (
                        <tr key={lineKey} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{lineKey}</td>
                          <td className="p-3 text-slate-500">{SCHEDULE_E_LINE_NAMES[lineKey as ScheduleELineKey]}</td>
                          <td className={`p-3 font-bold ${lineKey === 'line3_rents' ? 'text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                            {renderValueOrUnrecorded(amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Depreciation & Asset Schedule View */}
          {reportId === 'DEPRECIATION_SCHEDULE' && depData && (
            <div className="space-y-6" data-testid="depreciation-schedule-view">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Building Cost Basis</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{renderValueOrUnrecorded(depData.totalBuildingBasis)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Year Depreciation</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">{renderValueOrUnrecorded(depData.totalCurrentYearDepreciation)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Accumulated Deprec.</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{renderValueOrUnrecorded(depData.totalAccumulatedDepreciation)}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    <tr>
                      <th className="p-3">Property</th>
                      <th className="p-3">Total Basis</th>
                      <th className="p-3">Land Value</th>
                      <th className="p-3">Building Basis</th>
                      <th className="p-3">Placed in Service</th>
                      <th className="p-3">Current Year Deprec.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                    {depData.assets.map((a) => (
                      <tr key={a.projectId} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">
                          {a.propertyName}
                          {!a.isComplete && (
                            <span className="ml-2 text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                              (Missing {a.missingFields.join(', ')})
                            </span>
                          )}
                        </td>
                        <td className="p-3">{renderValueOrUnrecorded(a.totalCostBasis)}</td>
                        <td className="p-3 text-slate-400">{renderValueOrUnrecorded(a.landValue)}</td>
                        <td className="p-3 font-bold">{renderValueOrUnrecorded(a.buildingCostBasis)}</td>
                        <td className="p-3">{a.placedInServiceDate || <span className="text-amber-500 italic font-normal text-xs">Unrecorded</span>}</td>
                        <td className="p-3 font-bold text-slate-300">{renderValueOrUnrecorded(a.currentYearDepreciation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Form 1099 Summary View */}
          {reportId === 'FORM_1099_SUMMARY' && form1099Data && (
            <div className="space-y-6" data-testid="form-1099-view">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">IRS Reporting Threshold</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{formatCurrency(form1099Data.thresholdAmount)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendors Requiring 1099</span>
                  <p className="text-xl font-bold font-mono text-amber-500 mt-1">{form1099Data.vendorsRequiring1099Count} / {form1099Data.totalVendors}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reportable 1099 Payments</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">{formatCurrency(form1099Data.totalReportablePayments)}</p>
                </div>
              </div>

              {form1099Data.vendors.length === 0 ? (
                <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4" />
                    <span>No Contractor Payments Logged</span>
                  </div>
                  <p className="text-xs">
                    No vendor payment records found for tax year {form1099Data.taxYear}. To calculate 1099-NEC/1099-MISC thresholds, log contractor disbursements in project rehab expense logs.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">Vendor Name</th>
                        <th className="p-3">Total Paid</th>
                        <th className="p-3">EIN / SSN Provided</th>
                        <th className="p-3">1099 Required (≥$600)</th>
                        <th className="p-3">Form Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {form1099Data.vendors.map((v) => (
                        <tr key={v.vendorId} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{v.vendorName}</td>
                          <td className="p-3 font-mono font-bold">{formatCurrency(v.totalPaid)}</td>
                          <td className="p-3">{v.einOrSsnProvided ? 'Yes' : 'No'}</td>
                          <td className="p-3 font-bold" data-testid="vendor-1099-status">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${v.requires1099 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-500/10 text-slate-400'}`}>
                              {v.requires1099 ? 'Form 1099 Required' : 'Below Threshold'}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{v.requires1099 ? v.formType : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Log Books View */}
          {reportId === 'LOG_BOOKS' && logData && (
            <div className="space-y-6" data-testid="log-books-view">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Mileage Deduction</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">{formatCurrency(logData.totalMileageDeduction)} ({logData.totalMiles} mi)</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">REPS Material Hours</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{logData.totalREPSHours} Hours</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">REPS 750-Hr Qualification</span>
                  <p className={`text-xl font-bold font-mono mt-1 ${logData.isREPSMet ? 'text-slate-300' : 'text-amber-500'}`}>
                    {logData.isREPSMet ? 'QUALIFIED ✓' : 'Unrecorded / Pending'}
                  </p>
                </div>
              </div>

              {/* Mileage Log Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  Vehicle Business Mileage Log
                </h4>
                {logData.mileageLogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 text-xs space-y-1">
                    <strong className="font-bold text-amber-500">No Mileage Entries Recorded:</strong>
                    <p>User must log trip dates, destinations, and business purpose to calculate IRS standard mileage deduction ($0.67/mi).</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Property</th>
                          <th className="p-3">Business Purpose</th>
                          <th className="p-3">Miles</th>
                          <th className="p-3">Deduction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                        {logData.mileageLogs.map((m) => (
                          <tr key={m.id}>
                            <td className="p-3 font-semibold">{m.date}</td>
                            <td className="p-3 font-sans text-slate-900 dark:text-white">{m.propertyName}</td>
                            <td className="p-3 text-slate-500 font-sans">{m.purpose}</td>
                            <td className="p-3">{m.miles} mi</td>
                            <td className="p-3 font-bold text-slate-300">{formatCurrency(m.deductionAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* REPS Time Log Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  REPS Material Participation Time Log (750-Hour Threshold)
                </h4>
                {logData.timeLogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 text-xs space-y-1">
                    <strong className="font-bold text-amber-500">No Participation Hours Recorded:</strong>
                    <p>User must log active time entries (lease drafting, rehab supervision, property management) to qualify for Real Estate Professional Status (REPS).</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Property</th>
                          <th className="p-3">Activity</th>
                          <th className="p-3">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                        {logData.timeLogs.map((t) => (
                          <tr key={t.id}>
                            <td className="p-3 font-semibold">{t.date}</td>
                            <td className="p-3 font-sans text-slate-900 dark:text-white">{t.propertyName}</td>
                            <td className="p-3 text-slate-500 font-sans">{t.activity}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{t.hours} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Closing Documents Index View */}
          {reportId === 'CLOSING_DOCS_INDEX' && docsData && (
            <div className="space-y-6" data-testid="closing-docs-view">
              {docsData.documents.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 text-xs space-y-1">
                  <strong className="font-bold text-amber-500">No Closing Documents Recorded:</strong>
                  <p>Upload closing disclosures, HUD-1 statements, or promissory notes in project document stores for annual tax index inclusion.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">Property</th>
                        <th className="p-3">Document Type</th>
                        <th className="p-3">Document File Name</th>
                        <th className="p-3">Transaction Date</th>
                        <th className="p-3">Document Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {docsData.documents.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{d.propertyName}</td>
                          <td className="p-3 text-slate-500">{d.documentType}</td>
                          <td className="p-3 font-mono font-bold text-slate-300">{d.documentName}</td>
                          <td className="p-3 font-mono">{d.transactionDate}</td>
                          <td className="p-3 text-xs text-slate-400">{d.fileUrl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CPA Package Bundle View */}
          {reportId === 'CPA_PACKAGE_BUNDLE' && cpaBundleData && (
            <div className="space-y-6" data-testid="cpa-package-bundle-view">
              <div className="p-6 rounded-xl bg-slate-900 text-white border border-white/10 space-y-4">
                <h3 className="text-xl font-bold uppercase tracking-wide text-slate-300">One-Click Annual CPA Tax Package</h3>
                <p className="text-xs text-slate-300">
                  Includes 1040 Schedule E statement, 27.5-Yr MACRS Depreciation Schedule, Form 1099 summary, Log Books (mileage & REPS), and Closing Document Index with cover sheet.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 font-mono text-xs">
                  <div>Account: <strong className="text-white">{cpaBundleData.accountName}</strong></div>
                  <div>Tax Year: <strong className="text-white">{cpaBundleData.taxYear}</strong></div>
                  <div>Properties: <strong className="text-white">{cpaBundleData.propertyRosterCount}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* CapEx Tracker View */}
          {reportId === 'CAPEX_TRACKER' && capexData && (
            <div className="space-y-6" data-testid="capex-tracker-view">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Planned Budget</span>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{formatCurrency(capexData.totalPlanned)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In-Progress Spend</span>
                  <p className="text-xl font-bold font-mono text-amber-500 mt-1">{formatCurrency(capexData.totalInProgress)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Projects</span>
                  <p className="text-xl font-bold font-mono text-emerald-500 mt-1">{formatCurrency(capexData.totalCompleted)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total CapEx Spend</span>
                  <p className="text-xl font-bold font-mono text-slate-300 mt-1">{formatCurrency(capexData.totalCapExSpend)}</p>
                </div>
              </div>

              {/* Isolated CapEx Items Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2">
                  Isolated Capital Projects (Separate from OpEx Lines)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 dark:bg-white/5 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">Property</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Budgeted</th>
                        <th className="p-3">Actual Spend</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Contractor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                      {capexData.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">{item.propertyName}</td>
                          <td className="p-3 font-bold text-slate-500">{item.category}</td>
                          <td className="p-3 font-sans text-slate-400">{item.description}</td>
                          <td className="p-3">{formatCurrency(item.budgetedAmount)}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{formatCurrency(item.actualAmount)}</td>
                          <td className="p-3 font-sans font-bold" data-testid="capex-status-badge">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : item.status === 'In-Progress' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-slate-500">{item.contractorName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

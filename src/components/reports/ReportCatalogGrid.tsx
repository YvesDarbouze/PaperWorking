'use client';

import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Layers,
  Building2,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { getReportPreview } from '@/lib/reports/reportPreview';

export type ReportCategory = 'Monthly' | 'Quarterly' | 'Annual' | 'Lender (SREO)';

export interface ReportCatalogItem {
  id:
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
  title: string;
  category: ReportCategory;
  description: string;
  badge?: string;
}

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    id: 'PL',
    title: 'Profit & Loss Statement (P&L)',
    category: 'Monthly',
    description: 'Consolidated or per-property P&L detailing gross rental income, itemized operating expenses (utilities, repairs, management fees, property taxes, insurance), and Net Operating Income (NOI).',
    badge: 'Core Financial',
  },
  {
    id: 'BALANCE_SHEET',
    title: 'Balance Sheet',
    category: 'Monthly',
    description: 'Current property values (assets), mortgage balances (liabilities), security deposit liabilities as a distinct line, and computed owner equity.',
    badge: 'Assets & Liabilities',
  },
  {
    id: 'CASH_FLOW',
    title: 'Cash Flow Statement',
    category: 'Monthly',
    description: 'Spendable cash vs paper profit — starts at NOI, breaking out loan principal paydown and CapEx separately to arrive at real distributable cash.',
    badge: 'Cash Flow',
  },
  {
    id: 'RENT_ROLL',
    title: 'Rent Roll & Delinquency Report',
    category: 'Monthly',
    description: 'Active tenant leases, rent amounts, lease terms, vacancies, and honest unit delinquency status (live payment data or explicit "payment tracking not connected").',
    badge: 'Occupancy & Revenue',
  },
  {
    id: 'TAX_1040ES',
    title: '1040-ES Quarterly Estimated Tax Voucher',
    category: 'Quarterly',
    description: 'Estimated quarterly payment worksheet based on YTD portfolio income, active vs passive property income classification, and mandatory CPA disclaimer.',
    badge: 'Quarterly Tax',
  },
  {
    id: 'BUDGET_VS_ACTUALS',
    title: 'Quarterly Budget vs. Actuals Variance Report',
    category: 'Quarterly',
    description: 'Consolidated & property performance vs frozen budget_baselines powered directly by the operations variance engine, itemizing repairs/maintenance variance and reserve adjustments.',
    badge: 'Variance & Operations',
  },
  {
    id: 'SCHEDULE_E',
    title: 'Schedule E-Mapped Income Statement',
    category: 'Annual',
    description: 'Every income and expense category mapped to exactly one IRS Schedule E line for seamless 1040 tax preparation.',
    badge: 'IRS Tax Schedule',
  },
  {
    id: 'DEPRECIATION_SCHEDULE',
    title: 'Depreciation & Asset Schedule',
    category: 'Annual',
    description: 'Property cost basis, land value separation, 27.5-year MACRS straight-line depreciation, placed-in-service mid-month convention, and accumulated depreciation.',
    badge: 'Tax Depreciation',
  },
  {
    id: 'FORM_1099_SUMMARY',
    title: 'Form 1099 Contractor Summary',
    category: 'Annual',
    description: 'Contractors and vendors paid over the $600 IRS reporting threshold with 1099-NEC/MISC filing requirements.',
    badge: '1099 Tax Filing',
  },
  {
    id: 'LOG_BOOKS',
    title: 'Mileage & REPS Time Log Books',
    category: 'Annual',
    description: 'Standard mileage travel log ($0.67/mi) and Real Estate Professional Status (REPS) 750-hour material participation log.',
    badge: 'Audit & Compliance',
  },
  {
    id: 'CLOSING_DOCS_INDEX',
    title: 'Closing Statements & Loan Documents Index',
    category: 'Annual',
    description: 'Index of HUD-1 settlement statements, closing disclosures, promissory notes, and deeds for properties acquired, refinanced, or sold in the tax year.',
    badge: 'Document Index',
  },
  {
    id: 'CPA_PACKAGE_BUNDLE',
    title: 'One-Click CPA Annual Tax Package',
    category: 'Annual',
    description: 'Bundled ZIP/PDF package containing Schedule E, Depreciation Schedule, 1099 Summary, Log Books, and Closing Document Index with formal cover sheet.',
    badge: 'One-Click Tax Bundle',
  },
  {
    id: 'SREO',
    title: 'Schedule of Real Estate Owned (SREO)',
    category: 'Lender (SREO)',
    description: 'Lender-compliant Schedule of Real Estate Owned listing all portfolio properties, market values, debt balances, and NOI for debt underwriting.',
    badge: 'Lender & Underwriting',
  },
  {
    id: 'CAPEX_TRACKER',
    title: 'Capital Expenditures (CapEx) Tracker',
    category: 'Lender (SREO)',
    description: 'Major renovation overhauls isolated from operating expenses with per-asset status (planned, in-progress, completed) and budget tracking.',
    badge: 'Capital Assets',
  },
];

export interface ReportCatalogGridProps {
  onSelectReport: (reportId: ReportCatalogItem['id']) => void;
  dataThroughDate?: string;
  /**
   * When supplied, the grid renders exactly these reports and hides its own
   * category tabs — the Tax Intelligence page owns the period tabs, and two
   * rows of tabs would be redundant. Omit for the standalone/uncontrolled use.
   */
  visibleReportIds?: ReportCatalogItem['id'][];
  /** Projects in scope, used to compute each card's top-3 line preview. */
  projects?: unknown[];
}

export function ReportCatalogGrid({
  onSelectReport,
  dataThroughDate,
  visibleReportIds,
  projects = [],
}: ReportCatalogGridProps) {
  const [activeTab, setActiveTab] = useState<ReportCategory>('Monthly');
  const currentDateStamp = dataThroughDate || new Date().toISOString().split('T')[0];
  const controlled = Array.isArray(visibleReportIds);

  const categories: ReportCategory[] = ['Monthly', 'Quarterly', 'Annual', 'Lender (SREO)'];

  const filteredReports = controlled
    ? REPORT_CATALOG.filter((r) => visibleReportIds!.includes(r.id))
    : REPORT_CATALOG.filter(
        (r) => r.category === activeTab || (activeTab === 'Quarterly' || activeTab === 'Annual' ? r.category === 'Monthly' || r.category === activeTab : r.category === activeTab)
      );

  return (
    <div className="space-y-8" data-testid="report-catalog">
      {/* Category Tabs — hidden when the parent controls the selection */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        {!controlled && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                data-testid={`report-tab-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                onClick={() => setActiveTab(cat)}
                className={`pw-interactive-custom px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === cat
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-300" />
          <span>Last updated: <strong className="text-[var(--color-on-surface)]">{currentDateStamp}</strong></span>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="report-cards-grid">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            data-testid={`report-card-${report.id.toLowerCase().replace(/_/g, '-')}`}
            className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[var(--pw-surface)] border border-[var(--pw-border)] hover:border-white/20 hover:shadow-xl transition-all duration-200"
          >
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800/10 text-slate-300 dark:text-slate-300 border border-slate-700/20">
                  {report.badge || report.category}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Data through {currentDateStamp}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold text-[var(--color-on-surface)] mb-2.5 transition-colors">
                {report.title}
              </h3>
              <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed mb-4">
                {report.description}
              </p>

              {/* Top-3 line preview (req 2). Falls back to the description
                  alone when the report has no headline summary or the data is
                  too sparse to compute one. */}
              {(() => {
                const preview = getReportPreview(report.id, projects);
                if (preview.length === 0) return null;
                return (
                  <dl
                    className="mb-6 space-y-1.5 rounded-lg bg-white/[0.03] border border-white/5 p-3"
                    data-testid={`report-preview-${report.id.toLowerCase().replace(/_/g, '-')}`}
                  >
                    {preview.map((line) => (
                      <div key={line.label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-[11px] text-[var(--color-on-surface-variant)] truncate">
                          {line.label}
                        </dt>
                        <dd className="text-[11px] font-semibold tabular-nums text-[var(--color-on-surface)] shrink-0">
                          {line.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                );
              })()}
            </div>

            {/* Action CTA — neutral, not the emerald accent: there are up to 14
                cards on screen and the sprint allows one green CTA per view. */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Ready to compute</span>
              <button
                type="button"
                data-testid="generate-report-btn"
                data-report-id={report.id}
                onClick={() => onSelectReport(report.id)}
                className="pw-interactive-custom inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
              >
                <span>View Full Report</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

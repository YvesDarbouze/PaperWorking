'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import ReportCatalogGrid from '@/components/reports/ReportCatalogGrid';
import FinancialStatementGrid from '@/components/reports/FinancialStatementGrid';
import ReportsSummaryChart from '@/components/reports/ReportsSummaryChart';
import RentRollView from '@/components/reports/RentRollView';
import ReportRequiresDataState from '@/components/reports/ReportRequiresDataState';
import {
  ScheduleETable,
  DepreciationScheduleTable,
  Vendor1099Table,
  CapExLogTable,
} from '@/components/reports/TaxReportViews';
import { useOptionalAuth } from '@/context/AuthContext';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';
import type { ReportId } from '@/lib/reports/report-catalog';
import { exportStatementGridCsv } from '@/lib/export/statement-csv';
import { generateScheduleEReport } from '@/lib/reports/schedule-e-mapper';
import {
  aggregateVendor1099Payments,
  buildCapExLogReport,
} from '@/lib/reports/tax-reports';
import { buildProjectRentRollReport } from '@/lib/reports/rent-roll';
import {
  saveUserReportConfig,
  loadUserReportConfig,
} from '@/lib/reports/saved-reports';
import {
  deriveProjectStatementMatrix,
  aggregateStatementMatrices,
  computeAssetDepreciationSchedule,
  type ProjectStatementInputs,
  type StatementGranularity,
  type AssetDepreciationSchedule,
} from '@paperworking/financial-engine';

const ALL_PROJECTS = '__all__';

export function projectToStatementInputs(p: any): ProjectStatementInputs {
  const purchasePrice = p.purchasePrice || p.purchase_price || 300000;
  const grossRent = p.grossScheduledRentAnnual || p.gross_scheduled_rent || Math.round(purchasePrice * 0.086);
  const loanAmount = p.loanAmount || p.loan_amount || Math.round(purchasePrice * 0.75);

  return {
    projectId: p.id,
    projectName: p.address || p.propertyName || p.name || 'Unnamed Property',
    purchasePrice,
    propertyValue: p.propertyValue || p.property_value || purchasePrice,
    grossScheduledRentAnnual: grossRent,
    vacancyRatePct: p.vacancyRatePct ?? p.vacancy_rate ?? 4,
    otherIncomeAnnual: p.otherIncomeAnnual ?? p.other_income ?? 0,
    expenses: {
      tax: p.expenses?.tax ?? Math.round(purchasePrice * 0.013),
      insurance: p.expenses?.insurance ?? Math.round(purchasePrice * 0.0065),
      maintenance: p.expenses?.maintenance ?? Math.round(grossRent * 0.08),
      management: p.expenses?.management ?? Math.round(grossRent * 0.10),
      utilities: p.expenses?.utilities ?? 1200,
      security: p.expenses?.security ?? 0,
      HOA: p.expenses?.HOA ?? 0,
      capex: p.expenses?.capex ?? 1200,
    },
    debt: {
      loanAmount,
      interestRate: p.interestRate ?? p.interest_rate ?? 0.065,
      termYears: p.loanTermYears ?? p.loan_term_years ?? 30,
    },
    depreciation: {
      landValue: Math.round(purchasePrice * 0.20),
      improvementBasis: Math.round(purchasePrice * 0.80),
      inServiceDate: p.purchase_date || '2024-01-01',
      assetClass: 'residential_27_5',
    },
    tenantSecurityDeposits: Math.round(grossRent / 12),
  };
}

export default function PortfolioReportsPanel({
  initialProjects = SEED_PROJECTS,
}: {
  initialProjects?: typeof SEED_PROJECTS;
}) {
  const [projects] = useState(initialProjects);
  const [selectedReportId, setSelectedReportId] = useState<ReportId>('PL');
  const [projectScope, setProjectScope] = useState<string>(ALL_PROJECTS);
  const [granularity, setGranularity] = useState<StatementGranularity>('monthly');
  const [fiscalYear, setFiscalYear] = useState<number>(2026);
  const [hasApiError, setHasApiError] = useState<boolean>(false);

  const searchParams = useSearchParams();
  const demoScenario = searchParams?.get('scenario') || searchParams?.get('state');
  const isDemoEmpty = demoScenario === 'empty' || demoScenario === 'zero-projects';
  const isDemoError = demoScenario === 'error';

  const auth = useOptionalAuth();
  const uid = auth?.authenticated ? (auth.profile?.accountType || 'current-user') : undefined;

  // Restore saved configuration on mount
  useEffect(() => {
    if (!uid) return;
    const userUid = uid;
    let cancelled = false;
    async function restore() {
      const saved = await loadUserReportConfig(userUid, selectedReportId);
      if (!cancelled && saved) {
        if (saved.scope) setProjectScope(saved.scope);
        if (saved.granularity) setGranularity(saved.granularity);
        if (saved.fiscalYear) setFiscalYear(saved.fiscalYear);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [uid, selectedReportId]);

  // Persist configuration on change
  const handleSelectReport = useCallback(
    (id: ReportId) => {
      setSelectedReportId(id);
      if (uid) {
        const userUid = uid;
        void saveUserReportConfig(userUid, {
          reportId: id,
          scope: projectScope,
          granularity,
          fiscalYear,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [uid, projectScope, granularity, fiscalYear],
  );

  // Selected Projects & Inputs
  const scopedProjects = useMemo(() => {
    if (projectScope === ALL_PROJECTS) return projects;
    return projects.filter((p) => p.id === projectScope);
  }, [projects, projectScope]);

  const statementInputsList = useMemo(() => {
    return scopedProjects.map(projectToStatementInputs);
  }, [scopedProjects]);

  const currentProjectInputs = statementInputsList[0];

  const scopeLabel = useMemo(() => {
    if (projectScope === ALL_PROJECTS) {
      return `Portfolio Aggregate (${projects.length} properties)`;
    }
    const p = scopedProjects[0];
    return p?.address || p?.propertyName || 'Selected Property';
  }, [projectScope, projects.length, scopedProjects]);

  // Derive Statement Matrix (P&L, Balance Sheet, Cash Flow)
  const statementMatrix = useMemo(() => {
    if (statementInputsList.length === 0) return null;

    const statementType =
      selectedReportId === 'BALANCE_SHEET'
        ? 'BALANCE_SHEET'
        : selectedReportId === 'CASH_FLOW'
        ? 'CASH_FLOW'
        : 'PL';

    const individualMatrices = statementInputsList.map((inp) =>
      deriveProjectStatementMatrix(inp, {
        statementType,
        granularity,
        fiscalYear,
        holdYears: 5,
      }),
    );

    return aggregateStatementMatrices(individualMatrices);
  }, [statementInputsList, selectedReportId, granularity, fiscalYear]);

  // Derive Tax Reports
  const scheduleEReport = useMemo(() => {
    return generateScheduleEReport(statementInputsList, fiscalYear);
  }, [statementInputsList, fiscalYear]);

  const vendor1099Report = useMemo(() => {
    // R1 confirmed live Plaid actuals are unqueried -> triggers explicit "requires records" state
    return aggregateVendor1099Payments(undefined, fiscalYear);
  }, [fiscalYear]);

  const capexReport = useMemo(() => {
    return buildCapExLogReport(
      scopedProjects.map((p) => ({
        id: p.id,
        name: p.address || p.propertyName,
        rehabCosts: p.rehab_costs,
        purchaseDate: (p as any).purchase_date,
        expenses: {
          maintenance: Math.round((p.purchasePrice || 300000) * 0.08 * 0.08),
          capex: 1200,
        },
      })),
      fiscalYear,
    );
  }, [scopedProjects, fiscalYear]);

  const depreciationSchedules = useMemo((): AssetDepreciationSchedule[] => {
    const list: AssetDepreciationSchedule[] = [];
    for (const inp of statementInputsList) {
      if (inp.depreciation) {
        const res = computeAssetDepreciationSchedule({
          id: `${inp.projectId}-bldg`,
          name: `${inp.projectName} (Building Structure)`,
          assetClass: inp.depreciation.assetClass ?? 'residential_27_5',
          totalCostBasis: inp.purchasePrice || 300000,
          landValue: inp.depreciation.landValue,
          improvementBasis: inp.depreciation.improvementBasis,
          inServiceDate: inp.depreciation.inServiceDate ?? '2024-01-01',
        }, 5, fiscalYear);
        if (res.valid && res.schedule) {
          list.push(res.schedule);
        }
      }
    }
    return list;
  }, [statementInputsList, fiscalYear]);

  const rentRollReport = useMemo(() => {
    // R1 confirmed Unit/Tenant models are greenfield -> triggers explicit "requires rent roll data" state
    return buildProjectRentRollReport({
      id: currentProjectInputs?.projectId || 'portfolio',
      name: scopeLabel,
      units: [],
    });
  }, [currentProjectInputs, scopeLabel]);

  // Export handlers
  const handleExportCsv = useCallback(() => {
    if (!statementMatrix) return;
    exportStatementGridCsv({
      reportTitle: selectedReportId === 'PL' ? 'Profit & Loss Statement' : selectedReportId,
      reportId: selectedReportId,
      scopeName: scopeLabel,
      period: granularity,
      fiscalYear,
      columns: statementMatrix.columns,
      rows: statementMatrix.rows,
    });
  }, [statementMatrix, selectedReportId, scopeLabel, granularity, fiscalYear]);

  const handleExportPdf = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  // SCENARIO A: Guided Empty State (Zero Projects)
  if (projects.length === 0 || isDemoEmpty) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-16 text-center" data-testid="reports-empty-state">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border-subtle bg-surface text-accent mb-6">
          <span className="material-symbols-outlined text-[32px]">folder_off</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-text-primary">No Properties Added Yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
          Add your first real estate deal to generate multi-period P&amp;L statements, Balance Sheets, and CPA-ready Schedule E tax packages.
        </p>
        <div className="mt-8 flex justify-center">
          {/* Button Constitution: Exactly 1 primary button on empty state */}
          <Button
            variant="primary"
            size="lg"
            roleVariant="cta"
            href="/project/new"
            icon={<span className="material-symbols-outlined text-[18px]">add</span>}
            data-testid="empty-create-project-btn"
          >
            Create New Project
          </Button>
        </div>
      </div>
    );
  }

  // SCENARIO C: API Error State
  if (hasApiError || isDemoError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-12" data-testid="reports-error-state">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-danger mb-3">error</span>
          <h2 className="text-lg font-bold text-text-primary">Unable to Generate Report Data</h2>
          <p className="mt-1 text-xs text-text-muted max-w-md">
            An error occurred communicating with the financial reporting engine.
          </p>
          <div className="mt-6">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setHasApiError(false)}
              icon={<span className="material-symbols-outlined text-[16px]">refresh</span>}
            >
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8 text-text-primary" data-testid="tax-intelligence-page">
      {/* Header: Button Constitution dictates ZERO primary buttons on populated analytics surface */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1
            className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-text-primary"
            data-testid="tax-intelligence-title"
          >
            <span className="material-symbols-outlined text-[28px] text-accent">description</span>
            Reports
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            P&amp;L statements and tax reporting by period
          </p>
        </div>

        {/* Header Secondary Utility Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCsv}
            icon={<span className="material-symbols-outlined text-[16px] text-accent">table_chart</span>}
            data-testid="export-csv-btn"
          >
            Export to CSV
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportPdf}
            icon={<span className="material-symbols-outlined text-[16px]">print</span>}
            data-testid="export-pdf-btn"
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Control Bar: Scope, Period Granularity, Fiscal Year, Data Source */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-surface/60 p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4">
          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="project-scope-select" className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Scope
            </label>
            <select
              id="project-scope-select"
              data-testid="project-filter"
              value={projectScope}
              onChange={(e) => setProjectScope(e.target.value)}
              className="h-9 cursor-pointer rounded-lg border border-border-subtle bg-elevated px-3 text-xs font-semibold text-text-primary focus:outline-none focus:border-accent"
            >
              <option value={ALL_PROJECTS}>Portfolio Aggregate ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address || p.propertyName}
                </option>
              ))}
            </select>
          </div>

          {/* Period Segmented Toggle (Oldest -> Newest) */}
          <div
            className="flex items-center rounded-lg border border-border-subtle bg-app/40 p-1"
            role="tablist"
            data-testid="period-tabs"
          >
            {(['monthly', 'quarterly', 'annual'] as StatementGranularity[]).map((tab) => {
              const isActive = granularity === tab;
              const label = tab.charAt(0).toUpperCase() + tab.slice(1);
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`period-tab-${tab}`}
                  onClick={() => setGranularity(tab)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? 'bg-accent text-surface shadow-md'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Fiscal Year Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="fiscal-year-select" className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Fiscal Year
            </label>
            <select
              id="fiscal-year-select"
              data-testid="fiscal-year-select"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="h-9 cursor-pointer rounded-lg border border-border-subtle bg-elevated px-3 text-xs font-semibold text-text-primary focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>

        {/* Data Source Indicator: No dead Actual toggle per Prompt R2 */}
        <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-1.5 text-[11px] text-text-secondary">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span>Data Source: <strong className="text-text-primary">Projected (underwriting model)</strong></span>
        </div>
      </div>

      {/* Bank connect banner (preserved per prompt) */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-surface p-5"
        data-testid="empty-no-plaid"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-text-muted">
            account_balance
          </span>
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">Link your bank account</span> to
            auto-categorize transactions for tax reporting and actuals tracking.
          </p>
        </div>
        <Link
          href="/dashboard/settings/billing"
          data-testid="connect-bank-cta"
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border-subtle px-4 text-xs font-semibold text-text-primary no-underline hover:bg-elevated transition"
        >
          Connect Bank Account
        </Link>
      </div>

      {/* Summary Chart: Net Operating Income vs Cash Flow Before Tax (Viz Constitution) */}
      {statementMatrix && (
        <ReportsSummaryChart
          fiscalYear={fiscalYear}
          granularity={granularity}
          columns={statementMatrix.columns}
          rows={statementMatrix.rows}
        />
      )}

      {/* Active Statement View (Rendered below catalog) */}
      <div className="space-y-4" data-testid="statement-display-area">
        {selectedReportId === 'PL' && statementMatrix && (
          <FinancialStatementGrid
            title={`Profit & Loss Statement (P&L) — ${scopeLabel}`}
            subtitle="Gross scheduled rent, itemized operating expenses, net operating income, debt service, and cash flow"
            fiscalYear={fiscalYear}
            columns={statementMatrix.columns}
            rows={statementMatrix.rows}
            testId="pl-statement-grid"
          />
        )}

        {selectedReportId === 'BALANCE_SHEET' && statementMatrix && (
          <FinancialStatementGrid
            title={`Balance Sheet — ${scopeLabel}`}
            subtitle="Asset book values, mortgage liabilities, tenant security deposits held, and net owner equity"
            fiscalYear={fiscalYear}
            columns={statementMatrix.columns}
            rows={statementMatrix.rows}
            testId="balance-sheet-grid"
          />
        )}

        {selectedReportId === 'CASH_FLOW' && statementMatrix && (
          <FinancialStatementGrid
            title={`Cash Flow Statement — ${scopeLabel}`}
            subtitle="Operating, financing, and investing cash flows detailing distributable cash after debt service and CapEx"
            fiscalYear={fiscalYear}
            columns={statementMatrix.columns}
            rows={statementMatrix.rows}
            testId="cash-flow-grid"
          />
        )}

        {selectedReportId === 'RENT_ROLL' && (
          <RentRollView report={rentRollReport} />
        )}

        {selectedReportId === 'SCHEDULE_E' && (
          <ScheduleETable report={scheduleEReport} />
        )}

        {selectedReportId === 'DEPRECIATION_SCHEDULE' && (
          <DepreciationScheduleTable
            schedules={depreciationSchedules}
            fiscalYear={fiscalYear}
          />
        )}

        {selectedReportId === 'FORM_1099_SUMMARY' && (
          vendor1099Report.requiresVendorRecords ? (
            <ReportRequiresDataState
              reportTitle="Form 1099 & Vendor Payments"
              missingDataType="Vendor Payment Records"
              description="No vendor transactions or 1099 payee records were found in the database. Link your bank account or upload vendor payment records to track the $600 IRS reporting threshold."
              actionLabel="Connect Bank Account"
              actionHref="/dashboard/settings/billing"
              testId="1099-requires-data"
            />
          ) : (
            <Vendor1099Table report={vendor1099Report} />
          )
        )}

        {(selectedReportId === 'CAPEX_LOG' || selectedReportId === 'CAPEX_TRACKER') && (
          <CapExLogTable report={capexReport} />
        )}
      </div>

      {/* Statutory Financial & Legal Disclaimer Banner (Review C3.4) */}
      <div
        data-testid="reports-disclaimer-bar"
        className="rounded-xl border border-border-subtle bg-surface/50 p-4 text-center text-xs text-text-muted"
      >
        <p>
          <strong>Notice:</strong> Hypothetical illustration based on user-supplied assumptions; not investment, legal, tax, or financial advice; not a prediction or guarantee.
        </p>
      </div>

      {/* 8-Report Catalog Grid: Core Financial & Tax Preparation Sections */}
      <ReportCatalogGrid
        selectedReportId={selectedReportId}
        onSelectReport={handleSelectReport}
      />
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowClockwise,
  FileText,
  FolderDashed,
  Plus,
  Printer,
  Table,
  WarningCircle,
} from '@phosphor-icons/react';
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
import { bffFetch } from '@/lib/api/bff-fetch';
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
  const [projects, setProjects] = useState<any[]>(initialProjects);

  // Fetch live workspace projects on mount
  useEffect(() => {
    let cancelled = false;
    async function loadWorkspaceProjects() {
      try {
        const res = await bffFetch('/api/projects', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data?.projects || data?.items;
          if (Array.isArray(items) && items.length > 0 && !cancelled) {
            setProjects(items);
          }
        }
      } catch {
        // Retain initialProjects on error
      }
    }
    void loadWorkspaceProjects();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-none border border-border bg-card text-foreground mb-6 shadow-sm ring-1 ring-foreground/10">
          <FolderDashed weight="regular" className="h-8 w-8 text-foreground" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">No Properties Added Yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add your first real estate deal to generate multi-period P&amp;L statements, Balance Sheets, and CPA-ready Schedule E tax packages.
        </p>
        <div className="mt-8 flex justify-center">
          {/* Button Constitution: Exactly 1 primary button on empty state */}
          <Button
            variant="primary"
            size="lg"
            roleVariant="cta"
            href="/projects/new"
            icon={<Plus weight="bold" className="h-4 w-4" />}
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
        <div className="flex flex-col items-center justify-center rounded-none border border-destructive/30 bg-destructive/10 p-10 text-center">
          <WarningCircle weight="bold" className="h-10 w-10 text-destructive mb-3" />
          <h2 className="text-lg font-bold text-foreground">Unable to Generate Report Data</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">
            An error occurred communicating with the financial reporting engine.
          </p>
          <div className="mt-6">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setHasApiError(false)}
              icon={<ArrowClockwise weight="bold" className="h-4 w-4" />}
            >
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8 text-foreground" data-testid="tax-intelligence-page">
      {/* Header: Button Constitution dictates ZERO primary buttons on populated analytics surface */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1
            className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground"
            data-testid="tax-intelligence-title"
          >
            <FileText weight="bold" className="h-7 w-7 text-foreground" />
            Reports
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            P&amp;L statements and tax reporting by period
          </p>
        </div>

        {/* Header Secondary Utility Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCsv}
            icon={<Table weight="bold" className="h-4 w-4" />}
            data-testid="export-csv-btn"
          >
            Export to CSV
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportPdf}
            icon={<Printer weight="bold" className="h-4 w-4" />}
            data-testid="export-pdf-btn"
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Control Bar: Scope, Period Granularity, Fiscal Year, Data Source */}
      <div
        data-testid="reports-control-bar"
        className="flex flex-wrap items-center justify-between gap-4 rounded-none border border-border bg-card p-4 shadow-sm ring-1 ring-foreground/10"
      >
        <div className="flex w-full min-w-0 flex-wrap items-center gap-4 lg:w-auto">
          {/* Scope Selector */}
          <div
            data-testid="scope-selector-group"
            className="flex w-full min-w-0 items-center gap-2 sm:w-auto"
          >
            <label htmlFor="project-scope-select" className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Scope
            </label>
            <select
              id="project-scope-select"
              data-testid="project-filter"
              value={projectScope}
              onChange={(e) => setProjectScope(e.target.value)}
              className="h-10 min-h-[44px] w-full min-w-0 max-w-full flex-1 cursor-pointer truncate rounded-none border border-input bg-background px-3 text-base font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-auto sm:max-w-[280px] sm:flex-none md:max-w-[340px] md:text-xs"
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
            className="flex items-center rounded-none border border-border bg-muted/40 p-0.5"
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
                  className={`cursor-pointer rounded-none px-3 py-1.5 text-xs font-bold transition min-h-[44px] flex items-center justify-center ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-none'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Fiscal Year Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="fiscal-year-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Fiscal Year
            </label>
            <select
              id="fiscal-year-select"
              data-testid="fiscal-year-select"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="h-10 cursor-pointer rounded-none border border-input bg-background px-3 text-base md:text-xs font-semibold text-foreground focus:outline-none min-h-[44px]"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>

        {/* Data Source Indicator: No dead Actual toggle per Prompt R2 */}
        <div className="flex w-full max-w-full items-center gap-2 rounded-none border border-border bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground min-h-[44px] sm:w-auto">
          <span className="h-2 w-2 shrink-0 rounded-none bg-foreground" />
          <span className="min-w-0 break-words">Data Source: <strong className="text-foreground">Projected (underwriting model)</strong></span>
        </div>
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
            title={`Profit & Loss Statement (P&L) · ${scopeLabel}`}
            subtitle="Gross scheduled rent, itemized operating expenses, net operating income, debt service, and cash flow"
            fiscalYear={fiscalYear}
            columns={statementMatrix.columns}
            rows={statementMatrix.rows}
            testId="pl-statement-grid"
          />
        )}

        {selectedReportId === 'BALANCE_SHEET' && statementMatrix && (
          <FinancialStatementGrid
            title={`Balance Sheet · ${scopeLabel}`}
            subtitle="Asset book values, mortgage liabilities, tenant security deposits held, and net owner equity"
            fiscalYear={fiscalYear}
            columns={statementMatrix.columns}
            rows={statementMatrix.rows}
            testId="balance-sheet-grid"
          />
        )}

        {selectedReportId === 'CASH_FLOW' && statementMatrix && (
          <FinancialStatementGrid
            title={`Cash Flow Statement · ${scopeLabel}`}
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
              description="No vendor transactions or 1099 payee records were found in the database. Add vendor payment records to track the $600 IRS reporting threshold."
              actionLabel="Add Vendor Record"
              actionHref="/dashboard/transactions"
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
        className="rounded-none border border-border bg-card p-4 text-center text-xs text-muted-foreground shadow-sm ring-1 ring-foreground/10"
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

'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileDown, Landmark, Building2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProjectStore } from '@/store/projectStore';
import type { LedgerItem } from '@/types/schema';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import {
  REPORT_CATALOG,
  ReportCatalogGrid,
  type ReportCatalogItem,
} from '@/components/reports/ReportCatalogGrid';
import { ReportViewModal } from '@/components/reports/ReportViewModal';
import {
  assessReportReadiness,
  summarizeByPhase,
  untaggedTransactions,
  type TaggableTransaction,
} from '@/lib/reports/plaidPhaseTagging';
import { exportTaxReportPdf } from '@/lib/reports/taxReportPdf';
import { estimatedPaymentDueSoon } from '@/lib/reports/estimatedTaxDates';
import { formatCurrency } from '@/lib/reports/reportEngine';

/* ═══════════════════════════════════════════════════════════════════════════
   Tax Intelligence — fiscal command center.

   Replaces the previous "Reports & Tax Intelligence" bento dashboard, which
   rendered its own NOI/cash-flow widgets and imported none of the report
   engines. `reportEngine.ts`, `cpaPackageEngine.ts`, `ReportCatalogGrid` and
   `ReportViewModal` were all built and unit-tested but had zero importers;
   this page wires them to the route.

   The NOI trend, cash-flow intelligence and capital-gains widgets that used to
   live here remain available under /dashboard/intelligence.
   ═══════════════════════════════════════════════════════════════════════════ */

type PeriodTab = 'Monthly' | 'Quarterly' | 'Yearly' | 'Overall' | 'By Property';

const PERIOD_TABS: PeriodTab[] = ['Monthly', 'Quarterly', 'Yearly', 'Overall', 'By Property'];

/** Which catalog categories surface under each period tab. */
const TAB_CATEGORIES: Record<PeriodTab, ReportCatalogItem['category'][]> = {
  Monthly:       ['Monthly'],
  Quarterly:     ['Quarterly'],
  Yearly:        ['Annual'],
  Overall:       ['Monthly', 'Quarterly', 'Annual', 'Lender (SREO)'],
  'By Property': ['Monthly', 'Quarterly', 'Annual', 'Lender (SREO)'],
};

const ALL_PROJECTS = '__all__';

interface StoreProject {
  id?: string | number;
  address?: string;
  propertyName?: string;
}

export default function TaxIntelligencePage() {
  // Hydrates `projects` and `ledgerItems` from Firestore. Without this the
  // store stays empty and the page renders its no-properties empty state for
  // every user — the previous Reports page called the same hook.
  useAllDealsSync();

  const projects = useProjectStore((s) => s.projects);
  /** projectId -> ledger entries. This is where transactions actually live. */
  const ledgerItems = useProjectStore((s) => s.ledgerItems);

  const [period, setPeriod] = useState<PeriodTab>('Monthly');
  const [projectFilter, setProjectFilter] = useState<string>(ALL_PROJECTS);
  const [openReport, setOpenReport] = useState<ReportCatalogItem['id'] | null>(null);
  const [exporting, setExporting] = useState(false);

  const projectList = useMemo<StoreProject[]>(() => (projects ?? []) as StoreProject[], [projects]);

  /** Projects in scope for the current filter. */
  const scopedProjects = useMemo(() => {
    if (projectFilter === ALL_PROJECTS) return projectList;
    return projectList.filter((p) => String(p.id) === projectFilter);
  }, [projectList, projectFilter]);

  /**
   * Ledger entries across the scoped projects, normalised for phase tagging.
   * `ledgerItems` is keyed by projectId; an entry arriving without its own
   * `projectId` inherits the key it was filed under and is surfaced in the
   * untagged count rather than silently reported under the wrong property.
   *
   * `amount` is stored in dollars and expenses are positive, so it is
   * converted to signed cents here (expenses negative) to match
   * `TaggableTransaction`.
   */
  const scopedTransactions = useMemo<TaggableTransaction[]>(() => {
    return scopedProjects.flatMap((p) => {
      const key = p.id != null ? String(p.id) : '';
      const rows: LedgerItem[] = ledgerItems?.[key] ?? [];
      return rows.map((t, i) => {
        const amount = typeof t.amount === 'number' ? t.amount : 0;
        const isReceipt = t.type === 'receipt';
        return {
          id: String(t.id ?? `${key}-${i}`),
          projectId: t.projectId ?? (key || null),
          category: t.category ?? null,
          description: t.description ?? null,
          amountCents: Math.round(amount * 100) * (isReceipt ? 1 : -1),
          date: t.createdAt ? String(t.createdAt) : null,
        };
      });
    });
  }, [scopedProjects, ledgerItems]);

  const phaseTotals = useMemo(() => summarizeByPhase(scopedTransactions), [scopedTransactions]);
  const untagged = useMemo(() => untaggedTransactions(scopedTransactions), [scopedTransactions]);

  const readiness = useMemo(
    () => assessReportReadiness(scopedProjects.length, scopedTransactions.length),
    [scopedProjects.length, scopedTransactions.length],
  );

  const hasProjects = projectList.length > 0;
  /** A project counts as Plaid-linked once transactions are attached to it. */
  const plaidLinked = scopedTransactions.length > 0;

  /** Statutory 1040-ES deadline check for the Quarterly tab alert. */
  const dueSoon = useMemo(() => estimatedPaymentDueSoon(), []);

  const visibleReports = useMemo(() => {
    const cats = TAB_CATEGORIES[period];
    return REPORT_CATALOG.filter((r) => cats.includes(r.category));
  }, [period]);

  const contextLabel = useMemo(() => {
    const first = scopedProjects[0];
    const scope =
      projectFilter === ALL_PROJECTS
        ? `${projectList.length} propert${projectList.length === 1 ? 'y' : 'ies'}`
        : first?.address ?? first?.propertyName ?? 'Selected property';
    return `${scope} · ${period}`;
  }, [projectFilter, projectList.length, scopedProjects, period]);

  const handleExportPdf = useCallback(async () => {
    if (!readiness.ready) {
      toast.error(readiness.reason);
      return;
    }
    setExporting(true);
    try {
      await exportTaxReportPdf({
        title: `Tax Intelligence — ${period}`,
        context: contextLabel,
        sections: [
          {
            heading: 'REIL Phase Summary',
            columns: ['Phase', 'Transactions', 'Money In', 'Money Out', 'Needs Review'],
            rows: phaseTotals.map((t) => [
              t.label,
              t.count,
              formatCurrency(t.inflowCents / 100),
              formatCurrency(t.outflowCents / 100),
              t.unconfidentCount,
            ]),
          },
          {
            heading: 'Reports Included',
            columns: ['Report', 'Category'],
            rows: visibleReports.map((r) => [r.title, r.category]),
          },
        ],
      });
      toast.success('Report exported.');
    } catch (err) {
      console.error('[TaxIntelligence] PDF export failed', err);
      toast.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }, [readiness, period, contextLabel, phaseTotals, visibleReports]);

  return (
    <div className="w-full space-y-6" data-testid="tax-intelligence-page">
      {/* ━━━ Header ━━━ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-[var(--color-on-surface)]"
            data-testid="tax-intelligence-title"
          >
            Tax Intelligence
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
            Fiscal oversight, estimated taxes, and CPA-ready packages.
          </p>
        </div>

        <div className="relative group">
          <button
            onClick={handleExportPdf}
            disabled={!readiness.ready || exporting}
            data-testid="export-pdf-btn"
            className="pw-interactive-custom h-10 px-4 rounded-lg border border-[var(--pw-border)] text-sm font-medium text-[var(--color-on-surface)] hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
          {!readiness.ready && (
            <span
              role="tooltip"
              data-testid="export-pdf-tooltip"
              className="pointer-events-none absolute right-0 top-full mt-2 w-64 rounded-lg bg-[#0f0f0f] border border-[#222] px-3 py-2 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              {readiness.reason}
            </span>
          )}
        </div>
      </div>

      {/* ━━━ Period tabs ━━━ */}
      <div
        className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/5 w-fit"
        role="tablist"
        data-testid="period-tabs"
      >
        {PERIOD_TABS.map((tab) => {
          const isActive = period === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              data-testid={`period-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setPeriod(tab)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-[var(--color-on-surface)] shadow-sm'
                  : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ━━━ Empty state: no properties ━━━ */}
      {!hasProjects ? (
        <div
          className="rounded-2xl border border-dashed border-[var(--pw-border)] p-10 text-center"
          data-testid="empty-no-projects"
        >
          <Building2 className="w-8 h-8 mx-auto mb-3 text-[var(--color-on-surface-variant)]" />
          <p className="text-sm font-semibold text-[var(--color-on-surface)]">
            Add your first property to unlock Tax Intelligence.
          </p>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center justify-center mt-4 h-10 px-5 rounded-lg border border-[var(--pw-border)] text-sm font-medium hover:bg-white/5 transition-all"
          >
            Add a property
          </Link>
        </div>
      ) : (
        <>
          {/* ━━━ Project scoping (req 7) ━━━ */}
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="project-filter"
              className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]"
            >
              Project
            </label>
            <select
              id="project-filter"
              data-testid="project-filter"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-white/5 border border-[var(--pw-border)] text-sm text-[var(--color-on-surface)] focus:outline-none cursor-pointer"
            >
              <option value={ALL_PROJECTS}>All projects ({projectList.length})</option>
              {projectList.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.address || p.propertyName || `Project ${p.id}`}
                </option>
              ))}
            </select>

            {untagged.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-xs text-amber-400"
                data-testid="untagged-warning"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {untagged.length} transaction{untagged.length === 1 ? '' : 's'} not tagged to a project
              </span>
            )}
          </div>

          {/* ━━━ Plaid empty state — inline, never blocking (reqs 7 & 8) ━━━ */}
          {!plaidLinked && (
            <div
              className="rounded-2xl border border-[var(--pw-border)] bg-white/[0.02] p-5 flex flex-wrap items-center justify-between gap-4"
              data-testid="empty-no-plaid"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Landmark className="w-5 h-5 mt-0.5 shrink-0 text-[var(--color-on-surface-variant)]" />
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  <span className="text-[var(--color-on-surface)] font-semibold">
                    Link your bank account
                  </span>{' '}
                  to auto-categorize transactions for tax reporting.
                </p>
              </div>
              <Link
                href="/dashboard/settings/integrations"
                data-testid="connect-bank-cta"
                className="h-9 px-4 rounded-lg border border-[var(--pw-border)] text-xs font-semibold hover:bg-white/5 transition-all inline-flex items-center shrink-0"
              >
                Connect Bank Account
              </Link>
            </div>
          )}

          {/* ━━━ REIL phase breakdown (req 7) ━━━ */}
          {plaidLinked && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="phase-breakdown">
              {phaseTotals.map((t) => (
                <div
                  key={t.phase}
                  data-testid={`phase-card-${t.phase}`}
                  className="rounded-xl border border-[var(--pw-border)] bg-white/[0.02] p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    {t.label}
                  </p>
                  <p className="text-lg font-bold text-[var(--color-on-surface)] mt-1 tabular-nums">
                    {formatCurrency(t.outflowCents / 100)}
                  </p>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                    {t.count} transaction{t.count === 1 ? '' : 's'}
                    {t.unconfidentCount > 0 && ` · ${t.unconfidentCount} need review`}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ━━━ Estimated tax due alert (req 3) ━━━ */}
          {period === 'Quarterly' && dueSoon.dueSoon && (
            <div
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-2.5"
              data-testid="estimated-tax-alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <p className="text-sm text-[var(--color-on-surface)]">
                <span className="font-semibold">{dueSoon.label}.</span>{' '}
                <span className="text-[var(--color-on-surface-variant)]">
                  Review the 1040-ES worksheet below.
                </span>
              </p>
            </div>
          )}

          {/* ━━━ Report catalog ━━━ */}
          <ReportCatalogGrid
            onSelectReport={(id) => setOpenReport(id)}
            visibleReportIds={visibleReports.map((r) => r.id)}
            projects={scopedProjects}
          />
        </>
      )}

      {/* ━━━ Full report drawer ━━━ */}
      {openReport && (
        <ReportViewModal
          isOpen={!!openReport}
          onClose={() => setOpenReport(null)}
          reportId={openReport}
          projects={scopedProjects}
        />
      )}
    </div>
  );
}

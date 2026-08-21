'use client';

import type { ReportCatalogItem } from '@/lib/reports/report-catalog';
import { REPORT_CATALOG } from '@/lib/reports/report-catalog';

export default function ReportCatalogGrid({
  onSelectReport,
  visibleReportIds,
  dataThroughDate,
}: {
  onSelectReport: (reportId: ReportCatalogItem['id']) => void;
  visibleReportIds: ReportCatalogItem['id'][];
  dataThroughDate?: string;
}) {
  const stamp = dataThroughDate ?? new Date().toISOString().slice(0, 10);
  const filtered = REPORT_CATALOG.filter((r) => visibleReportIds.includes(r.id));

  return (
    <div className="space-y-6" data-testid="report-catalog">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <p className="text-sm font-semibold text-white/70">
          {filtered.length} report{filtered.length === 1 ? '' : 's'} available
        </p>
        <div className="flex items-center gap-2 font-mono text-xs text-white/45">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span>
            Last updated: <strong className="text-white/80">{stamp}</strong>
          </span>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        data-testid="report-cards-grid"
      >
        {filtered.map((report) => (
          <article
            key={report.id}
            data-testid={`report-card-${report.id.toLowerCase().replace(/_/g, '-')}`}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#161318] p-6 transition-all duration-200 hover:border-white/20 hover:shadow-xl"
          >
            <div>
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {report.badge || report.category}
                </span>
                <span className="font-mono text-[10px] text-slate-400">Data through {stamp}</span>
              </div>

              <h3 className="mb-2.5 text-lg font-bold text-white">{report.title}</h3>
              <p className="mb-4 text-xs leading-relaxed text-white/55">{report.description}</p>

              {report.preview && report.preview.length > 0 ? (
                <dl className="mb-6 space-y-1.5 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                  {report.preview.map((line) => (
                    <div key={line.label} className="flex items-baseline justify-between gap-3">
                      <dt className="truncate text-[11px] text-white/45">{line.label}</dt>
                      <dd className="shrink-0 text-[11px] font-semibold tabular-nums text-white">
                        {line.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-xs font-semibold text-slate-400">Ready to compute</span>
              <button
                type="button"
                data-testid="generate-report-btn"
                data-report-id={report.id}
                onClick={() => onSelectReport(report.id)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-100 transition-all hover:bg-slate-700"
              >
                View Full Report
                <span className="material-symbols-outlined text-[14px]">north_east</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

'use client';

import { REPORT_CATALOG, type ReportCatalogItem } from '@/lib/reports/report-catalog';

export default function ReportViewModal({
  reportId,
  contextLabel,
  onClose,
}: {
  reportId: ReportCatalogItem['id'];
  contextLabel: string;
  onClose: () => void;
}) {
  const report = REPORT_CATALOG.find((r) => r.id === reportId);
  if (!report) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      data-testid="report-view-modal"
    >
      <div
        role="dialog"
        aria-label={report.title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#161318] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
              {report.badge ?? report.category}
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">{report.title}</h2>
            <p className="mt-1 text-xs text-white/45">{contextLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-white/65">{report.description}</p>

        {report.preview && report.preview.length > 0 ? (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {report.preview.map((line) => (
              <div
                key={line.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {line.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">{line.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/50">
          Full statement engine and CPA package export wire to migrated report handlers
          post-cutover. Preview figures above are portfolio seed values for UI parity.
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/5"
          >
            Close
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-xl bg-[color:var(--color-primary)] px-4 py-2.5 text-xs font-bold text-[#0d0a0b]"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

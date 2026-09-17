'use client';

import React from 'react';
import type { ReportCatalogItem, ReportId, ReportSection } from '@/lib/reports/report-catalog';
import { REPORT_CATALOG, REPORT_SECTIONS } from '@/lib/reports/report-catalog';

export interface ReportCatalogGridProps {
  selectedReportId: ReportId;
  onSelectReport: (reportId: ReportId) => void;
  dataThroughDate?: string;
}

export function ReportCatalogGrid({
  selectedReportId,
  onSelectReport,
  dataThroughDate,
}: ReportCatalogGridProps) {
  const stamp = dataThroughDate ?? 'Aug 2026';

  return (
    <div className="space-y-8" data-testid="report-catalog">
      {REPORT_SECTIONS.map((section: ReportSection) => {
        const sectionReports = REPORT_CATALOG.filter((r) => r.section === section);

        return (
          <section key={section} className="space-y-4" data-testid={`catalog-section-${section.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-accent">
                  {section === 'Core Financial' ? 'account_balance_wallet' : 'receipt_long'}
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  {section}
                </h3>
              </div>
              <span className="text-xs text-text-muted">
                {sectionReports.length} reports
              </span>
            </div>

            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              data-testid="report-cards-grid"
            >
              {sectionReports.map((report: ReportCatalogItem) => {
                const isSelected = selectedReportId === report.id;

                return (
                  <article
                    key={report.id}
                    data-testid={`report-card-${report.id.toLowerCase().replace(/_/g, '-')}`}
                    onClick={() => onSelectReport(report.id)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all duration-200 backdrop-blur-sm ${
                      isSelected
                        ? 'border-accent bg-accent-subtle shadow-accent-glow ring-1 ring-accent'
                        : 'border-border-subtle bg-surface/60 hover:border-border-subtle hover:bg-elevated/40'
                    }`}
                  >
                    <div>
                      {/* Badge & Date */}
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isSelected
                              ? 'border border-accent/40 bg-accent/15 text-accent'
                              : 'border border-border-subtle bg-elevated/40 text-text-secondary'
                          }`}
                        >
                          {report.categoryTag}
                        </span>
                        <span className="font-mono text-[10px] text-text-muted">
                          Data through {report.dataThrough || stamp}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h4 className="mb-1.5 text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                        {report.title}
                      </h4>
                      <p className="mb-4 text-xs leading-relaxed text-text-muted line-clamp-3">
                        {report.description}
                      </p>

                      {/* Preview Stats */}
                      {report.preview && report.preview.length > 0 ? (
                        <dl className="mb-4 space-y-1 rounded-lg border border-border-subtle bg-surface p-2.5">
                          {report.preview.map((line) => (
                            <div key={line.label} className="flex items-baseline justify-between gap-2">
                              <dt className="truncate text-[10px] text-text-muted">{line.label}</dt>
                              <dd className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-text-primary">
                                {line.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-2">
                      <span className="text-[11px] font-medium text-text-muted">
                        {isSelected ? 'Currently Viewing' : 'Select to view'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold transition-transform group-hover:translate-x-0.5 ${
                          isSelected ? 'text-accent' : 'text-text-secondary'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Open'}
                        <span className="material-symbols-outlined text-[14px]">
                          {isSelected ? 'check' : 'arrow_forward'}
                        </span>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default ReportCatalogGrid;

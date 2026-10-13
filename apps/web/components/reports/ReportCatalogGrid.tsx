import React from 'react';
import {
  ArrowRight,
  Check,
  Receipt,
  Wallet,
} from '@phosphor-icons/react';
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
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                {section === 'Core Financial' ? (
                  <Wallet weight="bold" className="h-4 w-4 text-foreground" />
                ) : (
                  <Receipt weight="bold" className="h-4 w-4 text-foreground" />
                )}
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  {section}
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
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
                    className={`group relative flex flex-col justify-between rounded-none border p-5 cursor-pointer transition-all duration-200 shadow-sm ${
                      isSelected
                        ? 'border-primary bg-card ring-1 ring-primary'
                        : 'border-border bg-card hover:border-foreground/30 hover:bg-accent/40 ring-1 ring-foreground/10'
                    }`}
                  >
                    <div>
                      {/* Badge & Date */}
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span
                          className={`rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isSelected
                              ? 'border border-primary bg-primary/10 text-foreground'
                              : 'border border-border bg-muted text-muted-foreground'
                          }`}
                        >
                          {report.categoryTag}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Data through {report.dataThrough || stamp}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h4 className="mb-1.5 text-sm font-bold text-foreground group-hover:text-foreground transition-colors">
                        {report.title}
                      </h4>
                      <p className="mb-4 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                        {report.description}
                      </p>

                      {/* Preview Stats */}
                      {report.preview && report.preview.length > 0 ? (
                        <dl className="mb-4 space-y-1 rounded-none border border-border bg-muted/30 p-2.5">
                          {report.preview.map((line) => (
                            <div key={line.label} className="flex items-baseline justify-between gap-2">
                              <dt className="truncate text-[10px] text-muted-foreground">{line.label}</dt>
                              <dd className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-foreground">
                                {line.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-between border-t border-border pt-3 mt-2 min-h-[44px]">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {isSelected ? 'Currently Viewing' : 'Select to view'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold transition-transform group-hover:translate-x-0.5 ${
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Open'}
                        {isSelected ? (
                          <Check weight="bold" className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowRight weight="bold" className="h-3.5 w-3.5" />
                        )}
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

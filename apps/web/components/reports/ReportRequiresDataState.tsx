'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export interface ReportRequiresDataStateProps {
  reportTitle: string;
  missingDataType: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  testId?: string;
}

export function ReportRequiresDataState({
  reportTitle,
  missingDataType,
  description,
  actionLabel,
  actionHref,
  testId = 'report-requires-data',
}: ReportRequiresDataStateProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center rounded-2xl border border-border-subtle bg-surface/60 p-10 text-center backdrop-blur-md"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-status-caution/20 bg-status-caution/10 text-status-caution mb-4">
        <span className="material-symbols-outlined text-[28px]">data_info_alert</span>
      </div>

      <h3 className="text-base font-bold text-text-primary tracking-tight">
        {reportTitle}: Requires {missingDataType}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-relaxed text-text-muted">
        {description}
      </p>

      <div className="mt-6">
        <Button
          variant="secondary"
          size="md"
          href={actionHref}
          icon={<span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
          iconPosition="right"
          data-testid="requires-data-cta"
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

export default ReportRequiresDataState;

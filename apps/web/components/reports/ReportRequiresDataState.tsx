'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, WarningCircle } from '@phosphor-icons/react';
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
      className="flex flex-col items-center justify-center rounded-none border border-border bg-card p-10 text-center shadow-sm ring-1 ring-foreground/10"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-none border border-destructive/20 bg-destructive/10 text-destructive mb-4">
        <WarningCircle weight="bold" className="h-7 w-7" />
      </div>

      <h3 className="text-base font-bold text-foreground tracking-tight">
        {reportTitle}: Requires {missingDataType}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>

      <div className="mt-6">
        <Button
          variant="secondary"
          size="md"
          href={actionHref}
          icon={<ArrowRight weight="bold" className="h-4 w-4" />}
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

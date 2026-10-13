import type { MouseEvent } from 'react';
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProjectSummary } from '@/lib/projects/types';
import {
  Folder,
  FolderOpen,
  FolderSimpleDashed,
  CurrencyDollar,
  ArrowRight,
  ChartLineUp,
} from '@phosphor-icons/react';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function strategyLabel(disposition: ProjectSummary['dispositionType']): string {
  if (disposition === 'SALE') return 'Fix & Flip';
  if (disposition === 'RENT') return 'Rental';
  return 'Mixed';
}

function phaseInfo(phase: ProjectSummary['currentPhase']) {
  if (phase === 'purchase') {
    return {
      Icon: FolderOpen,
      progress: 50,
      label: 'Phase 2: Fund',
    };
  }
  if (phase === 'hold') {
    return {
      Icon: Folder,
      progress: 75,
      label: 'Phase 3: Hold',
    };
  }
  if (phase === 'exit') {
    return {
      Icon: Folder,
      progress: 100,
      label: 'Phase 4: Exit',
    };
  }
  return {
    Icon: FolderSimpleDashed,
    progress: 25,
    label: 'Phase 1: Acquisition',
  };
}

export default function ProjectFolderCard({ project }: { project: ProjectSummary }) {
  const router = useRouter();
  const phase = phaseInfo(project.currentPhase);
  const progress = project.phaseCompletionPct ?? phase.progress;
  const ownership = project.ownershipPercentage ?? 100;
  const PhaseIcon = phase.Icon;

  const headline =
    project.dispositionType === 'RENT'
      ? {
          label: 'Est. IRR',
          value: project.estimatedIrr ? `${(project.estimatedIrr * 100).toFixed(1)}%` : '—',
          isIllustrative: false,
        }
      : {
          label: 'Est. Exit',
          value: project.estimatedExitValue ? formatCurrency(project.estimatedExitValue) : '—',
          isIllustrative: Boolean(project.isIllustrativeExitValue),
        };

  return (
    <div
      className="group relative flex cursor-pointer flex-col gap-3 rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-all duration-200 hover:border-foreground/30 hover:shadow-md"
      onClick={() => router.push(`/project/${project.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/project/${project.id}`);
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`View project: ${project.propertyName}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-none border border-border bg-muted text-foreground">
            <PhaseIcon size={20} weight="regular" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {phase.label}
          </span>
        </div>
        <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
          {strategyLabel(project.dispositionType)}
        </span>
      </div>

      <div>
        <h3 className="mb-0.5 truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
          {project.propertyName}
        </h3>
        <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
          {project.dealId || project.dealSlug ? (
            <div className="flex items-center justify-between w-full gap-2">
              <Link
                href={`/marketplace/${project.dealSlug || project.dealId}`}
                onClick={(event: MouseEvent) => event.stopPropagation()}
                data-testid="project-deal-badge"
                className="inline-flex items-center gap-1.5 truncate text-foreground/80 no-underline hover:text-primary group/deal"
                title={project.dealAddress || project.address}
              >
                <CurrencyDollar size={14} className="text-muted-foreground group-hover/deal:text-primary" />
                <span className="truncate text-xs font-medium">Deal: {(project.dealAddress || project.address || '').split(',')[0]}</span>
                <span className="rounded-none border border-border bg-muted px-1.5 py-0.2 text-[10px] font-medium text-foreground">
                  Offering →
                </span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="truncate text-xs text-muted-foreground">{project.address || project.city}</span>
              <Link
                href={`/deal-calculator?projectId=${project.id}`}
                onClick={(event: MouseEvent) => event.stopPropagation()}
                data-testid="project-deal-badge"
                className="inline-flex items-center gap-1 rounded-none border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted transition"
              >
                + Underwrite Deal
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2.5 border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] text-muted-foreground">Ownership</span>
          <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
            {ownership}%
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-end justify-between text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Progress
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-none bg-muted">
            <div
              className="h-full bg-primary rounded-none transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Acquisition
            </p>
            <p className="text-xs font-semibold text-foreground">
              {formatCurrency(project.purchasePrice)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {headline.label}
              </p>
            </div>
            <p className="text-xs font-semibold text-primary">{headline.value}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

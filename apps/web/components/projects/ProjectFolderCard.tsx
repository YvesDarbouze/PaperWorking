'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProjectSummary } from '@/lib/projects/types';

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

function strategyTone(disposition: ProjectSummary['dispositionType']) {
  if (disposition === 'SALE') {
    return {
      text: '#7dd3c0',
      bg: 'rgba(52,211,153,0.10)',
      border: 'rgba(52,211,153,0.20)',
    };
  }
  if (disposition === 'RENT') {
    return {
      text: '#ffac5a',
      bg: 'rgba(255,172,90,0.10)',
      border: 'rgba(255,172,90,0.20)',
    };
  }
  return {
    text: '#7A9EAA',
    bg: 'rgba(122,158,170,0.10)',
    border: 'rgba(122,158,170,0.20)',
  };
}

function phaseVisual(phase: ProjectSummary['currentPhase']) {
  if (phase === 'purchase') {
    return {
      icon: 'snippet_folder',
      stripe: '#7A9EAA',
      iconColor: '#7A9EAA',
      iconBg: 'rgba(122,158,170,0.10)',
      iconBorder: 'rgba(122,158,170,0.20)',
      progressBg: '#7A9EAA',
      progress: 50,
      label: 'Phase 2: Fund',
    };
  }
  if (phase === 'hold') {
    return {
      icon: 'folder',
      stripe: '#ffac5a',
      iconColor: '#ffac5a',
      iconBg: 'rgba(255,172,90,0.10)',
      iconBorder: 'rgba(255,172,90,0.20)',
      progressBg: '#ffac5a',
      progress: 75,
      label: 'Phase 3: Hold',
    };
  }
  if (phase === 'exit') {
    return {
      icon: 'folder_shared',
      stripe: '#00dd94',
      iconColor: '#00dd94',
      iconBg: 'rgba(0,221,148,0.10)',
      iconBorder: 'rgba(0,221,148,0.20)',
      progressBg: '#00dd94',
      progress: 100,
      label: 'Phase 4: Exit',
    };
  }
  return {
    icon: 'folder_special',
    stripe: '#454955',
    iconColor: '#a8adb8',
    iconBg: 'rgba(69,73,85,0.20)',
    iconBorder: 'rgba(69,73,85,0.35)',
    progressBg: '#454955',
    progress: 25,
    label: 'Phase 1: Acquisition',
  };
}

export default function ProjectFolderCard({ project }: { project: ProjectSummary }) {
  const router = useRouter();
  const phase = phaseVisual(project.currentPhase);
  const strategy = strategyTone(project.dispositionType);
  const progress = project.phaseCompletionPct ?? phase.progress;
  const ownership = project.ownershipPercentage ?? 100;
  const headline =
    project.dispositionType === 'RENT'
      ? {
          label: 'Est. IRR',
          value: project.estimatedIrr ? `${(project.estimatedIrr * 100).toFixed(1)}%` : '—',
        }
      : {
          label: 'Est. Exit',
          value: project.estimatedExitValue
            ? formatCurrency(project.estimatedExitValue)
            : 'Unavailable',
        };

  return (
    <div
      className="group relative flex cursor-pointer flex-col gap-4 overflow-hidden border border-white/[0.08] backdrop-blur-xl transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, rgba(22,19,24,0.65) 0%, rgba(13,10,11,0.88) 100%)',
        borderRadius: '8px 28px 16px 16px',
        borderTop: `2px solid ${phase.stripe}55`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        padding: 20,
      }}
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
      onMouseEnter={(event) => {
        event.currentTarget.style.borderTopColor = `${phase.stripe}99`;
        event.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px ${phase.stripe}22`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderTopColor = `${phase.stripe}55`;
        event.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 20% 0%, ${phase.stripe}08 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex items-center justify-between">
        <div
          className="rounded-lg border p-3 transition-colors"
          style={{
            background: phase.iconBg,
            borderColor: phase.iconBorder,
            color: phase.iconColor,
          }}
        >
          <span
            className="material-symbols-outlined text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {phase.icon}
          </span>
        </div>
        <span
          className="rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: strategy.text, background: strategy.bg, borderColor: strategy.border }}
        >
          {strategyLabel(project.dispositionType)}
        </span>
      </div>

      <div className="relative z-10">
        <h3 className="mb-1 truncate text-[20px] font-semibold leading-7 text-[#fdfffc]">
          {project.propertyName}
        </h3>
        <div className="flex items-center justify-between gap-1 text-sm text-white/55">
          {project.dealId || project.dealSlug ? (
            <Link
              href={`/deals/${project.dealSlug || project.propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '')}/detail`}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-1 truncate text-[#00DD94] no-underline hover:underline"
            >
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              <span className="truncate">{project.dealAddress || project.address}</span>
            </Link>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="truncate text-xs text-white/45">{project.address || project.city}</span>
              <Link
                href={`/projects/new?step=2&projectId=${project.id}`}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border border-[#00DD94]/30 bg-[#00DD94]/10 px-2 py-0.5 text-[11px] font-semibold text-[#00DD94] hover:bg-[#00DD94]/20 transition"
              >
                Link a deal
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-auto flex flex-col gap-3 border-t border-white/5 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/45">Ownership</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[12px] font-semibold text-[#7dd3c0]">
            {ownership}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-end justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
              {phase.label}
            </span>
            <span className="text-[11px] text-white/45">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: phase.progressBg,
                boxShadow: `0 0 10px ${phase.progressBg}99`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Acquisition
            </p>
            <p className="text-xs font-semibold text-white/85">
              {formatCurrency(project.purchasePrice)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {headline.label}
            </p>
            <p className="text-xs font-semibold text-[#7dd3c0]">{headline.value}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

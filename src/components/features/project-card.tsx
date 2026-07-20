'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import type { Project } from '@/types/schema';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════════
   ProjectCard — Shared project card used on Dashboard & Projects

   A glass-card surface rendering a single project with:
   ● Phase color stripe (left edge)
   ● Property name + address + type chip
   ● State pill (Draft / Live / Realized)
   ● KPI mini-strip (NOI, Cap Rate, Cash Flow) for active projects
   ● Progress bar for drafts
   ● Full-card link to /dashboard/projects/[id]/phase-[n]

   Variants:
   - "default"  — full card with KPIs (projects grid)
   - "compact"  — condensed card for dashboard recent list
   ═══════════════════════════════════════════════════════════════════ */

/* ── Phase Color Map ── */
const PHASE_COLORS: Record<number, { stripe: string; glow: string; label: string }> = {
  1: { stripe: '#3B82F6', glow: 'rgba(59,130,246,0.15)', label: 'Acquisition' },
  2: { stripe: '#3f7d20', glow: 'rgba(63, 125, 32,0.15)', label: 'Fund' },
  3: { stripe: '#F59E0B', glow: 'rgba(245,158,11,0.15)', label: 'Hold' },
  4: { stripe: '#454955', glow: 'rgba(69, 73, 85,0.15)', label: 'Exit' },
};

/* ── Strategy to display label ── */
function getStrategyLabel(strategy?: string): string {
  if (!strategy) return 'Mixed';
  if (strategy === 'Sell' || strategy === 'Fix & Flip') return 'Fix & Flip';
  if (strategy === 'Rent' || strategy === 'Buy & Hold') return 'Rental';
  return 'Mixed';
}

/* ── Asset class chip label ── */
function getAssetLabel(assetClass?: string): string {
  if (!assetClass) return 'SFR';
  switch (assetClass) {
    case 'Residential':   return 'SFR';
    case 'Multi-Family':  return 'Multi';
    case 'Commercial':    return 'Commercial';
    case 'Land':          return 'Land';
    default:              return 'SFR';
  }
}

/* ── State classification ── */
type ProjectState = 'draft' | 'live' | 'realized';

function classifyState(project: Project): ProjectState {
  const s = project.status;
  if (s === 'exit') return 'realized';
  if (s === 'acquisition' || (!project.financials?.purchasePrice && !project.financials?.estimatedARV)) return 'draft';
  return 'live';
}

const STATE_PILLS: Record<ProjectState, { bg: string; text: string; label: string; pulse?: boolean }> = {
  draft:    { bg: 'rgba(156,163,175,0.15)', text: '#9CA3AF', label: 'DRAFT' },
  live:     { bg: 'rgba(63, 125, 32,0.15)',   text: '#3f7d20', label: 'LIVE', pulse: true },
  realized: { bg: 'rgba(59,130,246,0.15)',   text: '#3B82F6', label: 'REALIZED' },
};

/* ── Wizard completion heuristic for drafts ── */
function getWizardCompletion(project: Project): number {
  let filled = 0;
  let total = 6;
  if (project.propertyName) filled++;
  if (project.address) filled++;
  if (project.financials?.purchasePrice) filled++;
  if (project.financials?.estimatedARV || project.financials?.arv) filled++;
  if (project.dispositionType) filled++;
  if (project.assetClass) filled++;
  return Math.round((filled / total) * 100);
}

/* ── Format currency (compact) ── */
function fmtCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

/* ══════════════════════════════════════════
   ProjectCard — Component
   ══════════════════════════════════════════ */

import toast from 'react-hot-toast';

export interface ProjectCardProps {
  project: Project;
  variant?: 'default' | 'compact';
  showKPIs?: boolean;
}

export function ProjectCard({
  project,
  variant = 'default',
  showKPIs = true,
}: ProjectCardProps) {
  const phase = project.currentPhase ?? 1;
  const phaseConfig = PHASE_COLORS[phase] ?? PHASE_COLORS[1];
  const state = classifyState(project);
  const pill = STATE_PILLS[state];
  const assetLabel = getAssetLabel(project.assetClass);
  const strategy = project.dispositionType === 'RENT'
    ? (project.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
    : (project.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip');
  const strategyLabel = getStrategyLabel(strategy);
  const hasPartners = (project.fractionalInvestors?.length ?? 0) > 0;
  const ownership = project.financials?.ownershipPercentage ?? 100;

  // Compute metrics for KPI strip
  const metrics = useMemo(() => {
    if (!showKPIs || state === 'draft') return null;
    return deriveAllMetrics(
      project.financials,
      project.financials?.estimatedCurrentValue,
      project.dispositionType,
      project.currentPhase,
      project.createdAt
    );
  }, [project, showKPIs, state]);

  // KPI values
  const noiValue = metrics?.noi ?? 0;
  const capRateValue = metrics?.capRate ?? 0;
  const cashFlowValue = metrics?.annualCashFlow ?? 0;

  const wizardCompletion = state === 'draft' ? getWizardCompletion(project) : 0;

  const linkHref = `/dashboard/projects/${project.id}/phase-${phase}`;
  const isCompact = variant === 'compact';

  const handleClick = (e: React.MouseEvent) => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
      e.preventDefault();
      toast.error('Demo Mode: Sign up to view detailed project workspaces.', {
        id: 'demo-click-guard',
        style: { background: '#111', color: '#fff', border: '1px solid #333' }
      });
    }
  };

  return (
    <Link
      href={linkHref}
      onClick={handleClick}
      className={`group block rounded-xl transition-all duration-200 
        hover:translate-y-[-2px] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        ${state === 'draft' ? 'opacity-75 hover:opacity-100' : ''}
      `}
    >
      <div
        className={`relative flex overflow-hidden rounded-xl backdrop-blur-xl
          ${isCompact ? 'min-h-[100px]' : 'min-h-[180px]'}
        `}
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* ── Phase Color Stripe (left edge) ── */}
        <div
          className="w-1 shrink-0 rounded-l-xl"
          style={{ backgroundColor: phaseConfig.stripe }}
        />

        {/* ── Card Content ── */}
        <div className={`flex-1 flex flex-col ${isCompact ? 'p-3 gap-2' : 'p-4 gap-3'}`}>
          {/* Row 1: Header — Name, pills, chips */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`font-semibold truncate tracking-tight ${isCompact ? 'text-sm' : 'text-base'}`}
                style={{ color: 'rgba(253,255,252,0.95)' }}
              >
                {project.propertyName}
              </h3>
              <p
                className="text-[11px] truncate mt-0.5 flex items-center gap-1"
                style={{ color: 'rgba(253,255,252,0.45)' }}
              >
                <span className="material-symbols-outlined text-[12px]">location_on</span>
                {project.address}
              </p>
            </div>

            {/* State pill */}
            <span
              className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: pill.bg, color: pill.text }}
            >
              {pill.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: pill.text }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ backgroundColor: pill.text }}
                  />
                </span>
              )}
              {pill.label}
            </span>
          </div>

          {/* Row 2: Chips — Asset type, Strategy, Ownership, Phase */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Asset type chip */}
            <span
              className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'rgba(253,255,252,0.6)',
              }}
            >
              {assetLabel}
            </span>

            {/* Strategy chip */}
            <span
              className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${phaseConfig.stripe}15`,
                color: phaseConfig.stripe,
              }}
            >
              {strategyLabel}
            </span>

            {/* Phase chip */}
            <span
              className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${phaseConfig.stripe}10`,
                color: `${phaseConfig.stripe}cc`,
                border: `1px solid ${phaseConfig.stripe}20`,
              }}
            >
              P{phase} · {phaseConfig.label}
            </span>

            {/* Ownership chip (only if partners) */}
            {hasPartners && ownership < 100 && (
              <span
                className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: 'rgba(69, 73, 85,0.1)',
                  color: '#454955',
                }}
              >
                {ownership}% owned
              </span>
            )}
          </div>

          {/* Row 3: KPI Mini-Strip (active projects only) */}
          {showKPIs && state !== 'draft' && metrics && !isCompact && (
            <div
              className="grid grid-cols-3 gap-3 mt-auto pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <KPIMiniCell label="NOI" value={fmtCurrency(noiValue)} />
              <KPIMiniCell label="Cap Rate" value={`${capRateValue.toFixed(1)}%`} />
              <KPIMiniCell label="Cash Flow" value={fmtCurrency(cashFlowValue)} />
            </div>
          )}

          {/* Compact KPI row */}
          {showKPIs && state !== 'draft' && metrics && isCompact && (
            <div className="flex items-center gap-4 mt-auto">
              <span className="text-[10px] font-medium" style={{ color: 'rgba(253,255,252,0.5)' }}>
                NOI <span className="text-[11px] font-bold" style={{ color: 'rgba(253,255,252,0.85)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(noiValue)}</span>
              </span>
              <span className="text-[10px] font-medium" style={{ color: 'rgba(253,255,252,0.5)' }}>
                Cap <span className="text-[11px] font-bold" style={{ color: 'rgba(253,255,252,0.85)', fontVariantNumeric: 'tabular-nums' }}>{capRateValue.toFixed(1)}%</span>
              </span>
            </div>
          )}

          {/* Row 3 alt: Draft progress bar */}
          {state === 'draft' && !isCompact && (
            <div className="mt-auto pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.5)' }}>
                  Setup Progress
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'rgba(253,255,252,0.4)', fontVariantNumeric: 'tabular-nums' }}>
                  {wizardCompletion}%
                </span>
              </div>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${wizardCompletion}%`,
                    backgroundColor: '#9CA3AF',
                  }}
                />
              </div>
              <span className="text-[10px] font-medium" style={{ color: '#F59E0B' }}>
                Resume Draft →
              </span>
            </div>
          )}

          {/* Draft CTA for compact */}
          {state === 'draft' && isCompact && (
            <span className="text-[10px] font-medium mt-auto" style={{ color: '#F59E0B' }}>
              Resume Draft →
            </span>
          )}
        </div>

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
        />
      </div>
    </Link>
  );
}

/* ── KPI Mini Cell ── */
function KPIMiniCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[9px] font-semibold uppercase tracking-wider mb-0.5"
        style={{ color: 'rgba(253,255,252,0.4)' }}
      >
        {label}
      </p>
      <p
        className="text-sm font-bold"
        style={{ color: 'rgba(253,255,252,0.9)', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
    </div>
  );
}

export default ProjectCard;

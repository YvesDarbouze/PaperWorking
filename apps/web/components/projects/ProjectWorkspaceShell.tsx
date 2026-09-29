'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PROJECT_SUBROUTES } from '@/lib/projects/types';
import type { ProjectWorkspace } from '@/lib/projects/types';
import { PHASE_COLORS, PHASE_LABELS } from '@/lib/projects/phase-utils';
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav';
import DashboardMobileDrawer from '@/components/dashboard/DashboardMobileDrawer';

export default function ProjectWorkspaceShell({
  project,
  children,
}: {
  project: ProjectWorkspace;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const phaseStyle = PHASE_COLORS[project.currentPhase];
  const shellTone = phaseStyle.shell;
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ backgroundColor: shellTone }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 px-3 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push('/projects')}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 transition active:scale-95 touch-press"
              aria-label="Back to projects"
            >
              ← Projects
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-semibold truncate">{project.propertyName}</h1>
                <span className="hidden sm:inline-block rounded px-2 py-0.5 text-[10px] font-mono uppercase bg-white/10 text-neutral-300 border border-white/10">
                  Overarching Project
                </span>
                <span className="hidden sm:inline-block rounded px-2 py-0.5 text-[10px] font-mono uppercase bg-white/5 text-neutral-400 border border-white/5">
                  Deal Inside Project
                </span>
              </div>
              <div
                className="flex items-center gap-2 text-xs sm:text-sm text-white/70 mt-0.5 flex-wrap cursor-help"
                title={`Canonical Deal Serial: ${project.dealAddress || project.address}`}
              >
                <span className="text-neutral-400 font-medium text-[11px]">Deal Component:</span>
                {project.dealSlug || project.dealId ? (
                  <Link
                    href={`/marketplace/${project.dealSlug || project.dealId}`}
                    data-testid="workspace-deal-component-link"
                    className="inline-flex items-center gap-1 font-medium text-white hover:text-[var(--accent)] hover:underline transition truncate max-w-[320px]"
                    title={`View Deal Component: ${project.dealAddress || project.address || 'Underwriting Deal'}`}
                  >
                    <span className="material-symbols-outlined text-[13px] text-neutral-400">payments</span>
                    <span className="truncate">{(project.dealAddress || project.address || 'View Deal').split(',')[0]}</span>
                    <span className="text-[10px] rounded px-1.5 py-0.2 bg-white/10 text-white/80 border border-white/10">
                      Marketplace Offering →
                    </span>
                  </Link>
                ) : (
                  <span className="truncate text-white/60">
                    {(project.dealAddress || project.address || 'No deal attached').split(',')[0]}
                  </span>
                )}
              </div>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ background: phaseStyle.bg, color: phaseStyle.text }}
            >
              {PHASE_LABELS[project.currentPhase]}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs sm:text-sm pt-1 lg:pt-0">
            <span className="text-white/60">Phase completion</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--accent)]">{project.phase_completion_pct}%</span>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{ width: `${project.phase_completion_pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal scrollable sub-routes with hidden scrollbar and >=44px tap targets */}
        <nav
          aria-label="Project workspace tabs"
          className="mx-auto mt-3 flex max-w-7xl items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap"
        >
          {PROJECT_SUBROUTES.map((route) => {
            const href = route.slug ? `/project/${project.id}/${route.slug}` : `/project/${project.id}`;
            const active = pathname === href;
            return (
              <Link
                key={route.slug || 'overview'}
                href={href}
                className={`flex min-h-[44px] items-center rounded-full px-4 py-2 text-xs sm:text-sm font-medium no-underline transition-colors shrink-0 touch-press ${
                  active ? 'font-semibold' : 'hover:text-white'
                }`}
                style={{
                  background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                  color: active ? '#fdfffc' : 'rgba(253,255,252,0.72)',
                  border: `1px solid ${active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl flex-1 px-3 py-5 sm:px-6 sm:py-6 w-full max-w-full overflow-x-hidden min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">
        {children}
      </main>

      <DashboardBottomNav onOpenDrawer={() => setDrawerOpen(true)} isDrawerOpen={drawerOpen} />
      <DashboardMobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

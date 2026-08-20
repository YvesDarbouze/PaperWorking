'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PROJECT_SUBROUTES } from '@/lib/projects/types';
import type { ProjectWorkspace } from '@/lib/projects/types';
import { PHASE_COLORS, PHASE_LABELS } from '@/lib/projects/phase-utils';

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

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: shellTone }}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 px-4 py-4 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/projects')}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold"
            >
              ← Projects
            </button>
            <div>
              <h1 className="text-xl font-semibold">{project.propertyName}</h1>
              <p className="text-sm text-white/65">{project.address}</p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ background: phaseStyle.bg, color: phaseStyle.text }}
            >
              {PHASE_LABELS[project.currentPhase]}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/60">Phase completion</span>
            <span className="font-semibold text-emerald-300">{project.phase_completion_pct}%</span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${project.phase_completion_pct}%` }}
              />
            </div>
          </div>
        </div>

        <nav className="mx-auto mt-4 flex max-w-7xl flex-wrap gap-2">
          {PROJECT_SUBROUTES.map((route) => {
            const href = route.slug ? `/project/${project.id}/${route.slug}` : `/project/${project.id}`;
            const active = pathname === href;
            return (
              <Link
                key={route.slug || 'overview'}
                href={href}
                className="rounded-full px-3 py-1.5 text-sm no-underline transition-colors"
                style={{
                  background: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)',
                  color: active ? '#fdfffc' : 'rgba(253,255,252,0.72)',
                  border: `1px solid ${active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}

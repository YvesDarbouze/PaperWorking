'use client';

import React from 'react';
import Link from 'next/link';
import { useProjectStore } from '@/store/projectStore';
import { ProjectCard } from '@/components/features/project-card';
import { FolderX, Plus, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-states/EmptyState';
import { useRouter } from 'next/navigation';

/* ═══════════════════════════════════════════════════════════════
   RecentProjects — Dashboard section showing up to 6 recent projects

   - Shows ProjectCard components in a responsive grid
   - "View All →" link to full Projects page
   - Draft projects with reduced opacity + "Resume Draft" CTA
   - Empty state CTA opening the wizard
   ═══════════════════════════════════════════════════════════════ */

const MAX_RECENT = 6;

export function RecentProjects() {
  const router = useRouter();
  const projects = useProjectStore((state) => state.projects);

  // Sort by most recently updated, take first 6
  const recentProjects = [...projects]
    .sort((a, b) => {
      const aDate = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const bDate = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return bDate - aDate;
    })
    .slice(0, MAX_RECENT);

  const handleCreateProject = () => router.push('/dashboard/projects/new');

  if (projects.length === 0) {
    return (
      <section className="space-y-stack-md">
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'rgba(253,255,252,0.9)' }}
        >
          Your Portfolio
        </h2>
        <div className="flex justify-center py-8">
          <EmptyState
            title="Start Your Portfolio"
            description="Create your first project to start tracking deal phases, costs, and performance metrics."
            icon={FolderX}
            action={{
              label: 'Create Project',
              onClick: handleCreateProject,
              icon: Plus,
            }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-stack-md">
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'rgba(253,255,252,0.9)' }}
          >
            Recent Projects
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'rgba(253,255,252,0.4)' }}
          >
            {projects.length} project{projects.length !== 1 ? 's' : ''} in portfolio
          </p>
        </div>

        <div className="flex items-center gap-3">


          {/* View All link */}
          {projects.length > MAX_RECENT && (
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:text-[#454955]"
              style={{ color: 'rgba(253,255,252,0.5)' }}
            >
              View All
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {recentProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            variant="default"
            showKPIs={true}
          />
        ))}
      </div>

      {/* View All (bottom, visible when more than shown) */}
      {projects.length > MAX_RECENT && (
        <div className="flex justify-center pt-2">
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: 'rgba(253,255,252,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            View All {projects.length} Projects
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}

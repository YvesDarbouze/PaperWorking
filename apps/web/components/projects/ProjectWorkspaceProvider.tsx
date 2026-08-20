'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import ProjectWorkspaceShell from '@/components/projects/ProjectWorkspaceShell';
import type { ProjectWorkspace } from '@/lib/projects/types';

interface ProjectWorkspaceContextValue {
  project: ProjectWorkspace | null;
  loading: boolean;
  error: string | null;
}

const ProjectWorkspaceContext = createContext<ProjectWorkspaceContextValue>({
  project: null,
  loading: true,
  error: null,
});

export function useProjectWorkspace() {
  return useContext(ProjectWorkspaceContext);
}

export default function ProjectWorkspaceProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const [project, setProject] = useState<ProjectWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = (await response.json()) as { project?: ProjectWorkspace; error?: string };
        if (!response.ok) throw new Error(body.error ?? 'Project not found');
        if (!cancelled) setProject(body.project ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load project');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const value = useMemo(
    () => ({ project, loading, error }),
    [project, loading, error],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0a0b] text-sm text-white/65">
        Loading project workspace…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0a0b] px-4">
        <div className="max-w-md rounded-2xl border border-red-400/20 bg-red-950/20 p-6 text-sm text-red-100">
          {error ?? 'Project not found'}
        </div>
      </div>
    );
  }

  return (
    <ProjectWorkspaceContext.Provider value={value}>
      <ProjectWorkspaceShell project={project}>{children}</ProjectWorkspaceShell>
    </ProjectWorkspaceContext.Provider>
  );
}

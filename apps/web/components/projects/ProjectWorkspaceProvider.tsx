'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import ProjectWorkspaceShell from '@/components/projects/ProjectWorkspaceShell';
import type { ProjectWorkspace } from '@/lib/projects/types';
import { bffFetch } from '@/lib/api/bff-fetch';

interface ProjectWorkspaceContextValue {
  project: ProjectWorkspace | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProject: (updated: ProjectWorkspace) => void;
}

const ProjectWorkspaceContext = createContext<ProjectWorkspaceContextValue>({
  project: null,
  loading: true,
  error: null,
  refetch: async () => {},
  updateProject: () => {},
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

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await bffFetch(`/api/projects/${projectId}`, {
        cache: 'no-store',
      });
      const body = (await response.json()) as { project?: ProjectWorkspace; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Project not found');
      setProject(body.project ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const updateProject = useCallback((updated: ProjectWorkspace) => {
    setProject(updated);
  }, []);

  const value = useMemo(
    () => ({ project, loading, error, refetch: loadProject, updateProject }),
    [project, loading, error, loadProject, updateProject],
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

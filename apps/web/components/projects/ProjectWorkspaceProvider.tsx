'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from 'react';
import ProjectWorkspaceShell from '@/components/projects/ProjectWorkspaceShell';
import type { ProjectWorkspace } from '@/lib/projects/types';
import { bffFetch } from '@/lib/api/bff-fetch';

export type ProjectSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ProjectWorkspaceContextValue {
  project: ProjectWorkspace | null;
  loading: boolean;
  error: string | null;
  saveStatus: ProjectSaveStatus;
  saveError: string | null;
  refetch: () => Promise<void>;
  updateProject: (updated: ProjectWorkspace, options?: { immediate?: boolean }) => void;
  saveProject: (patch?: Partial<ProjectWorkspace>) => Promise<boolean>;
}

const ProjectWorkspaceContext = createContext<ProjectWorkspaceContextValue>({
  project: null,
  loading: true,
  error: null,
  saveStatus: 'idle',
  saveError: null,
  refetch: async () => {},
  updateProject: () => {},
  saveProject: async () => false,
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
  const [saveStatus, setSaveStatus] = useState<ProjectSaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetSavedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPatchRef = useRef<Partial<ProjectWorkspace> | null>(null);
  // Last server-confirmed state; saves send only the top-level fields that differ from it.
  const serverStateRef = useRef<ProjectWorkspace | null>(null);

  const changedFields = (next: ProjectWorkspace): Partial<ProjectWorkspace> => {
    const base = serverStateRef.current;
    if (!base) return next;
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(next) as Array<keyof ProjectWorkspace>) {
      if (next[key] !== base[key]) patch[key] = next[key];
    }
    return patch as Partial<ProjectWorkspace>;
  };

  const executeSave = useCallback(
    async (patch: Partial<ProjectWorkspace>): Promise<boolean> => {
      setSaveStatus('saving');
      setSaveError(null);
      if (resetSavedTimerRef.current) {
        clearTimeout(resetSavedTimerRef.current);
        resetSavedTimerRef.current = null;
      }

      try {
        const fetchFn = typeof bffFetch === 'function' ? bffFetch : fetch;
        const response = await fetchFn(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string | { message?: string };
          };
          const msg =
            (typeof body?.error === 'object' && body?.error?.message) ||
            (typeof body?.error === 'string' && body.error) ||
            `Failed to save project (${response.status})`;
          throw new Error(String(msg));
        }

        const data = (await response.json().catch(() => ({}))) as { project?: ProjectWorkspace };
        if (data.project) {
          serverStateRef.current = data.project;
          setProject((prev) => (prev ? { ...prev, ...data.project } : data.project!));
        }

        setSaveStatus('saved');
        resetSavedTimerRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
        return true;
      } catch (err: unknown) {
        console.error('[ProjectWorkspaceProvider] Error auto-saving project:', err);
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
        return false;
      }
    },
    [projectId]
  );

  const saveProject = useCallback(
    async (patch?: Partial<ProjectWorkspace>): Promise<boolean> => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const toSave = patch || pendingPatchRef.current || (project ? changedFields(project) : {});
      pendingPatchRef.current = null;
      return executeSave(toSave);
    },
    [executeSave, project]
  );

  const updateProject = useCallback(
    (updated: ProjectWorkspace, options?: { immediate?: boolean }) => {
      // 1. Optimistic local state update
      setProject(updated);
      const patch = changedFields(updated);
      pendingPatchRef.current = patch;

      // 2. Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // 3. Immediate or debounced server save
      if (options?.immediate) {
        void executeSave(patch);
      } else {
        setSaveStatus('saving');
        debounceTimerRef.current = setTimeout(() => {
          if (pendingPatchRef.current) {
            void executeSave(pendingPatchRef.current);
          }
        }, 500);
      }
    },
    [executeSave]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (resetSavedTimerRef.current) clearTimeout(resetSavedTimerRef.current);
    };
  }, []);

  const hasLoadedRef = useRef(false);

  const loadProject = useCallback(async () => {
    // Only the first load shows the full-page loading state; tool refreshes update in place.
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const response = await bffFetch(`/api/projects/${projectId}`, {
        cache: 'no-store',
      });
      const body = (await response.json()) as { project?: ProjectWorkspace; error?: unknown };
      if (!response.ok) {
        const errorMsg =
          body.error && typeof body.error === 'object' && 'message' in body.error
            ? String((body.error as { message: unknown }).message)
            : typeof body.error === 'string'
              ? body.error
              : 'Project workspace unavailable';
        throw new Error(errorMsg);
      }
      serverStateRef.current = body.project ?? null;
      setProject(body.project ?? null);
      hasLoadedRef.current = true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const value = useMemo(
    () => ({
      project,
      loading,
      error,
      saveStatus,
      saveError,
      refetch: loadProject,
      updateProject,
      saveProject,
    }),
    [project, loading, error, saveStatus, saveError, loadProject, updateProject, saveProject],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-xs font-mono text-neutral-400">
        Loading project workspace…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="w-full max-w-md rounded-none border border-neutral-800 bg-neutral-950 p-6 text-sm">
          <div className="mb-2 text-xs font-mono uppercase tracking-wider text-red-400">Workspace Unavailable</div>
          <p className="mb-4 text-xs font-mono text-neutral-300">{error ?? 'Project not found or session expired.'}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadProject()}
              className="rounded-none border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-white hover:bg-neutral-800 transition-colors"
            >
              Retry
            </button>
            <a
              href="/login"
              className="rounded-none bg-white px-3 py-1.5 text-xs font-mono font-medium text-black hover:bg-neutral-200 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProjectWorkspaceContext.Provider value={value}>
      <ProjectWorkspaceShell project={project} saveStatus={saveStatus}>
        {children}
      </ProjectWorkspaceShell>
    </ProjectWorkspaceContext.Provider>
  );
}

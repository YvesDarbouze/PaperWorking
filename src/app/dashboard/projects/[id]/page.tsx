'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWorkspaceProject } from './layout';

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const { project, loading } = useWorkspaceProject();

  useEffect(() => {
    if (loading || !project) return;

    let path = 'phase-1';
    
    if (project.status === 'exit' || project.currentPhase === 4 || project.retrospective) {
      path = 'phase-4';
    } else if (project.status === 'hold' || project.currentPhase === 3) {
      path = 'phase-3';
    } else if (project.status === 'fund' || project.currentPhase === 2) {
      path = 'phase-2';
    }

    router.replace(`/dashboard/projects/${projectId}/${path}`);
  }, [project, loading, projectId, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]" style={{ color: 'var(--text-secondary)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-wider font-bold">Redirecting to active workspace...</p>
      </div>
    </div>
  );
}

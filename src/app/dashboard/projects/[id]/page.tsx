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
    
    if (project.retrospective || project.status === 'Sold' || project.status === 'closed_won' || project.status === 'closed_lost') {
      path = 'phase-4';
    } else if (project.status === 'Renovating' || project.status === 'Rented' || project.entryStage === 'renovating_marketing') {
      path = 'phase-3';
    } else if (project.status === 'Under Contract' && project.entryStage === 'owned_closing') {
      path = 'phase-2';
    } else if (project.phaseStatus?.includes('Phase 2') || project.currentPhase === 2) {
      path = 'phase-2';
    } else if (project.phaseStatus?.includes('Phase 3') || project.currentPhase === 3) {
      path = 'phase-3';
    } else if (project.phaseStatus?.includes('Phase 4') || project.currentPhase === 4) {
      path = 'phase-4';
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

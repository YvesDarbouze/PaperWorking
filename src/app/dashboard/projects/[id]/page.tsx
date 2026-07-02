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

    // Resolve the path based on project.phaseStatus
    const phaseStatus = project.phaseStatus;
    let path = 'phase-1';
    
    if (phaseStatus === 'Phase 2: Acquisition' || phaseStatus === 'Phase 2: Transaction') {
      path = 'phase-2';
    } else if (
      phaseStatus === 'Phase 3: Holding & Rehab' ||
      phaseStatus === 'Phase 3: Rehab & Hold' ||
      phaseStatus === 'Phase 3: Rehab'
    ) {
      path = 'phase-3';
    } else if (
      phaseStatus === 'Phase 4: Closing & Exit' ||
      phaseStatus === 'Phase 4: Realized' ||
      phaseStatus === 'Phase 4: Hold / Exit'
    ) {
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

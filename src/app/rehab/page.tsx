'use client';

import React, { useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import RehabOperationsTracker from '@/components/operations/RehabOperationsTracker';

export default function RehabPage() {
  const projects = useProjectStore((s) => s.projects);
  const currentProject = useProjectStore((s) => s.currentProject);
  const setDeal = useProjectStore((s) => s.setDeal);

  useEffect(() => {
    if (!currentProject && projects.length > 0) {
      const rehabProject = projects.find(
        (p) => p.phaseStatus === 'Phase 3: Hold'
      );
      if (rehabProject) {
        setDeal(rehabProject);
      }
    }
  }, [projects, currentProject, setDeal]);

  return <RehabOperationsTracker />;
}


'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { HoldWorkspaceShell } from '@/components/hold/HoldWorkspaceShell';
import { DispositionType, ScopeTier } from '@/lib/project/holdCardRegistry';

export default function Phase3HoldWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = (params?.id as string) || 'demo';
  const userId = searchParams?.get('userId') || 'user_1';
  const { project } = useWorkspaceProject();

  // Normalize disposition_type (Decision H-1 Law: read-only in Hold)
  const queryStrategy = searchParams?.get('strategy');
  const rawStrategy = queryStrategy || (project as any)?.disposition_type || (project as any)?.strategyType || 'RENT';
  let dispositionType: DispositionType = 'RENT';

  if (rawStrategy === 'SALE' || rawStrategy === 'Fix & Flip' || rawStrategy === 'Sell') {
    dispositionType = 'SALE';
  } else if (rawStrategy === 'LEASE') {
    dispositionType = 'LEASE';
  } else {
    dispositionType = 'RENT';
  }

  // Scope tier
  const rawTier = (project as any)?.renovationTier || (project as any)?.rehabTier || 'RENOVATE';
  let scopeTier: ScopeTier = 'RENOVATE';
  if (['STAGE', 'REFURBISH', 'RENOVATE', 'GUT', 'DEVELOP'].includes(rawTier.toUpperCase())) {
    scopeTier = rawTier.toUpperCase() as ScopeTier;
  }

  return (
    <HoldWorkspaceShell
      projectId={projectId}
      address={project?.dealAddress || project?.address || 'Demo Property — 1044 S Olive St'}
      dispositionType={dispositionType}
      scopeTier={scopeTier}
      userId={userId}
    />
  );
}

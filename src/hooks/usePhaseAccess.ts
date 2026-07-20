'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import { usePermissions } from './usePermissions';

export function usePhaseAccess(phaseId: 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4') {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params?.id as string | undefined;
  
  const project = useProjectStore(s => projectId ? s.projects.find(p => p.id === projectId) : null);
  const { isLead } = usePermissions();

  if (!projectId || !project || !user) {
    return { canView: true, canEdit: true, loading: true };
  }

  // 1. Lead Investor/Admin/Owner has full access
  if (project.ownerUid === user.uid || isLead) {
    return { canView: true, canEdit: true, loading: false };
  }

  // 2. Check if the user is a linked EquityParty
  const party = project.equityParties?.find(
    p => p.memberId === user.uid || (p.email && p.email.toLowerCase() === user.email.toLowerCase())
  );

  if (party) {
    const permissions = party.phasePermissions?.[phaseId] || { canView: false, canEdit: false };
    return {
      canView: !!permissions.canView,
      canEdit: !!permissions.canEdit,
      loading: false,
    };
  }

  // 3. Fallback: Default to no access for non-lead / non-owner / non-linked users
  return { canView: false, canEdit: false, loading: false };
}

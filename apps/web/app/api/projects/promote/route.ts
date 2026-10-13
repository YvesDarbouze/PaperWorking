import { handleProjectsPromotePost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  createProjectInStore,
  countProjectsInStore,
} from '@/lib/projects/project-store';
import { initializeProjectTools } from '@/lib/projects/project-tools-init';

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  const body = await request.json();

  const targetOrgId = (body as any)?.organizationId || 'org-1';

  const result = await handleProjectsPromotePost(body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    getUser: async () => ({
      organizationId: targetOrgId,
      account_type: 'standard',
    }),
    countOrgProjects: async () => countProjectsInStore(targetOrgId),
    createProject: async ({ projectData, storageQuotaBytes, organizationId }) => {
      const projectId = (projectData as any).id || `proj-${Date.now().toString().slice(-6)}`;
      const pData = projectData as any;
      const initializedTools = initializeProjectTools({
        projectId,
        propertyName: pData.propertyName || pData.address || 'Project Workspace',
        address: pData.address || pData.property_address || '',
        purchasePrice: pData.purchasePrice,
        rehabBudget: pData.rehabBudget || pData.rehab_costs,
        estimatedARV: pData.estimatedARV,
        strategy: pData.strategy || pData.exit_strategy,
        creatorUid: isDevAuthFailure(auth) ? 'usr-dev-1' : auth.uid,
        creatorName: 'Lead Underwriter',
        teamMembers: body.teamMembers || [],
        targetContractDate: body.targetContractDate,
        targetClosingDate: body.targetClosingDate,
        inspectionDays: body.inspectionDays,
        financingDays: body.financingDays,
      });

      const created = await createProjectInStore({
        ...pData,
        ...initializedTools,
        id: projectId,
        organizationId: organizationId || targetOrgId,
        storageQuotaBytes,
      });
      return { projectId, project: created as unknown as Record<string, unknown> };
    },
  });

  return toNextResponse(result);
}

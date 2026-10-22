import { handleProjectsPromotePost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { ensurePersonalOrganization } from '@paperworking/database';
import {
  createProjectInStore,
  countProjectsInStore,
} from '@/lib/projects/project-store';
import { initializeProjectTools } from '@/lib/projects/project-tools-init';

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  const body = await request.json();

  const targetOrgId =
    (body as any)?.organizationId ||
    (!isDevAuthFailure(auth) && auth.organizationId ? auth.organizationId : null) ||
    (!isDevAuthFailure(auth) ? `org_me_${auth.uid}` : 'org-1');

  const isVendor = !isDevAuthFailure(auth) && auth.accountType === 'vendor';

  const result = await handleProjectsPromotePost(body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    getUser: async () => ({
      organizationId: targetOrgId,
      account_type: isVendor ? 'vendor' : 'standard',
      role: isVendor ? 'vendor' : 'owner',
    }),
    countOrgProjects: async () => countProjectsInStore(targetOrgId),
    createProject: async ({ projectData, storageQuotaBytes, organizationId }) => {
      const resolvedOrgId = organizationId || targetOrgId;

      // Personal workspace convention: org_me_<uid> with an active owner membership
      // so the creator can access the project page immediately after creation.
      if (!isDevAuthFailure(auth) && resolvedOrgId.startsWith('org_me_')) {
        try {
          await ensurePersonalOrganization(auth.uid, resolvedOrgId);
        } catch {
          // Non-fatal: project creation continues even if workspace bootstrap fails.
        }
      }

      const projectId = (projectData as any).id || `proj-${Date.now().toString().slice(-6)}`;
      const pData = projectData as any;
      const resolvedPurchasePrice =
        typeof pData.purchasePrice === 'number' && Number.isFinite(pData.purchasePrice)
          ? pData.purchasePrice
          : typeof pData.purchase_price === 'number' && Number.isFinite(pData.purchase_price)
            ? pData.purchase_price
            : typeof body?.purchasePrice === 'number' && Number.isFinite(body.purchasePrice)
              ? body.purchasePrice
              : 0;
      const resolvedRehabBudget =
        typeof pData.rehab_costs === 'number' && Number.isFinite(pData.rehab_costs)
          ? pData.rehab_costs
          : typeof pData.rehabBudget === 'number' && Number.isFinite(pData.rehabBudget)
            ? pData.rehabBudget
            : typeof body?.rehabBudget === 'number' && Number.isFinite(body.rehabBudget)
              ? body.rehabBudget
              : typeof body?.rehab_costs === 'number' && Number.isFinite(body.rehab_costs)
                ? body.rehab_costs
                : 0;
      const resolvedEstimatedArv =
        typeof pData.estimatedARV === 'number' && Number.isFinite(pData.estimatedARV) && pData.estimatedARV > 0
          ? pData.estimatedARV
          : typeof pData.estimatedExitValue === 'number' && Number.isFinite(pData.estimatedExitValue) && pData.estimatedExitValue > 0
            ? pData.estimatedExitValue
            : typeof pData.underwritingSnapshot?.inputs?.estimatedARV === 'number' &&
                Number.isFinite(pData.underwritingSnapshot.inputs.estimatedARV) &&
                pData.underwritingSnapshot.inputs.estimatedARV > 0
              ? pData.underwritingSnapshot.inputs.estimatedARV
              : typeof body?.estimatedARV === 'number' && Number.isFinite(body.estimatedARV) && body.estimatedARV > 0
                ? body.estimatedARV
                : resolvedPurchasePrice > 0
                  ? Math.round((resolvedPurchasePrice + Math.max(0, resolvedRehabBudget)) * 1.3)
                  : 650000;
      const initializedTools = initializeProjectTools({
        projectId,
        propertyName: pData.propertyName || pData.address || 'Project Workspace',
        address: pData.address || pData.property_address || '',
        purchasePrice: resolvedPurchasePrice,
        rehabBudget: resolvedRehabBudget,
        estimatedARV: resolvedEstimatedArv,
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
        organizationId: resolvedOrgId,
        purchasePrice: resolvedPurchasePrice,
        purchase_price: resolvedPurchasePrice,
        rehab_costs: resolvedRehabBudget,
        rehabBudget: resolvedRehabBudget,
        estimatedARV: resolvedEstimatedArv,
        estimatedExitValue: resolvedEstimatedArv,
        ...(pData.underwritingSnapshot
          ? {
              underwritingSnapshot: {
                ...pData.underwritingSnapshot,
                inputs: {
                  ...(pData.underwritingSnapshot.inputs || {}),
                  purchasePrice: resolvedPurchasePrice,
                  rehabBudget: resolvedRehabBudget,
                  estimatedARV:
                    pData.underwritingSnapshot.inputs?.estimatedARV ?? resolvedEstimatedArv,
                },
              },
            }
          : {}),
        storageQuotaBytes,
      } as any);
      return { projectId, project: created as unknown as Record<string, unknown> };
    },
  });

  return toNextResponse(result);
}

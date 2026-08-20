import { describe, expect, it } from '@jest/globals';
import {
  handleReilProjectsGet,
  handleReilProjectsPost,
  handleReilProjectByIdGet,
  handleReilProjectByIdPatch,
} from '../routes/reil/projects/handler.js';
import {
  handleReilProjectAssignmentsGet,
  handleReilProjectAssignmentsPost,
  handleReilProjectAssignmentPatch,
  handleReilProjectStatusGet,
  handleReilProjectStatusPost,
  handleReilProjectTermsGet,
  handleReilProjectTermsPost,
  handleReilProjectInvitePost,
} from '../routes/reil/projects/subroutes/handler.js';
import {
  handleProjectsAcquisitionPatch,
  handleProjectsPurchasePatch,
  handleProjectsHoldPatch,
  handleProjectsHoldRegistryGet,
  handleProjectsHoldRegistryPatch,
  handleProjectsExitPatch,
} from '../routes/projects/phases/handler.js';
import {
  handleProjectsLoanEstimatesGet,
  handleProjectsLoanEstimatesPost,
  handleProjectsLoanEstimateDelete,
} from '../routes/projects/loan-estimates/handler.js';
import {
  handleProjectsLenderPackageItemPatch,
  handleProjectsLenderPackageItemDelete,
  handleProjectsLenderPackageDebtFolderPost,
} from '../routes/projects/lender-package/by-id/handler.js';
import {
  handleIdentityClaimStartPost,
  handleIdentityClaimVerifyPost,
  handleIdentityClaimBindTokenPost,
  handleIdentityAppealPost,
  handleIdentityReportSpamPost,
} from '../routes/identity/handler.js';
import {
  handleTaxSharePost,
  handleTaxShareGet,
  handleTaxShareTokenGet,
  handleTaxShareRevokePost,
} from '../routes/tax/share/handler.js';

const auth = { uid: 'user-1', email: 'user@test.com', name: 'User One' };
const reilProject = {
  id: 'rp1',
  createdById: 'user-1',
  collaborators: [],
  displayName: 'Test Project',
};

describe('Phase 4z handlers', () => {
  it('reil project handlers', async () => {
    const list = await handleReilProjectsGet({
      requireAuth: async () => auth,
      listProjects: async () => [reilProject],
    });
    expect(list.status).toBe(200);

    const create = await handleReilProjectsPost(
      { addressLine: '123 Main' },
      {
        requireAuth: async () => auth,
        createProject: async (_uid, body) => ({ id: 'new', ...body }),
      },
    );
    expect(create.status).toBe(201);

    const get = await handleReilProjectByIdGet('rp1', {
      requireAuth: async () => auth,
      getProject: async () => reilProject,
    });
    expect(get.status).toBe(200);

    const patch = await handleReilProjectByIdPatch(
      'rp1',
      { displayName: 'Updated' },
      {
        requireAuth: async () => auth,
        getProject: async () => reilProject,
        updateProject: async (_id, body) => ({ ...reilProject, ...body }),
      },
    );
    expect(patch.status).toBe(200);
  });

  it('reil subroute handlers', async () => {
    const deps = {
      requireAuth: async () => auth,
      getProject: async () => reilProject,
    };

    expect((await handleReilProjectAssignmentsGet('rp1', { ...deps, listAssignments: async () => [] })).status).toBe(
      200,
    );
    expect(
      (
        await handleReilProjectAssignmentsPost(
          'rp1',
          { fieldKey: 'price', assignedToId: 'u2' },
          { ...deps, upsertAssignment: async () => ({ id: 'a1' }) },
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await handleReilProjectAssignmentPatch(
          'rp1',
          'a1',
          { status: 'FILLED' },
          { ...deps, patchAssignment: async () => ({ id: 'a1', status: 'FILLED' }) },
        )
      ).status,
    ).toBe(200);
    expect((await handleReilProjectStatusGet('rp1', { ...deps, listStatusEvents: async () => [] })).status).toBe(200);
    expect(
      (
        await handleReilProjectStatusPost(
          'rp1',
          { status: 'UNDER_CONTRACT' },
          { ...deps, createStatusEvent: async () => ({ status: 'UNDER_CONTRACT' }) },
        )
      ).status,
    ).toBe(201);
    expect((await handleReilProjectTermsGet('rp1', { ...deps, getTerms: async () => ({}) })).status).toBe(200);
    expect(
      (
        await handleReilProjectTermsPost(
          'rp1',
          { sellerResponse: 'ACCEPTED' },
          { ...deps, upsertTerms: async () => ({ sellerResponse: 'ACCEPTED' }) },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handleReilProjectInvitePost(
          'rp1',
          { email: 'collab@test.com', role: 'VIEWER' },
          {
            ...deps,
            inviteCollaborator: async () => ({ email: 'collab@test.com' }),
          },
        )
      ).status,
    ).toBe(201);
  });

  it('project phase handlers', async () => {
    const accessDeps = {
      requireAuth: async () => auth,
      verifyAccess: async () => ({ authorized: true, project: { financials: {} } }),
      authorizeMutation: () => ({ authorized: true }),
      updateProject: async (_id: string, update: Record<string, unknown>) => ({ id: 'p1', ...update }),
    };

    expect((await handleProjectsAcquisitionPatch('p1', { financials: { purchasePrice: 100000 } }, accessDeps)).status).toBe(
      200,
    );
    expect(
      (await handleProjectsPurchasePatch('p1', { financials: { loanAmount: 80000 } }, accessDeps)).status,
    ).toBe(200);
    expect((await handleProjectsHoldPatch('p1', { financials: { monthlyGrossRent: 2000 } }, accessDeps)).status).toBe(
      200,
    );
    expect((await handleProjectsHoldRegistryGet('p1', accessDeps)).status).toBe(200);
    expect(
      (
        await handleProjectsHoldRegistryPatch(
          'p1',
          { renovationTier: 'light' },
          { ...accessDeps, validateRegistry: () => ({ ok: true as const, data: { renovationTier: 'light' } }) },
        )
      ).status,
    ).toBe(200);
    expect((await handleProjectsExitPatch('p1', { realized: true }, accessDeps)).status).toBe(200);
  });

  it('loan estimates and lender package handlers', async () => {
    const loanDeps = {
      requireAuth: async () => auth,
      verifyAccess: async () => ({ authorized: true, role: 'Lead Investor', project: {} }),
    };

    expect((await handleProjectsLoanEstimatesGet('p1', { ...loanDeps, listEstimates: async () => [] })).status).toBe(
      200,
    );
    expect(
      (
        await handleProjectsLoanEstimatesPost(
          'p1',
          { lenderName: 'Bank', amountCents: 100000, interestRate: 5, termMonths: 360 },
          { ...loanDeps, createEstimate: async (_pid, est) => est },
        )
      ).status,
    ).toBe(201);
    expect(
      (await handleProjectsLoanEstimateDelete('p1', 'e1', { ...loanDeps, deleteEstimate: async () => true })).status,
    ).toBe(200);

    const memberDeps = {
      requireAuth: async () => auth,
      verifyMembership: async () => ({ organizationId: 'org-1', ownerUid: auth.uid }),
      loadItem: async () => ({ id: 'item-1' }),
    };
    expect(
      (
        await handleProjectsLenderPackageItemPatch(
          'p1',
          'item-1',
          { status: 'Uploaded' },
          { ...memberDeps, updateItem: async (_p, _i, update) => ({ id: 'item-1', ...update }) },
        )
      ).status,
    ).toBe(200);
    expect(
      (await handleProjectsLenderPackageItemDelete('p1', 'item-1', { ...memberDeps, deleteItem: async () => true }))
        .status,
    ).toBe(200);
    expect(
      (
        await handleProjectsLenderPackageDebtFolderPost('p1', {
          ...memberDeps,
          findDebtFolder: async () => null,
          createDebtFolder: async () => 'folder-1',
        })
      ).status,
    ).toBe(201);
  });

  it('identity and tax handlers', async () => {
    expect(
      (
        await handleIdentityClaimStartPost(
          { claimEmail: 'old@test.com' },
          {
            requireAuth: async () => auth,
            checkEmailHistory: async () => true,
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleIdentityClaimVerifyPost(
          { claimEmail: 'old@test.com', code: '123456' },
          {
            requireAuth: async () => auth,
            loadClaim: async () => ({
              code: '123456',
              expiresAt: new Date(Date.now() + 60000).toISOString(),
              verified: false,
            }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleIdentityClaimBindTokenPost(
          { token: 'invite-token' },
          {
            requireAuth: async () => auth,
            findInvitation: async () => ({ email: 'invited@test.com' }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleIdentityAppealPost(
          { reason: 'False positive' },
          {
            requireAuth: async () => auth,
            loadUser: async () => ({ invitationSuspended: true }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleIdentityReportSpamPost(
          { email: 'a@test.com', token: 'tok', projectId: 'p1' },
          {
            findInvitation: async () => ({ docRef: {}, inviterUid: 'inviter' }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleTaxSharePost(
          { taxYear: 2025, projectIds: ['p1'] },
          {
            requireAuth: async () => auth,
            loadOrganization: async () => 'org-1',
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (await handleTaxShareGet({ requireAuth: async () => auth, listShares: async () => [] })).status,
    ).toBe(200);

    expect(
      (
        await handleTaxShareTokenGet('share-token', {
          loadShare: async () => ({
            taxYear: 2025,
            projectIds: ['p1'],
            revoked: false,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          }),
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await handleTaxShareRevokePost(
          { token: 'share-token' },
          {
            requireAuth: async () => auth,
            loadShare: async () => ({ userId: auth.uid }),
          },
        )
      ).status,
    ).toBe(200);
  });
});

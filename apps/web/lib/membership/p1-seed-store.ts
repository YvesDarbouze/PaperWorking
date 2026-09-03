import { NextResponse } from 'next/server';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

/**
 * Seed store for P1 marketplace/collaboration collections.
 * Replaces missing Firestore docs until live adapters land.
 * Does NOT touch packageShareTokens / support_taxonomy (KEEP).
 */

export type VendorServiceSeed = {
  id: string;
  vendorUid: string;
  title: string;
  serviceType: string;
  description: string;
  status: 'draft' | 'published' | 'paused' | 'archived';
  regions?: string[];
  basePrice?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
};

export type DealInvitationSeed = {
  id: string;
  dealListingId: string;
  projectId: string;
  inviterUid: string;
  inviteeEmail: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type InvestorFollowerSeed = {
  id: string;
  followerUid: string;
  targetUid: string;
  createdAt: string;
};

const now = '2026-08-26T00:00:00.000Z';

export let VENDOR_SERVICES: VendorServiceSeed[] = [
  {
    id: 'svc-1',
    vendorUid: 'vendor-1',
    title: 'Full roof inspection',
    serviceType: 'inspection',
    description: 'Moisture scan + written report',
    status: 'published',
    regions: ['TX', 'OK'],
    basePrice: 450,
    currency: 'USD',
    createdAt: now,
    updatedAt: now,
  },
];

export let DEAL_INVITATIONS: DealInvitationSeed[] = [
  {
    id: 'inv-1',
    dealListingId: 'listing-1',
    projectId: 'proj-1',
    inviterUid: 'dev-user-1',
    inviteeEmail: 'lp@example.com',
    token: 'demo-invite-token-1',
    status: 'pending',
    expiresAt: '2026-09-26T00:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  },
];

export let INVESTOR_FOLLOWERS: InvestorFollowerSeed[] = [
  {
    id: 'dev-user-1_investor-2',
    followerUid: 'dev-user-1',
    targetUid: 'investor-2',
    createdAt: now,
  },
];

/** projects/{id}/vendorRequests | commitments | activityLog | phaseSnapshots */
export type ProjectSubcollectionName =
  | 'vendorRequests'
  | 'commitments'
  | 'activityLog'
  | 'phaseSnapshots';

type SubDoc = Record<string, unknown> & { id: string; projectId: string };

const SUBCOLLECTIONS: Record<string, SubDoc[]> = {
  'proj-1:vendorRequests': [
    {
      id: 'vr-1',
      projectId: 'proj-1',
      vendorType: 'inspector',
      status: 'open',
      title: 'Roof inspection bid',
      createdAt: now,
    },
  ],
  'proj-1:commitments': [
    {
      id: 'cmt-1',
      projectId: 'proj-1',
      investorUid: 'investor-2',
      amount: 100000,
      status: 'indicated',
      createdAt: now,
    },
  ],
  'proj-1:activityLog': [
    {
      id: 'act-1',
      projectId: 'proj-1',
      actorUid: 'dev-user-1',
      action: 'member.invited',
      summary: 'Invited Jordan as TEAM_LEAD',
      createdAt: now,
    },
  ],
  'proj-1:phaseSnapshots': [
    {
      id: 'snap-1',
      projectId: 'proj-1',
      phase: 1,
      label: 'Acquisition draft',
      payload: { offerPrice: 425000 },
      createdAt: now,
    },
  ],
};

export function listVendorServices(vendorUid?: string | null) {
  if (!vendorUid) return VENDOR_SERVICES;
  return VENDOR_SERVICES.filter((s) => s.vendorUid === vendorUid);
}

export function createVendorService(input: Omit<VendorServiceSeed, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const stamp = new Date().toISOString();
  const doc: VendorServiceSeed = {
    ...input,
    id: input.id ?? `svc_${Date.now()}`,
    createdAt: stamp,
    updatedAt: stamp,
  };
  VENDOR_SERVICES = [...VENDOR_SERVICES, doc];
  return doc;
}

export function listDealInvitations(projectId?: string | null) {
  if (!projectId) return DEAL_INVITATIONS;
  return DEAL_INVITATIONS.filter((d) => d.projectId === projectId);
}

export function createDealInvitation(
  input: Omit<DealInvitationSeed, 'id' | 'token' | 'createdAt' | 'updatedAt' | 'status'> & {
    id?: string;
    token?: string;
    status?: DealInvitationSeed['status'];
  },
) {
  const stamp = new Date().toISOString();
  const doc: DealInvitationSeed = {
    ...input,
    id: input.id ?? `inv_${Date.now()}`,
    token: input.token ?? `tok_${Date.now()}`,
    status: input.status ?? 'pending',
    createdAt: stamp,
    updatedAt: stamp,
  };
  DEAL_INVITATIONS = [...DEAL_INVITATIONS, doc];
  return doc;
}

export function listInvestorFollowers(followerUid?: string | null, targetUid?: string | null) {
  return INVESTOR_FOLLOWERS.filter((f) => {
    if (followerUid && f.followerUid !== followerUid) return false;
    if (targetUid && f.targetUid !== targetUid) return false;
    return true;
  });
}

export function upsertInvestorFollower(followerUid: string, targetUid: string, follow: boolean) {
  const id = `${followerUid}_${targetUid}`;
  if (!follow) {
    INVESTOR_FOLLOWERS = INVESTOR_FOLLOWERS.filter((f) => f.id !== id);
    return { id, following: false };
  }
  if (!INVESTOR_FOLLOWERS.some((f) => f.id === id)) {
    INVESTOR_FOLLOWERS = [
      ...INVESTOR_FOLLOWERS,
      { id, followerUid, targetUid, createdAt: new Date().toISOString() },
    ];
  }
  return { id, following: true };
}

export function listProjectSubcollection(
  projectId: string,
  name: ProjectSubcollectionName,
): SubDoc[] {
  return SUBCOLLECTIONS[`${projectId}:${name}`] ?? [];
}

export function appendProjectSubDoc(
  projectId: string,
  name: ProjectSubcollectionName,
  doc: Omit<SubDoc, 'projectId'> & { id?: string },
) {
  const key = `${projectId}:${name}`;
  const id = doc.id ?? `${name}_${Date.now()}`;
  const next = { ...doc, id, projectId };
  SUBCOLLECTIONS[key] = [...(SUBCOLLECTIONS[key] ?? []), next];
  return next;
}

/** Shared auth JSON helper for P1 routes */
export async function requireAuthOrJson() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return { ok: false as const, response: NextResponse.json(auth.body, { status: auth.status }) };
  }
  return { ok: true as const, uid: auth.uid };
}

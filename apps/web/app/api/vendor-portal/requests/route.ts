import { NextResponse } from 'next/server';
import {
  handleVendorPortalRequestsGet,
  handleVendorPortalRequestsPut,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { listProjectsFromStore } from '@/lib/projects/project-store';
import { loadSeedProjectsMap } from '@/lib/vendor-portal/seed-data';
import {
  createVendorRequestInStore,
  listVendorRequestsFromStore,
  updateVendorRequestInStore,
} from '@/lib/vendor-portal/vendor-store';

export async function GET() {
  const auth = await requireDevSessionAuth();

  const result = await handleVendorPortalRequestsGet({
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    listRequests: async (vendorUid) =>
      (await listVendorRequestsFromStore(vendorUid)) as unknown as Record<string, unknown>[],
    loadProjects: async (projectIds) => {
      const map = loadSeedProjectsMap(projectIds);
      try {
        const storedProjects = await listProjectsFromStore();
        for (const p of storedProjects) {
          if (projectIds.includes(p.id) && !map[p.id]) {
            map[p.id] = {
              propertyName: p.propertyName || p.address || p.property_address || 'Project',
              address: p.address || p.property_address || 'Austin, TX',
              status: p.status || 'Sourcing',
              leadEmail: 'investor@paperworking.test',
              actionItems: (p.todos || []).slice(0, 2).map((todo) => todo.content),
            };
          }
        }
      } catch {
        // Fallback to seed map
      }
      return map;
    },
  });

  return toNextResponse(result);
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse(auth);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const projectIdRaw = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const projectLabelRaw =
    typeof body.projectLabel === 'string'
      ? body.projectLabel.trim()
      : typeof body.dealName === 'string'
        ? body.dealName.trim()
        : '';
  const typeRaw =
    typeof body.type === 'string' && body.type.trim()
      ? body.type.trim()
      : 'General Contractor';
  const locationRaw =
    typeof body.location === 'string' && body.location.trim()
      ? body.location.trim()
      : 'Austin, TX';
  const messageRaw = typeof body.message === 'string' ? body.message.trim() : '';

  if (!messageRaw) {
    return NextResponse.json(
      { error: 'Please provide a scope of work or message for the RFP / quote request.' },
      { status: 400 },
    );
  }

  const projectId = projectIdRaw || 'general-rfp';
  const seedProjects = loadSeedProjectsMap([projectId]);
  const resolvedProjectLabel =
    projectLabelRaw ||
    (seedProjects[projectId]?.propertyName as string | undefined) ||
    'General RFP';
  const resolvedLocation =
    locationRaw ||
    (seedProjects[projectId]?.address as string | undefined) ||
    'Austin, TX';

  const created = await createVendorRequestInStore({
    projectId,
    projectLabel: resolvedProjectLabel,
    location: resolvedLocation,
    type: typeRaw,
    message: messageRaw,
    requesterUid: auth.uid,
    status: 'PENDING',
  });

  return NextResponse.json(
    {
      success: true,
      request: {
        ...created,
        dealName: resolvedProjectLabel,
        location: resolvedLocation,
        dealPhase: (seedProjects[projectId]?.status as string | undefined) || 'Sourcing',
        investor: 'investor@paperworking.test',
      },
    },
    { status: 201 },
  );
}

export async function PUT(request: Request) {
  const auth = await requireDevSessionAuth();
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await handleVendorPortalRequestsPut(body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid, email: 'vendor@paperworking.test' };
    },
    actorName: 'Dev Vendor',
    actorEmail: 'vendor@paperworking.test',
    updateRequest: async (input) => {
      await updateVendorRequestInStore(input);
    },
  });

  return toNextResponse(result);
}


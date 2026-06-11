import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { getRentHistoryProvider } from '@/lib/providers/rentHistory';
import telemetry from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await requireAuth(req);
    if (isAuthError(auth)) {
      return auth;
    }
    const { uid } = auth;

    // 2. Parse request body
    let body: { projectId?: string; address?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { projectId, address: customAddress } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId parameter' }, { status: 400 });
    }

    // 3. Fetch project and verify access (B2B isolation check)
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectSnap.data();
    const targetOrgId = projectData?.organizationId;

    if (!targetOrgId) {
      return NextResponse.json({ error: 'Project has no organization associated' }, { status: 400 });
    }

    // Check organization membership
    const orgRef = adminDb.collection('organizations').doc(targetOrgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgData = orgSnap.data();
    const isOwner = orgData?.ownerUid === uid;
    const isTeamMember = orgData?.teamMembers?.some((m: any) => m.id === uid && m.status === 'active');
    const isProjectMember = !!projectData?.members?.[uid];

    if (!isOwner && !isTeamMember && !isProjectMember) {
      return NextResponse.json(
        { error: 'Access denied. You do not have write access to this project.' },
        { status: 403 }
      );
    }

    // 4. Resolve address
    const address = customAddress || projectData?.address;
    if (!address) {
      return NextResponse.json(
        { error: 'No address associated with this project. Please provide an address.' },
        { status: 400 }
      );
    }

    // 5. Query Rent History Provider
    const provider = getRentHistoryProvider();
    let listings = [];
    try {
      listings = await provider.getRentalHistory(address);
    } catch (apiErr: any) {
      console.error('[RentCast Import Error] Failed to get rental history:', apiErr);
      
      // Emit failure event
      try {
        await telemetry.capture({
          distinctId: uid,
          event: 'rent_history_imported_failure',
          properties: {
            projectId,
            address,
            error: apiErr.message || String(apiErr),
          },
        });
        await telemetry.flush();
      } catch (telErr) {
        console.error('Failed to log telemetry:', telErr);
      }

      return NextResponse.json(
        { error: 'Failed to retrieve rental history from RentCast API.' },
        { status: 502 }
      );
    }

    // 6. Expand listings into month-by-month rent payments
    // If a property was listed, we assume a tenant was paying that rate from listedDate to removedDate (or present)
    const paymentsMap: Record<string, { period: string; modality: string; grossRevenue: number }> = {};

    for (const listing of listings) {
      if (!listing.price || !listing.listedDate) continue;

      const start = new Date(listing.listedDate);
      const end = listing.removedDate ? new Date(listing.removedDate) : new Date();

      // Loop month by month
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

      while (current <= endLimit) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        // Deduplicate or overwrite (more recent listings take precedence)
        paymentsMap[period] = {
          period,
          modality: 'long_term_rental',
          grossRevenue: listing.price,
        };

        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }
    }

    // Convert map to sorted array (newest month first)
    const rentPayments = Object.values(paymentsMap).sort((a, b) => b.period.localeCompare(a.period));

    // 7. Emit success event
    try {
      await telemetry.capture({
        distinctId: uid,
        event: 'rent_history_imported_success',
        properties: {
          projectId,
          address,
          count: rentPayments.length,
        },
      });
      await telemetry.flush();
    } catch (telErr) {
      console.error('Failed to log telemetry:', telErr);
    }

    return NextResponse.json({
      success: true,
      rentPayments,
    });

  } catch (error: any) {
    console.error('[RentCast Import Handler Error]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message || String(error) },
      { status: 500 }
    );
  }
}

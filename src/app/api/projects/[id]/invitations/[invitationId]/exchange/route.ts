import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { checkRateLimit, rateLimitResponse } from '@/lib/places/placesRateLimit';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  const { id: projectId, invitationId } = await params;

  try {
    // 1. Authenticate Lead Investor
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 2. Fetch Project & Verify Access
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectSnap.data()!;
    const isOwner = projectData.ownerUid === uid;
    let isAuthorized = isOwner;

    if (!isAuthorized && projectData.organizationId) {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      if (userSnap.exists && userSnap.data()?.organizationId === projectData.organizationId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // 3. Rate Limit
    const rateCheck = await checkRateLimit(uid, 'cardExchange');
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck);
    }

    // 4. Retrieve Invitation
    let invRef = adminDb.collection('dealInvitations').doc(invitationId);
    let invSnap = await invRef.get();
    if (!invSnap.exists) {
      invRef = adminDb.collection('invitations').doc(invitationId);
      invSnap = await invRef.get();
    }

    if (!invSnap.exists) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const invData = invSnap.data()!;
    if (invData.projectId !== projectId) {
      return NextResponse.json({ error: 'Invitation does not belong to this project.' }, { status: 400 });
    }

    if (invData.status !== 'interested' || invData.cardExchangeStatus !== 'pending') {
      return NextResponse.json({ error: 'No pending exchange request found.' }, { status: 400 });
    }

    // 5. Parse Body
    const body = await request.json();
    const { action, disclosedCard } = body;

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Action must be "accept" or "decline".' }, { status: 400 });
    }

    if (action === 'decline') {
      // Silent decline
      await invRef.update({
        cardExchangeStatus: 'declined',
      });
      return NextResponse.json({ success: true });
    }

    // accept
    if (!disclosedCard || !disclosedCard.name || !disclosedCard.email) {
      return NextResponse.json({ error: 'Sponsor business card details are required.' }, { status: 400 });
    }

    const inviteeCard = invData.inviteeBusinessCard;
    if (!inviteeCard || !inviteeCard.name || !inviteeCard.email) {
      return NextResponse.json({ error: 'Invitee business card details are missing.' }, { status: 400 });
    }

    const sponsorCard = {
      name: disclosedCard.name,
      email: disclosedCard.email,
      phone: disclosedCard.phone || '',
      company: disclosedCard.company || '',
      uid,
    };

    // Update invitation
    await invRef.update({
      cardExchangeStatus: 'accepted',
      sponsorBusinessCard: sponsorCard,
    });

    // Write Invitee's card to Sponsor's project files in 'Equity' folder:
    const sponsorFolderId = await ensureFolder(
      projectId,
      'Equity',
      projectData.organizationId || '',
      projectData.ownerUid || uid
    );

    const inviteeDocId = adminDb.collection('projectFiles').doc().id || `auto_${Math.random().toString(36).substring(2, 11)}`;
    const docInviteeRef = adminDb.collection('projectFiles').doc(inviteeDocId);
    await docInviteeRef.set({
      id: inviteeDocId,
      folderId: sponsorFolderId,
      projectId,
      organizationId: projectData.organizationId || '',
      name: `Business_Card_${inviteeCard.name.replace(/\s+/g, '_')}.json`,
      category: 'Business Card',
      storageUrl: `/api/projects/${projectId}/documents/${inviteeDocId}/download`,
      storagePath: `projects/${projectId}/documents/${inviteeDocId}/Business_Card_${inviteeCard.name.replace(/\s+/g, '_')}.json`,
      fileType: 'application/json',
      sizeBytes: JSON.stringify(inviteeCard).length,
      uploadedByUid: inviteeCard.uid || '',
      uploadedByEmail: inviteeCard.email || '',
      isVerified: true,
      uploadedAt: FieldValue?.serverTimestamp ? FieldValue.serverTimestamp() : new Date(),
      isControlEvidence: true,
      purpose: 'control_evidence' as const,
      phase: 'phase-1',
    });

    // Write Sponsor's card to Invitee's project files or contacts:
    const responderUid = inviteeCard.uid || invData.inviteeUid;
    let responderProjectId = '';
    let responderProjectData: any = null;

    if (responderUid) {
      const respProjSnap = await adminDb.collection('projects')
        .where('ownerUid', '==', responderUid)
        .where('activeListingId', '==', projectData.activeListingId || '')
        .limit(1)
        .get();

      if (!respProjSnap.empty) {
        responderProjectId = respProjSnap.docs[0].id;
        responderProjectData = respProjSnap.docs[0].data();
      }
    }

    if (responderProjectId && responderProjectData) {
      const responderFolderId = await ensureFolder(
        responderProjectId,
        'Equity',
        responderProjectData.organizationId || '',
        responderProjectData.ownerUid || responderUid
      );

      const sponsorDocId = adminDb.collection('projectFiles').doc().id || `auto_${Math.random().toString(36).substring(2, 11)}`;
      const docSponsorRef = adminDb.collection('projectFiles').doc(sponsorDocId);
      await docSponsorRef.set({
        id: sponsorDocId,
        folderId: responderFolderId,
        projectId: responderProjectId,
        organizationId: responderProjectData.organizationId || '',
        name: `Business_Card_Sponsor_${sponsorCard.name.replace(/\s+/g, '_')}.json`,
        category: 'Business Card',
        storageUrl: `/api/projects/${responderProjectId}/documents/${sponsorDocId}/download`,
        storagePath: `projects/${responderProjectId}/documents/${sponsorDocId}/Business_Card_Sponsor_${sponsorCard.name.replace(/\s+/g, '_')}.json`,
        fileType: 'application/json',
        sizeBytes: JSON.stringify(sponsorCard).length,
        uploadedByUid: uid,
        uploadedByEmail: sponsorCard.email || '',
        isVerified: true,
        uploadedAt: FieldValue?.serverTimestamp ? FieldValue.serverTimestamp() : new Date(),
        isControlEvidence: true,
        purpose: 'control_evidence' as const,
        phase: 'phase-1',
      });
    } else {
      // Fallback: Write Sponsor's card to Invitee's account-level contacts
      let responderOrgId = '';
      if (responderUid) {
        const respUserSnap = await adminDb.collection('users').doc(responderUid).get();
        if (respUserSnap.exists) {
          responderOrgId = respUserSnap.data()?.organizationId || '';
        }
      }

      const nameParts = (sponsorCard.name || '').split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (responderOrgId) {
        const contactDocId = adminDb.collection('organizations').doc(responderOrgId).collection('contacts').doc().id || `contact_${Math.random().toString(36).substring(2, 11)}`;
        const orgContactRef = adminDb.collection('organizations').doc(responderOrgId).collection('contacts').doc(contactDocId);
        await orgContactRef.set({
          id: contactDocId,
          organizationId: responderOrgId,
          role: 'Other',
          firstName,
          lastName,
          email: sponsorCard.email,
          phone: sponsorCard.phone || '',
          companyName: sponsorCard.company || '',
          assignedProjectIds: [],
          notes: `Exchanged business card via Marketplace double opt-in on deal: ${projectData.propertyName || 'Project'}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (responderUid) {
        const userContactDocId = adminDb.collection('users').doc(responderUid).collection('contacts').doc().id || `contact_${Math.random().toString(36).substring(2, 11)}`;
        const userContactRef = adminDb.collection('users').doc(responderUid).collection('contacts').doc(userContactDocId);
        await userContactRef.set({
          id: userContactDocId,
          organizationId: responderOrgId || '',
          role: 'Other',
          firstName,
          lastName,
          email: sponsorCard.email,
          phone: sponsorCard.phone || '',
          companyName: sponsorCard.company || '',
          assignedProjectIds: [],
          notes: `Exchanged business card via Marketplace double opt-in on deal: ${projectData.propertyName || 'Project'}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Commit to dealLedger timeline
    const ledgerDocId = adminDb.collection('projects').doc(projectId).collection('dealLedger').doc().id || `ledger_${Math.random().toString(36).substring(2, 11)}`;
    const ledgerRef = adminDb.collection('projects').doc(projectId).collection('dealLedger').doc(ledgerDocId);
    await ledgerRef.set({
      id: ledgerDocId,
      projectId,
      eventType: 'BUSINESS_CARD_EXCHANGED',
      performedBy: uid,
      timestamp: new Date().toISOString(),
      metadata: {
        invitationId,
        inviteeName: inviteeCard.name,
        sponsorName: sponsorCard.name,
      },
    });

    const { trackDealActivity } = require('@/lib/invitations/activityTimeline');
    await trackDealActivity(
      projectId,
      projectId,
      uid,
      'exchange',
      {
        inviteeEmail: inviteeCard.email || '',
        inviteeName: inviteeCard.name || '',
        sponsorName: sponsorCard.name || '',
      }
    ).catch((e: any) => console.error('Failed to log exchange event:', e));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CardExchange/API] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

async function ensureFolder(
  projectId: string,
  folderName: string,
  organizationId: string,
  ownerUid: string
): Promise<string> {
  const foldersColl = adminDb.collection('projectFolders');
  const snap = await foldersColl
    .where('projectId', '==', projectId)
    .where('name', '==', folderName)
    .limit(1)
    .get();

  if (!snap.empty) {
    return snap.docs[0].id;
  }

  const folderId = foldersColl.doc().id || `folder_${Math.random().toString(36).substring(2, 11)}`;
  const folderRef = foldersColl.doc(folderId);
  await folderRef.set({
    id: folderId,
    projectId,
    organizationId,
    name: folderName,
    phase: folderName,
    ownerUid,
    fileCount: 0,
    createdAt: FieldValue?.serverTimestamp ? FieldValue.serverTimestamp() : new Date(),
  });

  return folderId;
}

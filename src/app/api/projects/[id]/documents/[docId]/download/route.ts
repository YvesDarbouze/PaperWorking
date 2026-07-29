import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';
import { VENDOR_SLOT_FOLDER_MAPPING, getFolderForDocument, getPhaseForDocument } from '../../route';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: projectId, docId } = await params;
    if (!projectId || !docId) {
      return NextResponse.json({ error: 'Missing projectId or docId' }, { status: 400 });
    }

    // Try optional auth first (for public solicited deals)
    let auth: any = null;
    try {
      auth = await requireAuth(req);
    } catch {
      // Ignored for potential anonymous public access
    }

    const isAuthenticated = auth && !isAuthError(auth);
    const uid = isAuthenticated ? auth.uid : null;
    const email = isAuthenticated ? auth.token.email : null;

    // 1. Fetch file record from Firestore or resolve direct path (DM-20)
    let fileRecord: any = null;
    if (docId === 'download') {
      const searchParams = req.nextUrl.searchParams;
      const pathParam = searchParams.get('path');
      if (!pathParam) {
        return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
      }
      // Ensure path is restricted to the specific project directory to prevent path traversal
      if (!pathParam.startsWith(`projects/${projectId}/`)) {
        return NextResponse.json({ error: 'Access denied: path outside project directory' }, { status: 403 });
      }
      const nameParam = searchParams.get('name') || 'document';
      fileRecord = {
        projectId,
        storagePath: pathParam,
        name: nameParam,
        fileType: pathParam.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      };
    } else {
      const docRef = adminDb.collection('projectFiles').doc(docId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        fileRecord = docSnap.data();
      } else {
        const subDocRef = adminDb
          .collection('projects')
          .doc(projectId)
          .collection('documents')
          .doc(docId);
        const subDocSnap = await subDocRef.get();
        if (subDocSnap.exists) {
          fileRecord = subDocSnap.data();
        }
      }
    }

    if (!fileRecord) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify file matches the project ID requested
    if (fileRecord.projectId !== projectId) {
      return NextResponse.json({ error: 'Invalid project ID for file' }, { status: 400 });
    }

    // 2. Check deal visibility mode (DM-20)
    let listingSnap: any = { empty: true, docs: [] };
    const dealListingsColl = adminDb.collection('dealListings');
    if (dealListingsColl && typeof dealListingsColl.where === 'function') {
      listingSnap = await dealListingsColl
        .where('projectId', '==', projectId)
        .where('status', '==', 'published')
        .limit(1)
        .get();
    }

    let isAuthorized = false;
    let userRole = 'Anonymous';
    let assignedFolder = '';
    let partyId = '';

    // Direct project membership authorization
    if (isAuthenticated && uid && email) {
      const access = await verifyProjectAccessAndRole(projectId, uid, email);
      if (access) {
        isAuthorized = true;
        userRole = access.role;
        partyId = access.partyId || '';
        assignedFolder = VENDOR_SLOT_FOLDER_MAPPING[partyId] || '';
      }
    }

    // Check visibility mode if active listing exists
    let visibilityMode = 'PRIVATE';
    let exposedDocumentIds: string[] = [];
    if (!listingSnap.empty) {
      const listingData = listingSnap.docs[0].data();
      visibilityMode = listingData.visibilityMode || 'PRIVATE';
      exposedDocumentIds = listingData.exposedDocumentIds || [];

      if (visibilityMode === 'PUBLIC_SOLICITED' || visibilityMode === 'MARKETPLACE') {
        if (isAuthenticated && uid) {
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const userProfile = userDoc.exists ? userDoc.data() : null;
          const plan = userProfile?.subscriptionPlan;
          const status = userProfile?.subscriptionStatus;
          if (
            plan &&
            plan !== 'None' &&
            plan !== 'Vendor Network' &&
            status === 'active' &&
            userProfile?.accountType !== 'vendor'
          ) {
            isAuthorized = true;
            userRole = 'Subscriber';
          }
        }
      }
    }

    if (userRole === 'Vendor') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (userRole === 'Subscriber') {
      if (docId === 'download' || !exposedDocumentIds.includes(docId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Check phase view permission
    const docPhase = fileRecord.phase || getPhaseForDocument(fileRecord);
    if (isAuthenticated && uid && email && userRole !== 'Lead Investor' && userRole !== 'Subscriber') {
      const access = await verifyProjectAccessAndRole(projectId, uid, email);
      if (access && access.phasePermissions) {
        const canView = access.phasePermissions[docPhase]?.canView;
        if (canView === false) {
          return NextResponse.json(
            { error: `Access denied: View permission disabled for ${docPhase}.` },
            { status: 403 }
          );
        }
      }
    }

    // 3. Fine-grained permission checks (vendors, file recipients, etc.)
    if (userRole === 'Vendor') {
      const assignedFolder = VENDOR_SLOT_FOLDER_MAPPING[partyId || ''];
      if (!assignedFolder) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      const docFolder = getFolderForDocument(fileRecord);
      if (docFolder !== assignedFolder) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (userRole !== 'Lead Investor' && userRole !== 'Subscriber' && visibilityMode === 'PRIVATE') {
      // Direct project members checking uploadedBy / recipient
      const lowerEmail = email?.toLowerCase();
      const isUploader = fileRecord.uploadedByUid === uid || (fileRecord.uploadedByEmail && lowerEmail && fileRecord.uploadedByEmail.toLowerCase() === lowerEmail);
      const isRecipient = fileRecord.recipientUid === uid || (fileRecord.recipientEmail && lowerEmail && fileRecord.recipientEmail.toLowerCase() === lowerEmail);
      const isOwnSubAgreement = fileRecord.id === `sub_agreement_${partyId}`;
      const isPublic = fileRecord.isPublic === true || fileRecord.category === 'Deal identity';

      if (!isUploader && !isRecipient && !isOwnSubAgreement && !isPublic) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // 4. Download and stream the file from Cloud Storage
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(fileRecord.storagePath);
    const [exists] = await fileRef.exists();

    if (!exists) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    const [content] = await fileRef.download();

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': fileRecord.fileType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${fileRecord.name}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[API/documents download GET] failed:', error?.message ?? error);
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
  }
}

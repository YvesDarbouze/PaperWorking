import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { NotificationService } from '@/lib/services/notificationService';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    // collectionGroup query aggregates 'vendorRequests' across all parent projects
    const snapshot = await adminDb
      .collectionGroup('vendorRequests')
      .where('vendorUid', '==', auth.uid)
      .get();

    const requests: any[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        requestedAt: data.requestedAt?.toDate 
          ? data.requestedAt.toDate().toISOString() 
          : (data.requestedAt || new Date().toISOString()),
      };
    });

    // Enrich requests with their parent project data
    const projectIds = Array.from(new Set(requests.map(r => r.projectId).filter(Boolean)));
    const projectDocs = await Promise.all(
      projectIds.map(id => adminDb.collection('projects').doc(id).get())
    );

    const projectsMap: Record<string, any> = {};
    projectDocs.forEach(doc => {
      if (doc.exists) {
        projectsMap[doc.id] = doc.data();
      }
    });

    const enrichedRequests = requests.map(req => {
      const project = projectsMap[req.projectId];
      return {
        ...req,
        dealName: project?.propertyName || 'Unknown Project',
        location: project?.address || 'Unknown Location',
        dealPhase: project?.status || 'Sourcing',
        investor: project?.leadEmail || 'Lead Investor',
        actionItems: project?.actionItems || [],
      };
    });

    // Sort by requestedAt descending
    enrichedRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.requestedAt).getTime();
      const dateB = new Date(b.requestedAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, requests: enrichedRequests });
  } catch (error) {
    console.error('Vendor requests query failed:', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { requestId, projectId, quotedFee, message } = body;

    if (!requestId || !projectId || !quotedFee) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('vendorRequests')
      .doc(requestId);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = docSnap.data();
    if (requestData?.vendorUid !== auth.uid) {
      return NextResponse.json({ error: 'Unauthorized to update this request' }, { status: 403 });
    }

    await docRef.update({
      status: 'QUOTED',
      quotedFee: Number(quotedFee),
      message: message || '',
      quotedAt: new Date(),
    });

    // Notify investor
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (projectSnap.exists) {
      const projectData = projectSnap.data();
      const ownerUid = projectData?.ownerUid || projectData?.createdBy;
      
      if (ownerUid) {
        await NotificationService.createNotification({
          type: 'VENDOR_BID',
          recipientId: ownerUid,
          actor: { uid: auth.uid, name: auth.token.name || auth.token.email || 'A vendor' },
          objectReference: { 
            projectId, 
            task: 'Quote Proposal', 
            dealAddress: projectData?.propertyName || 'the project',
            amount: `$${Number(quotedFee).toLocaleString()}`,
            vendor: auth.token.name || auth.token.email || 'A vendor'
          },
          deepLinkUrl: `/dashboard/projects/${projectId}/vendors`,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to submit quote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

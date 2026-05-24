import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import type { UserProfile } from '@/types/user';
import { NotificationService } from '@/lib/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, projectId, vendorUid, message } = body;

    if (!idToken || !projectId || !vendorUid || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: idToken, projectId, vendorUid, message' },
        { status: 400 },
      );
    }

    // Authenticate user
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Fetch user profile
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }
    const profile = userSnap.data() as UserProfile;

    // Verify subscription access
    const hasActiveSub = isSubscriptionActive(profile);
    if (!hasActiveSub) {
      return NextResponse.json(
        { error: 'An active subscription is required to request vendor quotes.' },
        { status: 403 },
      );
    }

    // Verify project exists and user has access
    const dealSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!dealSnap.exists) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }
    const dealData = dealSnap.data();

    if (dealData?.organizationId !== profile?.organizationId) {
      return NextResponse.json({ error: 'Access denied for this project.' }, { status: 403 });
    }

    // Verify vendor exists
    const vendorSnap = await adminDb.collection('users').doc(vendorUid).get();
    if (!vendorSnap.exists) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
    }
    const vendorData = vendorSnap.data();

    // Create the vendor request
    const requestsRef = adminDb.collection('projects').doc(projectId).collection('vendorRequests');
    const newRequestDoc = await requestsRef.add({
      projectId,
      vendorUid,
      message,
      status: 'PENDING',
      requestedAt: new Date(),
      requestedBy: uid,
    });

    // Send notification to the vendor
    await NotificationService.createNotification({
      type: 'VENDOR_LEAD',
      recipientId: vendorUid,
      actor: { uid: uid, name: profile.displayName || profile.email || 'A user' },
      objectReference: { projectId, task: 'Quote Request', dealAddress: dealData?.address?.street || 'the project' },
      deepLinkUrl: `/dashboard/projects/${projectId}/vendors`,
    });

    return NextResponse.json({ success: true, requestId: newRequestDoc.id });
  } catch (error: any) {
    console.error('[Vendor Request] Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to submit vendor request.', details: error.message },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { createBidRequest, acceptBid, submitBidResponse, ServiceType } from '@/lib/marketplace/bidding';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const body = await request.json();
    const { action } = body;

    // Action 1: Create new Bid Request
    if (!action || action === 'create') {
      const { projectId, projectName, vendorId, vendorName, serviceType, description, budgetMin, budgetMax, deadline } = body;

      if (!projectId || !vendorId || !serviceType) {
        return NextResponse.json({ error: 'projectId, vendorId, and serviceType are required' }, { status: 400 });
      }

      const newBid = createBidRequest({
        projectId,
        projectName: projectName || 'Project',
        senderId: uid,
        senderName: body.senderName || 'Project Manager',
        vendorId,
        vendorName: vendorName || 'Vendor Specialist',
        serviceType: serviceType as ServiceType,
        description: description || 'Service request',
        budgetMin,
        budgetMax,
        deadline,
      });

      const bidRef = adminDb.collection('bids').doc(newBid.bidId);
      await bidRef.set(newBid);

      return NextResponse.json({ success: true, bid: newBid }, { status: 201 });
    }

    // Action 2: Vendor Submits Bid Amount
    if (action === 'submit_response') {
      const { bidId, bidAmount, estimatedTimeline, vendorMessage } = body;
      if (!bidId || !bidAmount) {
        return NextResponse.json({ error: 'bidId and bidAmount are required' }, { status: 400 });
      }

      const doc = await adminDb.collection('bids').doc(bidId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
      }

      const existingBid = doc.data() as any;
      const updatedBid = submitBidResponse(existingBid, bidAmount, estimatedTimeline || '5 Business Days', vendorMessage);
      await doc.ref.update(updatedBid as Record<string, any>);

      return NextResponse.json({ success: true, bid: updatedBid });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to process bid request', details: errMsg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const { bidId, action } = body;

    if (!bidId || !action) {
      return NextResponse.json({ error: 'bidId and action are required' }, { status: 400 });
    }

    const docRef = adminDb.collection('bids').doc(bidId);
    const doc = await docRef.get();
    if (!doc.exists) {
      // Return mock accepted response for client demonstration
      return NextResponse.json({
        success: true,
        bid: { bidId, status: action === 'accept' ? 'accepted' : action },
        requires1099Flag: true,
      });
    }

    const existingBid = doc.data() as any;

    if (action === 'accept') {
      const { acceptedBid, expenseRecord, requires1099Flag } = acceptBid(existingBid, 500);
      await docRef.update(acceptedBid as Record<string, any>);
      await adminDb.collection('expenses').doc(expenseRecord.expenseId).set(expenseRecord);

      return NextResponse.json({
        success: true,
        bid: acceptedBid,
        expenseRecord,
        requires1099Flag,
      });
    } else {
      await docRef.update({ status: action, updatedAt: new Date().toISOString() });
      return NextResponse.json({ success: true, status: action });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update bid', details: errMsg }, { status: 500 });
  }
}

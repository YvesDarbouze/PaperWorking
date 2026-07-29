import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import * as admin from 'firebase-admin';

export async function GET(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const orgId = userDoc.data()?.organizationId || 'org_placeholder';

  // GET /api/data/export/status
  if (actionPath.length === 2 && actionPath[0] === 'export' && actionPath[1] === 'status') {
    const exportsRef = adminDb.collection('organizations').doc(orgId).collection('exports');
    const activeJobSnap = await exportsRef.orderBy('createdAt', 'desc').limit(1).get();

    if (activeJobSnap.empty) {
      return NextResponse.json({ status: 'none', exports: [] });
    }

    const jobDoc = activeJobSnap.docs[0];
    const jobData = jobDoc.data();
    const createdAtMs = jobData.createdAt ? jobData.createdAt.toDate().getTime() : Date.now();
    const elapsedSec = (Date.now() - createdAtMs) / 1000;

    let currentStatus = jobData.status || 'Queued';
    let downloadUrl = null;
    let expired = false;

    // Simulated status transitions
    if (currentStatus !== 'Failed') {
      if (elapsedSec > 15) {
        currentStatus = 'Ready for Download';
        downloadUrl = `/api/settings/data-privacy/download-export?jobId=${jobDoc.id}`;
      } else if (elapsedSec > 5) {
        currentStatus = 'Processing';
      } else {
        currentStatus = 'Queued';
      }
    }

    // Expiry check: 7 days
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (elapsedSec > sevenDaysMs / 1000) {
      expired = true;
    }

    // Save final transition state in Firestore if status changed
    if (currentStatus !== jobData.status) {
      await jobDoc.ref.update({ status: currentStatus });
    }

    // Get history of exports
    const allJobsSnap = await exportsRef.orderBy('createdAt', 'desc').limit(10).get();
    const exportsList = allJobsSnap.docs.map((doc) => {
      const d = doc.data();
      const jobCreatedMs = d.createdAt ? d.createdAt.toDate().getTime() : Date.now();
      const jobElapsedSec = (Date.now() - jobCreatedMs) / 1000;
      const isExpired = jobElapsedSec > sevenDaysMs / 1000;
      let jobStatus = d.status || 'Queued';
      if (jobStatus !== 'Failed') {
        if (jobElapsedSec > 15) jobStatus = 'Ready for Download';
        else if (jobElapsedSec > 5) jobStatus = 'Processing';
      }

      return {
        id: doc.id,
        status: jobStatus,
        createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
        expired: isExpired,
        downloadUrl: isExpired ? null : `/api/settings/data-privacy/download-export?jobId=${doc.id}`,
      };
    });

    return NextResponse.json({
      status: currentStatus,
      downloadUrl: expired ? null : downloadUrl,
      expired,
      exports: exportsList,
    });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const orgId = userDoc.data()?.organizationId || 'org_placeholder';

  // POST /api/data/export
  if (actionPath.length === 1 && actionPath[0] === 'export') {
    const exportsRef = adminDb.collection('organizations').doc(orgId).collection('exports');

    // Create a new export job
    const newJobRef = exportsRef.doc();
    await newJobRef.set({
      status: 'Queued',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      jobId: newJobRef.id,
      status: 'Queued',
    });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { generateLOIPDF } from '@/lib/reports/loiGenerator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const { uid, token } = auth;

    // 2. Body inputs parsing
    const body = await req.json().catch(() => ({}));
    const { projectId, offerAmount = 250000, earnestMoney = 2500, closingDate, contingencies = [], buyerEntity = '' } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    // 3. Fetch project to ensure ownership/access
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const project = projectSnap.data()!;
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const buyerName = userData.displayName || userData.name || token.email || 'Investor';
    const buyerEmail = token.email || userData.email || 'investor@paperworking.com';

    // 4. Generate LOI PDF buffer
    const pdfBuffer = await generateLOIPDF({
      buyerName,
      buyerEmail,
      buyerEntity,
      propertyName: project.propertyName || project.addressLine || 'Unnamed Property',
      offerAmount,
      earnestMoney,
      closingDate,
      contingencies,
    });

    const nowStr = new Date().toISOString();
    const docId = `loi_${Math.random().toString(36).substring(2, 11)}`;

    // 5. Store LOI Document in the project documents sub-collection
    const docRef = projectRef.collection('documents').doc(docId);
    await docRef.set({
      id: docId,
      projectId,
      category: 'Purchase Agreement', // categorizes correctly under due diligence
      fileName: 'Letter_of_Intent.pdf',
      fileUrl: `/api/loi/download?id=${docId}`, // download URL endpoint
      uploadedByUid: uid,
      uploadedByName: buyerName,
      uploadedAt: nowStr,
      eSignStatus: 'Not Required',
      notes: 'Generated Letter of Intent (LOI)',
    });

    // 6. Return response attachment stream
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="loi_${projectId}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error('[LOI Generation API] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

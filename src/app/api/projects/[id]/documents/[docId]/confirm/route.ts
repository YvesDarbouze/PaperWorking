import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { updateProjectWithTracking } from '@/lib/firebase/projectWriteWrapper';

/* ═══════════════════════════════════════════════════════
   POST /api/projects/[id]/documents/[docId]/confirm

   Confirm OCR-extracted fields and write them to the
   project document via updateProjectWithTracking.

   Body (JSON):
     {
       confirmedFields: {
         "purchasePrice": 279000,
         "loanAmount": 223200,
         ...
       },
       targetPath: "financials"  // dot-path in project doc
     }

   This route:
     1. Validates the confirmed fields against extracted data
     2. Marks each confirmed field in the document record
     3. Writes values to the project via updateProjectWithTracking
        with source: 'ocr' for audit trail
     4. Returns updated confirmation status

   NO Cloud Functions — this is a Next.js API route.
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

interface ConfirmBody {
  confirmedFields: Record<string, any>;
  targetPath?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const { id: projectId, docId } = await params;
  if (!projectId || !docId) {
    return NextResponse.json({ error: 'Missing project ID or document ID' }, { status: 400 });
  }

  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { confirmedFields, targetPath } = body;
  if (!confirmedFields || typeof confirmedFields !== 'object' || Object.keys(confirmedFields).length === 0) {
    return NextResponse.json({ error: 'No fields to confirm' }, { status: 400 });
  }

  // ── Fetch document and verify ──────────────────────
  const docRef = adminDb.collection('projectFiles').doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const docData = docSnap.data()!;
  if (docData.projectId !== projectId) {
    return NextResponse.json({ error: 'Document does not belong to this project' }, { status: 403 });
  }

  if (docData.ocrStatus !== 'complete') {
    return NextResponse.json({ error: 'OCR has not completed for this document' }, { status: 400 });
  }

  // ── Mark fields as confirmed in the document record ──
  const extractedFields = { ...(docData.extractedFields || {}) };
  const confirmedFieldNames: string[] = [];

  for (const [fieldName, value] of Object.entries(confirmedFields)) {
    if (extractedFields[fieldName]) {
      extractedFields[fieldName] = {
        ...extractedFields[fieldName],
        confirmed: true,
        confirmedValue: value,
        confirmedBy: uid,
        confirmedAt: new Date().toISOString(),
      };
      confirmedFieldNames.push(fieldName);
    }
  }

  await docRef.update({ extractedFields });

  // ── Write confirmed values to project document ─────
  if (targetPath) {
    // Build flat update map with dot-notation paths
    const projectUpdates: Record<string, any> = {};
    for (const [fieldName, value] of Object.entries(confirmedFields)) {
      projectUpdates[`${targetPath}.${fieldName}`] = value;
    }

    try {
      const result = await updateProjectWithTracking(
        projectId,
        uid,
        projectUpdates,
        'ocr'
      );

      return NextResponse.json({
        docId,
        confirmedFields: confirmedFieldNames,
        projectUpdated: result.success,
        changesDetected: result.changesDetected,
      });
    } catch (error: any) {
      console.error('[confirm] Project update failed:', error?.message);
      return NextResponse.json(
        {
          docId,
          confirmedFields: confirmedFieldNames,
          projectUpdated: false,
          error: error?.message || 'Failed to update project',
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({
    docId,
    confirmedFields: confirmedFieldNames,
    projectUpdated: false,
    message: 'Fields confirmed but no targetPath specified — project not updated',
  });
}

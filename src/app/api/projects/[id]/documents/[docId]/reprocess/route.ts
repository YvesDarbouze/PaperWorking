import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { processDocument } from '@/lib/ocr/documentAIProcessor';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import type { OcrDocumentType, ArchivedExtraction } from '@/lib/ocr/types';

/* ═══════════════════════════════════════════════════════
   POST /api/projects/[id]/documents/[docId]/reprocess

   Re-run OCR on a document.

   Actions:
     1. Archive the current extraction (push to previousExtractions array)
     2. Clear current extracted fields
     3. Re-run OCR processor
     4. Write new results
     5. Log the re-processing event

   NO Cloud Functions — this is a Next.js API route.
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  // ── Auth ────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const { id: projectId, docId } = await params;
  if (!projectId || !docId) {
    return NextResponse.json({ error: 'Missing project ID or document ID' }, { status: 400 });
  }

  // Verify project scope & access
  const { hasProjectAccess } = await import('@/lib/auth/scopeGuard');
  if (!(await hasProjectAccess(uid, projectId))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // ── Fetch document record ──────────────────────────
  const docRef = adminDb.collection('projectFiles').doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const docData = docSnap.data()!;

  if (docData.projectId !== projectId) {
    return NextResponse.json({ error: 'Document does not belong to this project' }, { status: 403 });
  }

  if (docData.ocrStatus === 'processing') {
    return NextResponse.json(
      { error: 'OCR is already in progress for this document' },
      { status: 409 }
    );
  }

  // ── Archive previous extraction ────────────────────
  const previousExtractions: ArchivedExtraction[] = docData.previousExtractions || [];

  if (docData.extractedFields && Object.keys(docData.extractedFields).length > 0) {
    previousExtractions.push({
      extractedFields: docData.extractedFields,
      overallConfidence: docData.ocrConfidence || 0,
      processedAt: docData.ocrProcessedAt || new Date().toISOString(),
      archivedAt: new Date().toISOString(),
    });
  }

  // ── Mark as processing ─────────────────────────────
  await docRef.update({
    ocrStatus: 'processing',
    previousExtractions,
    extractedFields: {},
    ocrConfidence: null,
  });

  const storagePath = docData.storagePath as string;
  const documentType = (docData.ocrDocumentType || 'other') as OcrDocumentType;
  const mimeType = docData.fileType as string;

  try {
    // ── Re-run OCR ─────────────────────────────────────
    const result = await processDocument(storagePath, documentType, mimeType);

    if (!result.success) {
      await docRef.update({
        ocrStatus: 'failed',
        ocrError: result.error || 'Unknown processing error',
        ocrProcessedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          docId,
          ocrStatus: 'failed',
          error: result.error,
          previousExtractionsCount: previousExtractions.length,
        },
        { status: 200 }
      );
    }

    // ── Write new results ──────────────────────────────
    await docRef.update({
      extractedFields: result.extractedFields,
      ocrConfidence: result.overallConfidence,
      ocrStatus: 'complete',
      ocrProcessedAt: new Date().toISOString(),
      ocrProcessingTimeMs: result.processingTimeMs,
      ocrError: null,
    });

    // ── Activity log ───────────────────────────────────
    writeActivityLog(
      projectId,
      uid,
      [
        {
          fieldPath: `documents.${docId}.ocrReprocessed`,
          oldValue: `extraction #${previousExtractions.length}`,
          newValue: `extraction #${previousExtractions.length + 1}`,
        },
      ],
      'ocr'
    ).catch((err) => {
      console.error('[OCR/reprocess] Activity log write failed:', err?.message);
    });

    return NextResponse.json(
      {
        docId,
        ocrStatus: 'complete',
        extractedFields: result.extractedFields,
        overallConfidence: result.overallConfidence,
        processingTimeMs: result.processingTimeMs,
        previousExtractionsCount: previousExtractions.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[OCR/reprocess] Processing error:', error?.message ?? error);

    await docRef.update({
      ocrStatus: 'failed',
      ocrError: error?.message || 'Unexpected processing error',
      ocrProcessedAt: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json(
      {
        docId,
        ocrStatus: 'failed',
        error: error?.message || 'OCR reprocessing failed',
      },
      { status: 500 }
    );
  }
}

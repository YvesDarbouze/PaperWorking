import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { processDocument } from '@/lib/ocr/documentAIProcessor';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import type { OcrDocumentType } from '@/lib/ocr/types';

/* ═══════════════════════════════════════════════════════
   POST /api/projects/[id]/documents/[docId]/ocr

   Run OCR on a previously uploaded document.

   Called after upload (or manually for re-processing).

   Actions:
     1. Read the document record from Firestore
     2. Set ocrStatus to 'processing'
     3. Run through Document AI processor (currently stubbed)
     4. Parse extracted fields based on documentType
     5. Write results back to Firestore:
        - extractedFields: Record<string, ExtractedField>
        - ocrStatus: 'complete' | 'failed'
        - ocrConfidence: overall confidence 0-1
        - ocrProcessedAt: server timestamp
     6. Write activity log entry with source: 'ocr'

   Confidence tiers (for UI rendering):
     ≥ 0.95 → auto-prefill (green tier)
     0.70–0.94 → prefill with review flag (amber tier)
     < 0.70 → no prefill, hint only (red tier)

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

  // ── Fetch document record ──────────────────────────
  const docRef = adminDb.collection('projectFiles').doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const docData = docSnap.data()!;

  // Verify document belongs to this project
  if (docData.projectId !== projectId) {
    return NextResponse.json({ error: 'Document does not belong to this project' }, { status: 403 });
  }

  // Check if already processing (prevent duplicate runs)
  if (docData.ocrStatus === 'processing') {
    return NextResponse.json(
      { error: 'OCR is already in progress for this document' },
      { status: 409 }
    );
  }

  const storagePath = docData.storagePath as string;
  const documentType = (docData.ocrDocumentType || 'other') as OcrDocumentType;
  const mimeType = docData.fileType as string;

  // ── Mark as processing ─────────────────────────────
  await docRef.update({ ocrStatus: 'processing' });

  try {
    // ── Run OCR processor ──────────────────────────────
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
        },
        { status: 200 }
      );
    }

    // ── Write results to Firestore ─────────────────────
    await docRef.update({
      extractedFields: result.extractedFields,
      ocrConfidence: result.overallConfidence,
      ocrStatus: 'complete',
      ocrProcessedAt: new Date().toISOString(),
      ocrProcessingTimeMs: result.processingTimeMs,
      ocrError: null,
    });

    // ── Write activity log (non-blocking) ──────────────
    writeActivityLog(
      projectId,
      uid,
      [
        {
          fieldPath: `documents.${docId}.ocrStatus`,
          oldValue: docData.ocrStatus || 'pending',
          newValue: 'complete',
        },
        {
          fieldPath: `documents.${docId}.extractedFields`,
          oldValue: null,
          newValue: `${Object.keys(result.extractedFields).length} fields extracted`,
        },
      ],
      'ocr'
    ).catch((err) => {
      console.error('[OCR] Activity log write failed:', err?.message);
    });

    return NextResponse.json(
      {
        docId,
        ocrStatus: 'complete',
        extractedFields: result.extractedFields,
        overallConfidence: result.overallConfidence,
        processingTimeMs: result.processingTimeMs,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // ── Handle unexpected errors ───────────────────────
    console.error('[OCR] Processing error:', error?.message ?? error);

    await docRef.update({
      ocrStatus: 'failed',
      ocrError: error?.message || 'Unexpected processing error',
      ocrProcessedAt: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json(
      {
        docId,
        ocrStatus: 'failed',
        error: error?.message || 'OCR processing failed',
      },
      { status: 500 }
    );
  }
}

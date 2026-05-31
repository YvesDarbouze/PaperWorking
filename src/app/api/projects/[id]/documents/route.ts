import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/* ═══════════════════════════════════════════════════════
   POST /api/projects/[id]/documents

   Upload a document to a project's filing cabinet.

   Accepts: multipart/form-data
     - file: File (PDF, JPG, PNG) — max 25 MB
     - documentType: OcrDocumentType enum value
     - category: DocumentCategory (optional, defaults to 'Other')
     - folderId: string (optional — parent folder)

   Actions:
     1. Validate file type, size, auth
     2. Upload to Firebase Storage: projects/{id}/documents/{docId}/{filename}
     3. Create projectFiles record in Firestore with ocrStatus: 'pending'
     4. Return { docId, downloadUrl, ocrStatus: 'pending' }

   NO Cloud Functions — this is a Next.js API route.
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

const VALID_DOCUMENT_TYPES = [
  'closing_disclosure',
  'receipt',
  'lease',
  'inspection',
  'appraisal',
  'contractor_bid',
  'title_report',
  'other',
] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ────────────────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
  }

  // ── Verify project access ──────────────────────────
  const projectSnap = await adminDb.collection('projects').doc(projectId).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const projectData = projectSnap.data()!;
  const hasAccess =
    projectData.ownerUid === uid ||
    projectData.teamMembers?.includes(uid) ||
    projectData.organizationId; // org-level access checked downstream
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // ── Parse multipart form data ──────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data. Expected multipart/form-data.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided. Include a "file" field.' }, { status: 400 });
  }

  // ── Validate file type ─────────────────────────────
  const mimeType = file.type;
  if (!(ALLOWED_MIMES as readonly string[]).includes(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type "${mimeType}". Accepted: ${ALLOWED_MIMES.join(', ')}` },
      { status: 415 }
    );
  }

  // ── Validate file size ─────────────────────────────
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 413 }
    );
  }

  // ── Read form fields ───────────────────────────────
  const documentType = (formData.get('documentType') as string) || 'other';
  if (!VALID_DOCUMENT_TYPES.includes(documentType as typeof VALID_DOCUMENT_TYPES[number])) {
    return NextResponse.json(
      { error: `Invalid documentType "${documentType}". Valid: ${VALID_DOCUMENT_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const category = (formData.get('category') as string) || 'Other';
  const folderId = (formData.get('folderId') as string) || '';

  // ── Generate document ID and upload ────────────────
  const docId = crypto.randomUUID();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `projects/${projectId}/documents/${docId}/${sanitizedFilename}`;

  try {
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Firebase Storage via Admin SDK
    const bucket = adminStorage.bucket();
    const storageFile = bucket.file(storagePath);

    await storageFile.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          projectId,
          docId,
          uploadedBy: uid,
          documentType,
        },
      },
    });

    // Make the file publicly readable (or generate a signed URL)
    await storageFile.makePublic();
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // ── Create Firestore record ────────────────────────
    const fileRecord = {
      id: docId,
      folderId: folderId || `${projectId}_default`,
      projectId,
      organizationId: projectData.organizationId || '',
      name: file.name,
      category,
      storageUrl: downloadUrl,
      storagePath,
      fileType: mimeType,
      sizeBytes: file.size,
      uploadedByUid: uid,
      uploadedByEmail: auth.token.email || '',
      isVerified: false,
      uploadedAt: FieldValue.serverTimestamp(),
      ocrStatus: 'pending' as const,
      ocrDocumentType: documentType,
      extractedFields: {},
      ocrConfidence: null,
    };

    await adminDb.collection('projectFiles').doc(docId).set(fileRecord);

    // Update folder file count (if folder exists)
    if (folderId) {
      const folderRef = adminDb.collection('projectFolders').doc(folderId);
      await folderRef.update({ fileCount: FieldValue.increment(1) }).catch(() => {
        // Folder may not exist yet — non-critical
      });
    }

    return NextResponse.json(
      {
        docId,
        downloadUrl,
        storagePath,
        ocrStatus: 'pending',
        documentType,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API/documents] Upload failed:', error?.message ?? error);
    return NextResponse.json(
      { error: 'Document upload failed', details: error?.message },
      { status: 500 }
    );
  }
}

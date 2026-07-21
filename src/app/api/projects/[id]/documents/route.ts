import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';

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

const VENDOR_SLOT_FOLDER_MAPPING: Record<string, string> = {
  f4TitleEscrowVendor: 'Title & Insurance',
  f4ClosingAttorneyVendor: 'Closing',
  f4AppraiserVendor: 'Debt',
  f4EnvironmentalVendor: 'Title & Insurance',
  f4SurveyorVendor: 'Title & Insurance',
  f4InsuranceBrokerVendor: 'Title & Insurance',
  f4CdcVendor: 'Debt',
  f4HardMoneyLenderVendor: 'Debt',
};

function getFolderForDocument(doc: any): 'Capital Plan' | 'Equity' | 'Debt' | 'Title & Insurance' | 'Closing' {
  if (doc.folderName) {
    const name = String(doc.folderName).trim();
    if (['Capital Plan', 'Equity', 'Debt', 'Title & Insurance', 'Closing'].includes(name)) {
      return name as any;
    }
  }

  const ocrType = (doc.ocrDocumentType || doc.documentType || '').toLowerCase();
  const category = (doc.category || '').toLowerCase();
  const name = (doc.name || doc.fileName || '').toLowerCase();
  const notes = (doc.notes || '').toLowerCase();

  // Debt (lender package, estimates, appraisal, commitment)
  if (
    ocrType === 'appraisal' ||
    category === 'appraisal' ||
    name.includes('appraisal') ||
    name.includes('lender') ||
    name.includes('loan_estimate') ||
    name.includes('loan estimate') ||
    name.includes('debt') ||
    name.includes('commitment') ||
    category === 'debt'
  ) {
    return 'Debt';
  }

  // Title & Insurance
  if (
    ocrType === 'title_report' ||
    category === 'title report' ||
    category === 'inspection report' ||
    ocrType === 'inspection' ||
    category === 'permit' ||
    ocrType === 'permit' ||
    name.includes('title') ||
    name.includes('survey') ||
    name.includes('environmental') ||
    name.includes('phase_i') ||
    name.includes('insurance') ||
    name.includes('zoning') ||
    name.includes('hoa') ||
    category === 'title & insurance' ||
    category === 'title search' ||
    category === 'compliance & operations'
  ) {
    return 'Title & Insurance';
  }

  // Equity (agreements, subscriptions)
  if (
    category === 'equity' ||
    category === 'subscription' ||
    doc.id?.startsWith('sub_agreement_') ||
    name.includes('subscription') ||
    name.includes('partnership')
  ) {
    return 'Equity';
  }

  // Capital Plan (proof of funds)
  if (
    category === 'capital plan' ||
    category === 'proof of funds' ||
    notes.includes('capital stack') ||
    name.includes('capital-stack') ||
    name.includes('proof-of-funds') ||
    name.includes('capital_stack') ||
    category === 'proof_of_funds'
  ) {
    return 'Capital Plan';
  }

  // Closing (CD, executed set, recording)
  if (
    ocrType === 'closing_disclosure' ||
    category === 'hud-1 settlement statement' ||
    name.includes('closing') ||
    name.includes('deed') ||
    name.includes('executed') ||
    name.includes('recording') ||
    name.includes('disbursement') ||
    notes.includes('dossier snapshot') ||
    category === 'dossier snapshot' ||
    doc.id?.startsWith('closing_') ||
    name.includes('psa') ||
    name.includes('purchase_and_sale') ||
    name.includes('emd') ||
    category === 'transaction & escrow'
  ) {
    return 'Closing';
  }

  return 'Closing'; // Fallback
}

async function ensureFolder(
  projectId: string,
  folderName: string,
  organizationId: string,
  ownerUid: string
): Promise<string> {
  const foldersColl = adminDb.collection('projectFolders');
  const snap = await foldersColl
    .where('projectId', '==', projectId)
    .where('name', '==', folderName)
    .limit(1)
    .get();

  if (!snap.empty) {
    return snap.docs[0].id;
  }

  const folderRef = foldersColl.doc();
  const folderId = folderRef.id;
  await folderRef.set({
    id: folderId,
    projectId,
    organizationId,
    name: folderName,
    phase: folderName,
    ownerUid,
    fileCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  return folderId;
}

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
  const access = await verifyProjectAccessAndRole(projectId, uid, auth.token.email);
  if (!access) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
  }

  if (access.role !== 'Lead Investor') {
    const canEdit = access.phasePermissions?.['phase-2']?.canEdit ?? true;
    if (!canEdit) {
      return NextResponse.json({ error: 'Edit permission denied for this phase' }, { status: 403 });
    }
  }

  const projectData = access.project;
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

  // Auto-resolve folder taxonomy name and folder ID
  const resolvedFolder = getFolderForDocument({
    name: file.name,
    fileName: file.name,
    category,
    documentType,
    ocrDocumentType: documentType,
  });

  // Enforce Vendor folder boundaries
  if (access.role === 'Vendor') {
    const assignedFolder = VENDOR_SLOT_FOLDER_MAPPING[access.partyId || ''];
    if (!assignedFolder || resolvedFolder !== assignedFolder) {
      return NextResponse.json(
        { error: `Vendor is only authorized to upload documents to the "${assignedFolder}" folder.` },
        { status: 403 }
      );
    }
  }

  const folderId = await ensureFolder(
    projectId,
    resolvedFolder,
    projectData.organizationId || '',
    projectData.ownerUid || uid
  );

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
      folderId,
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

    // Update folder file count
    const folderRef = adminDb.collection('projectFolders').doc(folderId);
    await folderRef.update({ fileCount: FieldValue.increment(1) }).catch(() => {
      // Non-critical
    });

    // Emit activity event — failure-isolated, never blocks the response
    if (projectData.organizationId) {
      const actorName = auth.token.name || auth.token.email || 'Unknown';
      const projectLabel = projectData.propertyName || projectData.address || projectId;
      logOrgActivity({
        organizationId: projectData.organizationId,
        type: 'doc_uploaded',
        actorId: uid,
        actorName,
        summary: `Uploaded "${file.name}" to ${projectLabel}`,
        targetRef: `projects/${projectId}/documents/${docId}`,
        projectId,
        projectName: projectLabel,
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;
    const email = auth.token.email;

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }

    const access = await verifyProjectAccessAndRole(projectId, uid, email);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 1. Fetch documents from projectFiles collection
    const filesSnap = await adminDb
      .collection('projectFiles')
      .where('projectId', '==', projectId)
      .get();

    const files = filesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() ?? null,
    }));

    // 2. Fetch subcollection documents
    const subDocsSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('documents')
      .get();

    const subDocs = subDocsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() ?? doc.data().uploadedAt ?? null,
    }));

    const allDocs = [...files, ...subDocs];

    // 3. Filter if not Lead Investor
    let filteredDocs = allDocs;
    if (access.role !== 'Lead Investor') {
      const lowerEmail = email?.toLowerCase();
      filteredDocs = allDocs.filter((d: any) => {
        // If the user is a Vendor, they can ONLY see documents in their assigned folder!
        if (access.role === 'Vendor') {
          const assignedFolder = VENDOR_SLOT_FOLDER_MAPPING[access.partyId || ''];
          if (!assignedFolder) return false;
          const docFolder = getFolderForDocument(d);
          return docFolder === assignedFolder;
        }

        const isUploader = d.uploadedByUid === uid || (d.uploadedByEmail && lowerEmail && d.uploadedByEmail.toLowerCase() === lowerEmail);
        const isRecipient = d.recipientUid === uid || (d.recipientEmail && lowerEmail && d.recipientEmail.toLowerCase() === lowerEmail);
        const isOwnSubAgreement = d.id === `sub_agreement_${access.partyId}`;
        const isPublic = d.isPublic === true || d.category === 'Deal identity';

        return isUploader || isRecipient || isOwnSubAgreement || isPublic;
      });
    }

    // Fetch existing folders for the project
    const foldersSnap = await adminDb
      .collection('projectFolders')
      .where('projectId', '==', projectId)
      .get();
    
    const foldersMap = new Map<string, string>();
    foldersSnap.docs.forEach(doc => {
      foldersMap.set(doc.data().name, doc.id);
    });

    // Populate resolved folderName and folderId
    const mappedDocs = filteredDocs.map((d: any) => {
      const resolvedFolder = getFolderForDocument(d);
      const resolvedFolderId = foldersMap.get(resolvedFolder) || `${projectId}_default`;
      return {
        ...d,
        folderName: resolvedFolder,
        folderId: resolvedFolderId,
      };
    });

    return NextResponse.json({ documents: mappedDocs });
  } catch (error: any) {
    console.error('[API/documents GET] failed:', error?.message ?? error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

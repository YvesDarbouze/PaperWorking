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
     - documentType: DocumentType enum value
     - category: DocumentCategory (optional, defaults to 'Other')
     - folderId: string (optional — parent folder)

   Actions:
     1. Validate file type, size, auth
     2. Upload to Firebase Storage: projects/{id}/documents/{docId}/{filename}
     3. Create projectFiles record in Firestore with status: 'Uploaded'
     4. Return { docId, downloadUrl, status: 'Uploaded' }

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
  'purchase_agreement',
  'other',
] as const;

export const VENDOR_SLOT_FOLDER_MAPPING: Record<string, string> = {
  f4TitleEscrowVendor: 'Title & Insurance',
  f4ClosingAttorneyVendor: 'Closing',
  f4AppraiserVendor: 'Debt',
  f4EnvironmentalVendor: 'Title & Insurance',
  f4SurveyorVendor: 'Title & Insurance',
  f4InsuranceBrokerVendor: 'Title & Insurance',
  f4CdcVendor: 'Debt',
  f4HardMoneyLenderVendor: 'Debt',
};

export function getFolderForDocument(doc: any): 'Capital Plan' | 'Equity' | 'Debt' | 'Title & Insurance' | 'Closing' {
  if (doc.folderName) {
    const name = String(doc.folderName).trim();
    if (['Capital Plan', 'Equity', 'Debt', 'Title & Insurance', 'Closing'].includes(name)) {
      return name as any;
    }
  }

  const docType = (doc.documentType || '').toLowerCase();
  const category = (doc.category || '').toLowerCase();
  const name = (doc.name || doc.fileName || '').toLowerCase();
  const notes = (doc.notes || '').toLowerCase();

  // Debt (lender package, estimates, appraisal, commitment)
  if (
    docType === 'appraisal' ||
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
    docType === 'title_report' ||
    category === 'title report' ||
    category === 'inspection report' ||
    docType === 'inspection' ||
    category === 'permit' ||
    docType === 'permit' ||
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
    docType === 'closing_disclosure' ||
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

export function getPhaseForDocument(doc: any): 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'founder_review' {
  if (doc.phase) {
    if (['phase-1', 'phase-2', 'phase-3', 'phase-4', 'founder_review'].includes(doc.phase)) {
      return doc.phase as any;
    }
  }

  const docType = (doc.documentType || '').toLowerCase();
  const category = (doc.category || '').toLowerCase();
  const name = (doc.name || doc.fileName || '').toLowerCase();

  // Phase 1: Acquisition (LOI, PSA/Purchase Agreement, Due Diligence checklists)
  if (
    category === 'loi' ||
    docType === 'loi' ||
    category === 'purchase agreement' ||
    docType === 'purchase_agreement' ||
    name.includes('loi') ||
    name.includes('psa') ||
    name.includes('purchase_agreement') ||
    name.includes('emd') ||
    name.includes('due_diligence')
  ) {
    return 'phase-1';
  }

  // Phase 3: Hold (Rehab bids, rehab invoices, leasing, rent setup, operations, contractor)
  if (
    category === 'contractor bid' ||
    name.includes('rehab') ||
    name.includes('bid') ||
    name.includes('invoice') ||
    name.includes('lease') ||
    name.includes('tenant') ||
    name.includes('rent_roll')
  ) {
    return 'phase-3';
  }

  // Phase 4: Exit (Sold, Listed, final gains waterfall tax packets)
  if (
    name.includes('taxpacket') ||
    name.includes('sold') ||
    name.includes('exit_waterfall')
  ) {
    return 'phase-4';
  }

  // Phase 2: Fund (Lender packages, loans, commitments, appraisals, subscriptions, capital plan, proof of funds, etc.)
  return 'phase-2';
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

  let phase = (formData.get('phase') as string) || '';
  if (phase && !['phase-1', 'phase-2', 'phase-3', 'phase-4', 'founder_review'].includes(phase)) {
    return NextResponse.json(
      { error: `Invalid phase "${phase}". Valid values: phase-1, phase-2, phase-3, phase-4, founder_review` },
      { status: 400 }
    );
  }

  if (!phase) {
    phase = getPhaseForDocument({
      name: file.name,
      fileName: file.name,
      category,
      documentType,
    });
  }

  // Auto-resolve folder taxonomy name and folder ID
  const resolvedFolder = getFolderForDocument({
    name: file.name,
    fileName: file.name,
    category,
    documentType,
  });

  if (access.role === 'Vendor') {
    const assignedFolder = VENDOR_SLOT_FOLDER_MAPPING[access.partyId || ''];
    if (!assignedFolder || resolvedFolder !== assignedFolder) {
      return NextResponse.json(
        { error: `Vendor is only authorized to upload documents to the "${assignedFolder}" folder` },
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

    // DO NOT call makePublic() — keep the GCS file private (DM-20)
    const downloadUrl = `/api/projects/${projectId}/documents/${docId}/download`;

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
      status: 'Uploaded',
      isControlEvidence: true,
      purpose: 'control_evidence' as const,
      phase,
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
        status: 'Uploaded',
        phase,
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
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }

    // Try optional auth first (for public solicited deals)
    let auth: any = null;
    try {
      auth = await requireAuth(req);
    } catch {
      // Ignored for potential anonymous public access
    }

    const isAuthenticated = auth && !isAuthError(auth);
    const uid = isAuthenticated ? auth.uid : null;
    const email = isAuthenticated ? auth.token.email : null;

    // Check deal visibility mode (DM-20)
    let listingSnap: any = { empty: true, docs: [] };
    const dealListingsColl = adminDb.collection('dealListings');
    if (dealListingsColl && typeof dealListingsColl.where === 'function') {
      listingSnap = await dealListingsColl
        .where('projectId', '==', projectId)
        .where('status', '==', 'published')
        .limit(1)
        .get();
    }

    let isAuthorized = false;
    let projectData: any = null;
    let userRole = 'Anonymous';
    let assignedFolder = '';
    let partyId = '';
    let access: any = null;

    // Direct project membership authorization
    if (isAuthenticated && uid && email) {
      access = await verifyProjectAccessAndRole(projectId, uid, email);
      if (access) {
        isAuthorized = true;
        projectData = access.project;
        userRole = access.role;
        partyId = access.partyId || '';
        assignedFolder = VENDOR_SLOT_FOLDER_MAPPING[partyId] || '';
      }
    }

    // Check visibility mode if active listing exists
    let visibilityMode = 'PRIVATE';
    let exposedDocumentIds: string[] = [];
    if (!listingSnap.empty) {
      const listingData = listingSnap.docs[0].data();
      visibilityMode = listingData.visibilityMode || 'PRIVATE';
      exposedDocumentIds = listingData.exposedDocumentIds || [];

      if (visibilityMode === 'PUBLIC_SOLICITED' || visibilityMode === 'MARKETPLACE') {
        if (isAuthenticated && uid) {
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const userProfile = userDoc.exists ? userDoc.data() : null;
          const plan = userProfile?.subscriptionPlan;
          const status = userProfile?.subscriptionStatus;
          if (
            plan &&
            plan !== 'None' &&
            plan !== 'Vendor Network' &&
            status === 'active' &&
            userProfile?.accountType !== 'vendor'
          ) {
            isAuthorized = true;
            userRole = 'Subscriber';
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!projectData) {
      const projectSnap = await adminDb.collection('projects').doc(projectId).get();
      if (!projectSnap.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      projectData = projectSnap.data();
    }

    // 1. Fetch files
    const filesSnap = await adminDb
      .collection('projectFiles')
      .where('projectId', '==', projectId)
      .get();

    const files = filesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() ?? doc.data().uploadedAt ?? null,
    }));

    // 2. Fetch Sub Agreements
    const subSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('subAgreements')
      .get();

    const subDocs = subSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() ?? doc.data().uploadedAt ?? null,
    }));

    const allDocs = [...files, ...subDocs];

    // 3. Filter if not Lead Investor
    let filteredDocs = allDocs;
    if (userRole !== 'Lead Investor') {
      const lowerEmail = email?.toLowerCase();
      filteredDocs = allDocs.filter((d: any) => {
        // Check phase view permission
        const docPhase = d.phase || getPhaseForDocument(d);
        if (access && access.phasePermissions) {
          const canView = access.phasePermissions[docPhase]?.canView;
          if (canView === false) {
            return false;
          }
        }

        // If the user is a Vendor, they can ONLY see documents in their assigned folder!
        if (userRole === 'Vendor') {
          const assignedFolder = VENDOR_SLOT_FOLDER_MAPPING[partyId || ''];
          if (!assignedFolder) return false;
          const docFolder = getFolderForDocument(d);
          return docFolder === assignedFolder;
        }

        // Subscribers and public users see public documents (or the ones where they are recipients, etc.)
        const isUploader = d.uploadedByUid === uid || (d.uploadedByEmail && lowerEmail && d.uploadedByEmail.toLowerCase() === lowerEmail);
        const isRecipient = d.recipientUid === uid || (d.recipientEmail && lowerEmail && d.recipientEmail.toLowerCase() === lowerEmail);
        const isOwnSubAgreement = d.id === `sub_agreement_${partyId}`;
        
        // For marketplace / public_solicited, allow viewing public documents
        const isPublic = d.isPublic === true || d.category === 'Deal identity' || visibilityMode === 'MARKETPLACE' || visibilityMode === 'PUBLIC_SOLICITED';

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
      
      const isExposed = exposedDocumentIds.includes(d.id);
      
      const baseDoc: any = {
        id: d.id,
        name: d.name,
        type: d.type || null,
        category: d.category || null,
        phase: d.phase || null,
        uploadedAt: d.uploadedAt || null,
        folderName: resolvedFolder,
        folderId: resolvedFolderId,
      };

      if (userRole !== 'Subscriber' && userRole !== 'Anonymous') {
        return {
          ...d,
          ...baseDoc,
          storageUrl: `/api/projects/${projectId}/documents/${d.id}/download`,
          documentUrl: `/api/projects/${projectId}/documents/${d.id}/download`,
        };
      } else {
        if (isExposed) {
          return {
            ...d,
            ...baseDoc,
            storageUrl: `/api/projects/${projectId}/documents/${d.id}/download`,
            documentUrl: `/api/projects/${projectId}/documents/${d.id}/download`,
          };
        } else {
          return baseDoc;
        }
      }
    });

    return NextResponse.json({ documents: mappedDocs });
  } catch (error: any) {
    console.error('[API/documents GET] failed:', error?.message ?? error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}





















































import { NextResponse } from 'next/server';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  guestForbidden,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import { isAllowedProjectFile, MAX_PROJECT_FILE_BYTES } from '@/lib/projects/project-files';
import { getStorageAdapter } from '@/lib/storage/storage-adapter';
import type { ProjectDocument } from '@/lib/projects/types';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const { project } = access;
  const storageAdapter = getStorageAdapter();
  const adapterDocuments = await storageAdapter.list(projectId);

  const allDocuments: ProjectDocument[] = [...(project.documents || [])];
  for (const doc of adapterDocuments) {
    if (!allDocuments.some((d) => d.doc_id === doc.docId)) {
      allDocuments.push({
        doc_id: doc.docId,
        type: doc.type,
        name: doc.name,
        url: doc.downloadUrl,
        generated_at: doc.uploadedAt,
      });
    }
  }

  return NextResponse.json({
    projectId,
    isConfigured: storageAdapter.isConfigured,
    providerName: storageAdapter.providerName,
    storageUsedBytes: project.storage_used_bytes || 0,
    storageQuotaBytes: project.storageQuotaBytes || 536_870_912,
    documents: allDocuments,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'member');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const storageAdapter = getStorageAdapter();
  if (!storageAdapter.isConfigured) {
    return NextResponse.json(
      {
        error:
          'Storage provider not configured. Configure FIREBASE_STORAGE_BUCKET or enable local storage driver (REQUIRES CREDENTIALS).',
        isConfigured: false,
      },
      { status: 503 },
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let fileName = '';
    let mimeType = '';
    let fileBuffer: Uint8Array;
    let category = 'General';
    let documentType = 'File';
    let phase: ProjectDocument['phase'];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      fileName = file.name;
      mimeType = file.type;
      category = (formData.get('category') as string) || category;
      documentType = (formData.get('documentType') as string) || documentType;
      phase = (formData.get('phase') as ProjectDocument['phase']) || undefined;
      fileBuffer = new Uint8Array(await file.arrayBuffer());
    } else {
      const body = await request.json();
      if (!body.name || !body.base64Content) {
        return NextResponse.json({ error: 'Missing name or base64Content' }, { status: 400 });
      }
      fileName = body.name;
      mimeType = body.type || '';
      category = body.category || category;
      documentType = body.documentType || documentType;
      phase = body.phase || undefined;
      const binaryStr = atob(body.base64Content);
      fileBuffer = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        fileBuffer[i] = binaryStr.charCodeAt(i);
      }
    }

    if (!isAllowedProjectFile(fileName, mimeType)) {
      return NextResponse.json(
        { error: 'That file type is not supported. Upload documents, spreadsheets, presentations, images, audio or video.' },
        { status: 422 },
      );
    }

    if (fileBuffer.byteLength > MAX_PROJECT_FILE_BYTES) {
      return NextResponse.json(
        { error: `File is ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)} MB. The limit is 50 MB.` },
        { status: 413 },
      );
    }

    const uploaded = await storageAdapter.upload(
      projectId,
      { name: fileName, type: mimeType || 'application/octet-stream', sizeBytes: fileBuffer.byteLength, buffer: fileBuffer },
      category,
    );

    const actor = resolveActorIdentity(access);
    const newDoc: ProjectDocument = {
      doc_id: uploaded.docId,
      type: documentType,
      name: uploaded.name,
      url: uploaded.downloadUrl,
      generated_at: uploaded.uploadedAt,
      status: 'uploaded',
      mimeType: mimeType || undefined,
      sizeBytes: fileBuffer.byteLength,
      uploadedByName: actor.name,
      ...(phase ? { phase } : {}),
    };

    const { project } = access;
    const newStorageBytes = (project.storage_used_bytes || 0) + fileBuffer.byteLength;
    await updateProjectInStore(projectId, {
      documents: [newDoc, ...(project.documents || [])],
      storage_used_bytes: newStorageBytes,
    });

    await recordProjectActivity(projectId, {
      actorUid: access.uid,
      actorName: actor.name,
      kind: 'document.uploaded',
      summary: `Uploaded "${newDoc.name}"`,
      targetId: newDoc.doc_id,
      vendorVisible: false,
    });

    return NextResponse.json({ success: true, document: newDoc, storageUsedBytes: newStorageBytes }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to upload document', details: message }, { status: 500 });
  }
}

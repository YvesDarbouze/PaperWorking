import { NextResponse } from 'next/server';
import { recordWebAuditEvent } from '@/lib/auth/require-role';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  guestForbidden,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import { getStorageAdapter, validateTaxComplianceDeletion } from '@/lib/storage/storage-adapter';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; docId: string }> },
) {
  const { id: projectId, docId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const storageAdapter = getStorageAdapter();
  const urlObj = new URL(request.url);
  const wantsSignedUrl =
    urlObj.searchParams.get('mode') === 'signedUrl' ||
    urlObj.searchParams.get('signedUrl') === 'true';

  if (wantsSignedUrl) {
    const rawExpires = Number(urlObj.searchParams.get('expiresIn') || 900);
    const ttl = Math.min(Math.max(isNaN(rawExpires) ? 900 : rawExpires, 60), 900);
    const signed = await storageAdapter.getSignedDownloadUrl(projectId, docId, ttl);
    if (!signed) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      projectId,
      docId,
      signedUrl: signed.url,
      expiresAt: signed.expiresAt,
      maxValiditySeconds: 900,
    });
  }

  const downloaded = await storageAdapter.download(projectId, docId);
  if (!downloaded) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  return new Response(Buffer.from(downloaded.content), {
    status: 200,
    headers: {
      'Content-Type': downloaded.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${downloaded.fileName}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; docId: string }> },
) {
  const { id: projectId, docId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'admin');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const existingDocs = access.project.documents || [];
  const doc = existingDocs.find((d) => d.doc_id === docId);
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // IRS 3-year retention lock on closing, settlement and tax documents
  const complianceCheck = validateTaxComplianceDeletion(
    doc.type || doc.name,
    doc.generated_at || new Date().toISOString(),
  );
  if (!complianceCheck.canDelete) {
    return NextResponse.json({ error: complianceCheck.reason, isTaxLocked: true }, { status: 403 });
  }

  await getStorageAdapter().delete(projectId, docId);

  const updatedDocs = existingDocs.filter((d) => d.doc_id !== docId);
  await updateProjectInStore(projectId, {
    documents: updatedDocs,
    storage_used_bytes: Math.max(0, (access.project.storage_used_bytes || 0) - (doc.sizeBytes || 0)),
  });

  const actor = resolveActorIdentity(access);
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: actor.name,
    kind: 'document.deleted',
    summary: `Deleted "${doc.name}"`,
    targetId: docId,
    vendorVisible: false,
  });
  await recordWebAuditEvent({
    organizationId: access.project.organizationId || 'org-1',
    projectId,
    actorUid: access.uid,
    actorRole: access.role,
    action: 'document.deleted',
    targetType: 'document',
    targetId: docId,
    metadata: { docName: doc.name, docType: doc.type },
  }).catch(() => undefined);

  return NextResponse.json({ success: true, deletedDocId: docId, remainingCount: updatedDocs.length });
}

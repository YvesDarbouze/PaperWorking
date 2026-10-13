import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { publicShareLinkCreateSchema } from '@paperworking/validation';
import { recordWebAuditEvent } from '@/lib/auth/require-role';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  guestForbidden,
  parseProjectBody,
  projectApiError,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import type { ProjectPublicShareLink } from '@/lib/projects/types';

/**
 * Public Share Links API:
 * GET: Lists active share links for the project (Team viewer+).
 * POST: Generates a new cryptographically secure share link (Team member+).
 * DELETE: Revokes an existing share link by token (Team member+).
 */

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const links = access.project.publicShareLinks ?? [];
  return NextResponse.json({ links });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'member');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const parsed = await parseProjectBody(request, publicShareLinkCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const token = crypto.randomBytes(24).toString('base64url');
  const now = new Date();
  const expiresAt = body.expiresInDays
    ? new Date(now.getTime() + body.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const newLink: ProjectPublicShareLink = {
    token,
    page: body.page,
    ...(body.label ? { label: body.label } : {}),
    createdAt: now.toISOString(),
    createdByUid: access.uid,
    ...(expiresAt ? { expiresAt } : {}),
    ...(body.vendorOnly !== undefined ? { vendorOnly: body.vendorOnly } : {}),
  };

  const currentLinks = access.project.publicShareLinks ?? [];
  const updatedLinks = [newLink, ...currentLinks];

  await updateProjectInStore(projectId, { publicShareLinks: updatedLinks });

  const projectOrg = access.project.organizationId || 'org-1';
  await recordWebAuditEvent({
    organizationId: projectOrg,
    projectId,
    actorUid: access.uid,
    actorRole: access.role,
    action: 'project.public_link.created',
    targetType: 'public_link',
    targetId: token,
    toState: newLink,
  });

  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: resolveActorIdentity(access).name,
    kind: 'public_link.created',
    summary: `Created public share link for ${body.page}${newLink.label ? ` ("${newLink.label}")` : ''}`,
    targetId: token,
    vendorVisible: false,
  });

  return NextResponse.json({ success: true, link: newLink, links: updatedLinks }, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'member');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return projectApiError(400, 'Missing link token', 'VALIDATION_ERROR');
  }

  const currentLinks = access.project.publicShareLinks ?? [];
  const linkIndex = currentLinks.findIndex((l) => l.token === token);
  if (linkIndex === -1) {
    return projectApiError(404, 'Share link not found', 'NOT_FOUND');
  }

  const removed = currentLinks[linkIndex];
  const remaining = currentLinks.filter((l) => l.token !== token);

  await updateProjectInStore(projectId, { publicShareLinks: remaining });

  const projectOrg = access.project.organizationId || 'org-1';
  await recordWebAuditEvent({
    organizationId: projectOrg,
    projectId,
    actorUid: access.uid,
    actorRole: access.role,
    action: 'project.public_link.revoked',
    targetType: 'public_link',
    targetId: token,
    fromState: removed,
  });

  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: resolveActorIdentity(access).name,
    kind: 'public_link.revoked',
    summary: `Revoked public share link for ${removed.page}`,
    targetId: token,
    vendorVisible: false,
  });

  return NextResponse.json({ success: true, links: remaining });
}

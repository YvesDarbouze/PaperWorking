import { NextResponse } from 'next/server';
import { projectGuestInviteSchema, projectGuestRemoveSchema } from '@paperworking/validation';
import { recordWebAuditEvent, requireWebOrgRole } from '@/lib/auth/require-role';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  guestForbidden,
  parseProjectBody,
  projectApiError,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import type { ProjectGuestAccess } from '@/lib/projects/types';

/**
 * Project guests (vendors, lenders, title, LPs).
 * GET: any team member. POST/DELETE: org owner or admin. Guests cannot list or manage guests.
 */

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  return NextResponse.json({ guests: access.project.vendorAccess ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'admin');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const parsed = await parseProjectBody(request, projectGuestInviteSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const { project } = access;
  const projectOrg = project.organizationId || 'org-1';
  const alreadyTeam = (project.teamMembers ?? []).some(
    (member) => member && (member.uid === body.uid || member.id === body.uid),
  );
  if (alreadyTeam) {
    return projectApiError(409, 'This person is already on the project team', 'ALREADY_TEAM_MEMBER');
  }

  const guests = [...(project.vendorAccess ?? [])];
  const existingIndex = guests.findIndex((g) => g.uid === body.uid);
  const previous = existingIndex === -1 ? undefined : guests[existingIndex];
  const guest: ProjectGuestAccess = {
    uid: body.uid,
    name: body.name,
    ...(body.email ? { email: body.email } : {}),
    ...(body.company ? { company: body.company } : {}),
    guestType: body.guestType ?? 'vendor',
    invitedAt: previous?.invitedAt ?? new Date().toISOString(),
    invitedByUid: previous?.invitedByUid ?? access.uid,
    ...(body.personalNote ? { personalNote: body.personalNote } : {}),
  };
  if (previous) guests[existingIndex] = guest;
  else guests.push(guest);

  await updateProjectInStore(projectId, { vendorAccess: guests });

  // Send invitation email if email is provided
  if (body.email) {
    try {
      const { sendGridService } = await import('@/lib/email/sendgrid-service');
      const { renderProjectInvitationEmailHtml, renderProjectInvitationEmailPlainText } = await import(
        '@/lib/email/templates'
      );
      const inviterName = resolveActorIdentity(access).name;
      const projectName = project.title || project.address || 'Project';
      const roleLabel = (body.guestType ?? 'vendor').replace('_', ' ').toUpperCase();

      const html = renderProjectInvitationEmailHtml({
        recipientName: body.name,
        recipientEmail: body.email,
        inviterName,
        projectName,
        projectId,
        roleOrGuestType: roleLabel,
        isGuest: true,
        company: body.company,
        personalNote: body.personalNote,
      });

      const text = renderProjectInvitationEmailPlainText({
        recipientName: body.name,
        recipientEmail: body.email,
        inviterName,
        projectName,
        projectId,
        roleOrGuestType: roleLabel,
        isGuest: true,
        company: body.company,
        personalNote: body.personalNote,
      });

      await sendGridService.send({
        to: { email: body.email, name: body.name },
        subject: `Invitation: Collaborate on ${projectName} (Vendor Access)`,
        html,
        text,
      });
    } catch (err) {
      console.warn('[Project Guest Invite] Could not dispatch email (REQUIRES CREDENTIALS: SENDGRID_API_KEY):', (err as Error).message);
    }
  }
  await recordWebAuditEvent({
    organizationId: projectOrg,
    projectId,
    actorUid: access.uid,
    actorRole: access.role,
    action: previous ? 'project.guest.updated' : 'project.guest.invited',
    targetType: 'project_guest',
    targetId: guest.uid,
    fromState: previous ?? null,
    toState: guest,
  });
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: resolveActorIdentity(access).name,
    kind: previous ? 'guest.updated' : 'guest.invited',
    summary: `${previous ? 'Updated guest' : 'Invited guest'} ${guest.name}`,
    targetId: guest.uid,
    vendorVisible: false,
  });
  return NextResponse.json({ success: true, guest, guests }, { status: previous ? 200 : 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'admin');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const queryUid = new URL(request.url).searchParams.get('uid');
  let uid: string;
  if (queryUid) {
    const check = projectGuestRemoveSchema.safeParse({ uid: queryUid });
    if (!check.success) return projectApiError(400, 'Invalid uid', 'VALIDATION_ERROR');
    uid = check.data.uid;
  } else {
    const parsed = await parseProjectBody(request, projectGuestRemoveSchema);
    if (!parsed.ok) return parsed.response;
    uid = parsed.data.uid;
  }

  const { project } = access;
  const guests = project.vendorAccess ?? [];
  const removed = guests.find((g) => g.uid === uid);
  if (!removed) return projectApiError(404, 'Guest not found', 'NOT_FOUND');
  const remaining = guests.filter((g) => g.uid !== uid);

  await updateProjectInStore(projectId, { vendorAccess: remaining });
  await recordWebAuditEvent({
    organizationId: project.organizationId || 'org-1',
    projectId,
    actorUid: access.uid,
    actorRole: access.role,
    action: 'project.guest.removed',
    targetType: 'project_guest',
    targetId: uid,
    fromState: removed,
    toState: null,
  });
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: resolveActorIdentity(access).name,
    kind: 'guest.removed',
    summary: `Removed guest ${removed.name}`,
    targetId: uid,
    vendorVisible: false,
  });
  return NextResponse.json({ success: true, guests: remaining });
}

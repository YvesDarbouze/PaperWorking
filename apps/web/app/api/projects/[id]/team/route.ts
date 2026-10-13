import {
  handleProjectTeamGet,
  handleProjectTeamPost,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { getProjectFromStore, updateProjectInStore } from '@/lib/projects/project-store';
import {
  guestForbidden,
  newProjectItemId,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';

async function loadTeamProject(id: string) {
  const project = await getProjectFromStore(id);
  if (!project) return null;
  return {
    id: project.id,
    organizationId: project.organizationId ?? 'org-1',
    teamMembers: project.teamMembers ?? [],
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const result = await handleProjectTeamGet(projectId, {
    requireAuth: async () => ({ uid: access.uid, organizationId: access.project.organizationId ?? 'org-1' }),
    getProject: loadTeamProject,
  });
  return toNextResponse(result);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'admin');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const actor = resolveActorIdentity(access);
  const result = await handleProjectTeamPost(projectId, body, {
    requireAuth: async () => ({ uid: access.uid, organizationId: access.project.organizationId ?? 'org-1' }),
    getProject: loadTeamProject,
    addTeamMember: async (id, memberData) => {
      const current = await getProjectFromStore(id);
      const memberId = newProjectItemId('team');
      const member = { id: memberId, uid: memberId, ...memberData };
      await updateProjectInStore(id, { teamMembers: [...(current?.teamMembers ?? []), member] });
      await recordProjectActivity(id, {
        actorUid: access.uid,
        actorName: actor.name,
        kind: 'team.member_added',
        summary: `Added ${(memberData as { name?: string }).name ?? 'a member'} to the team`,
        targetId: memberId,
        vendorVisible: false,
      });

      // Send invitation email if email is provided
      const memberEmail = (memberData as { email?: string }).email;
      const memberName = (memberData as { name?: string }).name || 'Colleague';
      const memberRole = (memberData as { role?: string }).role || 'Team Member';
      const personalNote = (memberData as { personalNote?: string }).personalNote;

      if (memberEmail) {
        try {
          const { sendGridService } = await import('@/lib/email/sendgrid-service');
          const { renderProjectInvitationEmailHtml, renderProjectInvitationEmailPlainText } = await import(
            '@/lib/email/templates'
          );
          const projectName = current?.title || current?.address || 'Project';

          const html = renderProjectInvitationEmailHtml({
            recipientName: memberName,
            recipientEmail: memberEmail,
            inviterName: actor.name,
            projectName,
            projectId: id,
            roleOrGuestType: memberRole.toUpperCase(),
            isGuest: false,
            personalNote,
          });

          const text = renderProjectInvitationEmailPlainText({
            recipientName: memberName,
            recipientEmail: memberEmail,
            inviterName: actor.name,
            projectName,
            projectId: id,
            roleOrGuestType: memberRole.toUpperCase(),
            isGuest: false,
            personalNote,
          });

          await sendGridService.send({
            to: { email: memberEmail, name: memberName },
            subject: `Invitation: Join ${projectName} Investment Team`,
            html,
            text,
          });
        } catch (err) {
          console.warn('[Project Team Invite] Could not dispatch email (REQUIRES CREDENTIALS: SENDGRID_API_KEY):', (err as Error).message);
        }
      }

      return member;
    },
  });

  return toNextResponse(result);
}

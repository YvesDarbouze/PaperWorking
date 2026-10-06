import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { getSeedProjectById, updateSeedProject } from '@/lib/projects/seed-data';
import { sendGridService, SendGridError } from '@/lib/email/sendgrid-service';
import { resolveAppBaseUrl } from '@/lib/utils/url';
import type { AssigneeOption, LegacyProjectPhase } from '@/lib/projects/types';

export async function GET() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  // Returns active invitations for user session
  return NextResponse.json({
    invites: [],
    count: 0,
  });
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const {
    email,
    name,
    role,
    projectId,
    taskId,
    taskTitle,
    assignType = 'step',
    phaseKey,
    phaseTitle,
  } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
  }

  const resolvedPhaseTitle =
    phaseTitle ||
    (phaseKey
      ? ((phaseKey as string).charAt(0).toUpperCase() + (phaseKey as string).slice(1))
      : 'Phase');

  const memberName = name?.trim() || email.split('@')[0];
  const memberRole =
    role?.trim() ||
    (assignType === 'phase' ? `${resolvedPhaseTitle} Lead` : 'Team Member');
  const newMemberId = `team-${Date.now().toString().slice(-6)}`;

  const newMember: AssigneeOption = {
    id: newMemberId,
    uid: `usr-inv-${Date.now().toString().slice(-6)}`,
    name: memberName,
    email: email.trim().toLowerCase(),
    role: memberRole,
    status: 'invited',
  };

  let updatedProject = null;

  if (projectId) {
    const project = getSeedProjectById(projectId);
    if (project) {
      const existingMembers = project.teamMembers || [];
      const updatedMembers = [...existingMembers, newMember];

      const patch: Record<string, unknown> = {
        teamMembers: updatedMembers,
      };

      if (assignType === 'phase' && phaseKey) {
        patch.phaseAssignees = {
          ...(project.phaseAssignees || {}),
          [phaseKey as LegacyProjectPhase]: newMember,
        };
      } else if ((assignType === 'step' || taskId) && taskId) {
        const existingTasks = project.tasks || [];
        const hasTask = existingTasks.some((t) => t.id === taskId);
        if (hasTask) {
          patch.tasks = existingTasks.map((t) => {
            if (t.id === taskId) {
              return {
                ...t,
                assignedTo: memberName,
                assigneeName: memberName,
                assignedToUid: newMemberId,
                assigneeUid: newMemberId,
              };
            }
            return t;
          });
        } else {
          patch.tasks = [
            ...existingTasks,
            {
              id: taskId,
              title: taskTitle || 'Assigned Step',
              status: 'pending' as const,
              assignedTo: memberName,
              assigneeName: memberName,
              assignedToUid: newMemberId,
              assigneeUid: newMemberId,
            },
          ];
        }
      }

      updateSeedProject(projectId, patch);
      updatedProject = getSeedProjectById(projectId);
    }
  }

  // Transactional email dispatch via SendGrid adapter
  let emailSent = false;
  let requiresCredentials = false;

  const projectName =
    updatedProject?.propertyName ||
    updatedProject?.property_address ||
    'PaperWorking Project Workspace';

  let emailSubject = '';
  let emailText = '';
  let emailHtml = '';

  const baseUrl = resolveAppBaseUrl(request);

  if (assignType === 'phase') {
    const inviteUrl = `${baseUrl}/projects/${projectId}?phase=${phaseKey}`;
    emailSubject = `Project Invitation: Assigned to lead ${resolvedPhaseTitle} on ${projectName}`;
    emailText = `Hello ${memberName},\n\nYou have been invited to join the project team for "${projectName}" and assigned to lead the ${resolvedPhaseTitle} phase.\n\nAccess the project workspace here: ${inviteUrl}\n\nPaperWorking Team`;
    emailHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0c0c0c; color: #f4f4f5; border: 1px solid #27272a;">
  <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 20px;">
    <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">PaperWorking</span>
    <span style="font-size: 11px; font-weight: 600; color: #a1a1aa; margin-left: 8px; text-transform: uppercase;">Phase Lead Assignment</span>
  </div>
  <p style="font-size: 15px; line-height: 1.5; margin-bottom: 12px;">Hello <strong>${memberName}</strong>,</p>
  <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin-bottom: 16px;">
    You have been invited to join the project team for <strong>${projectName}</strong> and assigned to lead the <strong>${resolvedPhaseTitle}</strong> phase.
  </p>
  <div style="background-color: #18181b; border: 1px solid #27272a; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 6px 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Role and Scope</p>
    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">Phase Lead: ${resolvedPhaseTitle}</p>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #a1a1aa;">Project: ${projectName}</p>
  </div>
  <div style="margin: 24px 0;">
    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #ffffff; color: #09090b; text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: -0.01em;">Open Phase Workspace</a>
  </div>
  <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;" />
  <p style="font-size: 11px; color: #71717a; margin: 0;">
    PaperWorking: Real Estate Investment Lifecycle Management System
  </p>
</div>`;
  } else {
    const inviteUrl = `${baseUrl}/projects/${projectId || ''}`;
    emailSubject = taskTitle
      ? `Project Invitation: Assigned to step "${taskTitle}" on ${projectName}`
      : `Project Invitation: ${projectName}`;
    emailText = `Hello ${memberName},\n\nYou have been invited to join the project team for "${projectName}" as ${memberRole}.\n${taskTitle ? `Assigned Step: ${taskTitle}\n\n` : ''}Access the project workspace here: ${inviteUrl}\n\nPaperWorking Team`;
    emailHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0c0c0c; color: #f4f4f5; border: 1px solid #27272a;">
  <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 20px;">
    <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">PaperWorking</span>
    <span style="font-size: 11px; font-weight: 600; color: #a1a1aa; margin-left: 8px; text-transform: uppercase;">Team Step Assignment</span>
  </div>
  <p style="font-size: 15px; line-height: 1.5; margin-bottom: 12px;">Hello <strong>${memberName}</strong>,</p>
  <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin-bottom: 16px;">
    You have been invited to join the project team for <strong>${projectName}</strong> as <strong>${memberRole}</strong>.
  </p>
  ${taskTitle ? `<div style="background-color: #18181b; border: 1px solid #27272a; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 6px 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Step</p>
    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">${taskTitle}</p>
  </div>` : ''}
  <div style="margin: 24px 0;">
    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #ffffff; color: #09090b; text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: -0.01em;">Open Project Workspace</a>
  </div>
  <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;" />
  <p style="font-size: 11px; color: #71717a; margin: 0;">
    PaperWorking: Real Estate Investment Lifecycle Management System
  </p>
</div>`;
  }

  try {
    const emailResult = await sendGridService.send({
      to: { email, name: memberName },
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });
    emailSent = emailResult.success;
  } catch (err: unknown) {
    if (err instanceof SendGridError) {
      requiresCredentials = true;
    }
    console.warn('[Invites API] SendGrid dispatch fallback (unconfigured or delivery error):', err);
  }

  return NextResponse.json({
    success: true,
    member: newMember,
    projectId: projectId || null,
    assignType,
    phaseKey: phaseKey || null,
    phaseTitle: resolvedPhaseTitle,
    taskId: taskId || null,
    emailSent,
    requiresCredentials,
  }, { status: 201 });
}

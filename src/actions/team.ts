"use server";

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { OrgTeamMember, InternalRole, TeamInvitation, Permission, AuditLog } from '@/types/schema';
import { cookies } from 'next/headers';
import { NotificationService } from '@/lib/services/notificationService';
import crypto from 'crypto';
import { assignVendorToProject } from '@/actions/vendorAssignment';

function escapeHtml(unsafe: string): string {
  return (unsafe || '').replace(/[&<"'>]/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

async function getCallerUid(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('__session')?.value;
  if (!token) throw new Error('Unauthorized: no session cookie.');
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

async function logAuditAction(
  organizationId: string,
  actorUid: string,
  actorName: string,
  action: AuditLog['action'],
  metadata: Record<string, any>,
  targetUid?: string,
  targetEmail?: string
) {
  const auditRef = adminDb.collection('auditLogs').doc();
  const log: AuditLog = {
    id: auditRef.id,
    organizationId,
    actorUid,
    actorName,
    action,
    targetUid,
    targetEmail,
    metadata,
    createdAt: new Date(),
  };
  await auditRef.set(log);
}

/**
 * Creates a tokenized team invitation and stores it in the `teamInvitations` collection.
 * Replaces the old array-based approach.
 */
export async function persistTeamInvite(member: OrgTeamMember): Promise<void> {
  const callerUid = await getCallerUid();

  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');
  if (userData.subscriptionPlan !== 'Team') throw new Error('Team features require the Team plan.');
  if (userData.role !== 'Lead Investor' && userData.role !== 'Admin') {
    throw new Error('Only Lead Investors and Admins may invite team members.');
  }

  const organizationId: string = userData.organizationId;
  if (!organizationId) throw new Error('Organization not found for this account.');

  const orgRef = adminDb.collection('organizations').doc(organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new Error('Organization document not found.');
  const orgData = orgSnap.data()!;

  const existingMembers: OrgTeamMember[] = orgData.teamMembers ?? [];
  const activeMembers = existingMembers.filter((m: OrgTeamMember) => m.status !== 'removed');

  // Query pending invites
  const pendingInvitesSnap = await adminDb.collection('teamInvitations')
    .where('organizationId', '==', organizationId)
    .where('status', '==', 'pending')
    .get();

  const maxSeats: number = orgData.maxSeats ?? 10;
  const currentSeatUsage = activeMembers.length + pendingInvitesSnap.size;

  if (currentSeatUsage >= maxSeats) throw new Error(`Seat limit of ${maxSeats} reached.`);

  const alreadyMember = activeMembers.find(
    (m: OrgTeamMember) => m.email.toLowerCase() === member.email.toLowerCase()
  );
  if (alreadyMember) throw new Error('This email is already on the team.');
  
  const alreadyInvited = pendingInvitesSnap.docs.find(d => d.data().email.toLowerCase() === member.email.toLowerCase());
  if (alreadyInvited) throw new Error('This email already has a pending invitation.');

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const inviteRef = adminDb.collection('teamInvitations').doc();

  const scopedProjectIds: string[] = Array.isArray(member.scopedProjectIds) && member.scopedProjectIds.length > 0
    ? member.scopedProjectIds
    : member.assignedProjectIds.length > 0 ? member.assignedProjectIds : [];
  const isScoped = member.isScoped === true || (member.scope === 'project' && scopedProjectIds.length > 0);

  const inviteData = {
    id: inviteRef.id,
    token,
    organizationId,
    organizationName: orgData.name || 'Organization',
    email: member.email.toLowerCase(),
    role: member.internalRole,
    status: 'pending',
    invitedByUid: callerUid,
    invitedByName: userData.displayName || userData.email,
    createdAt: now,
    expiresAt,
    scopedProjectIds,
    isScoped,
    // Legacy compat: populate single-project field when exactly one project scoped
    ...(scopedProjectIds.length === 1 ? { invitedToProjectId: scopedProjectIds[0] } : {}),
    day3ReminderSent: false,
    day6ReminderSent: false,
  };

  await inviteRef.set(inviteData);

  await logAuditAction(
    organizationId,
    callerUid,
    userData.displayName || userData.email,
    'MEMBER_INVITED',
    { role: member.internalRole, isScoped, scopedProjectIds },
    undefined,
    inviteData.email
  );

  // Send Notification
  // Determine if the invitee exists in our users collection by email
  const inviteeSnap = await adminDb.collection('users').where('email', '==', inviteData.email).limit(1).get();
  if (!inviteeSnap.empty) {
    const inviteeDoc = inviteeSnap.docs[0];
    await NotificationService.createNotification({
      recipientId: inviteeDoc.id,
      type: 'TEAM_INVITE',
      actor: { uid: callerUid, name: inviteData.invitedByName },
      objectReference: {
        organizationId: inviteData.organizationId,
        organizationName: inviteData.organizationName,
      },
      deepLinkUrl: `/invite/team?token=${token}`,
      expiresAt: inviteData.expiresAt,
    });
  } else {
    // If they aren't registered yet, queue an email
    await adminDb.collection('queued_emails').add({
      recipientEmail: inviteData.email,
      status: 'pending',
      isBatchable: false,
      type: 'TEAM_INVITE',
      actorName: inviteData.invitedByName,
      deepLinkUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invite/team?token=${token}`,
      sendEmail: true,
      sendPush: false,
      title: `${escapeHtml(inviteData.invitedByName)} invited you to join team ${escapeHtml(inviteData.organizationName)}`,
      body: `You have been invited to join the organization '${inviteData.organizationName}'. Click to accept the invitation.`,
      subject: `${escapeHtml(inviteData.invitedByName)} invited you to join team ${escapeHtml(inviteData.organizationName)}`,
      html: `<p>${escapeHtml(inviteData.invitedByName)} invited you to join team ${escapeHtml(inviteData.organizationName)}.</p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invite/team?token=${token}">Accept Invitation</a>`,
      createdAt: FieldValue.serverTimestamp(),
      retryCount: 0,
      expiresAt: inviteData.expiresAt,
    });
  }
}

/**
 * Resends a pending team invitation, extending its expiry and queueing a new email/notification.
 */
export async function resendTeamInvite(email: string): Promise<void> {
  const callerUid = await getCallerUid();

  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');
  if (userData.role !== 'Lead Investor' && userData.role !== 'Admin') {
    throw new Error('Only Lead Investors and Admins may resend team invitations.');
  }

  const organizationId: string = userData.organizationId;
  if (!organizationId) throw new Error('Organization not found for this account.');

  const invitesSnap = await adminDb.collection('teamInvitations')
    .where('organizationId', '==', organizationId)
    .where('email', '==', email.toLowerCase())
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (invitesSnap.empty) {
    throw new Error('No pending invitation found for this email.');
  }

  const inviteDoc = invitesSnap.docs[0];
  const inviteData = inviteDoc.data() as TeamInvitation;

  const now = new Date();

  // Enforce 60-second rate limit to prevent spam
  const lastSent = inviteData.lastSentAt || inviteData.createdAt;
  if (lastSent) {
    const lastSentTime = (lastSent as any).toDate ? (lastSent as any).toDate().getTime() : new Date(lastSent).getTime();
    if (now.getTime() - lastSentTime < 60 * 1000) {
      throw new Error('Please wait at least 60 seconds between resend attempts.');
    }
  }

  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token = crypto.randomBytes(32).toString('hex');

  await inviteDoc.ref.update({
    token,
    expiresAt,
    day3ReminderSent: false,
    day6ReminderSent: false,
    createdAt: now,
    lastSentAt: now,
  });

  await logAuditAction(
    organizationId,
    callerUid,
    userData.displayName || userData.email,
    'MEMBER_INVITED',
    { role: inviteData.role, resent: true },
    undefined,
    inviteData.email
  );

  const inviteeSnap = await adminDb.collection('users').where('email', '==', inviteData.email).limit(1).get();
  if (!inviteeSnap.empty) {
    const inviteeDoc = inviteeSnap.docs[0];
    await NotificationService.createNotification({
      recipientId: inviteeDoc.id,
      type: 'TEAM_INVITE',
      actor: { uid: callerUid, name: userData.displayName || userData.email },
      objectReference: {
        organizationId: inviteData.organizationId,
        organizationName: inviteData.organizationName,
      },
      deepLinkUrl: `/invite/team?token=${token}`,
      expiresAt,
    });
  } else {
    await adminDb.collection('queued_emails').add({
      recipientEmail: inviteData.email,
      status: 'pending',
      isBatchable: false,
      type: 'TEAM_INVITE',
      actorName: userData.displayName || userData.email,
      deepLinkUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invite/team?token=${token}`,
      sendEmail: true,
      sendPush: false,
      title: `${escapeHtml(userData.displayName || userData.email)} invited you to join team ${escapeHtml(inviteData.organizationName)}`,
      body: `You have been invited to join the organization '${inviteData.organizationName}'. Click to accept the invitation.`,
      subject: `${escapeHtml(userData.displayName || userData.email)} invited you to join team ${escapeHtml(inviteData.organizationName)}`,
      html: `<p>${escapeHtml(userData.displayName || userData.email)} invited you to join team ${escapeHtml(inviteData.organizationName)}.</p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invite/team?token=${token}">Accept Invitation</a>`,
      createdAt: FieldValue.serverTimestamp(),
      retryCount: 0,
      expiresAt,
    });
  }
}

/**
 * Accepts a tokenized team invitation.
 */
export async function acceptTeamInvitation(token: string): Promise<void> {
  const callerUid = await getCallerUid();

  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();
  if (!userData) throw new Error('User profile not found.');

  const invitesSnap = await adminDb.collection('teamInvitations').where('token', '==', token).limit(1).get();
  if (invitesSnap.empty) throw new Error('Invalid or expired invitation token.');

  const inviteDoc = invitesSnap.docs[0];
  const inviteData = inviteDoc.data() as TeamInvitation;

  if (userData.email.toLowerCase() !== inviteData.email.toLowerCase()) {
    throw new Error('This invitation was sent to a different email address. Please sign in with the correct account.');
  }

  await adminDb.runTransaction(async (t) => {
    const tInviteSnap = await t.get(inviteDoc.ref);
    if (!tInviteSnap.exists) throw new Error('Invitation no longer exists.');
    const tInviteData = tInviteSnap.data() as TeamInvitation;

    if (tInviteData.status !== 'pending') throw new Error(`Invitation is already ${tInviteData.status}.`);
    if ((tInviteData.expiresAt as any).toDate() < new Date()) {
      t.update(inviteDoc.ref, { status: 'expired' });
      throw new Error('This invitation has expired.');
    }

    const orgRef = adminDb.collection('organizations').doc(tInviteData.organizationId);
    const orgSnap = await t.get(orgRef);
    if (!orgSnap.exists) throw new Error('Organization no longer exists.');

    t.update(inviteDoc.ref, { status: 'accepted' });

    // Resolve the authoritative scoped project list:
    // prefer new scopedProjectIds field; fall back to legacy invitedToProjectId for old invites.
    const resolvedScopedIds: string[] =
      Array.isArray(tInviteData.scopedProjectIds) && tInviteData.scopedProjectIds.length > 0
        ? tInviteData.scopedProjectIds
        : tInviteData.invitedToProjectId ? [tInviteData.invitedToProjectId] : [];

    const resolvedIsScoped = tInviteData.isScoped === true || resolvedScopedIds.length > 0;

    const newMember: OrgTeamMember = {
      id: callerUid,
      email: tInviteData.email,
      displayName: userData.displayName || userData.email,
      internalRole: tInviteData.role,
      assignedProjectIds: resolvedScopedIds,
      scopedProjectIds: resolvedScopedIds,
      isScoped: resolvedIsScoped,
      scope: resolvedIsScoped ? 'project' : 'tenant',
      invitedAt: tInviteData.createdAt,
      status: 'active',
    };

    t.update(orgRef, {
      teamMembers: FieldValue.arrayUnion(newMember),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Write scope onto the user's own document so per-project server actions
    // can enforce access without fetching the full org document.
    t.update(userSnap.ref, {
      [`memberships.${tInviteData.organizationId}`]: tInviteData.role,
      [`membershipScopes.${tInviteData.organizationId}`]: {
        isScoped: resolvedIsScoped,
        scopedProjectIds: resolvedScopedIds,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Revokes a pending team invitation.
 */
export async function revokeTeamInvitation(inviteId: string): Promise<void> {
  const callerUid = await getCallerUid();

  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');
  if (userData.role !== 'Lead Investor' && userData.role !== 'Admin') {
    throw new Error('Insufficient privileges.');
  }

  const inviteRef = adminDb.collection('teamInvitations').doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new Error('Invitation not found.');
  const inviteData = inviteSnap.data() as TeamInvitation;

  if (inviteData.organizationId !== userData.organizationId) {
    throw new Error('Unauthorized.');
  }

  if (inviteData.status !== 'pending') {
    throw new Error(`Cannot revoke invitation that is already ${inviteData.status}.`);
  }

  await inviteRef.update({ status: 'revoked' });
}

/**
 * Removes a team member from the organization (soft-delete via status).
 */
export async function removeTeamMember(memberId: string): Promise<void> {
  const callerUid = await getCallerUid();

  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');
  if (userData.role !== 'Lead Investor' && userData.role !== 'Admin') {
    throw new Error('Insufficient privileges.');
  }

  const organizationId: string = userData.organizationId;
  const orgRef = adminDb.collection('organizations').doc(organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new Error('Organization not found.');

  const members: OrgTeamMember[] = orgSnap.data()?.teamMembers ?? [];
  const targetMember = members.find((m: OrgTeamMember) => m.id === memberId);
  if (!targetMember) throw new Error('Member not found.');

  // Guardrail: Cannot remove the last Lead Investor
  const targetUserSnap = await adminDb.collection('users').doc(memberId).get();
  if (targetUserSnap.exists && targetUserSnap.data()?.role === 'Lead Investor') {
    const allLeadInvestors = await adminDb.collection('users')
      .where('organizationId', '==', organizationId)
      .where('role', '==', 'Lead Investor')
      .get();
    if (allLeadInvestors.size <= 1) {
      throw new Error('Cannot remove the last Lead Investor of the organization.');
    }
  }

  const updated = members.map((m: OrgTeamMember) =>
    m.id === memberId ? { ...m, status: 'removed' as const } : m
  );

  const batch = adminDb.batch();

  batch.update(orgRef, {
    teamMembers: updated,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Guardrail: remove user's access token mapping to strictly drop permissions
  const targetUserRef = adminDb.collection('users').doc(memberId);
  batch.update(targetUserRef, {
    [`memberships.${organizationId}`]: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Mark tasks for reassignment
  const projectsSnap = await adminDb.collection('projects').where('organizationId', '==', organizationId).get();
  for (const pdoc of projectsSnap.docs) {
    const pdata = pdoc.data();
    const actionItems = pdata.actionItems || [];
    let updatedActionItems = false;
    const newActionItems = actionItems.map((item: any) => {
      if (item.assignee?.toLowerCase() === targetMember.email.toLowerCase()) {
        updatedActionItems = true;
        return { ...item, needsReassignment: true };
      }
      return item;
    });

    if (updatedActionItems) {
      batch.update(pdoc.ref, { actionItems: newActionItems });
    }
  }

  await batch.commit();

  await logAuditAction(
    organizationId,
    callerUid,
    userData.displayName || userData.email,
    'MEMBER_REMOVED',
    { previousRole: targetMember.internalRole },
    memberId,
    targetMember.email
  );
}

/**
 * Fetches a team invitation by token. Does not require authentication.
 */
export async function getTeamInvitationByToken(token: string): Promise<TeamInvitation | null> {
  const invitesSnap = await adminDb.collection('teamInvitations').where('token', '==', token).limit(1).get();
  if (invitesSnap.empty) return null;
  
  const doc = invitesSnap.docs[0];
  const data = doc.data();
  return {
    ...data,
    createdAt: data.createdAt.toDate(),
    expiresAt: data.expiresAt.toDate(),
  } as TeamInvitation;
}

export async function suspendTeamMember(memberId: string, suspend: boolean): Promise<void> {
  const callerUid = await getCallerUid();
  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');
  if (userData.role !== 'Lead Investor' && userData.role !== 'Admin') {
    throw new Error('Insufficient privileges.');
  }

  const organizationId: string = userData.organizationId;
  const orgRef = adminDb.collection('organizations').doc(organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new Error('Organization not found.');

  const members: OrgTeamMember[] = orgSnap.data()?.teamMembers ?? [];
  const targetMember = members.find((m: OrgTeamMember) => m.id === memberId);
  if (!targetMember) throw new Error('Member not found.');

  const newStatus = suspend ? 'suspended' : 'active';
  
  if (targetMember.status === newStatus) return;

  const updated = members.map((m: OrgTeamMember) =>
    m.id === memberId ? { ...m, status: newStatus as 'active' | 'suspended' } : m
  );

  await orgRef.update({
    teamMembers: updated,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditAction(
    organizationId,
    callerUid,
    userData.displayName || userData.email,
    'MEMBER_SUSPENDED',
    { suspended: suspend },
    memberId,
    targetMember.email
  );
}

export async function updateMemberRoleAndPermissions(
  memberId: string,
  role: InternalRole,
  customPermissions?: Permission[]
): Promise<void> {
  const callerUid = await getCallerUid();
  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');
  if (userData.role !== 'Lead Investor' && userData.role !== 'Admin') {
    throw new Error('Insufficient privileges.');
  }

  const organizationId: string = userData.organizationId;
  const orgRef = adminDb.collection('organizations').doc(organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new Error('Organization not found.');

  const members: OrgTeamMember[] = orgSnap.data()?.teamMembers ?? [];
  const targetMember = members.find((m: OrgTeamMember) => m.id === memberId);
  if (!targetMember) throw new Error('Member not found.');

  const updated = members.map((m: OrgTeamMember) =>
    m.id === memberId ? { ...m, internalRole: role, customPermissions } : m
  );

  await orgRef.update({
    teamMembers: updated,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditAction(
    organizationId,
    callerUid,
    userData.displayName || userData.email,
    customPermissions ? 'MEMBER_PERMISSIONS_CHANGED' : 'MEMBER_ROLE_CHANGED',
    { role, customPermissions },
    memberId,
    targetMember.email
  );
}

export async function updateMemberScope(
  memberId: string,
  scope: 'tenant' | 'project',
  assignedProjectIds: string[]
): Promise<void> {
  const callerUid = await getCallerUid();
  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');
  if (userData.role !== 'Lead Investor' && userData.role !== 'Admin') {
    throw new Error('Insufficient privileges.');
  }

  const organizationId: string = userData.organizationId;
  const orgRef = adminDb.collection('organizations').doc(organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new Error('Organization not found.');

  const members: OrgTeamMember[] = orgSnap.data()?.teamMembers ?? [];
  const targetMember = members.find((m: OrgTeamMember) => m.id === memberId);
  if (!targetMember) throw new Error('Member not found.');

  const updated = members.map((m: OrgTeamMember) =>
    m.id === memberId ? { ...m, scope, assignedProjectIds } : m
  );

  await orgRef.update({
    teamMembers: updated,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditAction(
    organizationId,
    callerUid,
    userData.displayName || userData.email,
    'PROJECT_SCOPE_CHANGED',
    { scope, assignedProjectIds },
    memberId,
    targetMember.email
  );
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const callerUid = await getCallerUid();
  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');
  if (userData.role !== 'Lead Investor' && userData.role !== 'Admin') {
    throw new Error('Insufficient privileges.');
  }

  const organizationId: string = userData.organizationId;
  const snapshot = await adminDb.collection('auditLogs')
    .where('organizationId', '==', organizationId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
    } as AuditLog;
  });
}

/**
 * Assigns a task to a user, handling existing members, vendors, and assign-as-invite.
 */
export async function assignTask(projectId: string, taskId: string, assigneeEmail: string, taskLabel: string): Promise<void> {
  const callerUid = await getCallerUid();
  const userSnap = await adminDb.collection('users').doc(callerUid).get();
  const userData = userSnap.data();

  if (!userData) throw new Error('User profile not found.');

  const projectRef = adminDb.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new Error('Project not found.');
  const projectData = projectSnap.data();

  const organizationId = projectData?.organizationId;
  if (!organizationId) throw new Error('Project is not associated with an organization.');

  const orgRef = adminDb.collection('organizations').doc(organizationId);
  const orgSnap = await orgRef.get();
  const orgData = orgSnap.data();

  // Guardrail: Ensure caller has access to this tenant
  const members: OrgTeamMember[] = orgData?.teamMembers ?? [];
  const callerMember = members.find((m: OrgTeamMember) => m.id === callerUid && m.status !== 'removed');
  if (!callerMember && userData.organizationId !== organizationId && userData.personalOrganizationId !== organizationId) {
    throw new Error('Unauthorized: You do not have access to this tenant.');
  }

  const targetEmail = assigneeEmail.toLowerCase();

  const isMember = members.find((m) => m.email.toLowerCase() === targetEmail && m.status !== 'removed');

  if (isMember) {
    // Existing member: Notify them via inbox
    const targetUserSnap = await adminDb.collection('users').where('email', '==', targetEmail).limit(1).get();
    if (!targetUserSnap.empty) {
      const targetUserId = targetUserSnap.docs[0].id;
      await NotificationService.createNotification({
        recipientId: targetUserId,
        type: 'TASK_ASSIGNED',
        actor: { uid: callerUid, name: userData.displayName || userData.email },
        objectReference: { projectId, task: taskLabel },
        deepLinkUrl: `/dashboard/projects/${projectId}`,
      });
    }
  } else {
    // Check if vendor
    const vendorSnap = await adminDb.collection('users')
      .where('email', '==', targetEmail)
      .where('accountType', '==', 'vendor')
      .limit(1)
      .get();

    if (!vendorSnap.empty) {
      // Real vendor assignment via vendorAssignment.ts lifecycle
      const vendorUid = vendorSnap.docs[0].id;
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('__session')?.value;
      if (!sessionToken) throw new Error('Unauthorized: no session cookie.');

      const result = await assignVendorToProject(
        sessionToken,
        projectId,
        vendorUid,
        taskLabel,  // serviceType — the task label describes the work
        `Task assignment: ${taskLabel}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to assign vendor.');
      }

    } else {
      // Assign-as-invite
      // Check for existing pending invite
      const existingInviteSnap = await adminDb.collection('teamInvitations')
        .where('organizationId', '==', organizationId)
        .where('email', '==', targetEmail)
        .where('status', '==', 'pending')
        .get();

      let inviteToken = '';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      if (existingInviteSnap.empty) {
        // Enforce seat limit before creating invite
        const activeMembers = members.filter((m: OrgTeamMember) => m.status !== 'removed');
        const pendingInvitesSnap = await adminDb.collection('teamInvitations')
          .where('organizationId', '==', organizationId)
          .where('status', '==', 'pending')
          .get();
        const maxSeats: number = orgData?.maxSeats ?? 10;
        if (activeMembers.length + pendingInvitesSnap.size >= maxSeats) {
          throw new Error(`Seat limit of ${maxSeats} reached. Cannot create invite for new assignee.`);
        }

        inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteRef = adminDb.collection('teamInvitations').doc();
        await inviteRef.set({
          id: inviteRef.id,
          token: inviteToken,
          organizationId,
          organizationName: orgData?.name || 'Organization',
          email: targetEmail,
          role: 'Standard', // Least-privilege role
          status: 'pending',
          invitedByUid: callerUid,
          invitedByName: userData.displayName || userData.email,
          createdAt: new Date(),
          expiresAt,
          invitedToTaskId: taskId,
          invitedToProjectId: projectId,
        });
      } else {
        const inviteDoc = existingInviteSnap.docs[0];
        inviteToken = inviteDoc.data().token;
        // Update the existing invite to link to this task
        await inviteDoc.ref.update({ 
          invitedToTaskId: taskId,
          invitedToProjectId: projectId 
        });
      }

      // Send invite email
      await adminDb.collection('queued_emails').add({
        recipientEmail: targetEmail,
        status: 'pending',
        isBatchable: false,
        type: 'TEAM_INVITE_TASK',
        actorName: userData.displayName || userData.email,
        deepLinkUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invite/team?token=${inviteToken}`,
        sendEmail: true,
        sendPush: false,
        title: `${escapeHtml(userData.displayName || userData.email)} assigned you a task and invited you to PaperWorking`,
        body: `You have been assigned the task "${taskLabel}" and invited to join the team. Click to accept the invitation.`,
        subject: `Task Assignment: ${escapeHtml(taskLabel)}`,
        html: `<p>You have been assigned the task <strong>${escapeHtml(taskLabel)}</strong>.</p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/invite/team?token=${inviteToken}">Accept Invitation & View Task</a>`,
        createdAt: FieldValue.serverTimestamp(),
        retryCount: 0,
        expiresAt,
      });
    }
  }

  // Find the task in projectData.actionItems and update its assignee, and remove needsReassignment if it's there
  let actionItems = projectData?.actionItems || [];
  let found = false;
  actionItems = actionItems.map((item: any) => {
    if (item.id === taskId) {
      found = true;
      const updated = { ...item, assignee: targetEmail };
      delete updated.needsReassignment;
      return updated;
    }
    return item;
  });

  if (!found) {
    // If task isn't in DB yet, we can push it. We don't have all details here, 
    // but the UI's bulk save will save it shortly.
    // Let's just push a minimal stub if needed, or rely on UI to save.
    // Actually, ProjectTodoList already saves to backend. We'll let UI handle the DB save for the action item itself.
    // We only do this so the action item is marked assigned if it already exists.
  } else {
    await projectRef.update({
      actionItems,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}


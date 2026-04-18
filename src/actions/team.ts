"use server";

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { OrgTeamMember } from '@/types/schema';
import { cookies } from 'next/headers';

async function getCallerUid(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('__session')?.value;
  if (!token) throw new Error('Unauthorized: no session cookie.');
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

/**
 * Persists a team invite into the caller's organization document.
 * The invitee gains access once they register/login with the same email.
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

  const existing: OrgTeamMember[] = orgSnap.data()?.teamMembers ?? [];
  const active = existing.filter((m: OrgTeamMember) => m.status !== 'removed');

  const maxSeats: number = orgSnap.data()?.maxSeats ?? 10;
  if (active.length >= maxSeats) throw new Error(`Seat limit of ${maxSeats} reached.`);

  const already = active.find(
    (m: OrgTeamMember) => m.email.toLowerCase() === member.email.toLowerCase()
  );
  if (already) throw new Error('This email is already on the team.');

  // Add the member to the org's teamMembers array
  await orgRef.update({
    teamMembers: FieldValue.arrayUnion({
      ...member,
      invitedAt: FieldValue.serverTimestamp(),
    }),
    updatedAt: FieldValue.serverTimestamp(),
  });
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
  const updated = members.map((m: OrgTeamMember) =>
    m.id === memberId ? { ...m, status: 'removed' as const } : m
  );

  await orgRef.update({
    teamMembers: updated,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

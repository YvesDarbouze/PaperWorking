"use server";

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getTitleProvider } from '@/lib/providers/title';
import type { TitleCommitmentData, TitleWorkflowState } from '@/types/schema';

// ─── Auth helper ─────────────────────────────────────────────────────────────
async function verifyAuth(idToken: string) {
  if (!idToken) throw new Error('Unauthorized');
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userSnap.exists) throw new Error('User profile not found.');
    const data = userSnap.data() as Record<string, unknown>;
    return {
      uid: decoded.uid,
      displayName: (data.displayName as string) || (decoded.email as string) || 'Unknown',
      organizationId: data.organizationId as string,
      ...data,
    };
  } catch {
    throw new Error('Unauthorized');
  }
}

// ─── Scope/Access check ──────────────────────────────────────────────────────
async function verifyProjectAccess(projectId: string, uid: string, organizationId: string) {
  const projectRef = adminDb.collection('projects').doc(projectId);
  const snap = await projectRef.get();
  if (!snap.exists) throw new Error('Project not found.');
  const data = snap.data()!;

  // Owner check
  if (data.ownerUid === uid) return;

  // Organization match
  if (data.organizationId === organizationId) return;

  // Team membership check
  if (data.members?.[uid]) return;
  if (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(uid)) return;

  // Title/Escrow vendor slot check (counterpart visibility)
  const titleVendorId = data.financials?.f4TitleEscrowVendor?.marketplaceVendorId;
  if (titleVendorId && titleVendorId === uid) return;

  throw new Error('You do not have access to this project.');
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function openTitleOrderAction(idToken: string, projectId: string): Promise<TitleWorkflowState> {
  const user = await verifyAuth(idToken);
  await verifyProjectAccess(projectId, user.uid, user.organizationId);

  const provider = getTitleProvider();
  const res = await provider.openOrder(projectId, user.uid, user.displayName);
  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');
    await jobQueue.enqueue('timeline_sync', { projectId });
  } catch (err: any) {
    console.error('Failed to enqueue timeline sync on openTitleOrderAction:', err.message);
  }
  return res;
}

export async function receiveTitleCommitmentAction(
  idToken: string,
  projectId: string,
  data: TitleCommitmentData
): Promise<TitleWorkflowState> {
  const user = await verifyAuth(idToken);
  await verifyProjectAccess(projectId, user.uid, user.organizationId);

  const provider = getTitleProvider();
  const res = await provider.receiveCommitment(projectId, data, user.uid, user.displayName);
  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');
    await jobQueue.enqueue('timeline_sync', { projectId });
  } catch (err: any) {
    console.error('Failed to enqueue timeline sync on receiveTitleCommitmentAction:', err.message);
  }
  return res;
}

export async function addTitleDefectAction(
  idToken: string,
  projectId: string,
  description: string
): Promise<TitleWorkflowState> {
  const user = await verifyAuth(idToken);
  await verifyProjectAccess(projectId, user.uid, user.organizationId);

  const provider = getTitleProvider();
  const res = await provider.addDefect(projectId, description, user.uid, user.displayName);
  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');
    await jobQueue.enqueue('timeline_sync', { projectId });
  } catch (err: any) {
    console.error('Failed to enqueue timeline sync on addTitleDefectAction:', err.message);
  }
  return res;
}

export async function resolveTitleDefectAction(
  idToken: string,
  projectId: string,
  defectId: string,
  notes: string,
  documentUrl: string | null,
  documentName: string | null
): Promise<TitleWorkflowState> {
  const user = await verifyAuth(idToken);
  await verifyProjectAccess(projectId, user.uid, user.organizationId);

  const provider = getTitleProvider();
  const res = await provider.resolveDefect(projectId, defectId, notes, documentUrl, documentName, user.uid, user.displayName);
  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');
    await jobQueue.enqueue('timeline_sync', { projectId });
  } catch (err: any) {
    console.error('Failed to enqueue timeline sync on resolveTitleDefectAction:', err.message);
  }
  return res;
}export async function clearTitleAction(idToken: string, projectId: string): Promise<TitleWorkflowState> {
  const user = await verifyAuth(idToken);
  await verifyProjectAccess(projectId, user.uid, user.organizationId);

  const provider = getTitleProvider();
  const res = await provider.clearTitle(projectId, user.uid, user.displayName);
  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');
    await jobQueue.enqueue('timeline_sync', { projectId });
  } catch (err: any) {
    console.error('Failed to enqueue timeline sync on clearTitleAction:', err.message);
  }
  return res;
}

export async function getTitleWorkflowStateAction(idToken: string, projectId: string): Promise<TitleWorkflowState> {
  const user = await verifyAuth(idToken);
  await verifyProjectAccess(projectId, user.uid, user.organizationId);

  const provider = getTitleProvider();
  return provider.getWorkflowState(projectId);
}

export async function getActiveTitleProviderAction(): Promise<string> {
  return process.env.TITLE_PROVIDER || 'manual';
}

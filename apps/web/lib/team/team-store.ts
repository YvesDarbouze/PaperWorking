/**
 * Authoritative Server-side Team Persistence Store.
 *
 * Implements persistent Google Cloud Firestore storage for workspace team members,
 * roles, granular access levels, invitations, and seat capacity settings under
 * `team_members/{memberId}` and `team_settings/{organizationId}` collections,
 * with automatic fallback and seed bootstrapping for offline and testing environments.
 */

import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import {
  TEAM_MEMBERS,
  TEAM_SEATS,
  getDefaultAccessLevelForRole,
  type InternalRole,
  type TeamMember,
  type TeamMemberStatus,
  type TeamMemberType,
  type WorkspaceAccessLevel,
} from '@/lib/dashboard/shell-seed';

export type {
  InternalRole,
  TeamMember,
  TeamMemberStatus,
  TeamMemberType,
  WorkspaceAccessLevel,
};

export interface TeamMemberRecord extends TeamMember {
  organizationId?: string;
  scopedProjectId?: string | null;
  scopedProjectName?: string | null;
  scopedTabOrTask?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamSeatsSettings {
  organizationId: string;
  used: number;
  limit: number;
  tier: 'Individual' | 'Team';
  tierLabel: string;
  updatedAt?: string;
}

/**
 * Sanitizes object keys so that no key is `undefined`, replacing with `null`.
 * Cloud Firestore throws if any document field value is `undefined`.
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = { ...obj };
  for (const key of Object.keys(clean)) {
    if (clean[key] === undefined) {
      clean[key] = null;
    }
  }
  return clean as T;
}

declare global {
  // eslint-disable-next-line no-var
  var __pw_team_cache: Map<string, TeamMemberRecord> | undefined;
  // eslint-disable-next-line no-var
  var __pw_team_settings_cache: Map<string, TeamSeatsSettings> | undefined;
}

const memoryTeamCache: Map<string, TeamMemberRecord> =
  globalThis.__pw_team_cache ?? (globalThis.__pw_team_cache = new Map<string, TeamMemberRecord>());

const memorySettingsCache: Map<string, TeamSeatsSettings> =
  globalThis.__pw_team_settings_cache ??
  (globalThis.__pw_team_settings_cache = new Map<string, TeamSeatsSettings>());

// Initialize default organization settings cache
const DEFAULT_ORG_ID = 'org-1';

function initializeDefaultSettings(): TeamSeatsSettings {
  return {
    organizationId: DEFAULT_ORG_ID,
    used: TEAM_SEATS.used,
    limit: TEAM_SEATS.limit,
    tier: TEAM_SEATS.tier,
    tierLabel: TEAM_SEATS.tierLabel,
    updatedAt: new Date().toISOString(),
  };
}

if (!memorySettingsCache.has(DEFAULT_ORG_ID)) {
  memorySettingsCache.set(DEFAULT_ORG_ID, initializeDefaultSettings());
}

function ensureBootstrapped(orgId = DEFAULT_ORG_ID): void {
  if (memoryTeamCache.size === 0) {
    for (const m of TEAM_MEMBERS) {
      memoryTeamCache.set(m.id, {
        ...m,
        organizationId: orgId,
        createdAt: m.invitedAt || '2026-08-01T00:00:00Z',
        updatedAt: m.invitedAt || '2026-08-01T00:00:00Z',
      });
    }
  }
  if (!memorySettingsCache.has(orgId)) {
    memorySettingsCache.set(orgId, initializeDefaultSettings());
  }
}

// Initial bootstrap
ensureBootstrapped(DEFAULT_ORG_ID);

function toIsoString(val: unknown, fallback: string): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof (val as any).toDate === 'function') {
    try {
      return (val as any).toDate().toISOString();
    } catch {
      return fallback;
    }
  }
  if (val instanceof Date) return val.toISOString();
  return fallback;
}

function normalizeMemberRecord(docId: string, data: Record<string, unknown>): TeamMemberRecord {
  const role = (data.role as string) || 'Associate';
  const guessedAccess = getDefaultAccessLevelForRole(role);
  const now = new Date().toISOString();

  return {
    id: docId,
    name: (data.name as string) || (data.email as string)?.split('@')[0] || 'Team Operator',
    email: (data.email as string) || '',
    role,
    type: (data.type as TeamMemberType) || (role === 'Vendor' ? 'External' : 'Internal'),
    status: (data.status as TeamMemberStatus) || 'Active',
    accessLevel: (data.accessLevel as WorkspaceAccessLevel) || guessedAccess,
    projects: typeof data.projects === 'number' ? data.projects : 0,
    lastActive: (data.lastActive as string) || 'N/A',
    invitedAt: data.invitedAt ? toIsoString(data.invitedAt, '') || undefined : undefined,
    isYou: Boolean(data.isYou),
    organizationId: (data.organizationId as string) || DEFAULT_ORG_ID,
    scopedProjectId: (data.scopedProjectId as string) || undefined,
    scopedProjectName: (data.scopedProjectName as string) || undefined,
    scopedTabOrTask: (data.scopedTabOrTask as string) || undefined,
    createdAt: toIsoString(data.createdAt, now),
    updatedAt: toIsoString(data.updatedAt, now),
  };
}

function calculateActiveSeats(members: TeamMemberRecord[]): number {
  return members.filter(
    (m) => m.status === 'Active' || m.status === 'Suspended' || m.status === 'Invited',
  ).length;
}

/**
 * Lists team members from persistent store with optional filtering.
 */
export async function listTeamMembersFromStore(options?: {
  organizationId?: string;
  search?: string;
  role?: string;
  status?: string;
}): Promise<TeamMemberRecord[]> {
  const orgId = options?.organizationId || DEFAULT_ORG_ID;
  ensureBootstrapped(orgId);

  const filterList = (list: TeamMemberRecord[]): TeamMemberRecord[] => {
    let result = list.filter((m) => !m.organizationId || m.organizationId === orgId);

    if (options?.role && options.role !== 'all') {
      result = result.filter((m) => m.role.toLowerCase() === options.role?.toLowerCase());
    }

    if (options?.status && options.status !== 'all') {
      result = result.filter((m) => m.status.toLowerCase() === options.status?.toLowerCase());
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q),
      );
    }

    // Sort: "isYou" first, then Active, Suspended, Invited, Removed
    result.sort((a, b) => {
      if (a.isYou && !b.isYou) return -1;
      if (!a.isYou && b.isYou) return 1;
      const statusOrder: Record<TeamMemberStatus, number> = {
        Active: 1,
        Suspended: 2,
        Invited: 3,
        Removed: 4,
      };
      return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    });

    return result;
  };

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      let queryRef: FirebaseFirestore.Query = db.collection('team_members');

      if (options?.organizationId) {
        queryRef = queryRef.where('organizationId', '==', orgId);
      }

      const snap = await queryRef.get();
      if (!snap.empty) {
        const records = snap.docs.map((d) => normalizeMemberRecord(d.id, d.data()));
        for (const r of records) {
          memoryTeamCache.set(r.id, r);
        }
        return filterList(records);
      }

      // If Firestore collection is empty, bootstrap with seed TEAM_MEMBERS
      const batch = db.batch();
      for (const s of TEAM_MEMBERS) {
        const rec = normalizeMemberRecord(s.id, {
          ...s,
          organizationId: orgId,
          createdAt: s.invitedAt || new Date().toISOString(),
          updatedAt: s.invitedAt || new Date().toISOString(),
        });
        const docRef = db.collection('team_members').doc(s.id);
        batch.set(docRef, sanitizeForFirestore(rec));
        memoryTeamCache.set(s.id, rec);
      }
      batch.commit().catch((err) => {
        console.warn('[team-store] Non-fatal batch seed commit warning:', err?.message || err);
      });

      return filterList(Array.from(memoryTeamCache.values()));
    } catch (err: any) {
      console.warn('[team-store] Firestore list failed, falling back to cache:', err?.message || err);
    }
  }

  return filterList(Array.from(memoryTeamCache.values()));
}

/**
 * Retrieves a single team member by ID.
 */
export async function getTeamMemberFromStore(id: string): Promise<TeamMemberRecord | null> {
  if (!id) return null;
  ensureBootstrapped(DEFAULT_ORG_ID);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const doc = await db.collection('team_members').doc(id).get();
      if (doc.exists) {
        const record = normalizeMemberRecord(doc.id, doc.data() as Record<string, unknown>);
        memoryTeamCache.set(id, record);
        return record;
      }
    } catch (err: any) {
      console.warn(`[team-store] Firestore get failed for ${id}:`, err?.message || err);
    }
  }

  const cached = memoryTeamCache.get(id);
  if (cached) return cached;

  // Fallback to seed TEAM_MEMBERS in case cache was flushed or re-instantiated
  const seed = TEAM_MEMBERS.find((m) => m.id === id);
  if (seed) {
    const record = normalizeMemberRecord(seed.id, {
      ...seed,
      organizationId: DEFAULT_ORG_ID,
      createdAt: seed.invitedAt || '2026-08-01T00:00:00Z',
      updatedAt: seed.invitedAt || '2026-08-01T00:00:00Z',
    });
    memoryTeamCache.set(id, record);
    return record;
  }

  return null;
}

/**
 * Retrieves current team seats settings and calculates live usage.
 */
export async function getTeamSeatsFromStore(organizationId = DEFAULT_ORG_ID): Promise<TeamSeatsSettings> {
  ensureBootstrapped(organizationId);
  let settings = memorySettingsCache.get(organizationId);
  if (!settings) {
    settings = initializeDefaultSettings();
    memorySettingsCache.set(organizationId, settings);
  }

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const doc = await db.collection('team_settings').doc(organizationId).get();
      if (doc.exists) {
        const data = doc.data() as Record<string, unknown>;
        settings = {
          organizationId,
          used: typeof data.used === 'number' ? data.used : settings.used,
          limit: typeof data.limit === 'number' ? data.limit : 10,
          tier: (data.tier as 'Individual' | 'Team') || 'Team',
          tierLabel: (data.tierLabel as string) || (data.tier === 'Individual' ? 'Individual Investor' : 'Investment Team'),
          updatedAt: toIsoString(data.updatedAt, new Date().toISOString()),
        };
        memorySettingsCache.set(organizationId, settings);
      }
    } catch (err: any) {
      console.warn('[team-store] Firestore settings read failed:', err?.message || err);
    }
  }

  // Recalculate live active seats
  const allMembers = await listTeamMembersFromStore({ organizationId });
  const liveUsed = calculateActiveSeats(allMembers);

  return {
    ...settings,
    used: liveUsed,
    limit: settings.tier === 'Individual' ? 1 : 10,
  };
}

/**
 * Updates workspace subscription tier (Individual <-> Team).
 */
export async function updateTeamTierInStore(
  tier: 'Individual' | 'Team',
  organizationId = DEFAULT_ORG_ID,
): Promise<TeamSeatsSettings> {
  const current = await getTeamSeatsFromStore(organizationId);
  const updated: TeamSeatsSettings = {
    ...current,
    tier,
    tierLabel: tier === 'Team' ? 'Investment Team' : 'Individual Investor',
    limit: tier === 'Team' ? 10 : 1,
    updatedAt: new Date().toISOString(),
  };

  memorySettingsCache.set(organizationId, updated);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await db.collection('team_settings').doc(organizationId).set(
        {
          ...updated,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err: any) {
      console.warn('[team-store] Warning: Failed to persist tier update to Firestore (memory cache preserved):', err?.message || err);
    }
  }

  return updated;
}

/**
 * Creates and persists a single team member.
 */
export async function createTeamMemberInStore(
  payload: Partial<TeamMemberRecord> & {
    email: string;
    role?: InternalRole;
    accessLevel?: WorkspaceAccessLevel;
  },
): Promise<TeamMemberRecord> {
  const id = payload.id || `member-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const role = payload.role || 'Associate';
  const guessedAccess = getDefaultAccessLevelForRole(role);

  const record: TeamMemberRecord = normalizeMemberRecord(id, {
    ...payload,
    name: payload.name || payload.email.split('@')[0],
    email: payload.email.toLowerCase().trim(),
    role,
    type: payload.type || (role === 'Vendor' ? 'External' : 'Internal'),
    status: payload.status || 'Invited',
    accessLevel: payload.accessLevel || guessedAccess,
    projects: typeof payload.projects === 'number' ? payload.projects : 0,
    lastActive: payload.lastActive || '—',
    invitedAt: payload.invitedAt || now,
    organizationId: payload.organizationId || DEFAULT_ORG_ID,
    scopedProjectId: payload.scopedProjectId,
    scopedProjectName: payload.scopedProjectName,
    scopedTabOrTask: payload.scopedTabOrTask,
    createdAt: now,
    updatedAt: now,
    id,
  });

  memoryTeamCache.set(id, record);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      const firestoreData = sanitizeForFirestore({
        ...record,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await db
        .collection('team_members')
        .doc(id)
        .set(firestoreData);
    } catch (err: any) {
      console.warn(`[team-store] Warning: Failed to persist member ${id} to Firestore (memory cache preserved):`, err?.message || err);
    }
  }

  return record;
}

/**
 * Bulk invites multiple team members, validating seat limits and persisting each.
 */
export async function bulkInviteTeamMembersInStore(payload: {
  emails: string[];
  role: InternalRole;
  accessLevel: WorkspaceAccessLevel;
  scopedProjectId?: string;
  scopedProjectName?: string;
  scopedTabOrTask?: string;
  organizationId?: string;
}): Promise<{ invited: TeamMemberRecord[]; seats: TeamSeatsSettings }> {
  const orgId = payload.organizationId || DEFAULT_ORG_ID;
  const currentSeats = await getTeamSeatsFromStore(orgId);

  const validEmails = Array.from(
    new Set(
      payload.emails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@')),
    ),
  );

  if (validEmails.length === 0) {
    throw new Error('Please provide at least one valid email address.');
  }

  if (currentSeats.used + validEmails.length > currentSeats.limit) {
    const available = Math.max(0, currentSeats.limit - currentSeats.used);
    throw new Error(
      `Cannot invite ${validEmails.length} member(s): only ${available} seat(s) remaining in this workspace tier.`,
    );
  }

  const invited: TeamMemberRecord[] = [];

  for (let i = 0; i < validEmails.length; i++) {
    const email = validEmails[i];
    const newMember = await createTeamMemberInStore({
      id: `invite-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
      name: email.split('@')[0],
      email,
      role: payload.role,
      type: payload.role === 'Vendor' ? 'External' : 'Internal',
      status: 'Invited',
      accessLevel: payload.accessLevel,
      projects: payload.scopedProjectId ? 1 : 0,
      scopedProjectId: payload.scopedProjectId,
      scopedProjectName: payload.scopedProjectName,
      scopedTabOrTask: payload.scopedTabOrTask,
      organizationId: orgId,
    });
    invited.push(newMember);
  }

  const updatedSeats = await getTeamSeatsFromStore(orgId);
  return { invited, seats: updatedSeats };
}

/**
 * Updates an existing team member in store and Firestore.
 */
export async function updateTeamMemberInStore(
  id: string,
  updates: Partial<TeamMemberRecord>,
): Promise<TeamMemberRecord | null> {
  const existing = await getTeamMemberFromStore(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextRole = (updates.role as InternalRole) || existing.role;
  const nextAccessLevel =
    updates.accessLevel ||
    (updates.role ? getDefaultAccessLevelForRole(nextRole) : existing.accessLevel);

  const updated: TeamMemberRecord = {
    ...existing,
    ...updates,
    role: nextRole,
    type: updates.type || (nextRole === 'Vendor' ? 'External' : 'Internal'),
    accessLevel: nextAccessLevel,
    scopedProjectId:
      'scopedProjectId' in updates
        ? updates.scopedProjectId || undefined
        : existing.scopedProjectId,
    scopedProjectName:
      'scopedProjectName' in updates
        ? updates.scopedProjectName || undefined
        : existing.scopedProjectName,
    scopedTabOrTask:
      'scopedTabOrTask' in updates
        ? updates.scopedTabOrTask || undefined
        : existing.scopedTabOrTask,
    projects:
      'scopedProjectId' in updates
        ? (updates.scopedProjectId ? 1 : 0)
        : (updates.projects !== undefined ? updates.projects : existing.projects),
    updatedAt: now,
  };

  memoryTeamCache.set(id, updated);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      const firestoreData = sanitizeForFirestore({
        ...updated,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db
        .collection('team_members')
        .doc(id)
        .set(firestoreData, { merge: true });
    } catch (err: any) {
      console.warn(`[team-store] Warning: Failed to update member ${id} in Firestore (memory cache preserved):`, err?.message || err);
    }
  }

  return updated;
}

/**
 * Deletes or revokes a team member from store and Firestore.
 */
export async function deleteTeamMemberInStore(id: string): Promise<boolean> {
  const existing = await getTeamMemberFromStore(id);
  if (!existing) return false;

  memoryTeamCache.delete(id);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await db.collection('team_members').doc(id).delete();
    } catch (err: any) {
      console.warn(`[team-store] Warning: Failed to delete member ${id} from Firestore:`, err?.message || err);
    }
  }

  return true;
}

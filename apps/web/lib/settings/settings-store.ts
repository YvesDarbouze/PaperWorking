/**
 * Server-side settings, profile, and billing persistence store.
 * Manages user profile, billing state, and security settings.
 * Adheres to PaperWorking Firebase conventions (per-user /users/{uid} documents).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isTeamTierOverrideEmail } from '@paperworking/services';
import { PROFILE_PREVIEW, BILLING_PREVIEW } from '@/lib/dashboard/shell-seed';
import { shouldAttemptFirestore } from '@/lib/firebase/admin';

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  teamLogoUrl?: string;
  businessName?: string;
  companyName?: string;
  onboardingCompleted?: boolean;
  headline?: string;
  publicBio?: string;
  location?: string;
  websiteUrl?: string;
  strategies?: string[];
  isVerified?: boolean;
  publicProfile?: boolean;
  twoFaEnabled?: boolean;
  timezone?: string;
  locale?: string;
  role?: string;
  aumCents?: number;
  avgRoiPct?: number;
  equityMultiple?: number;
  dealCount?: number;
  showRoiPublicly?: boolean;
  vendorSkills?: string[];
  [key: string]: unknown;
}

export interface BillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BillingInvoice {
  id: string;
  number: string;
  date: string;
  amount: string;
  status: string;
  pdfUrl?: string;
  hostedUrl?: string;
}

export interface UserBillingData {
  plan: string;
  price: string;
  monthlyPrice?: number;
  status: string;
  subscriptionStatus: string;
  nextBillingDate: string;
  trialEnds?: string;
  paymentMethods: BillingPaymentMethod[];
  invoices: BillingInvoice[];
  billingEmail?: string;
  companyName?: string;
  billingAddress?: string;
  stripeConfigured?: boolean;
}

// In-memory backing cache keyed by uid, persisted across Next.js dev bundles via globalThis
declare global {
  // eslint-disable-next-line no-var
  var __pw_user_profile_cache: Map<string, UserProfileData> | undefined;
  // eslint-disable-next-line no-var
  var __pw_user_profile_dirty_uids: Set<string> | undefined;
  // eslint-disable-next-line no-var
  var __pw_user_billing_cache: Map<string, UserBillingData> | undefined;
  // eslint-disable-next-line no-var
  var __pw_user_security_cache: Map<string, Record<string, unknown>> | undefined;
}

const userProfileCache: Map<string, UserProfileData> =
  globalThis.__pw_user_profile_cache ?? (globalThis.__pw_user_profile_cache = new Map<string, UserProfileData>());
const dirtyUserProfileUids: Set<string> =
  globalThis.__pw_user_profile_dirty_uids ?? (globalThis.__pw_user_profile_dirty_uids = new Set<string>());
const userBillingCache: Map<string, UserBillingData> =
  globalThis.__pw_user_billing_cache ?? (globalThis.__pw_user_billing_cache = new Map<string, UserBillingData>());
const userSecurityCache: Map<string, Record<string, unknown>> =
  globalThis.__pw_user_security_cache ?? (globalThis.__pw_user_security_cache = new Map<string, Record<string, unknown>>());

function getInitialProfile(uid: string): UserProfileData {
  return {
    uid,
    displayName: `${PROFILE_PREVIEW.firstName} ${PROFILE_PREVIEW.lastName}`.trim() || 'Alex Morgan',
    email: PROFILE_PREVIEW.email || 'alex@apexcap.internal',
    phone: PROFILE_PREVIEW.phone || '+1 (555) 234-5678',
    avatarUrl: '',
    avatar: '',
    companyName: PROFILE_PREVIEW.organization || 'Apex Capital Partners',
    businessName: PROFILE_PREVIEW.organization || 'Apex Capital Partners',
    headline: 'Austin & National Commercial Syndicator · 12 years active',
    publicBio: 'Focusing on opportunistic value-add acquisitions across high-growth Sunbelt metros. Conservative leverage, active asset management.',
    location: 'Austin, TX',
    websiteUrl: 'https://apexcapitalpartners.internal',
    strategies: ['buy_and_hold', 'multifamily', 'commercial'],
    isVerified: true,
    publicProfile: true,
    twoFaEnabled: PROFILE_PREVIEW.mfaEnabled || false,
    timezone: 'America/Chicago',
    locale: 'en-US',
    role: 'Managing Partner / Operator',
    aumCents: 14500000000, // $145M
    avgRoiPct: 19.2,
    equityMultiple: 1.88,
    dealCount: 8,
    showRoiPublicly: true,
    vendorSkills: [],
  };
}

function getInitialBilling(uid?: string): UserBillingData {
  let plan: string = BILLING_PREVIEW.plan || 'Pro Portfolio';
  let status: string = BILLING_PREVIEW.status || 'Active';
  let email: string = BILLING_PREVIEW.billingEmail || 'alex@apexcap.internal';

  if (uid === 'e2e-test-user-1') {
    plan = 'Individual';
    status = 'active';
    email = 'e2e@paperworking.test';
  } else if (uid === 'dev-user-investor') {
    plan = 'Individual';
    status = 'active';
    email = 'investor@paperworking.test';
  } else if (uid === 'dev-user-admin') {
    plan = 'Team';
    status = 'active';
    email = 'admin@paperworking.test';
  }

  return {
    plan,
    price: plan === 'Individual' ? '$29/mo' : `$${BILLING_PREVIEW.monthlyPrice || 79}/mo`,
    monthlyPrice: plan === 'Individual' ? 29 : (BILLING_PREVIEW.monthlyPrice || 79),
    status,
    subscriptionStatus: status.toLowerCase(),
    nextBillingDate: '2026-10-01T00:00:00.000Z',
    trialEnds: BILLING_PREVIEW.trialEnds || 'Sep 28, 2026',
    billingEmail: email,
    companyName: 'Apex Capital Partners LLC',
    billingAddress: '100 Congress Ave, Suite 2000, Austin, TX 78701',
    paymentMethods: [
      {
        id: 'pm_1',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2028,
        isDefault: true,
      },
    ],
    invoices: [
      {
        id: 'in_101',
        number: 'INV-2026-001',
        date: '2026-08-01T00:00:00.000Z',
        amount: plan === 'Individual' ? '$29.00' : '$79.00',
        status: 'paid',
        pdfUrl: '/api/billing/invoices/in_101/download',
      },
      {
        id: 'in_102',
        number: 'INV-2026-002',
        date: '2026-07-01T00:00:00.000Z',
        amount: plan === 'Individual' ? '$29.00' : '$79.00',
        status: 'paid',
        pdfUrl: '/api/billing/invoices/in_102/download',
      },
      {
        id: 'in_103',
        number: 'INV-2026-003',
        date: '2026-06-01T00:00:00.000Z',
        amount: plan === 'Individual' ? '$29.00' : '$79.00',
        status: 'paid',
        pdfUrl: '/api/billing/invoices/in_103/download',
      },
    ],
  };
}

// Canonical implementation lives in @/lib/firebase/admin (managed-runtime aware).
export { shouldAttemptFirestore };

const PROFILE_DISK_CACHE_PATH = path.join(os.tmpdir(), 'paperworking-user-profiles-cache.json');

function readDiskProfileCache(): Record<string, UserProfileData> {
  if (process.env.NODE_ENV === 'test') return {};
  try {
    if (!fs.existsSync(PROFILE_DISK_CACHE_PATH)) return {};
    const raw = fs.readFileSync(PROFILE_DISK_CACHE_PATH, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, UserProfileData>) : {};
  } catch {
    return {};
  }
}

function writeDiskProfileCache(uid: string, profile: UserProfileData): void {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const existing = readDiskProfileCache();
    existing[uid] = profile;
    fs.writeFileSync(PROFILE_DISK_CACHE_PATH, JSON.stringify(existing, null, 2), 'utf8');
  } catch {
    // Non-fatal in read-only filesystems
  }
}

export const FIRESTORE_READ_TIMEOUT_MS = Number(process.env.FIRESTORE_READ_TIMEOUT_MS ?? 800);
export const FIRESTORE_WRITE_TIMEOUT_MS = Number(process.env.FIRESTORE_WRITE_TIMEOUT_MS ?? 1500);

function withFirestoreTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs: number = FIRESTORE_READ_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Firestore ${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

/**
 * Loads user profile data.
 */
export async function getUserProfile(uid: string): Promise<UserProfileData> {
  const diskProfiles = readDiskProfileCache();
  const diskCached = diskProfiles[uid];

  if (!userProfileCache.has(uid)) {
    const base = getInitialProfile(uid);
    userProfileCache.set(uid, diskCached ? { ...base, ...diskCached, uid } : base);
  } else if (diskCached) {
    const memCached = userProfileCache.get(uid)!;
    const diskTime = typeof diskCached.updatedAt === 'string' ? Date.parse(diskCached.updatedAt) : 0;
    const memTime = typeof memCached.updatedAt === 'string' ? Date.parse(memCached.updatedAt) : 0;
    if (diskTime >= memTime) {
      userProfileCache.set(uid, { ...memCached, ...diskCached, uid });
    }
  }

  // Attempt reading from Firestore if initialized and active
  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const db = getAdminFirestore();
      const doc = await withFirestoreTimeout(
        db.collection('users').doc(uid).get(),
        `read users/${uid}`,
        FIRESTORE_READ_TIMEOUT_MS,
      );
      if (doc.exists) {
        const data = stripUndefinedDeep(doc.data() as Partial<UserProfileData>);
        const cached = userProfileCache.get(uid)!;
        const merged = dirtyUserProfileUids.has(uid)
          ? { ...cached, ...data, ...cached, uid }
          : { ...cached, ...data, uid };
        userProfileCache.set(uid, merged);
        writeDiskProfileCache(uid, merged);
        return merged;
      }
    } catch {
      // Fallback to memory/disk cache
    }
  }

  return userProfileCache.get(uid)!;
}

/**
 * Updates and persists user profile data.
 */
export async function updateUserProfile(
  uid: string,
  patch: Partial<UserProfileData>,
): Promise<UserProfileData> {
  const current = await getUserProfile(uid);
  const sanitizedPatch = stripUndefinedDeep(patch);
  const updatedAtIso = new Date().toISOString();
  const updated: UserProfileData = {
    ...current,
    ...sanitizedPatch,
    uid,
    updatedAt: updatedAtIso,
  };
  userProfileCache.set(uid, updated);
  dirtyUserProfileUids.add(uid);
  writeDiskProfileCache(uid, updated);

  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const { FieldValue } = await import('firebase-admin/firestore');
      const db = getAdminFirestore();
      await withFirestoreTimeout(
        db.collection('users').doc(uid).set(
          {
            ...stripUndefinedDeep(updated),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        `write users/${uid}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
      dirtyUserProfileUids.delete(uid);
    } catch (err: any) {
      console.warn(`[settings-store] Firestore write fallback for user ${uid}: profile saved to memory cache (${err?.message || 'timeout'}).`);
    }
  }

  return updated;
}

/**
 * Loads user billing data.
 */
export async function getUserBilling(uid: string): Promise<UserBillingData> {
  if (!userBillingCache.has(uid)) {
    userBillingCache.set(uid, getInitialBilling(uid));
  }

  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const db = getAdminFirestore();
      const doc = await withFirestoreTimeout(
        db.collection('users').doc(uid).get(),
        `read billing users/${uid}`,
        FIRESTORE_READ_TIMEOUT_MS,
      );
      if (doc.exists) {
        const data = doc.data() as any;
        if (data?.subscriptionPlan || data?.billing) {
          const billingInfo = stripUndefinedDeep(data.billing || {});
          const merged: UserBillingData = {
            ...userBillingCache.get(uid)!,
            plan: data.subscriptionPlan || billingInfo.plan || 'Free',
            status: data.subscriptionStatus || billingInfo.status || 'Active',
            ...billingInfo,
          };
          const email = typeof data.email === 'string' ? data.email : userProfileCache.get(uid)?.email;
          if (isTeamTierOverrideEmail(email)) {
            merged.plan = 'Team';
            merged.status = 'Active';
            merged.subscriptionStatus = 'active';
          }
          userBillingCache.set(uid, merged);
          return merged;
        }
      }
    } catch {
      // Fallback to memory cache
    }
  }

  return userBillingCache.get(uid)!;
}

/**
 * Updates user billing data.
 */
export async function updateUserBilling(
  uid: string,
  patch: Partial<UserBillingData>,
): Promise<UserBillingData> {
  const current = await getUserBilling(uid);
  const sanitizedPatch = stripUndefinedDeep(patch);
  const updated: UserBillingData = {
    ...current,
    ...sanitizedPatch,
  };
  userBillingCache.set(uid, updated);

  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const { FieldValue } = await import('firebase-admin/firestore');
      const db = getAdminFirestore();
      await withFirestoreTimeout(
        db.collection('users').doc(uid).set(
          {
            billing: sanitizedPatch,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        `write billing users/${uid}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[settings-store] Firestore billing fallback for user ${uid}: billing saved to memory cache (${err?.message || 'timeout'}).`);
    }
  }

  return updated;
}

/**
 * Loads user security settings.
 */
export async function getUserSecurity(uid: string): Promise<Record<string, unknown>> {
  if (!userSecurityCache.has(uid)) {
    userSecurityCache.set(uid, {
      twoFaEnabled: false,
      twoFaRequired: false,
      sessions: [
        {
          id: 'sess_1',
          device: 'MacBook Pro · Chrome (Current)',
          ip: '192.168.1.1',
          lastActive: 'Just now',
          current: true,
        },
      ],
    });
  }
  return userSecurityCache.get(uid)!;
}

/**
 * Updates user security settings.
 */
export async function updateUserSecurity(
  uid: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const current = await getUserSecurity(uid);
  const sanitizedPatch = stripUndefinedDeep(patch);
  const updated = { ...current, ...sanitizedPatch };
  userSecurityCache.set(uid, updated);

  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const { FieldValue } = await import('firebase-admin/firestore');
      const db = getAdminFirestore();
      await withFirestoreTimeout(
        db.collection('users').doc(uid).set(
          {
            security: sanitizedPatch,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        `write security users/${uid}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[settings-store] Firestore security fallback for user ${uid}: security settings saved to memory cache (${err?.message || 'timeout'}).`);
    }
  }

  return updated;
}

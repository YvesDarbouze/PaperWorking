/**
 * Server-side settings, profile, and billing persistence store.
 * Manages user profile, billing state, and security settings.
 * Adheres to PaperWorking Firebase conventions (per-user /users/{uid} documents).
 */

import { PROFILE_PREVIEW, BILLING_PREVIEW } from '@/lib/dashboard/shell-seed';

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  businessName?: string;
  companyName?: string;
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
  var __pw_user_billing_cache: Map<string, UserBillingData> | undefined;
  // eslint-disable-next-line no-var
  var __pw_user_security_cache: Map<string, Record<string, unknown>> | undefined;
}

const userProfileCache: Map<string, UserProfileData> =
  globalThis.__pw_user_profile_cache ?? (globalThis.__pw_user_profile_cache = new Map<string, UserProfileData>());
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

export function shouldAttemptFirestore(): boolean {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CLOUD_PROJECT)
  );
}

/**
 * Loads user profile data.
 */
export async function getUserProfile(uid: string): Promise<UserProfileData> {
  if (!userProfileCache.has(uid)) {
    userProfileCache.set(uid, getInitialProfile(uid));
  }

  // Attempt reading from Firestore if initialized and active
  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const db = getAdminFirestore();
      const getPromise = db.collection('users').doc(uid).get();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2000),
      );
      const doc = await Promise.race([getPromise, timeoutPromise]);
      if (doc.exists) {
        const data = doc.data() as Partial<UserProfileData>;
        const merged = { ...userProfileCache.get(uid)!, ...data, uid };
        userProfileCache.set(uid, merged);
        return merged;
      }
    } catch {
      // Local fallback in development
    }
  }

  return userProfileCache.get(uid)!;
}

/**
 * Updates and persists user profile data.
 * When shouldAttemptFirestore() is active, write errors THROW loudly.
 */
export async function updateUserProfile(
  uid: string,
  patch: Partial<UserProfileData>,
): Promise<UserProfileData> {
  const current = await getUserProfile(uid);
  const updated: UserProfileData = {
    ...current,
    ...patch,
    uid,
  };
  userProfileCache.set(uid, updated);

  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const { FieldValue } = await import('firebase-admin/firestore');
      const db = getAdminFirestore();
      const setPromise = db.collection('users').doc(uid).set(
        {
          ...patch,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timed out after 2000ms')), 2000),
      );
      await Promise.race([setPromise, timeoutPromise]);
    } catch (err: any) {
      console.error(`[settings-store] Firestore write failed for user ${uid}:`, err?.message || err);
      throw new Error(`Database persistence failure: unable to write to Firestore (${err?.message || 'timeout'}). Please retry.`);
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
      const getPromise = db.collection('users').doc(uid).get();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2000),
      );
      const doc = await Promise.race([getPromise, timeoutPromise]);
      if (doc.exists) {
        const data = doc.data() as any;
        if (data?.subscriptionPlan || data?.billing) {
          const billingInfo = data.billing || {};
          const merged: UserBillingData = {
            ...userBillingCache.get(uid)!,
            plan: data.subscriptionPlan || billingInfo.plan || 'Free',
            status: data.subscriptionStatus || billingInfo.status || 'Active',
            ...billingInfo,
          };
          userBillingCache.set(uid, merged);
          return merged;
        }
      }
    } catch {
      // Local fallback
    }
  }

  return userBillingCache.get(uid)!;
}

/**
 * Updates user billing data.
 * When shouldAttemptFirestore() is active, write errors THROW loudly.
 */
export async function updateUserBilling(
  uid: string,
  patch: Partial<UserBillingData>,
): Promise<UserBillingData> {
  const current = await getUserBilling(uid);
  const updated: UserBillingData = {
    ...current,
    ...patch,
  };
  userBillingCache.set(uid, updated);

  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const { FieldValue } = await import('firebase-admin/firestore');
      const db = getAdminFirestore();
      const setPromise = db.collection('users').doc(uid).set(
        {
          billing: patch,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timed out after 2000ms')), 2000),
      );
      await Promise.race([setPromise, timeoutPromise]);
    } catch (err: any) {
      console.error(`[settings-store] Firestore billing write failed for user ${uid}:`, err?.message || err);
      throw new Error(`Database persistence failure: unable to write billing records to Firestore (${err?.message || 'timeout'}). Please retry.`);
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
 * When shouldAttemptFirestore() is active, write errors THROW loudly.
 */
export async function updateUserSecurity(
  uid: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const current = await getUserSecurity(uid);
  const updated = { ...current, ...patch };
  userSecurityCache.set(uid, updated);

  if (shouldAttemptFirestore()) {
    try {
      const { getAdminFirestore } = await import('@/lib/firebase/admin');
      const { FieldValue } = await import('firebase-admin/firestore');
      const db = getAdminFirestore();
      const setPromise = db.collection('users').doc(uid).set(
        {
          security: patch,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timed out after 2000ms')), 2000),
      );
      await Promise.race([setPromise, timeoutPromise]);
    } catch (err: any) {
      console.error(`[settings-store] Firestore security write failed for user ${uid}:`, err?.message || err);
      throw new Error(`Database persistence failure: unable to write security settings to Firestore (${err?.message || 'timeout'}). Please retry.`);
    }
  }

  return updated;
}

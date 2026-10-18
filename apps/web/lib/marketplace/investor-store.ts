import { getAdminFirestore, isValidPrivateKey } from '@/lib/firebase/admin';
import {
  SEED_INVESTOR_PROFILES,
  isSeedFollowing,
  listSeedFollowingIds,
  updateSeedFollowState,
} from './seed-data';

declare global {
  // eslint-disable-next-line no-var
  var __pw_dynamic_investor_profiles_cache:
    | Map<string, { uid: string; data: Record<string, unknown> }>
    | undefined;
}

const dynamicInvestorProfilesCache: Map<
  string,
  { uid: string; data: Record<string, unknown> }
> =
  globalThis.__pw_dynamic_investor_profiles_cache ??
  (globalThis.__pw_dynamic_investor_profiles_cache = new Map<
    string,
    { uid: string; data: Record<string, unknown> }
  >());

function shouldAttemptFirestoreSafely(): boolean {
  if (
    process.env.NODE_ENV === 'test' &&
    !process.env.FIRESTORE_EMULATOR_RUNNING &&
    !process.env.FIRESTORE_EMULATOR_HOST
  ) {
    return false;
  }
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_RUNNING === 'true' ||
      isValidPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
}

const INVESTOR_FIRESTORE_TIMEOUT_MS = 3000;

export function upsertInvestorProfileInStore(
  uid: string,
  data: Record<string, unknown>,
): { uid: string; data: Record<string, unknown> } {
  const cleanUid = uid.trim();
  const normalizedData: Record<string, unknown> = {
    ...data,
    uid: cleanUid,
    publicProfile: data.publicProfile ?? true,
  };
  const existingSeed = SEED_INVESTOR_PROFILES.find((p) => p.uid === cleanUid);
  if (existingSeed) {
    existingSeed.data = { ...existingSeed.data, ...normalizedData };
    return existingSeed;
  }
  const existingDynamic = dynamicInvestorProfilesCache.get(cleanUid);
  const merged = {
    uid: cleanUid,
    data: existingDynamic ? { ...existingDynamic.data, ...normalizedData } : normalizedData,
  };
  dynamicInvestorProfilesCache.set(cleanUid, merged);
  return merged;
}

export async function listPublicProfilesFromStore(): Promise<
  Array<{ uid: string; data: Record<string, unknown> }>
> {
  const profileMap = new Map<string, { uid: string; data: Record<string, unknown> }>();

  for (const profile of SEED_INVESTOR_PROFILES) {
    if (profile.data.publicProfile === true) {
      profileMap.set(profile.uid, profile);
    }
  }

  for (const [uid, profile] of dynamicInvestorProfilesCache.entries()) {
    if (profile.data.publicProfile === true) {
      profileMap.set(uid, profile);
    }
  }

  const userProfileCache = globalThis.__pw_user_profile_cache;
  const dirtyUserUids = globalThis.__pw_user_profile_dirty_uids;
  if (userProfileCache) {
    for (const [uid, userProfile] of userProfileCache.entries()) {
      const isExplicitlySaved = dirtyUserUids ? dirtyUserUids.has(uid) : false;
      if (isExplicitlySaved && userProfile.publicProfile === true) {
        const canonicalUid =
          typeof userProfile.uid === 'string' && userProfile.uid.trim()
            ? userProfile.uid.trim()
            : uid;
        const entry = {
          uid: canonicalUid,
          data: { ...(userProfile as Record<string, unknown>), uid: canonicalUid, publicProfile: true },
        };
        dynamicInvestorProfilesCache.set(canonicalUid, entry);
        profileMap.set(canonicalUid, entry);
      }
    }
  }

  if (shouldAttemptFirestoreSafely()) {
    try {
      const db = getAdminFirestore();
      const queryPromise = db
        .collection('users')
        .where('publicProfile', '==', true)
        .limit(100)
        .get();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), INVESTOR_FIRESTORE_TIMEOUT_MS),
      );
      const snap = await Promise.race([queryPromise, timeoutPromise]);
      for (const doc of snap.docs) {
        const docData = doc.data() as Record<string, unknown>;
        const canonicalUid = doc.id;
        const existingSeed = SEED_INVESTOR_PROFILES.find((p) => p.uid === canonicalUid);
        if (existingSeed) {
          existingSeed.data = { ...existingSeed.data, ...docData, uid: canonicalUid };
          profileMap.set(canonicalUid, existingSeed);
        } else {
          const entry = {
            uid: canonicalUid,
            data: { ...docData, uid: canonicalUid, publicProfile: docData.publicProfile ?? true },
          };
          dynamicInvestorProfilesCache.set(canonicalUid, entry);
          profileMap.set(canonicalUid, entry);
        }
      }
    } catch {
      // Fallback to in-memory seed and dynamic profiles
    }
  }

  return [...profileMap.values()];
}

export async function getInvestorProfileFromStore(
  rawInvestorId: string,
): Promise<{ uid: string; data: Record<string, unknown> } | null> {
  let investorId = rawInvestorId.trim();
  try {
    investorId = decodeURIComponent(investorId).trim();
  } catch {
    // Keep trimmed rawInvestorId if malformed URI component
  }
  if (!investorId) return null;

  const investorIdLower = investorId.toLowerCase();

  // 1. Check SEED_INVESTOR_PROFILES by uid, data.uid, or displayName
  const existingSeed =
    SEED_INVESTOR_PROFILES.find(
      (profile) =>
        profile.uid === investorId ||
        String(profile.data.uid ?? '') === investorId ||
        String(profile.data.displayName ?? '').toLowerCase() === investorIdLower,
    ) ?? null;

  // 2. Check dynamicInvestorProfilesCache
  const existingDynamic =
    dynamicInvestorProfilesCache.get(investorId) ??
    [...dynamicInvestorProfilesCache.values()].find(
      (profile) =>
        profile.uid === investorId ||
        String(profile.data.uid ?? '') === investorId ||
        String(profile.data.displayName ?? '').toLowerCase() === investorIdLower,
    ) ??
    null;

  // 3. Check settings-store userProfileCache (globalThis.__pw_user_profile_cache)
  let cachedSettingsProfile: { uid: string; data: Record<string, unknown> } | null = null;
  const userProfileCache = globalThis.__pw_user_profile_cache;
  if (userProfileCache) {
    const direct = userProfileCache.get(investorId);
    if (direct) {
      cachedSettingsProfile = {
        uid: investorId,
        data: {
          ...(direct as Record<string, unknown>),
          uid: investorId,
          publicProfile: direct.publicProfile ?? true,
        },
      };
    } else {
      for (const [uid, profile] of userProfileCache.entries()) {
        if (
          uid === investorId ||
          String(profile.uid ?? '') === investorId ||
          String(profile.displayName ?? '').toLowerCase() === investorIdLower
        ) {
          cachedSettingsProfile = {
            uid,
            data: {
              ...(profile as Record<string, unknown>),
              uid,
              publicProfile: profile.publicProfile ?? true,
            },
          };
          break;
        }
      }
    }
  }

  // 4. Query Firestore users collection (by doc ID, then fallback to uid field or displayName)
  if (shouldAttemptFirestoreSafely()) {
    try {
      const db = getAdminFirestore();
      const lookupFirestore = async (): Promise<{
        uid: string;
        data: Record<string, unknown>;
      } | null> => {
        const directDoc = await db.collection('users').doc(investorId).get();
        if (directDoc.exists) {
          return {
            uid: directDoc.id,
            data: directDoc.data() as Record<string, unknown>,
          };
        }
        const byUidSnap = await db
          .collection('users')
          .where('uid', '==', investorId)
          .limit(1)
          .get();
        if (!byUidSnap.empty) {
          const doc = byUidSnap.docs[0]!;
          return { uid: doc.id, data: doc.data() as Record<string, unknown> };
        }
        const byNameSnap = await db
          .collection('users')
          .where('displayName', '==', investorId)
          .limit(1)
          .get();
        if (!byNameSnap.empty) {
          const doc = byNameSnap.docs[0]!;
          return { uid: doc.id, data: doc.data() as Record<string, unknown> };
        }
        return null;
      };

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), INVESTOR_FIRESTORE_TIMEOUT_MS),
      );
      const found = await Promise.race([lookupFirestore(), timeoutPromise]);
      if (found) {
        const normalizedData: Record<string, unknown> = {
          ...found.data,
          uid: found.uid,
          publicProfile: found.data.publicProfile ?? true,
        };
        if (existingSeed) {
          existingSeed.data = { ...existingSeed.data, ...normalizedData };
          return existingSeed;
        }
        const entry = { uid: found.uid, data: normalizedData };
        dynamicInvestorProfilesCache.set(found.uid, entry);
        return entry;
      }
    } catch {
      // Fallback to in-memory caches
    }
  }

  if (existingSeed) return existingSeed;
  if (existingDynamic) return existingDynamic;
  if (cachedSettingsProfile) {
    dynamicInvestorProfilesCache.set(cachedSettingsProfile.uid, cachedSettingsProfile);
    return cachedSettingsProfile;
  }

  return null;
}

export async function listFollowingIdsFromStore(followerUid: string): Promise<string[]> {
  const ids = new Set<string>(listSeedFollowingIds(followerUid));

  if (shouldAttemptFirestoreSafely()) {
    try {
      const db = getAdminFirestore();
      const queryPromise = db
        .collection('investorFollowers')
        .where('followerUid', '==', followerUid)
        .get();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), INVESTOR_FIRESTORE_TIMEOUT_MS),
      );
      const snap = await Promise.race([queryPromise, timeoutPromise]);
      for (const doc of snap.docs) {
        const targetUid = String(doc.data()?.targetUid ?? '').trim();
        if (targetUid) {
          ids.add(targetUid);
          updateSeedFollowState(followerUid, targetUid, true);
        }
      }
    } catch {
      // Fallback to in-memory following state
    }
  }

  return [...ids];
}

export async function isFollowingInStore(
  followerUid: string,
  targetUid: string,
): Promise<boolean> {
  if (isSeedFollowing(followerUid, targetUid)) return true;

  if (shouldAttemptFirestoreSafely()) {
    try {
      const db = getAdminFirestore();
      const docPromise = db
        .collection('investorFollowers')
        .doc(`${followerUid}_${targetUid}`)
        .get();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), INVESTOR_FIRESTORE_TIMEOUT_MS),
      );
      const doc = await Promise.race([docPromise, timeoutPromise]);
      if (doc.exists) {
        updateSeedFollowState(followerUid, targetUid, true);
        return true;
      }
    } catch {
      // Fallback to in-memory following state
    }
  }

  return isSeedFollowing(followerUid, targetUid);
}

export async function updateFollowStateInStore(
  followerUid: string,
  targetUid: string,
  follow: boolean,
): Promise<{ following: boolean; changed: boolean }> {
  const result = updateSeedFollowState(followerUid, targetUid, follow);

  const dynamicTarget = dynamicInvestorProfilesCache.get(targetUid);
  if (dynamicTarget && result.changed) {
    const currentCount =
      typeof dynamicTarget.data.followerCount === 'number' ? dynamicTarget.data.followerCount : 0;
    dynamicTarget.data.followerCount = follow
      ? currentCount + 1
      : Math.max(0, currentCount - 1);
  }

  if (shouldAttemptFirestoreSafely()) {
    try {
      const { FieldValue } = await import('firebase-admin/firestore');
      const db = getAdminFirestore();
      const followDocRef = db.collection('investorFollowers').doc(`${followerUid}_${targetUid}`);
      const targetUserRef = db.collection('users').doc(targetUid);

      const writeOp = async () => {
        if (follow) {
          await followDocRef.set(
            {
              followerUid,
              targetUid,
              createdAt: FieldValue.serverTimestamp(),
              consent: true,
            },
            { merge: true },
          );
          if (result.changed) {
            await targetUserRef
              .set({ followerCount: FieldValue.increment(1) }, { merge: true })
              .catch(() => undefined);
          }
        } else {
          await followDocRef.delete();
          if (result.changed) {
            await targetUserRef
              .set({ followerCount: FieldValue.increment(-1) }, { merge: true })
              .catch(() => undefined);
          }
        }
      };

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), INVESTOR_FIRESTORE_TIMEOUT_MS),
      );
      await Promise.race([writeOp(), timeoutPromise]);
    } catch {
      // Non-fatal fallback; globalThis in-memory state is already updated
    }
  }

  return result;
}


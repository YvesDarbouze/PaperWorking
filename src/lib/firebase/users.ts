import { db } from './config';
import { 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection
} from 'firebase/firestore';

/* ═══════════════════════════════════════════════════════
   Users Service — Account & Organization Management
   
   Handles onboarding persistence, profile updates, 
   banner dismissal preferences, and organization memberships.
   ════════════════════════════════─────────────────────── */

export const usersService = {
  
  /**
   * Persist onboarding data for a new user.
   * Creates the Organization and updates the User profile.
   */
  async persistOnboarding(userId: string, orgData: { name: string; market: string }) {
    try {
      // 1. Create the Organization
      const orgsRef = collection(db, 'organizations');
      const orgDoc = doc(orgsRef);
      
      await setDoc(orgDoc, {
        id: orgDoc.id,
        name: orgData.name,
        primaryMarket: orgData.market,
        ownerUid: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        plan: 'Standard' // Default plan
      });

      // 2. Update the User profile with the organizationId
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        uid: userId,
        organizationId: orgDoc.id,
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return orgDoc.id;
    } catch (error) {
      console.error('Onboarding Persistence Failure:', error);
      throw error;
    }
  },

  /**
   * Update internal role for a team member
   */
  async updateRole(userId: string, role: string) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      internalRole: role,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * User-scoped phase banner dismissal status (Workspace Plane).
   * Persists to Firestore user document preferences under `dismissedBanners.<phase>`.
   */
  async getPhaseBannerDismissed(userId: string, phase: string): Promise<boolean> {
    if (!userId || userId === 'guest') {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(`pw_banner_dismissed_${phase}_guest`) === 'true';
      }
      return false;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return !!data?.dismissedBanners?.[phase];
      }
    } catch (err) {
      console.warn('Firestore read fallback to localStorage:', err);
    }

    if (typeof window !== 'undefined') {
      return localStorage.getItem(`pw_banner_dismissed_${phase}_${userId}`) === 'true';
    }
    return false;
  },

  /**
   * Set user-scoped phase banner dismissal (Workspace Plane).
   * Writes to Firestore user document and syncs local storage.
   */
  async setPhaseBannerDismissed(userId: string, phase: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pw_banner_dismissed_${phase}_${userId}`, 'true');
    }

    if (!userId || userId === 'guest') return;

    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          dismissedBanners: {
            [phase]: true,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore write fallback:', err);
    }
  },
};

import { db } from './config';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection
} from 'firebase/firestore';

/* ═══════════════════════════════════════════════════════
   Users Service — Account & Organization Management
   
   Handles onboarding persistence, profile updates, 
   and organization memberships for PaperWorking.
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
  }
};

import { adminDb } from '@/lib/firebase/admin';

/**
 * Merges a user's prior history associated with a claimed email address into their verified userId.
 * This includes updating dealInvitations, investor_contacts, followers, commitments, and project equityParties.
 */
export async function mergeIdentityHistory(userId: string, claimEmail: string, userDisplayName?: string): Promise<void> {
  const emailLower = claimEmail.toLowerCase().trim();

  // 1. Update dealInvitations
  const invitesSnap = await adminDb.collection('dealInvitations')
    .where('inviteeEmail', '==', emailLower)
    .get();
  for (const doc of invitesSnap.docs) {
    await doc.ref.update({
      inviteeUid: userId,
      ...(userDisplayName ? { inviteeName: userDisplayName } : {}),
    });
  }

  // 2. Update investor_contacts
  const contactsSnap = await adminDb.collectionGroup('investor_contacts')
    .where('email', '==', emailLower)
    .get();
  for (const doc of contactsSnap.docs) {
    await doc.ref.update({ uid: userId });
  }

  // 3. Update followers (key doc by userId and delete old non-userId doc)
  const followersSnap = await adminDb.collectionGroup('followers')
    .where('email', '==', emailLower)
    .get();
  for (const doc of followersSnap.docs) {
    const data = doc.data();
    const newRef = doc.ref.parent.doc(userId);
    await newRef.set({
      ...data,
      id: userId,
    });
    if (doc.id !== userId) {
      await doc.ref.delete();
    }
  }

  // 4. Update commitments
  const commitmentsSnap = await adminDb.collectionGroup('commitments')
    .where('email', '==', emailLower)
    .get();
  for (const doc of commitmentsSnap.docs) {
    await doc.ref.update({ uid: userId });
  }

  // 5. Update project equityParties
  const projectsSnap = await adminDb.collection('projects').get();
  for (const doc of projectsSnap.docs) {
    const data = doc.data();
    if (data.equityParties && Array.isArray(data.equityParties)) {
      let updated = false;
      const newParties = data.equityParties.map((p: any) => {
        if (p.email && p.email.toLowerCase() === emailLower) {
          updated = true;
          return { ...p, memberId: userId };
        }
        return p;
      });
      if (updated) {
        await doc.ref.update({ equityParties: newParties });
      }
    }
  }
}

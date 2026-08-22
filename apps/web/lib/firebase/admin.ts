import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK for Next.js API routes (session cookie exchange).
 * Credential resolution mirrors PaperWorking v0 admin.ts.
 */
function ensureInitialized(): void {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.trim()
    .replace(/^['"]/, '')
    .replace(/['"],?\s*$/, '')
    .replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId!,
        clientEmail,
        privateKey,
      }),
    });
    return;
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

function getAuth(): admin.auth.Auth {
  ensureInitialized();
  return admin.auth();
}

function getFirestore(): admin.firestore.Firestore {
  ensureInitialized();
  return admin.firestore();
}

export const adminAuth: {
  verifyIdToken: (idToken: string) => Promise<admin.auth.DecodedIdToken>;
  createSessionCookie: (idToken: string, expiresInMs: number) => Promise<string>;
  verifySessionCookie: (sessionCookie: string) => Promise<admin.auth.DecodedIdToken>;
} = {
  verifyIdToken: (idToken: string) => getAuth().verifyIdToken(idToken),
  createSessionCookie: (idToken: string, expiresInMs: number) =>
    getAuth().createSessionCookie(idToken, { expiresIn: expiresInMs }),
  verifySessionCookie: (sessionCookie: string) =>
    getAuth().verifySessionCookie(sessionCookie, true),
};

export async function loadSessionProfile(uid: string): Promise<{
  subscriptionPlan: string;
  subscriptionStatus: string;
  accountType: string;
}> {
  try {
    const snap = await getFirestore().collection('users').doc(uid).get();
    if (!snap.exists) {
      return {
        subscriptionPlan: 'Individual',
        subscriptionStatus: 'active',
        accountType: 'investor',
      };
    }
    const data = snap.data() as {
      subscriptionPlan?: string;
      subscriptionStatus?: string;
      accountType?: string;
    };
    return {
      subscriptionPlan: data.subscriptionPlan ?? 'Individual',
      subscriptionStatus: data.subscriptionStatus ?? 'active',
      accountType: data.accountType ?? 'investor',
    };
  } catch {
    return {
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
      accountType: 'investor',
    };
  }
}

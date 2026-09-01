function readAuthFlag(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

/** V0 parity: Firebase when configured unless explicitly disabled. */
export function isFirebaseAuthEnabled(): boolean {
  const explicit = readAuthFlag(process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH);
  if (explicit !== undefined) return explicit;
  return isFirebaseConfigured();
}

export function isFirebaseConfigured(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return Boolean(
    apiKey &&
      authDomain &&
      projectId &&
      !apiKey.includes('placeholder') &&
      !authDomain.includes('placeholder'),
  );
}

export function firebasePublicConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

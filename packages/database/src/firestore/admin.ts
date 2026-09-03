import type { Firestore } from 'firebase-admin/firestore';

let firestoreInstance: Firestore | null = null;

export type FirestoreAdminConfig = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

function resolveAdminConfig(): FirestoreAdminConfig {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

function isEmulatorMode(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

/**
 * Lazy Firebase Admin Firestore client.
 * Returns null when credentials are not configured (local dev without Firebase).
 * When FIRESTORE_EMULATOR_HOST is set, initializes against the emulator without credentials.
 */
export async function getFirestoreAdmin(): Promise<Firestore | null> {
  if (firestoreInstance) return firestoreInstance;

  const config = resolveAdminConfig();
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (isEmulatorMode()) {
    const projectId = config.projectId || 'demo-paperworking';
    const app = getApps()[0] ?? initializeApp({ projectId });
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  }

  if (!config.projectId || !config.clientEmail || !config.privateKey) {
    return null;
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
      projectId: config.projectId,
    });

  firestoreInstance = getFirestore(app);
  return firestoreInstance;
}

export function resetFirestoreAdminForTests(): void {
  firestoreInstance = null;
}

export const FIRESTORE_COLLECTIONS = {
  users: 'users',
  organizations: 'organizations',
  organizationMembers: 'organizationMembers',
  projects: 'projects',
  projectMembers: 'projectMembers',
  projectFolders: 'projectFolders',
  projectFiles: 'projectFiles',
  dealListings: 'dealListings',
  dealInvitations: 'dealInvitations',
  organizationInvites: 'organizationInvites',
  inboxItems: 'inboxItems',
  investorFollowers: 'investorFollowers',
  vendors: 'vendors',
  vendorRequests: 'vendorRequests',
  notifications: 'notifications',
  messageThreads: 'messageThreads',
  messages: 'messages',
  taskAssignments: 'taskAssignments',
  vendorServices: 'vendorServices',
  subscriptions: 'subscriptions',
  stripeEvents: 'stripe_events',
  auditLogs: 'auditLogs',
  systemConfig: 'systemConfig',
} as const;

import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface ProbeExecutionResult {
  success: boolean;
  probeId: string;
  roundtripMs: number;
  verifiedSteps: {
    write: boolean;
    read: boolean;
    delete: boolean;
    cleanedUp: boolean;
  };
  timestamp: string;
  message: string;
}

export async function executeProbe(injectedDb?: any): Promise<ProbeExecutionResult> {
  const startTime = Date.now();
  const probeId = `probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const db = injectedDb || getAdminFirestore();
  const docRef = db.collection('_dev_probes').doc(probeId);

  // 1. Write probe document
  await docRef.set({
    probeId,
    createdAt: FieldValue.serverTimestamp(),
    testMessage: 'Proof-of-life emulator roundtrip verification',
    clientEnvironment: 'node-nextjs-api',
  });

  // 2. Read back document
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new Error(`Probe document ${probeId} was not found after write.`);
  }

  const data = typeof snapshot.data === 'function' ? snapshot.data() : snapshot.data;
  if (data?.probeId !== probeId) {
    throw new Error(`Probe document ${probeId} data mismatch.`);
  }

  // 3. Delete probe document
  await docRef.delete();

  // 4. Verify deletion
  const postDeleteSnap = await docRef.get();
  const isCleanedUp = !postDeleteSnap.exists;

  const roundtripMs = Date.now() - startTime;

  return {
    success: true,
    probeId,
    roundtripMs,
    verifiedSteps: {
      write: true,
      read: true,
      delete: true,
      cleanedUp: isCleanedUp,
    },
    timestamp: new Date().toISOString(),
    message: 'Client → API → Admin SDK → Firestore emulator roundtrip succeeded.',
  };
}

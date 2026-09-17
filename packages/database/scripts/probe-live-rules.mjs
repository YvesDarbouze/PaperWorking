import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, getDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, connectStorageEmulator } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';

export async function runLiveRulesProbes(config) {
  const projectId =
    config?.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    'demo-paperworking';

  const appConfig = {
    apiKey: config?.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyFakeKeyForRulesProbeTesting123456',
    projectId,
    storageBucket: config?.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  };

  const appName = `probe-runner-${Date.now()}`;
  const app = initializeApp(appConfig, appName);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const auth = getAuth(app);

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const [fHost, fPort] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    connectFirestoreEmulator(db, fHost, Number(fPort || 8080));
  }

  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    const [sHost, sPort] = process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':');
    connectStorageEmulator(storage, sHost, Number(sPort || 9199));
  }

  const results = [];

  // Probe 1: Unauthenticated Firestore read of /feedback/{id}
  const feedbackDocId = `probe-throwaway-${Date.now()}`;
  const feedbackRef = doc(db, 'feedback', feedbackDocId);
  try {
    await getDoc(feedbackRef);
    results.push({
      probeName: 'Probe 1: Unauthenticated Read of /feedback/{id}',
      targetPath: `/feedback/${feedbackDocId}`,
      expectedStatus: 'DENIED',
      actualCode: 'ALLOWED',
      passed: false,
      message: 'CRITICAL SECURITY FAILURE: Unauthenticated read was permitted on confidential /feedback path!',
    });
  } catch (err) {
    const code = err?.code || 'unknown_error';
    const isDenied = code.includes('permission-denied') || code.includes('PERMISSION_DENIED');
    results.push({
      probeName: 'Probe 1: Unauthenticated Read of /feedback/{id}',
      targetPath: `/feedback/${feedbackDocId}`,
      expectedStatus: 'DENIED',
      actualCode: code,
      passed: isDenied,
      message: isDenied
        ? 'PASSED: Unauthenticated client read was rejected with permission-denied.'
        : `WARNING: Unexpected error code received: ${code}`,
    });
  }

  // Probe 2: Authenticated client Storage GET of Contract Vault PSA path
  const psaDocPath = `deals/probe-throwaway-deal-${Date.now()}/documents/throwaway-psa.pdf`;
  const psaStorageRef = ref(storage, psaDocPath);

  try {
    // Attempt anonymous authentication or test client session
    try {
      await signInAnonymously(auth);
    } catch {
      // If anonymous auth is disabled on project, request proceeds unauthenticated
    }

    await getDownloadURL(psaStorageRef);
    results.push({
      probeName: 'Probe 2: Authenticated Client Storage GET of Contract Vault PSA',
      targetPath: psaDocPath,
      expectedStatus: 'DENIED',
      actualCode: 'ALLOWED',
      passed: false,
      message: 'CRITICAL SECURITY FAILURE: Client was able to obtain download URL for Contract Vault document!',
    });
  } catch (err) {
    const code = err?.code || 'unknown_error';
    const isDenied =
      code.includes('storage/unauthorized') ||
      code.includes('permission-denied') ||
      code.includes('PERMISSION_DENIED');
    results.push({
      probeName: 'Probe 2: Authenticated Client Storage GET of Contract Vault PSA',
      targetPath: psaDocPath,
      expectedStatus: 'DENIED',
      actualCode: code,
      passed: isDenied,
      message: isDenied
        ? 'PASSED: Client read on Contract Vault path was rejected with storage/unauthorized.'
        : `WARNING: Unexpected error code received: ${code}`,
    });
  }

  try {
    await deleteApp(app);
  } catch {
    // Teardown
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}

export function formatProbeReport(report) {
  const lines = [];
  lines.push('================================================================================');
  lines.push('       FIREBASE LIVE SECURITY RULES DEPLOYMENT VERIFICATION PROBE REPORT       ');
  lines.push('================================================================================');
  lines.push(`Overall Status: ${report.passed ? 'ALL PROBES PASSED (RULES ACTIVE & ENFORCING)' : 'PROBES FAILED'}`);
  lines.push('');

  for (const r of report.results) {
    lines.push(`[${r.probeName}]`);
    lines.push(`  Target Path:     ${r.targetPath}`);
    lines.push(`  Expected Status: ${r.expectedStatus}`);
    lines.push(`  Actual Code:     ${r.actualCode}`);
    lines.push(`  Result:          ${r.passed ? 'PASSED' : 'FAILED'}`);
    lines.push(`  Detail:          ${r.message}`);
    lines.push('');
  }

  lines.push('================================================================================');
  return lines.join('\n');
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running Firebase live rules verification probes...');
  runLiveRulesProbes()
    .then((report) => {
      console.log(formatProbeReport(report));
      if (!report.passed) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Fatal probe execution error:', err);
      process.exit(1);
    });
}

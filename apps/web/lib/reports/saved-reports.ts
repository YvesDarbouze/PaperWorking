/**
 * Saved Reports Persistence Module (@/lib/reports/saved-reports.ts)
 *
 * Persists user report preferences (last selected report, scope, granularity, fiscal year)
 * to Firestore under `/users/{uid}/saved_reports/{reportId}` per Pattern A in firestore.rules.
 * Falls back safely to localStorage if Firestore is unavailable or client is offline.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase/client';

export interface SavedReportConfig {
  reportId: string;
  scope: string; // project ID or '__all__'
  granularity: 'monthly' | 'quarterly' | 'annual';
  fiscalYear: number;
  updatedAt: string;
}

const LOCAL_STORAGE_PREFIX = 'pw_saved_report_';

/**
 * Saves a user's report configuration to Firestore (`/users/{uid}/saved_reports/{reportId}`).
 */
export async function saveUserReportConfig(
  uid: string,
  config: SavedReportConfig,
): Promise<boolean> {
  if (!uid) return false;

  // Local storage cache write
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${uid}_${config.reportId}`, JSON.stringify(config));
    } catch {
      // Quota or SSR safe
    }
  }

  const db = getFirestoreDb();
  if (!db) return true; // Local cache succeeded

  try {
    const docRef = doc(db, 'users', uid, 'saved_reports', config.reportId);
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch {
    // Soft-fail: local storage holds state
    return false;
  }
}

/**
 * Loads a user's saved report configuration from Firestore or local cache.
 */
export async function loadUserReportConfig(
  uid: string,
  reportId: string,
): Promise<SavedReportConfig | null> {
  if (!uid) return null;

  const db = getFirestoreDb();
  if (db) {
    try {
      const docRef = doc(db, 'users', uid, 'saved_reports', reportId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as SavedReportConfig;
      }
    } catch {
      // Fall through to localStorage
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${uid}_${reportId}`);
      if (cached) {
        return JSON.parse(cached) as SavedReportConfig;
      }
    } catch {
      // Corrupt JSON or storage issue
    }
  }

  return null;
}

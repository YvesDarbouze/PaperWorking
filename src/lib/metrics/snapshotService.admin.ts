import { adminDb } from '../firebase/admin';
import { Project } from '@/types/schema';
import { computeProjectSnapshotData } from './snapshotService';

/**
 * Saves active monthly, quarterly, and annual snapshots for a project
 * using the Firebase Admin SDK. Suitable for server-side environments
 * (e.g., API routes, cron jobs) where the admin SDK is required.
 */
export async function saveActiveSnapshotsForProjectAdmin(project: Project): Promise<void> {
  const today = new Date();
  
  // Monthly period: YYYY-MM
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const monthlyPeriod = `${year}-${month}`;
  const monthlyDate = new Date(year, today.getMonth(), 1);
  
  // Quarterly period: YYYY-QX
  const quarter = Math.floor(today.getMonth() / 3) + 1;
  const quarterlyPeriod = `${year}-Q${quarter}`;
  const quarterlyDate = new Date(year, Math.floor(today.getMonth() / 3) * 3, 1);
  
  // Annual period: YYYY
  const annualPeriod = `${year}`;
  const annualDate = new Date(year, 0, 1);
  
  const periods = [
    { period: monthlyPeriod, type: 'monthly' as const, date: monthlyDate },
    { period: quarterlyPeriod, type: 'quarterly' as const, date: quarterlyDate },
    { period: annualPeriod, type: 'annual' as const, date: annualDate },
  ];
  
  const batch = adminDb.batch();
  
  for (const item of periods) {
    const snapshotData = computeProjectSnapshotData(project, item.period, item.type, item.date);
    const docRef = adminDb.collection('propertyMetricSnapshots').doc(snapshotData.id);
    
    batch.set(docRef, {
      ...snapshotData,
      createdAt: new Date(),
    }, { merge: true });
  }
  
  await batch.commit();
}

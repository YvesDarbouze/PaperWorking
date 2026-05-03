import { Permit } from '@/types/schema';

// Mock function representing querying a municipal database for permit statuses
export async function syncPermitsFromMunicipality(permits: Permit[]): Promise<Permit[]> {
  return permits.map(permit => {
    // 60% chance a pending permit gets approved when synced
    if (permit.status === 'Pending' && Math.random() > 0.4) {
      return {
        ...permit,
        status: 'Approved',
        lastCheckedAt: new Date()
      };
    }
    return {
      ...permit,
      lastCheckedAt: new Date()
    };
  });
}

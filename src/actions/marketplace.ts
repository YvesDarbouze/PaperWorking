'use server';

import { cookies } from 'next/headers';

/* ═══════════════════════════════════════════════════════
   Marketplace Server Actions — Admin Marketplace Analytics

   Queries Firestore for real vendor/professional counts
   and vendor request pipeline data. Returns serializable
   results with graceful degradation to zero.
   ═══════════════════════════════════════════════════════ */

// ── Types ────────────────────────────────────────────

export interface MarketplaceStats {
  /** Active vendor/professional accounts (accountType === 'vendor', subscriptionStatus === 'active') */
  activeProfessionals: number;
  /** Total vendor accounts regardless of status */
  totalVendors: number;
  /** Gross procured volume — sum of purchasePrice across all projects */
  grossProcuredVolume: number;
  /** Vendor request pipeline counts */
  pipeline: {
    requested: number;
    feesLogged: number;
    approved: number;
    finalized: number;
  };
}

// ── Constants ────────────────────────────────────────

const ADMIN_ROLES = ['Platform Admin', 'Admin', 'Lead Investor'];

// ── Helpers ──────────────────────────────────────────

async function verifyAdmin(): Promise<{ uid: string } | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('__session');
    if (!session?.value) return null;

    const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
    const decoded = await adminAuth.verifyIdToken(session.value);
    if (!decoded.uid) return null;

    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userSnap.data();
    const role = userData?.role || '';

    if (!ADMIN_ROLES.includes(role)) return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

// ── getMarketplaceStats ──────────────────────────────

const EMPTY_STATS: MarketplaceStats = {
  activeProfessionals: 0,
  totalVendors: 0,
  grossProcuredVolume: 0,
  pipeline: { requested: 0, feesLogged: 0, approved: 0, finalized: 0 },
};

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const admin = await verifyAdmin();
  if (!admin) return EMPTY_STATS;

  try {
    const { adminDb } = await import('@/lib/firebase/admin');

    // 1. Count vendor professionals from the users collection
    const vendorsSnap = await adminDb
      .collection('users')
      .where('accountType', '==', 'vendor')
      .get();

    const totalVendors = vendorsSnap.size;
    let activeProfessionals = 0;

    vendorsSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.subscriptionStatus === 'active' || d.subscriptionStatus === 'trialing') {
        activeProfessionals++;
      }
    });

    // 2. Calculate gross procured volume from projects
    const projectsSnap = await adminDb.collection('projects').get();
    let grossProcuredVolume = 0;

    projectsSnap.docs.forEach((doc) => {
      const d = doc.data();
      const purchasePrice = d.purchasePrice || d.acquisitionPrice || 0;
      grossProcuredVolume += purchasePrice;
    });

    // 3. Aggregate vendor request pipeline across all projects
    //    vendorRequests are stored as subcollections under projects.
    //    We scan projects that have vendorRequests to build funnel counts.
    let requested = 0;
    let feesLogged = 0;
    let approved = 0;
    let finalized = 0;

    // Only scan projects that actually exist (already fetched above)
    const projectIds = projectsSnap.docs.map((doc) => doc.id);

    // Process in batches to avoid overwhelming Firestore
    const BATCH = 20;
    for (let i = 0; i < projectIds.length; i += BATCH) {
      const batch = projectIds.slice(i, i + BATCH);
      const promises = batch.map(async (pid) => {
        try {
          const reqSnap = await adminDb
            .collection('projects')
            .doc(pid)
            .collection('vendorRequests')
            .get();
          reqSnap.docs.forEach((rdoc) => {
            const status = (rdoc.data().status || '').toUpperCase();
            requested++;
            if (status !== 'PENDING') feesLogged++;
            if (status === 'APPROVED' || status === 'ACCEPTED' || status === 'COMPLETED' || status === 'FINALIZED') {
              approved++;
            }
            if (status === 'COMPLETED' || status === 'FINALIZED') {
              finalized++;
            }
          });
        } catch {
          // subcollection may not exist — fine
        }
      });
      await Promise.all(promises);
    }

    return {
      activeProfessionals,
      totalVendors,
      grossProcuredVolume,
      pipeline: { requested, feesLogged, approved, finalized },
    };
  } catch (error) {
    console.error('[getMarketplaceStats] Failed:', error);
    return EMPTY_STATS;
  }
}

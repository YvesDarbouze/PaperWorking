'use server';

import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

/* ═══════════════════════════════════════════════════════
   Marketplace Server Actions — Admin Marketplace Analytics

   All queries run server-side with the Admin SDK.
   Every export verifies the caller is an admin before
   touching Firestore.
   ═══════════════════════════════════════════════════════ */

// ── Types ────────────────────────────────────────────

export interface JurisdictionStat {
  state: string;       // 2-letter state code or 'Other'
  count: number;       // number of quoted requests in this jurisdiction
  avgFee: number;      // average quotedFee in USD
  deviation: number;   // % deviation from global mean (positive = above average)
  trend: 'up' | 'down' | 'flat';
}

export interface VendorCsvRow {
  requestId: string;
  projectId: string;
  vendorUid: string;
  vendorName: string;
  vendorType: string;
  status: string;
  quotedFee: number | null;
  requestedAt: string;    // ISO string
  completedAt: string;    // ISO string or ''
  primaryState: string;
}

export interface FullMarketplaceData {
  activeProfessionals: number;
  totalVendors: number;
  grossProcuredVolume: number;
  matchRatePct: number;     // feesLogged/requested * 100, or 0 if no requests
  avgResponseHours: number; // avg hours from requestedAt → completedAt for COMPLETED, or 0
  pipeline: {
    requested: number;
    feesLogged: number;
    approved: number;
    finalized: number;
  };
  jurisdictions: JurisdictionStat[];
  csvRows: VendorCsvRow[];
}

export interface AuditResult {
  runId: string;
  flaggedCount: number;
  stalePendingCount: number;
}

// ── Constants ────────────────────────────────────────

const ADMIN_ROLES = ['Platform Admin', 'Admin', 'Lead Investor'];
const STALE_PENDING_HOURS = 48;

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

function toMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof (ts as any).toMillis === 'function') return (ts as any).toMillis();
  if (typeof (ts as any).seconds === 'number') return (ts as any).seconds * 1000;
  return 0;
}

function toIso(ts: unknown): string {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toISOString() : '';
}

// ── getFullMarketplaceData ────────────────────────────

const EMPTY: FullMarketplaceData = {
  activeProfessionals: 0,
  totalVendors: 0,
  grossProcuredVolume: 0,
  matchRatePct: 0,
  avgResponseHours: 0,
  pipeline: { requested: 0, feesLogged: 0, approved: 0, finalized: 0 },
  jurisdictions: [],
  csvRows: [],
};

export async function getFullMarketplaceData(): Promise<FullMarketplaceData> {
  const admin = await verifyAdmin();
  if (!admin) return EMPTY;

  try {
    const { adminDb } = await import('@/lib/firebase/admin');

    // ── 1. Vendor professionals ──────────────────────
    const vendorsSnap = await adminDb
      .collection('users')
      .where('accountType', '==', 'vendor')
      .get();

    const totalVendors = vendorsSnap.size;
    let activeProfessionals = 0;

    // Build uid → vendor profile map for join
    const vendorMap = new Map<string, { name: string; type: string; states: string[] }>();
    vendorsSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.subscriptionStatus === 'active' || d.subscriptionStatus === 'trialing') {
        activeProfessionals++;
      }
      vendorMap.set(doc.id, {
        name: d.companyName || d.displayName || 'Unknown Vendor',
        type: d.type || d.serviceType || d.vendorType || 'Unknown',
        states: Array.isArray(d.licensingStates) ? d.licensingStates : [],
      });
    });

    // ── 2. Gross procured volume from projects ───────
    const projectsSnap = await adminDb.collection('projects').get();
    let grossProcuredVolume = 0;
    const projectIds: string[] = [];

    projectsSnap.docs.forEach((doc) => {
      const d = doc.data();
      // financials.purchasePrice is the canonical field; fall back to root-level aliases
      const price = d.financials?.purchasePrice || d.purchasePrice || d.acquisitionPrice || 0;
      grossProcuredVolume += Number(price);
      projectIds.push(doc.id);
    });

    // ── 3. Vendor request pipeline ───────────────────
    let requested = 0;
    let feesLogged = 0;
    let approved = 0;
    let finalized = 0;
    let totalResponseMs = 0;
    let completedWithTiming = 0;

    const csvRows: VendorCsvRow[] = [];

    // Aggregate per-state fee data for jurisdiction variance
    const stateFees = new Map<string, number[]>();

    const BATCH = 20;
    for (let i = 0; i < projectIds.length; i += BATCH) {
      const batch = projectIds.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (pid) => {
          try {
            const reqSnap = await adminDb
              .collection('projects')
              .doc(pid)
              .collection('vendorRequests')
              .get();

            reqSnap.docs.forEach((rdoc) => {
              const r = rdoc.data();
              const status = (r.status || '').toUpperCase();
              const quotedFee: number | null = typeof r.quotedFee === 'number' ? r.quotedFee : null;
              const requestedAt = toMillis(r.requestedAt);
              const completedAt = toMillis(r.completedAt);

              requested++;

              if (status !== 'PENDING' && quotedFee !== null) feesLogged++;
              if (['APPROVED', 'ACCEPTED', 'COMPLETED', 'FINALIZED'].includes(status)) approved++;
              if (['COMPLETED', 'FINALIZED'].includes(status)) {
                finalized++;
                // Track response latency only when we have both timestamps
                if (requestedAt && completedAt && completedAt > requestedAt) {
                  totalResponseMs += completedAt - requestedAt;
                  completedWithTiming++;
                }
              }

              // Jurisdiction: use vendor's primary licensing state
              const vendor = vendorMap.get(r.vendorUid);
              const primaryState = vendor?.states[0] || 'Other';

              if (quotedFee !== null && quotedFee > 0) {
                const arr = stateFees.get(primaryState) || [];
                arr.push(quotedFee);
                stateFees.set(primaryState, arr);
              }

              csvRows.push({
                requestId: rdoc.id,
                projectId: pid,
                vendorUid: r.vendorUid || '',
                vendorName: vendor?.name || r.vendorUid || '',
                vendorType: vendor?.type || '',
                status: r.status || '',
                quotedFee,
                requestedAt: toIso(r.requestedAt),
                completedAt: toIso(r.completedAt),
                primaryState,
              });
            });
          } catch {
            // subcollection may not exist — fine
          }
        }),
      );
    }

    // ── 4. Derived stats ──────────────────────────────
    const matchRatePct = requested > 0 ? Math.round((feesLogged / requested) * 1000) / 10 : 0;
    const avgResponseHours = completedWithTiming > 0
      ? Math.round((totalResponseMs / completedWithTiming / 3_600_000) * 10) / 10
      : 0;

    // ── 5. Jurisdiction variance ──────────────────────
    // Compute global mean across all quoted fees
    const allFees = Array.from(stateFees.values()).flat();
    const globalMean = allFees.length > 0 ? allFees.reduce((a, b) => a + b, 0) / allFees.length : 0;

    const jurisdictions: JurisdictionStat[] = Array.from(stateFees.entries())
      .map(([state, fees]) => {
        const avg = fees.reduce((a, b) => a + b, 0) / fees.length;
        const deviation = globalMean > 0
          ? Math.round(((avg - globalMean) / globalMean) * 1000) / 10
          : 0;
        return {
          state,
          count: fees.length,
          avgFee: Math.round(avg),
          deviation: Math.abs(deviation),
          trend: deviation > 0 ? 'up' : deviation < 0 ? 'down' : 'flat',
        } satisfies JurisdictionStat;
      })
      .sort((a, b) => b.count - a.count)  // most-active jurisdictions first
      .slice(0, 8);                         // cap at 8 rows for readability

    return {
      activeProfessionals,
      totalVendors,
      grossProcuredVolume,
      matchRatePct,
      avgResponseHours,
      pipeline: { requested, feesLogged, approved, finalized },
      jurisdictions,
      csvRows,
    };
  } catch (error) {
    console.error('[getFullMarketplaceData] Failed:', error);
    return EMPTY;
  }
}

// ── initiateMarketplaceAudit ──────────────────────────

export async function initiateMarketplaceAudit(): Promise<AuditResult | null> {
  const admin = await verifyAdmin();
  if (!admin) return null;

  try {
    const { adminDb } = await import('@/lib/firebase/admin');

    const nowMs = Date.now();
    const staleThresholdMs = STALE_PENDING_HOURS * 3_600_000;

    // Scan all projects for PENDING requests older than 48h
    const projectsSnap = await adminDb.collection('projects').get();
    const flagged: Array<{ projectId: string; requestId: string; hoursStale: number; vendorUid: string }> = [];

    await Promise.all(
      projectsSnap.docs.map(async (pdoc) => {
        try {
          const reqSnap = await adminDb
            .collection('projects')
            .doc(pdoc.id)
            .collection('vendorRequests')
            .where('status', '==', 'PENDING')
            .get();

          reqSnap.docs.forEach((rdoc) => {
            const r = rdoc.data();
            const requestedMs = toMillis(r.requestedAt);
            if (requestedMs && nowMs - requestedMs > staleThresholdMs) {
              const hoursStale = Math.round((nowMs - requestedMs) / 3_600_000);
              flagged.push({
                projectId: pdoc.id,
                requestId: rdoc.id,
                hoursStale,
                vendorUid: r.vendorUid || '',
              });
            }
          });
        } catch {
          // subcollection may not exist
        }
      }),
    );

    // Write audit run document
    const runRef = adminDb.collection('vendorAuditRuns').doc();
    await runRef.set({
      runAt: FieldValue.serverTimestamp(),
      triggeredBy: admin.uid,
      stalePendingThresholdHours: STALE_PENDING_HOURS,
      flaggedCount: flagged.length,
      flagged,
      status: 'complete',
    });

    return {
      runId: runRef.id,
      flaggedCount: flagged.length,
      stalePendingCount: flagged.length,
    };
  } catch (error) {
    console.error('[initiateMarketplaceAudit] Failed:', error);
    return null;
  }
}

import { db } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  where,
  getDocs,
  onSnapshot,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { Project, LedgerItem, PhaseSnapshotKey, PhaseSnapshotMap, Phase1Snapshot, Phase2Snapshot, Phase3Snapshot } from '@/types/schema';
import { financialsSyncService } from '../services/financialsSyncService';
import { computeAutopsyMetrics } from '../math/calculatorUtils';

/* ═══════════════════════════════════════════════════════
   Deals Service — High-Performance Firestore mutations
   
   Includes optimistic-safe writes and sub-collection 
   management for PaperWorking Dashboard.
   ═══════════════════════════════════════════════════════ */

export const projectsService = {
  
  /**
   * Create a new deal for an organization
   */
  async createDeal(dealData: Partial<Project>, organizationId: string) {
    try {
      const projectsRef = collection(db, 'projects');
      const newDoc = doc(projectsRef);
      
      const deal: Project = {
        ...dealData as any,
        id: newDoc.id,
        organizationId,
        // ── Schema Defaults (enforced server-side) ──
        // Phase must be 1 (Find & Fund) for every new project
        phaseStatus: 'Phase 1: Find & Fund',
        // Status must be 'Active' for every new project
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerUid: dealData.ownerUid || '',
        // CRITICAL BUG FIX: Initialize members map so creator has access via firestore.rules
        members: {
          [dealData.ownerUid || '']: {
            role: 'Lead Investor',
            addedAt: new Date(),
          }
        }
      };

      await setDoc(newDoc, {
        ...deal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // SYNC: Trigger Postgres replication for the new deal
      // We don't await to keep the UI response immediate
      financialsSyncService.syncProjectFinancials(deal);

      return newDoc.id;
    } catch (error) {
      console.error('Critical Failure: Could not record deal in Firestore.', error);
      throw error;
    }
  },

  /**
   * Update deal meta-data (status, address, etc)
   */
  async updateDeal(projectId: string, updates: Partial<Project>) {
    try {
      const dealRef = doc(db, 'projects', projectId);

      // ── Automation Hook: Phase Progression ──
      if (updates.financials?.offerStatus === 'Accepted') {
        updates.phaseStatus = 'Phase 2: Acquisition';
      }

      await updateDoc(dealRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // SYNC: Fetch full deal and update Postgres
      this.getDeal(projectId).then(fullDeal => {
        if (fullDeal) financialsSyncService.syncProjectFinancials(fullDeal);
      });
    } catch (error) {
       console.error(`Status Shift Error: Failed to synchronize update for deal ${projectId}`, error);
       throw error;
    }
  },

  /**
   * Add a line item to the ledgerItems sub-collection
   */
  async addLedgerItem(projectId: string, organizationId: string, item: Partial<LedgerItem>) {
    try {
      const ledgerRef = collection(db, 'projects', projectId, 'ledgerItems');
      const docData = {
        ...item,
        projectId,
        organizationId,
        createdAt: serverTimestamp(),
        status: item.status || 'Pending',
      };
      
      const docRef = await addDoc(ledgerRef, docData);

      // SYNC: Trigger batch sync for the deal's ledger
      this.getLedgerItems(projectId).then(items => {
        financialsSyncService.syncLedgerItems(projectId, organizationId, items);
      });

      return docRef.id;
    } catch (error) {
       console.error(`Ledger Integrity Breach: Failed to record item for deal ${projectId}`, error);
       throw error;
    }
  },

  /**
   * Update or Approve/Reject a ledger item
   */
  async updateLedgerItem(projectId: string, itemId: string, updates: Partial<LedgerItem>) {
    try {
      const itemRef = doc(db, 'projects', projectId, 'ledgerItems', itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // SYNC: Recalculate and sync the entire ledger to ensure SQL consistency
      const snapshot = await getDoc(doc(db, 'projects', projectId));
      const orgId = snapshot.data()?.organizationId;
      if (orgId) {
        this.getLedgerItems(projectId).then(items => {
          financialsSyncService.syncLedgerItems(projectId, orgId, items);
        });
      }
    } catch (error) {
       console.error(`Approval Failure: Failed to modify ledger item ${itemId}`, error);
       throw error;
    }
  },

  /**
   * Real-time listener for a single deal's ledger
   */
  subscribeToLedger(projectId: string, onUpdate: (items: LedgerItem[]) => void) {
    const ledgerRef = collection(db, 'projects', projectId, 'ledgerItems');
    const q = query(ledgerRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LedgerItem));
      onUpdate(items);
    });
  },

  /**
   * Fetch a single deal by ID
   */
  async getDeal(projectId: string) {
    try {
      const dealRef = doc(db, 'projects', projectId);
      const snapshot = await getDoc(dealRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Project;
      }
      return null;
    } catch (error) {
       console.error(`Fetch Failure: Could not retrieve deal ${projectId}`, error);
       throw error;
    }
  },

  /**
   * Find projects by MLS ID (ListingKey)
   * Essential for webhook ingestion where ListingKey is the primary identifier.
   */
  async getDealsByMlsId(mlsId: string) {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, where('mls_id', '==', mlsId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
    } catch (error) {
      console.error(`Search Failure: Could not find projects for mls_id ${mlsId}`, error);
      throw error;
    }
  },

  /**
   * Fetch all ledger items for a deal (internal use for sync)
   */
  async getLedgerItems(projectId: string) {
    const ledgerRef = collection(db, 'projects', projectId, 'ledgerItems');
    const snapshot = await getDocs(ledgerRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LedgerItem));
  },

  /**
   * Create a vendor quote request
   */
  async createVendorRequest(projectId: string, vendorUid: string, message: string, quotedFee?: number) {
    try {
      const requestsRef = collection(db, 'projects', projectId, 'vendorRequests');
      const docData = {
        projectId,
        vendorUid,
        message,
        quotedFee,
        status: 'PENDING',
        requestedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(requestsRef, docData);
      return docRef.id;
    } catch (error) {
      console.error(`Vendor Request Error: Failed to create request for vendor ${vendorUid}`, error);
      throw error;
    }
  },

  /**
   * Finalize and archive a project, updating portfolio aggregates on the Organization.
   */
  async closeProjectAndArchive(projectId: string, organizationId: string, exitStrategy: 'Sell' | 'Rent') {
    try {
      // 1. Fetch the project and calculate final outcome using canonical math
      const deal = await this.getDeal(projectId);
      if (!deal) throw new Error('Deal not found');

      const metrics = computeAutopsyMetrics(deal);
      const profit = metrics.netProfit;
      const roi = metrics.roi;
      
      const closedOutcome = profit >= 0 ? 'won' : 'lost';
      const targetStatus = closedOutcome === 'won' ? 'closed_won' : 'closed_lost';

      // 2. Update Project status and lock it globally
      const dealRef = doc(db, 'projects', projectId);
      await updateDoc(dealRef, {
        status: targetStatus,
        phaseStatus: 'Phase 4: Closing & Exit',
        locked: true,
        'financials.closedOutcome': closedOutcome,
        'financials.netRealizedProfit': profit,
        'financials.totalROI': roi,
        updatedAt: serverTimestamp(),
      });

      // 3. Aggregate all closed projects for this organization
      const projectsRef = collection(db, 'projects');
      const q = query(
        projectsRef,
        where('organizationId', '==', organizationId),
        where('status', 'in', ['closed_won', 'closed_lost', 'Sold', 'Rented'])
      );
      const snapshot = await getDocs(q);

      let totalProfit = 0;
      let totalAllInCost = 0;
      const closedCount = snapshot.docs.length;

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Project;
        const p = data.financials?.netRealizedProfit || 0;
        const c = data.financials?.totalAllInCost || 0;
        totalProfit += p;
        totalAllInCost += c;
      });

      // Capital-weighted average ROI calculation
      const avgROI = totalAllInCost > 0 ? (totalProfit / totalAllInCost) * 100 : 0;

      // 4. Update Organization aggregates for the global dashboard
      const orgRef = doc(db, 'organizations', organizationId);
      await updateDoc(orgRef, {
        totalProjectsClosed: closedCount,
        totalNetRealizedProfit: totalProfit,
        averagePortfolioROI: avgROI,
        updatedAt: serverTimestamp(),
      });

      return { closedOutcome, profit, roi };
    } catch (error) {
      console.error('Failed to close and archive project:', error);
      throw error;
    }
  },

  /**
   * Subscribe to vendor requests for a project
   */
  subscribeToVendorRequests(projectId: string, onUpdate: (requests: any[]) => void) {
    const requestsRef = collection(db, 'projects', projectId, 'vendorRequests');
    const q = query(requestsRef, orderBy('requestedAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      onUpdate(items);
    });
  },

  /**
   * Write an immutable snapshot of a phase’s financial state.
   * Called exactly once when the user advances past a phase.
   * Also atomically bumps Project.currentPhase to the next value.
   *
   * Sub-collection path: projects/{projectId}/phaseSnapshots/{phaseKey}
   */
  async capturePhaseSnapshot(
    projectId: string,
    phaseKey: PhaseSnapshotKey,
    data: Phase1Snapshot | Phase2Snapshot | Phase3Snapshot
  ): Promise<void> {
    try {
      // 1. Write snapshot document (setDoc = deterministic ID = idempotent)
      const snapshotRef = doc(db, 'projects', projectId, 'phaseSnapshots', phaseKey);
      await setDoc(snapshotRef, {
        ...data,
        capturedAt: serverTimestamp(),
      });

      // 2. Atomically bump currentPhase on the parent project
      const phaseNumber: Record<PhaseSnapshotKey, number> = {
        'phase-1': 2,
        'phase-2': 3,
        'phase-3': 4,
      };
      const dealRef = doc(db, 'projects', projectId);
      await updateDoc(dealRef, {
        currentPhase: phaseNumber[phaseKey],
        lastPhaseTransitionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`Pipeline Error: Failed to capture ${phaseKey} snapshot for ${projectId}`, error);
      throw error;
    }
  },

  /**
   * Fetch all captured phase snapshots for a project.
   * Returns a PhaseSnapshotMap (partial — only completed phases are present).
   * Used by ProjectPipelineContext on mount.
   */
  async getPhaseSnapshots(projectId: string): Promise<PhaseSnapshotMap> {
    try {
      const snapshotsRef = collection(db, 'projects', projectId, 'phaseSnapshots');
      const snapshotDocs = await getDocs(snapshotsRef);
      const map: PhaseSnapshotMap = {};

      snapshotDocs.forEach(docSnap => {
        const key = docSnap.id as PhaseSnapshotKey;
        const raw = docSnap.data();
        // Coerce Firestore Timestamps → JS Date
        const capturedAt = raw.capturedAt?.toDate ? raw.capturedAt.toDate() : new Date();

        if (key === 'phase-1') {
          map['phase-1'] = { ...raw, capturedAt } as Phase1Snapshot;
        } else if (key === 'phase-2') {
          map['phase-2'] = { ...raw, capturedAt } as Phase2Snapshot;
        } else if (key === 'phase-3') {
          map['phase-3'] = { ...raw, capturedAt } as Phase3Snapshot;
        }
      });

      return map;
    } catch (error) {
      console.error(`Pipeline Error: Failed to fetch snapshots for ${projectId}`, error);
      return {};
    }
  },
};


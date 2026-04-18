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
import { Project, LedgerItem } from '@/types/schema';
import { financialsSyncService } from '../services/financialsSyncService';

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
        status: 'Lead',
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
  }
};

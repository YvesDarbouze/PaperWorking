"use server";

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Validates the caller via the supplied ID Token and returns user data
 */
interface VerifiedUser {
  uid: string;
  role: string;
  organizationId: string;
  [key: string]: unknown;
}

async function verifyActionAuth(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error('Missing authentication token.');
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userDocRef.get();
    
    if (!userSnap.exists) throw new Error('User profile not found in database.');
    
    const userData = userSnap.data() as Record<string, unknown>;
    return { uid: decodedToken.uid, ...userData } as VerifiedUser;
  } catch (err) {
    console.error('Server Action Auth Error:', err);
    throw new Error('Unauthorized');
  }
}

/**
 * APPROVE LEDGER ITEM
 * Safely updates an isolated ledger receipt and atomically recalculates the parent Deal ROI
 */
export async function approveLedgerItem(idToken: string, projectId: string, itemId: string) {
  const user = await verifyActionAuth(idToken);
  
  // Restriction: Must be an Admin or Accountant (or Lead Investor)
  const allowedRoles = ['Admin', 'Accountant', 'Lead Investor'];
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient privileges to approve financial lines.');
  }

  const dealRef = adminDb.collection('projects').doc(projectId);
  const ledgerItemRef = dealRef.collection('ledgerItems').doc(itemId);

  return adminDb.runTransaction(async (transaction) => {
    const dealSnap = await transaction.get(dealRef);
    const itemSnap = await transaction.get(ledgerItemRef);

    if (!dealSnap.exists || !itemSnap.exists) {
      throw new Error('Reference documents do not exist.');
    }

    if (dealSnap.data()?.organizationId !== user.organizationId) {
       throw new Error('Cross-Tenant Data Security Exception');
    }

    if (itemSnap.data()?.status === 'Approved') {
      return { success: true, message: 'Already approved.' }; // Ideopotent return
    }

    // 1. Update the sub-collection item status
    transaction.update(ledgerItemRef, { 
      status: 'Approved',
      updatedAt: FieldValue.serverTimestamp()
    });

    // 2. Fetch all Currently Approved ledger items attached to this Deal to calculate correct totals
    // (Firebase Admin SDK Transactions require all queries BEFORE mutations, so we get them here)
    const allLedgersQuery = dealRef.collection('ledgerItems').where('status', '==', 'Approved');
    const allApprovedLedgers = await transaction.get(allLedgersQuery);
    
    let totalApprovedCosts = 0;
    allApprovedLedgers.forEach(doc => {
      totalApprovedCosts += doc.data().amount || 0;
    });
    // Add the cost of the item we are CURRENTLY approving in this transaction
    totalApprovedCosts += itemSnap.data()?.amount || 0;

    const dealData = dealSnap.data();
    const purchasePrice = dealData?.financials?.purchasePrice || 0;
    const estimatedARV = dealData?.financials?.estimatedARV || 0;
    
    // Core total investment equation dynamically recalculating
    const totalInvestment = purchasePrice + totalApprovedCosts;
    const targetProfit = estimatedARV - totalInvestment;
    
    // Safety check against infinity
    const projectedROI = totalInvestment > 0 ? (targetProfit / totalInvestment) * 100 : 0;

    // 3. Mutate the Parent Deal aggregate properties 
    transaction.update(dealRef, {
      'financials.projectedROI': projectedROI,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true, projectedROI };
  });
}

/**
 * CREATE NEW DEAL
 * Automatically boots up a new property file assigning standard 4-Phase framework architectures.
 */
export async function createNewDeal(idToken: string, rawDealData: any) {
  const user = await verifyActionAuth(idToken);
  
  // Base configuration guarantees the timeline clock initiates safely server-side
  const serverTime = FieldValue.serverTimestamp();
  
  const dealDoc = adminDb.collection('projects').doc(); // Auto-generates ID
  
  const newDeal = {
    id: dealDoc.id,
    organizationId: user.organizationId,
    ownerUid: user.uid,
    propertyName: rawDealData.propertyName || 'New Acquisition',
    address: rawDealData.address || '',
    
    // Phase Framework Strict Standards
    status: 'Lead', // 4-Phase Core: ['Lead', 'Under Contract', 'Renovating', 'Listed/Sold']
    activePhase: 1, 
    
    // Clocks
    createdAt: serverTime,
    updatedAt: serverTime,
    holdingCostClockStart: serverTime, // Automatically kicks off the holding cost accrual
    
    // Core default structure enforcing RBAC automatically onto creator
    members: {
      [user.uid]: {
        role: 'Lead Investor',
        joinedAt: serverTime
      }
    },
    assignedUsers: [user.uid], // Overlap query array mechanism for rules
    
    financials: {
      purchasePrice: rawDealData.purchasePrice || 0,
      estimatedARV: rawDealData.estimatedARV || 0,
      // ... default zeroes omitted for brevity
    }
  };

  await dealDoc.set(newDeal);
  return { success: true, projectId: dealDoc.id };
}

/**
 * CLOSE PROJECT AND ARCHIVE
 * Finalizes the project, updates its status, and aggregates outcomes back to the Organization
 */
export async function closeProjectAndArchiveServerAction(idToken: string, projectId: string, organizationId: string, exitStrategy: 'Sell' | 'Rent') {
  const user = await verifyActionAuth(idToken);
  
  // Security validation
  const allowedRoles = ['Admin', 'Accountant', 'Lead Investor'];
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient privileges to close a project.');
  }

  // Double check that the passed organizationId matches the user's organization
  if (user.organizationId !== organizationId) {
    throw new Error('Cross-Tenant Data Security Exception');
  }

  return adminDb.runTransaction(async (transaction) => {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const orgRef = adminDb.collection('organizations').doc(organizationId);

    const projectSnap = await transaction.get(projectRef);
    if (!projectSnap.exists) {
      throw new Error('Project not found');
    }

    const projectData = projectSnap.data();
    if (projectData?.organizationId !== organizationId) {
      throw new Error('Project does not belong to this organization');
    }

    // 1. Fetch all other closed projects for this org BEFORE making any writes
    const closedProjectsQuery = adminDb.collection('projects')
      .where('organizationId', '==', organizationId)
      .where('status', 'in', ['closed_won', 'closed_lost']);
    const closedProjectsSnap = await transaction.get(closedProjectsQuery);

    const profit = projectData?.financials?.netRealizedProfit || 0;
    const targetStatus = profit >= 0 ? 'closed_won' : 'closed_lost';

    // 2. Perform Writes
    // Update Project status
    transaction.update(projectRef, {
      status: targetStatus,
      phaseStatus: 'Phase 4: Closing & Exit',
      'financials.closedOutcome': profit >= 0 ? 'won' : 'lost',
      locked: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    let totalProfit = 0;
    let totalAllInCost = 0;
    
    // We add 1 for the current project because it hasn't been committed as closed_won/closed_lost yet
    // unless it was ALREADY closed_won/closed_lost (which we should handle).
    let isAlreadyClosed = ['closed_won', 'closed_lost'].includes(projectData?.status);
    let closedCount = closedProjectsSnap.docs.length + (isAlreadyClosed ? 0 : 1);

    closedProjectsSnap.forEach(docSnap => {
      // Don't double count the current project if it's already in the query results
      if (docSnap.id === projectId) return;

      const data = docSnap.data();
      const p = data.financials?.netRealizedProfit || 0;
      const c = data.financials?.totalAllInCost || 0;
      totalProfit += p;
      totalAllInCost += c;
    });

    // Add the current project's financials to the aggregates
    const currentProjectCost = projectData?.financials?.totalAllInCost || 0;
    totalProfit += profit;
    totalAllInCost += currentProjectCost;

    const avgROI = totalAllInCost > 0 ? (totalProfit / totalAllInCost) * 100 : 0;

    // Update Organization aggregates
    transaction.update(orgRef, {
      totalProjectsClosed: closedCount,
      totalNetRealizedProfit: totalProfit,
      averagePortfolioROI: avgROI,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Project successfully closed and archived' };
  });
}

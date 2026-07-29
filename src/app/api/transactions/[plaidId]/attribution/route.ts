import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { attributeTransaction } from '@/lib/banking/attributor';
import { financialsSyncService } from '@/lib/services/financialsSyncService';
import { clearDashboardCache } from '@/lib/cache/dashboardCache';

// Helper to verify ID token and get userId
async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded.uid;
  } catch (error) {
    console.error('[Attribution API] Token verification failed:', error);
    return null;
  }
}

/**
 * PATCH /api/transactions/[plaidId]/attribution
 * Manually attributes a transaction to a project or ignores it.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { plaidId: string } }
) {
  const { plaidId } = params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { projectId, ignore } = body;

    // Verify transaction exists and belongs to the user
    const tx = await prisma.transaction.findUnique({
      where: { plaidId },
    });

    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    if (tx.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Keep track of old projectId to recalculate its KPIs if it changed
    const oldProjectId = tx.projectId;

    // Update the transaction in Postgres
    const updatedTx = await prisma.transaction.update({
      where: { plaidId },
      data: {
        projectId: ignore ? null : projectId,
        reviewedByUser: true,
        attributedAt: (ignore || !projectId) ? null : new Date(),
      },
    });

    // Dismiss active unarchived inbox items for this transaction
    const inboxItemsSnap = await adminDb
      .collection('inboxItems')
      .where('recipientUid', '==', userId)
      .where('metadata.plaidId', '==', plaidId)
      .where('archived', '==', false)
      .get();

    const batch = adminDb.batch();
    inboxItemsSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        archived: true,
        read: true,
        actionTaken: 'dismissed',
      });
    });
    await batch.commit();

    // Recalculate KPIs for affected projects
    const affectedProjectIds = new Set<string>();
    if (oldProjectId) affectedProjectIds.add(oldProjectId);
    if (projectId && !ignore) affectedProjectIds.add(projectId);

    for (const projId of affectedProjectIds) {
      await recalculateAndSyncProjectKPIs(projId);
    }

    return NextResponse.json({ success: true, transaction: updatedTx });
  } catch (error: any) {
    console.error('[Attribution API] PATCH Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/transactions/[plaidId]/attribution/search
 * Re-runs attribution matching engine and returns suggested project.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { plaidId: string } }
) {
  const { plaidId } = params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tx = await prisma.transaction.findUnique({
      where: { plaidId },
    });

    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    if (tx.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Call attributeTransaction to find a match
    const attribution = await attributeTransaction(
      {
        plaidId: tx.plaidId,
        name: tx.merchantName || 'Plaid Transaction',
        amount: Number(tx.amount),
        date: tx.date,
        reiCategory: tx.reiCategory || 'unknown',
        merchantName: tx.merchantName,
      },
      userId
    );

    let projectName = null;
    if (attribution.projectId) {
      const projSnap = await adminDb.collection('projects').doc(attribution.projectId).get();
      if (projSnap.exists) {
        projectName = projSnap.data()?.propertyName || projSnap.data()?.address;
      }
    }

    return NextResponse.json({
      success: true,
      projectId: attribution.projectId,
      projectName,
      matchType: attribution.matchType,
      confidence: attribution.confidence,
    });
  } catch (error: any) {
    console.error('[Attribution API] POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Recalculates rent and cost actuals in Firestore, updates Postgres financials, and invalidates cache.
 */
async function recalculateAndSyncProjectKPIs(projectId: string) {
  try {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) return;

    const projectData = projectSnap.data();
    const orgId = projectData?.organizationId;

    // Query all attributed transactions in Postgres
    const txs = await prisma.transaction.findMany({
      where: { projectId },
    });

    // 1. Rent actuals (sum of rental_income)
    const rentTxs = txs.filter((t) => t.reiCategory === 'rental_income');
    const totalRentCents = rentTxs.reduce((sum, t) => sum + Number(t.amount), 0);
    const actualRentalIncome = totalRentCents / 100;

    // 2. Costs (non-income actuals)
    const existingCosts = projectData?.financials?.costs || [];
    // Keep manual entries, filter out Plaid items
    const nonPlaidCosts = existingCosts.filter((c: any) => !c.id.startsWith('tx_') && c.addedBy !== 'system');

    const plaidCosts = txs
      .filter((t) => t.reiCategory !== 'rental_income')
      .map((t) => ({
        id: t.plaidId,
        description: t.merchantName || 'Plaid Transaction',
        amount: Math.abs(Number(t.amount)) / 100,
        approved: true,
        addedBy: 'system',
        createdAt: t.date,
        category: 'Other',
        status: 'Approved',
      }));

    const mergedCosts = [...nonPlaidCosts, ...plaidCosts];
    const actualRehabCost = mergedCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

    const financialsUpdate = {
      ...projectData?.financials,
      actualRentalIncome,
      actualRehabCost,
      costs: mergedCosts,
    };

    // Update Firestore
    await projectRef.update({
      financials: financialsUpdate,
    });

    // Clear dashboard cache
    if (orgId) {
      clearDashboardCache(orgId);
    }

    // Sync to Postgres dealFinancials
    await financialsSyncService.syncProjectFinancials({
      ...projectData,
      id: projectId,
      financials: financialsUpdate,
    } as any);
  } catch (err) {
    console.error(`[KPI Recalculator] Failed to update project ${projectId}:`, err);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import prisma from '@/lib/prisma';
import { getBankingProvider } from '@/lib/banking';
import * as tokenVault from '@/lib/encryption/tokenVault';
import { classifyTransaction } from '@/lib/banking/classifier';
import { attributeTransaction } from '@/lib/banking/attributor';
import { checkMissingRent } from '@/lib/alerts/rentMonitor';

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
    console.error('[Inbox Actions API] Token verification failed:', error);
    return null;
  }
}

/**
 * POST /api/inbox/[itemId]/actions
 * Executes a manual override action (confirm_paid, mark_late, search_again) on a missed rent alert.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: itemId } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Retrieve the inbox item
    const docRef = adminDb.collection('inboxItems').doc(itemId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Inbox item not found' }, { status: 404 });
    }

    const item = docSnap.data();
    if (!item) {
      return NextResponse.json({ success: false, error: 'Inbox item is empty' }, { status: 404 });
    }

    // Auth check: recipientUid must match caller's userId
    if (item.recipientUid !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, paidDate } = body; // confirm_paid, mark_late, search_again

    const projectId = item.metadata?.projectId;
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Missing projectId in item metadata' }, { status: 400 });
    }

    // 2. Handle Actions
    if (action === 'confirm_paid') {
      // Archive/resolve inbox item
      await docRef.update({
        archived: true,
        read: true,
        actionTaken: 'confirm_paid',
        updatedAt: new Date(),
      });

      // Log manual override note in project
      const projectRef = adminDb.collection('projects').doc(projectId);
      const projSnap = await projectRef.get();
      if (projSnap.exists) {
        const projData = projSnap.data();
        const displayDate = paidDate ? new Date(paidDate).toLocaleDateString() : new Date().toLocaleDateString();
        const expectedDate = item.metadata?.expectedDate || 'N/A';
        const expectedAmount = item.metadata?.expectedAmount || 'N/A';
        const noteText = `[Manual Rent Override - ${new Date().toLocaleDateString()}] Expected rent of $${expectedAmount} for due date ${expectedDate} confirmed paid manually on ${displayDate}.`;

        let notesUpdate: any;
        if (Array.isArray(projData?.notes)) {
          notesUpdate = [...projData.notes, noteText];
        } else if (typeof projData?.notes === 'string') {
          notesUpdate = projData.notes ? `${projData.notes}\n${noteText}` : noteText;
        } else {
          notesUpdate = [noteText];
        }

        await projectRef.update({
          notes: notesUpdate,
          'financials.rentStatus': 'PAID_MANUALLY',
        });
      }

      return NextResponse.json({ success: true, message: 'Rent marked as paid manually.' });
    }

    if (action === 'mark_late') {
      // Archive/resolve inbox item
      await docRef.update({
        archived: true,
        read: true,
        actionTaken: 'mark_late',
        updatedAt: new Date(),
      });

      // Log late rent note in project
      const projectRef = adminDb.collection('projects').doc(projectId);
      const projSnap = await projectRef.get();
      if (projSnap.exists) {
        const projData = projSnap.data();
        const expectedDate = item.metadata?.expectedDate || 'N/A';
        const noteText = `[Rent Overdue Note - ${new Date().toLocaleDateString()}] Rent for due date ${expectedDate} was marked as late by investor.`;

        let notesUpdate: any;
        if (Array.isArray(projData?.notes)) {
          notesUpdate = [...projData.notes, noteText];
        } else if (typeof projData?.notes === 'string') {
          notesUpdate = projData.notes ? `${projData.notes}\n${noteText}` : noteText;
        } else {
          notesUpdate = [noteText];
        }

        await projectRef.update({
          notes: notesUpdate,
          'financials.rentStatus': 'LATE',
        });
      }

      return NextResponse.json({ success: true, message: 'Rent marked as late.' });
    }

    if (action === 'search_again') {
      // Re-trigger transaction sync for user's active connections
      const connections = await prisma.bankConnection.findMany({
        where: { userId, status: 'active' },
      });

      if (connections.length > 0) {
        const bankingProvider = getBankingProvider();
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];

        // Retrieve organization projects context for attribution
        const userSnap = await adminDb.collection('users').doc(userId).get();
        const userData = userSnap.data();
        const orgId = userData?.organizationId || 'org_placeholder';

        let projects: any[] = [];
        if (orgId && orgId !== 'org_placeholder') {
          const projectsSnap = await adminDb
            .collection('projects')
            .where('organizationId', '==', orgId)
            .get();

          const rawProjects = projectsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          projects = await Promise.all(
            rawProjects.map(async (p) => {
              const [loansSnap, assignmentsSnap, requestsSnap] = await Promise.all([
                adminDb.collection('projects').doc(p.id).collection('loans').get(),
                adminDb.collection('projects').doc(p.id).collection('vendorAssignments').get(),
                adminDb.collection('projects').doc(p.id).collection('vendorRequests').get(),
              ]);

              const loans = loansSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
              const vendorAssignments = assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
              const vendorRequests = requestsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

              return {
                ...p,
                loans,
                vendorAssignments,
                vendorRequests,
              };
            })
          );
        }

        // Run connection syncs
        for (const connection of connections) {
          try {
            const decryptedToken = tokenVault.decrypt(connection.accessToken);
            let nextCursor = connection.lastSyncCursor || undefined;
            let hasMore = true;

            while (hasMore) {
              const syncResult = await bankingProvider.getTransactions({
                accessToken: decryptedToken,
                startDate,
                endDate,
                cursor: nextCursor,
              });

              // Process added transactions only
              for (const tx of syncResult.added) {
                const classified = classifyTransaction(tx.name);
                const attribution = await attributeTransaction(
                  {
                    plaidId: tx.plaidId,
                    name: tx.name,
                    amount: tx.amount,
                    date: tx.date,
                    reiCategory: classified.reiCategory || 'unknown',
                    merchantName: tx.merchantName,
                  },
                  userId,
                  projects
                );

                const pid = attribution.projectId;
                const attrDate = pid ? new Date() : null;

                await prisma.transaction.upsert({
                  where: { plaidId: tx.plaidId },
                  update: {
                    accountId: tx.accountId,
                    connectionId: connection.id,
                    userId,
                    amount: BigInt(tx.amount),
                    date: tx.date,
                    category: tx.category,
                    merchantName: tx.merchantName,
                    pending: tx.pending,
                    reiCategory: classified.reiCategory,
                    confidence: classified.confidence,
                    projectId: pid,
                    attributedAt: attrDate,
                  },
                  create: {
                    plaidId: tx.plaidId,
                    accountId: tx.accountId,
                    connectionId: connection.id,
                    userId,
                    amount: BigInt(tx.amount),
                    date: tx.date,
                    category: tx.category,
                    merchantName: tx.merchantName,
                    pending: tx.pending,
                    reiCategory: classified.reiCategory,
                    confidence: classified.confidence,
                    projectId: pid,
                    attributedAt: attrDate,
                  },
                });
              }

              nextCursor = syncResult.nextCursor;
              hasMore = syncResult.hasMore;
            }

            await prisma.bankConnection.update({
              where: { id: connection.id },
              data: {
                lastSyncCursor: nextCursor,
                lastSyncAt: new Date(),
              },
            });
          } catch (syncErr) {
            console.error(`[Inbox Actions API] Sync connection ${connection.id} failed:`, syncErr);
          }
        }
      }

      // Re-run the missing rent check
      const rentMissing = await checkMissingRent(projectId);
      if (!rentMissing) {
        // Rent paid/found! Archive the alert!
        await docRef.update({
          archived: true,
          read: true,
          actionTaken: 'found_via_plaid',
          updatedAt: new Date(),
        });
        return NextResponse.json({
          success: true,
          rentFound: true,
          message: 'Plaid sync completed. Rent payment found and attributed!',
        });
      }

      return NextResponse.json({
        success: true,
        rentFound: false,
        message: 'Plaid sync completed. Rent payment is still missing.',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Inbox Actions API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

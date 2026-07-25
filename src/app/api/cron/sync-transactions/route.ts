import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBankingProvider } from '@/lib/banking';
import * as tokenVault from '@/lib/encryption/tokenVault';
import { classifyTransaction } from '@/lib/banking/classifier';
import { attributeTransaction } from '@/lib/banking/attributor';
import { adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';
import { checkMissingRent } from '@/lib/alerts/rentMonitor';

export async function GET(req: NextRequest) {
  // Validate CRON_SECRET header or Authorization header
  const authHeader = req.headers.get('Authorization');
  const cronSecretHeader = req.headers.get('CRON_SECRET') || req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ success: false, error: 'CRON_SECRET is not configured on the server.' }, { status: 500 });
  }

  const isAuthValid =
    authHeader === `Bearer ${expectedSecret}` ||
    cronSecretHeader === expectedSecret;

  if (!isAuthValid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bankingProvider = getBankingProvider();

    // Query active connections
    let connections = await prisma.bankConnection.findMany({
      where: { status: 'active' },
    });

    // In mock mode, seed a connection if none exist to enable end-to-end sync testing
    if (connections.length === 0 && process.env.BANKING_PROVIDER === 'mock') {
      const mockConnection = await prisma.bankConnection.upsert({
        where: { id: 'mock-connection-id' },
        update: { status: 'active' },
        create: {
          id: 'mock-connection-id',
          userId: 'mock-user-id',
          accessToken: 'mock-access-token',
          status: 'active',
        },
      });

      await prisma.bankAccount.upsert({
        where: { plaidAccountId: 'mock-plaid-account-id' },
        update: {},
        create: {
          id: 'mock-account-id',
          plaidAccountId: 'mock-plaid-account-id',
          connectionId: mockConnection.id,
          name: 'Business Premier Savings (*8892)',
          balance: 75000_00,
          type: 'depository',
        },
      });

      connections.push(mockConnection);
    }

    let successCount = 0;
    let failCount = 0;
    const inboxItemsToCreate: any[] = [];

    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    for (const connection of connections) {
      try {
        const decryptedToken = tokenVault.decrypt(connection.accessToken);

        // Fetch user profile and organization projects
        const userSnap = await adminDb.collection('users').doc(connection.userId).get();
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

        let currentCursor = connection.lastSyncCursor || undefined;
        let hasMore = true;
        let nextCursor = currentCursor;

        while (hasMore) {
          const syncResult = await bankingProvider.getTransactions({
            accessToken: decryptedToken,
            startDate,
            endDate,
            cursor: nextCursor,
          });

          // Process Added Transactions
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
              connection.userId,
              projects
            );

            const projectId = attribution.projectId;
            const attributedAt = projectId ? new Date() : null;

            await prisma.transaction.upsert({
              where: { plaidId: tx.plaidId },
              update: {
                accountId: tx.accountId,
                connectionId: connection.id,
                userId: connection.userId,
                amount: BigInt(tx.amount),
                date: tx.date,
                category: tx.category,
                merchantName: tx.merchantName,
                pending: tx.pending,
                reiCategory: classified.reiCategory,
                confidence: classified.confidence,
                projectId,
                attributedAt,
              },
              create: {
                plaidId: tx.plaidId,
                accountId: tx.accountId,
                connectionId: connection.id,
                userId: connection.userId,
                amount: BigInt(tx.amount),
                date: tx.date,
                category: tx.category,
                merchantName: tx.merchantName,
                pending: tx.pending,
                reiCategory: classified.reiCategory,
                confidence: classified.confidence,
                projectId,
                attributedAt,
              },
            });

            // Enqueue manual review inbox item if attribution failed
            if (!projectId) {
              const existingInboxItems = await adminDb
                .collection('inboxItems')
                .where('recipientUid', '==', connection.userId)
                .where('metadata.plaidId', '==', tx.plaidId)
                .where('archived', '==', false)
                .get();

              if (existingInboxItems.empty) {
                const formattedAmount = (tx.amount / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                });
                const formattedDate = new Date(tx.date).toLocaleDateString('en-US');
                const bodyText = `Unattributed transaction: ${tx.name} for ${formattedAmount} on ${formattedDate}. Which project does this belong to?`;

                const itemId = `inb_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
                const inboxItem = {
                  id: itemId,
                  recipientUid: connection.userId,
                  organizationId: orgId,
                  type: 'unattributed_transaction',
                  priority: 'normal',
                  title: 'Unattributed Transaction',
                  body: bodyText,
                  senderUid: 'system',
                  senderName: 'PaperWorking',
                  senderAvatarInitial: 'P',
                  read: false,
                  archived: false,
                  createdAt: new Date(),
                  metadata: {
                    plaidId: tx.plaidId,
                    name: tx.name,
                    amount: tx.amount,
                    date: tx.date instanceof Date ? tx.date.toISOString() : new Date(tx.date).toISOString(),
                    reiCategory: classified.reiCategory || 'unknown',
                  },
                };
                inboxItemsToCreate.push(inboxItem);
              }
            }
          }

          // Process Modified Transactions
          for (const tx of syncResult.modified) {
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
              connection.userId,
              projects
            );

            const projectId = attribution.projectId;
            const attributedAt = projectId ? new Date() : null;

            await prisma.transaction.upsert({
              where: { plaidId: tx.plaidId },
              update: {
                accountId: tx.accountId,
                connectionId: connection.id,
                userId: connection.userId,
                amount: BigInt(tx.amount),
                date: tx.date,
                category: tx.category,
                merchantName: tx.merchantName,
                pending: tx.pending,
                reiCategory: classified.reiCategory,
                confidence: classified.confidence,
                projectId,
                attributedAt,
              },
              create: {
                plaidId: tx.plaidId,
                accountId: tx.accountId,
                connectionId: connection.id,
                userId: connection.userId,
                amount: BigInt(tx.amount),
                date: tx.date,
                category: tx.category,
                merchantName: tx.merchantName,
                pending: tx.pending,
                reiCategory: classified.reiCategory,
                confidence: classified.confidence,
                projectId,
                attributedAt,
              },
            });
          }

          // Process Removed Transactions
          for (const plaidId of syncResult.removed) {
            try {
              await prisma.transaction.delete({
                where: { plaidId },
              });
            } catch (err) {
              console.warn(`[Transaction Sync Cron] Transaction ${plaidId} could not be deleted or was already removed`);
            }
          }

          nextCursor = syncResult.nextCursor;
          hasMore = syncResult.hasMore;
        }

        // Sync completed successfully, update connection metadata
        await prisma.bankConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncCursor: nextCursor,
            lastSyncAt: new Date(),
          },
        });

        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(`[Transaction Sync Cron] Failed to sync connection ${connection.id}:`, err);

        // Update connection status to error if item login is required
        if (
          err.message &&
          (err.message.includes('ITEM_LOGIN_REQUIRED') ||
            err.message.includes('item_login_required'))
        ) {
          await prisma.bankConnection.update({
            where: { id: connection.id },
            data: { status: 'error' },
          });
        }
      }
    }

    // Run missing rent alerts checks for rental projects owned by users with active connections
    const uniqueUserIds = Array.from(new Set(connections.map((c) => c.userId)));
    let missedRentAlertsCreated = 0;

    for (const userId of uniqueUserIds) {
      try {
        const userSnap = await adminDb.collection('users').doc(userId).get();
        if (userSnap.exists) {
          const userData = userSnap.data();
          const orgId = userData?.organizationId;
          if (orgId) {
            const projectsSnap = await adminDb
              .collection('projects')
              .where('organizationId', '==', orgId)
              .get();

            const projectIds = projectsSnap.docs.map((doc) => doc.id);
            const results = await Promise.all(
              projectIds.map(async (pid) => {
                try {
                  return await checkMissingRent(pid);
                } catch (err) {
                  console.error(`[Transaction Sync Cron] checkMissingRent failed for project ${pid}:`, err);
                  return false;
                }
              })
            );
            missedRentAlertsCreated += results.filter(Boolean).length;
          }
        }
      } catch (err) {
        console.error(`[Transaction Sync Cron] Rent monitoring failed for user ${userId}:`, err);
      }
    }

    console.log(`[Transaction Sync Cron] Completed missing rent checks. Alerts active/created: ${missedRentAlertsCreated}`);

    // Batch create all enqueued inbox items at the end
    if (inboxItemsToCreate.length > 0) {
      let batch = adminDb.batch();
      let count = 0;
      for (const item of inboxItemsToCreate) {
        const docRef = adminDb.collection('inboxItems').doc(item.id);
        batch.set(docRef, item);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = adminDb.batch();
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    }

    const total = successCount + failCount;
    if (total > 0 && failCount / total > 0.1) {
      console.error(
        `🚨 [CRITICAL TRANSACTION SYNC FAILURE ALERT] More than 10% of transaction syncs failed. Failed: ${failCount}/${total}`
      );
    }

    return NextResponse.json({
      synced: successCount,
      failures: failCount,
    });
  } catch (error: any) {
    console.error('[Transaction Sync Cron] Fatal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

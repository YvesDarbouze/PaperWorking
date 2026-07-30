import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { DailySyncOrchestrator } from '@/lib/banking/dailySyncOrchestrator';
import { FinancialNotificationService } from '@/lib/notifications/financialNotifications';
import { sseEventBus } from '@/lib/events/eventBus';

/**
 * POST /api/webhooks/plaid
 *
 * Real-time DTM-compliant Plaid webhook handler.
 * Handles:
 *   • TRANSACTIONS/SYNC_UPDATES_AVAILABLE & DEFAULT_UPDATE
 *   • ITEM/DEFAULT_UPDATE
 *   • ITEM/PENDING_EXPIRATION
 *   • ITEM/USER_PERMISSION_REVOKED
 *   • ITEM/CONSENT_UPDATED
 *   • ITEM/ERROR (ITEM_LOGIN_REQUIRED, INSUFFICIENT_CREDENTIALS, ADDITIONAL_CONSENT_REQUIRED)
 *
 * Security:
 *   - Verifies Plaid-Signature header / HMAC secret.
 *   - Rejects unauthenticated payload calls with 400/401.
 */

export const dynamic = 'force-dynamic';

async function verifyPlaidSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.PLAID_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.BANKING_PROVIDER === 'mock' || process.env.NODE_ENV === 'development') {
      return true;
    }
    console.error('[Plaid Webhook] PLAID_WEBHOOK_SECRET not set — rejecting signature.');
    return false;
  }

  const plaidSig = req.headers.get('plaid-verification') || req.headers.get('Plaid-Signature');
  if (!plaidSig) {
    console.error('[Plaid Webhook] Missing signature header.');
    return false;
  }

  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(plaidSig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  const isValid = await verifyPlaidSignature(req, rawBody);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const {
    webhook_type: webhookType,
    webhook_code: webhookCode,
    item_id: itemId,
    error,
    new_consented_products: newConsentedProducts,
    new_data_scopes: newDataScopes,
  } = payload as {
    webhook_type?: string;
    webhook_code?: string;
    item_id?: string;
    error?: Record<string, unknown>;
    new_consented_products?: string[];
    new_data_scopes?: string[];
  };

  console.info(`[Plaid Webhook] Received ${webhookType}/${webhookCode} for itemId ${itemId}`);

  if (!itemId) {
    return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });
  }

  // 1. Audit log raw webhook event
  let webhookLogId: string | null = null;
  try {
    const logged = await prisma.plaidWebhookEvent.create({
      data: {
        eventType: `${webhookType}/${webhookCode}`,
        itemId,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
    webhookLogId = logged.id;
  } catch (err) {
    console.error('[Plaid Webhook] Audit logging failed:', err);
  }

  // 2. Find PlaidConnection
  const conn = await prisma.plaidConnection.findFirst({ where: { itemId } });

  if (conn) {
    try {
      // ── Event 1: SYNC_UPDATES_AVAILABLE / TRANSACTIONS_DEFAULT_UPDATE ────
      if (
        webhookType === 'TRANSACTIONS' &&
        (webhookCode === 'SYNC_UPDATES_AVAILABLE' ||
          webhookCode === 'DEFAULT_UPDATE' ||
          webhookCode === 'INITIAL_UPDATE' ||
          webhookCode === 'HISTORICAL_UPDATE')
      ) {
        await DailySyncOrchestrator.syncConnection(conn.id);
      }

      // ── Event 2: DEFAULT_UPDATE (Balances / Account info) ───────────────────
      else if (webhookType === 'ITEM' && webhookCode === 'DEFAULT_UPDATE') {
        if (conn.projectId) {
          sseEventBus.emit(`account:updated:${conn.projectId}`, {
            itemId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // ── Event 3: PENDING_EXPIRATION ─────────────────────────────────────────
      else if (webhookType === 'ITEM' && webhookCode === 'PENDING_EXPIRATION') {
        await prisma.plaidConnection.update({
          where: { id: conn.id },
          data: { status: 'PENDING_AUTH' },
        });

        await FinancialNotificationService.sendUrgentAlert({
          userId: conn.userId,
          projectId: conn.projectId,
          connectionId: conn.id,
          institutionName: conn.institutionName,
          reason: 'PENDING_EXPIRATION',
        });
      }

      // ── Event 4: USER_PERMISSION_REVOKED ────────────────────────────────────
      else if (webhookType === 'ITEM' && webhookCode === 'USER_PERMISSION_REVOKED') {
        await prisma.plaidConnection.update({
          where: { id: conn.id },
          data: { status: 'DISCONNECTED', updatedAt: new Date() },
        });

        await prisma.plaidConsentEvent.create({
          data: {
            plaidConnectionId: conn.id,
            eventType: 'CONSENT_REVOKED',
            triggeredBy: 'WEBHOOK',
          },
        });

        await FinancialNotificationService.sendUrgentAlert({
          userId: conn.userId,
          projectId: conn.projectId,
          connectionId: conn.id,
          institutionName: conn.institutionName,
          reason: 'CONSENT_REVOKED',
        });
      }

      // ── Event 5: CONSENT_UPDATED (DTM-specific) ─────────────────────────────
      else if (webhookType === 'ITEM' && webhookCode === 'CONSENT_UPDATED') {
        await DailySyncOrchestrator.handleConsentChange(
          itemId,
          newConsentedProducts ?? ((conn.consentedProducts as string[]) ?? []),
          newDataScopes ?? ((conn.consentedDataScopes as string[]) ?? [])
        );
      }

      // ── Event 6: ERROR (ITEM_LOGIN_REQUIRED, etc.) ─────────────────────────
      else if (webhookType === 'ITEM' && webhookCode === 'ERROR') {
        const errCode = (error?.error_code as string) ?? 'ITEM_ERROR';
        const errMsg = (error?.error_message as string) ?? 'Plaid Item Error';

        await prisma.plaidConnection.update({
          where: { id: conn.id },
          data: {
            status: 'ERROR',
            syncErrorCount: { increment: 1 },
            lastSyncErrorMessage: `${errCode}: ${errMsg}`.slice(0, 500),
          },
        });

        let alertReason: 'ITEM_LOGIN_REQUIRED' | 'ADDITIONAL_CONSENT_REQUIRED' = 'ITEM_LOGIN_REQUIRED';
        if (errCode === 'ADDITIONAL_CONSENT_REQUIRED') {
          alertReason = 'ADDITIONAL_CONSENT_REQUIRED';
        }

        await FinancialNotificationService.sendUrgentAlert({
          userId: conn.userId,
          projectId: conn.projectId,
          connectionId: conn.id,
          institutionName: conn.institutionName,
          reason: alertReason,
        });
      }
    } catch (handlerErr: unknown) {
      console.error(`[Plaid Webhook] Error processing ${webhookType}/${webhookCode}:`, handlerErr);
    }
  }

  // 3. Mark webhook log processed
  if (webhookLogId) {
    await prisma.plaidWebhookEvent
      .update({
        where: { id: webhookLogId },
        data: {
          processedAt: new Date(),
          processingResult: conn ? 'HANDLED' : 'IGNORED',
        },
      })
      .catch(() => {/* non-fatal */});
  }

  return NextResponse.json({ received: true });
}

import { adminDb } from '@/lib/firebase/admin';

export interface DailySummaryData {
  userId: string;
  projectId?: string | null;
  rentCount: number;
  rentTotalCents: number;
  expenseCount: number;
  expenseTotalCents: number;
  mortgageBalanceCents?: number | null;
  principalReductionCents?: number | null;
  cashOnCashReturnPct?: number | null;
  cocChangePct?: number | null;
}

export interface UrgentAlertData {
  userId: string;
  projectId?: string | null;
  connectionId: string;
  institutionName?: string | null;
  reason: 'ITEM_LOGIN_REQUIRED' | 'PENDING_EXPIRATION' | 'CONSENT_REVOKED' | 'ADDITIONAL_CONSENT_REQUIRED';
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export class FinancialNotificationService {
  /**
   * Dispatch daily sync summary notification to user inbox.
   */
  static async sendDailySummary(data: DailySummaryData): Promise<void> {
    const {
      userId,
      projectId,
      rentCount,
      rentTotalCents,
      expenseCount,
      expenseTotalCents,
      mortgageBalanceCents,
      principalReductionCents,
      cashOnCashReturnPct,
      cocChangePct,
    } = data;

    // Skip sending empty summaries if no activity
    if (rentCount === 0 && expenseCount === 0 && !mortgageBalanceCents) {
      return;
    }

    const bullets: string[] = [];
    if (rentCount > 0) {
      bullets.push(`• ${rentCount} rent deposit${rentCount > 1 ? 's' : ''} identified (${formatCurrency(rentTotalCents)} total)`);
    }
    if (expenseCount > 0) {
      bullets.push(`• ${expenseCount} expense${expenseCount > 1 ? 's' : ''} categorized (${formatCurrency(expenseTotalCents)} total)`);
    }
    if (mortgageBalanceCents != null) {
      const redStr = principalReductionCents ? ` (-${formatCurrency(principalReductionCents)} principal this month)` : '';
      bullets.push(`• Mortgage balance updated: ${formatCurrency(mortgageBalanceCents)}${redStr}`);
    }
    if (cashOnCashReturnPct != null) {
      const deltaStr = cocChangePct ? ` (${cocChangePct > 0 ? '+' : ''}${cocChangePct.toFixed(1)}%)` : '';
      bullets.push(`• Your Cash-on-Cash Return: ${cashOnCashReturnPct.toFixed(1)}%${deltaStr}`);
    }

    const body = `Your investments were automatically updated:\n${bullets.join('\n')}`;

    const inboxId = `inb_daily_summary_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await adminDb.collection('inboxItems').doc(inboxId).set({
      id: inboxId,
      recipientUid: userId,
      projectId: projectId ?? null,
      type: 'daily_financial_summary',
      priority: 'medium',
      title: 'Daily Financial Sync Summary',
      body,
      senderUid: 'system',
      senderName: 'PaperWorking Auto-Sync',
      senderAvatarInitial: 'P',
      read: false,
      archived: false,
      createdAt: new Date(),
      metadata: { rentCount, rentTotalCents, expenseCount, expenseTotalCents },
    });
  }

  /**
   * Dispatch urgent re-authentication / consent warning to user inbox.
   */
  static async sendUrgentAlert(data: UrgentAlertData): Promise<void> {
    const { userId, projectId, connectionId, institutionName, reason } = data;

    let title = 'Bank Connection Requires Attention';
    let body = `Your ${institutionName ?? 'bank'} connection needs attention to continue automatic tracking.`;
    let priority: 'high' | 'urgent' = 'high';

    switch (reason) {
      case 'ITEM_LOGIN_REQUIRED':
      case 'PENDING_EXPIRATION':
        title = `Action Required: Reconnect ${institutionName ?? 'Bank'}`;
        body = `Your ${institutionName ?? 'bank'} connection session has expired or requires re-authentication. Reconnect in seconds to keep your 33 KPIs updating automatically.`;
        priority = 'urgent';
        break;
      case 'CONSENT_REVOKED':
        title = `Bank Disconnected: ${institutionName ?? 'Bank'}`;
        body = `Your ${institutionName ?? 'bank'} connection was removed at your financial institution. Historical transaction records remain safe.`;
        priority = 'high';
        break;
      case 'ADDITIONAL_CONSENT_REQUIRED':
        title = `New Consent Required for ${institutionName ?? 'Bank'}`;
        body = `Additional product consent (e.g. mortgage/liabilities) is required to track loan balances for your project. Please update your connection permissions.`;
        priority = 'high';
        break;
    }

    const inboxId = `inb_urgent_${reason.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await adminDb.collection('inboxItems').doc(inboxId).set({
      id: inboxId,
      recipientUid: userId,
      projectId: projectId ?? null,
      type: `plaid_${reason.toLowerCase()}`,
      priority,
      title,
      body,
      senderUid: 'system',
      senderName: 'PaperWorking Security',
      senderAvatarInitial: 'P',
      read: false,
      archived: false,
      createdAt: new Date(),
      metadata: { connectionId, reason, institutionName },
    });
  }
}

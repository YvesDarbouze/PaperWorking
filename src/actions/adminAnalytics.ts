'use server';

import { cookies } from 'next/headers';
import { authorize } from '@/lib/authz/authorize';
import { prisma } from '@/lib/prisma';
import { adminDb } from '@/lib/firebase/admin';

export interface PlaidHealthConnectionItem {
  id: string;
  userId: string;
  institutionName: string;
  accountMask: string | null;
  status: string;
  syncErrorCount: number;
  lastSyncErrorMessage: string | null;
  lastSuccessfulSyncAt: string | null;
  webhookUrl: string | null;
  requestId: string | null;
  linkSessionId: string | null;
  reauthRequired: boolean;
}

export interface PlaidHealthStats {
  totalConnections: number;
  healthyCount: number;
  loginRequiredCount: number;
  staleCount: number;
  erroredCount: number;
  connections: PlaidHealthConnectionItem[];
}

export interface SupportMetricsData {
  hasData: boolean;
  totalTickets: number;
  avgFirstResponseTimeHours: number;
  avgResolutionTimeHours: number;
  csatScore: number;
  categoryBreakdown: { category: string; count: number; percentage: number }[];
}

async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('__session')?.value || null;
  } catch {
    return null;
  }
}

/**
 * Server Action: Plaid Health Monitoring & Connection Buckets (Amendment B)
 */
export async function getPlaidHealthStats(): Promise<PlaidHealthStats> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_analytics');
  if (!authz.authorized) {
    return {
      totalConnections: 0,
      healthyCount: 0,
      loginRequiredCount: 0,
      staleCount: 0,
      erroredCount: 0,
      connections: [],
    };
  }

  try {
    if (!prisma || !prisma.plaidConnection) {
      return {
        totalConnections: 0,
        healthyCount: 0,
        loginRequiredCount: 0,
        staleCount: 0,
        erroredCount: 0,
        connections: [],
      };
    }

    const conns = await prisma.plaidConnection.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date().getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    let healthyCount = 0;
    let loginRequiredCount = 0;
    let staleCount = 0;
    let erroredCount = 0;

    const connections: PlaidHealthConnectionItem[] = conns.map((c) => {
      const statusStr = c.status || 'NOT_CONNECTED';
      const isLoginReq = statusStr === 'ITEM_LOGIN_REQUIRED' || (c.lastSyncErrorMessage || '').includes('ITEM_LOGIN_REQUIRED');
      const isStale = c.lastSuccessfulSyncAt ? (now - new Date(c.lastSuccessfulSyncAt).getTime() > sevenDaysMs) : true;
      const isErrored = c.syncErrorCount > 0 || statusStr === 'DISCONNECTED';

      if (isLoginReq) {
        loginRequiredCount++;
      } else if (isErrored) {
        erroredCount++;
      } else if (isStale) {
        staleCount++;
      } else {
        healthyCount++;
      }

      return {
        id: c.id,
        userId: c.userId,
        institutionName: c.institutionName || 'Bank Account',
        accountMask: c.accountMask || null,
        status: statusStr,
        syncErrorCount: c.syncErrorCount,
        lastSyncErrorMessage: c.lastSyncErrorMessage || null,
        lastSuccessfulSyncAt: c.lastSuccessfulSyncAt ? c.lastSuccessfulSyncAt.toISOString() : null,
        webhookUrl: c.webhookUrl || null,
        requestId: c.requestId || null,
        linkSessionId: c.linkSessionId || null,
        reauthRequired: isLoginReq,
      };
    });

    return {
      totalConnections: conns.length,
      healthyCount,
      loginRequiredCount,
      staleCount,
      erroredCount,
      connections,
    };
  } catch (error) {
    console.error('[getPlaidHealthStats] Failed:', error);
    return {
      totalConnections: 0,
      healthyCount: 0,
      loginRequiredCount: 0,
      staleCount: 0,
      erroredCount: 0,
      connections: [],
    };
  }
}

/**
 * Server Action: Support Operations MVP Metrics Engine (Amendment D)
 * Computes FRT, Resolution Time, CSAT Score, and Category Volume.
 */
export async function getSupportMetrics(): Promise<SupportMetricsData> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_analytics');
  if (!authz.authorized) {
    return {
      hasData: false,
      totalTickets: 0,
      avgFirstResponseTimeHours: 0,
      avgResolutionTimeHours: 0,
      csatScore: 0,
      categoryBreakdown: [],
    };
  }

  try {
    const ticketsSnap = await adminDb.collection('tickets').get();
    if (ticketsSnap.empty) {
      return {
        hasData: false,
        totalTickets: 0,
        avgFirstResponseTimeHours: 0,
        avgResolutionTimeHours: 0,
        csatScore: 0,
        categoryBreakdown: [],
      };
    }

    const tickets = ticketsSnap.docs.map((doc) => doc.data());
    const totalTickets = tickets.length;

    let frtSum = 0;
    let frtCount = 0;
    let resSum = 0;
    let resCount = 0;
    let csatSum = 0;
    let csatCount = 0;

    const categories: Record<string, number> = {
      BILLING: 0,
      TECHNICAL: 0,
      ACCOUNT: 0,
      PLAID: 0,
      GENERAL: 0,
    };

    tickets.forEach((t) => {
      const cat = (t.category || 'GENERAL').toUpperCase();
      categories[cat] = (categories[cat] || 0) + 1;

      const created = t.createdAt?.toDate ? t.createdAt.toDate().getTime() : null;
      const firstResp = t.firstRespondedAt?.toDate ? t.firstRespondedAt.toDate().getTime() : null;
      const resolved = t.resolvedAt?.toDate ? t.resolvedAt.toDate().getTime() : null;

      if (created && firstResp && firstResp >= created) {
        frtSum += (firstResp - created) / (1000 * 60 * 60);
        frtCount++;
      }

      if (created && resolved && resolved >= created) {
        resSum += (resolved - created) / (1000 * 60 * 60);
        resCount++;
      }

      if (typeof t.rating === 'number' && t.rating >= 1 && t.rating <= 5) {
        csatSum += t.rating;
        csatCount++;
      }
    });

    const categoryBreakdown = Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0,
    }));

    return {
      hasData: totalTickets > 0,
      totalTickets,
      avgFirstResponseTimeHours: frtCount > 0 ? Number((frtSum / frtCount).toFixed(1)) : 0,
      avgResolutionTimeHours: resCount > 0 ? Number((resSum / resCount).toFixed(1)) : 0,
      csatScore: csatCount > 0 ? Number((csatSum / csatCount).toFixed(1)) : 0,
      categoryBreakdown,
    };
  } catch (error) {
    console.error('[getSupportMetrics] Failed:', error);
    return {
      hasData: false,
      totalTickets: 0,
      avgFirstResponseTimeHours: 0,
      avgResolutionTimeHours: 0,
      csatScore: 0,
      categoryBreakdown: [],
    };
  }
}

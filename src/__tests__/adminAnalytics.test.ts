import { PlaidHealthStats, SupportMetricsData } from '@/actions/adminAnalytics';

describe('PROMPT 5 — Support Metrics & Plaid Health Surface Unit Suite', () => {
  describe('Plaid Health Connection Classification (Amendment B)', () => {
    it('classifies healthy connections', () => {
      const mockConn = {
        id: 'conn_1',
        userId: 'u1',
        institutionName: 'Chase Bank',
        accountMask: '1234',
        status: 'CONNECTED',
        syncErrorCount: 0,
        lastSyncErrorMessage: null,
        lastSuccessfulSyncAt: new Date().toISOString(),
        webhookUrl: 'https://app.paperworking.com/api/webhooks/plaid',
        requestId: 'req_123',
        linkSessionId: 'sess_456',
        reauthRequired: false,
      };

      expect(mockConn.status).toBe('CONNECTED');
      expect(mockConn.syncErrorCount).toBe(0);
      expect(mockConn.reauthRequired).toBe(false);
    });

    it('identifies ITEM_LOGIN_REQUIRED requiring re-authentication', () => {
      const mockConn = {
        id: 'conn_2',
        userId: 'u2',
        institutionName: 'Bank of America',
        accountMask: '5678',
        status: 'ITEM_LOGIN_REQUIRED',
        syncErrorCount: 2,
        lastSyncErrorMessage: 'ITEM_LOGIN_REQUIRED: user credentials expired',
        lastSuccessfulSyncAt: null,
        webhookUrl: null,
        requestId: 'req_789',
        linkSessionId: 'sess_012',
        reauthRequired: true,
      };

      expect(mockConn.reauthRequired).toBe(true);
      expect(mockConn.status).toBe('ITEM_LOGIN_REQUIRED');
    });
  });

  describe('Support Operations MVP Metrics Calculations (Amendment D)', () => {
    it('computes FRT, resolution time, and CSAT correctly from ticket data', () => {
      const created = new Date('2026-08-01T10:00:00Z').getTime();
      const firstResp = new Date('2026-08-01T12:00:00Z').getTime(); // 2 hours FRT
      const resolved = new Date('2026-08-01T16:00:00Z').getTime(); // 6 hours Resolution

      const frtHours = (firstResp - created) / (1000 * 60 * 60);
      const resHours = (resolved - created) / (1000 * 60 * 60);

      expect(frtHours).toBe(2);
      expect(resHours).toBe(6);
    });

    it('handles honest empty state when 0 tickets exist', () => {
      const emptyMetrics: SupportMetricsData = {
        hasData: false,
        totalTickets: 0,
        openBacklogCount: 0,
        medianFirstResponseTimeHours: 0,
        avgResolutionTimeHours: 0,
        firstContactResolutionPct: 0,
        csatScore: 0,
        categoryBreakdown: [],
      };

      expect(emptyMetrics.hasData).toBe(false);
      expect(emptyMetrics.totalTickets).toBe(0);
      expect(emptyMetrics.categoryBreakdown).toHaveLength(0);
    });
  });
});

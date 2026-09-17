import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { PlaidStalenessBadge } from '../../components/shared/PlaidStalenessBadge.js';
import { BankConnectionCard } from '../../components/settings/BankConnectionCard.js';

describe('Plaid UI Components & Honest Staleness Displays (Review C2.7, H-33)', () => {
  describe('PlaidStalenessBadge', () => {
    it('renders healthy badge with formatted synced_at timestamp', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      const html = renderToString(<PlaidStalenessBadge syncedAt={fiveHoursAgo} status="active" />);

      expect(html).toContain('data-testid="plaid-healthy-badge"');
      expect(html).toContain('Synced');
      expect(html).toContain('bg-emerald-500');
    });

    it('renders stale badge with >48h indication when data is stale', () => {
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const html = renderToString(<PlaidStalenessBadge syncedAt={threeDaysAgo} status="active" />);

      expect(html).toContain('data-testid="plaid-stale-badge"');
      expect(html).toContain('Reconnect your bank (Stale &gt;48h)');
      expect(html).toContain('bg-red-500');
    });

    it('renders login_repair_required badge with pulse and fix login action', () => {
      const html = renderToString(
        <PlaidStalenessBadge
          syncedAt={new Date().toISOString()}
          status="login_repair_required"
          onReconnect={() => {}}
        />,
      );

      expect(html).toContain('data-testid="plaid-login-repair-badge"');
      expect(html).toContain('Reconnect required');
      expect(html).toContain('Fix login');
      expect(html).toContain('animate-pulse');
    });

    it('renders disconnected badge when status is disconnected', () => {
      const html = renderToString(<PlaidStalenessBadge syncedAt={new Date().toISOString()} status="disconnected" />);

      expect(html).toContain('data-testid="plaid-disconnected-badge"');
      expect(html).toContain('Disconnected');
    });
  });

  describe('BankConnectionCard', () => {
    it('renders active bank card with institution name and disconnect trigger', () => {
      const conn = {
        id: 'conn-chase-1',
        itemId: 'item-chase-1',
        institutionName: 'JPMorgan Chase',
        status: 'active',
        syncedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
      };

      const html = renderToString(<BankConnectionCard connection={conn} />);

      expect(html).toContain('JPMorgan Chase');
      expect(html).toContain('data-testid="bank-card-item-chase-1"');
      expect(html).toContain('data-testid="disconnect-bank-btn"');
      expect(html).toContain('Disconnect');
    });

    it('renders reconnect button when connection is stale (>48h)', () => {
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const conn = {
        id: 'conn-stale-1',
        itemId: 'item-stale-1',
        institutionName: 'Wells Fargo',
        status: 'active',
        syncedAt: threeDaysAgo,
        lastSyncAt: threeDaysAgo,
        staleness: {
          isStale: true,
          state: 'stale_reconnect_required',
          displayText: 'Reconnect your bank',
        },
      };

      const html = renderToString(<BankConnectionCard connection={conn} />);

      expect(html).toContain('Wells Fargo');
      expect(html).toContain('data-testid="reconnect-bank-btn"');
      expect(html).toContain('Reconnect');
    });

    it('renders disconnected state when item is disconnected', () => {
      const conn = {
        id: 'conn-purged-1',
        itemId: 'item-purged-1',
        institutionName: 'Citibank',
        status: 'disconnected',
        syncedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
      };

      const html = renderToString(<BankConnectionCard connection={conn} />);

      expect(html).toContain('data-testid="bank-card-disconnected-item-purged-1"');
      expect(html).toContain('Credentials purged and disconnected');
      expect(html).toContain('Disconnected');
    });
  });
});

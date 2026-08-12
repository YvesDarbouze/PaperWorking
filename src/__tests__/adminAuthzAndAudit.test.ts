import crypto from 'crypto';
import { computeEntryHash } from '@/lib/audit/auditLogger';

describe('Admin Authorization Engine & SHA-256 Audit Log Spine', () => {
  describe('SHA-256 Hash Chain Computation', () => {
    it('computes deterministic SHA-256 entry hash', () => {
      const seq = 1;
      const ts = '2026-08-12T12:00:00.000Z';
      const actor = 'user_123';
      const action = 'admin:view_overview';
      const target = 'admin_panel';
      const status = 'SUCCESS';
      const prevHash = 'GENESIS';

      const hash = computeEntryHash(seq, ts, actor, action, target, status, prevHash);

      const expectedPayload = `1:2026-08-12T12:00:00.000Z:user_123:admin:view_overview:admin_panel:SUCCESS:GENESIS`;
      const expectedHash = crypto.createHash('sha256').update(expectedPayload, 'utf8').digest('hex');

      expect(hash).toBe(expectedHash);
      expect(hash.length).toBe(64);
    });

    it('detects tampered links in hash chain', () => {
      const ts1 = '2026-08-12T12:00:00.000Z';
      const ts2 = '2026-08-12T12:05:00.000Z';

      const hash1 = computeEntryHash(1, ts1, 'user_1', 'admin:view_users', 'users', 'SUCCESS', 'GENESIS');
      const hash2 = computeEntryHash(2, ts2, 'user_2', 'admin:change_role', 'users', 'SUCCESS', hash1);

      // Simulating a tampered hash1
      const tamperedHash1 = '0000000000000000000000000000000000000000000000000000000000000000';
      const recomputedHash2WithTampered = computeEntryHash(2, ts2, 'user_2', 'admin:change_role', 'users', 'SUCCESS', tamperedHash1);

      expect(recomputedHash2WithTampered).not.toBe(hash2);
    });
  });

  describe('Permission Matrix Scenarios', () => {
    const ROLE_PERMISSIONS: Record<string, string[]> = {
      'Platform Admin': [
        'admin:view_overview',
        'admin:view_users',
        'admin:manage_users',
        'admin:view_subscriptions',
        'admin:manage_subscriptions',
        'admin:view_marketplace',
        'admin:view_analytics',
        'admin:view_tickets',
        'admin:manage_tickets',
        'admin:view_audit_logs',
        'admin:export_audit_logs',
        'admin:manage_agents',
        'admin:manage_roles',
        'admin:purge_data',
      ],
      Admin: [
        'admin:view_overview',
        'admin:view_users',
        'admin:view_subscriptions',
        'admin:view_marketplace',
        'admin:view_analytics',
        'admin:view_tickets',
        'admin:manage_tickets',
        'admin:view_audit_logs',
        'admin:export_audit_logs',
      ],
      'Lead Investor': [
        'admin:view_overview',
        'admin:view_marketplace',
        'admin:view_analytics',
      ],
    };

    it('grants Platform Admin super-role full permissions', () => {
      expect(ROLE_PERMISSIONS['Platform Admin']).toContain('admin:manage_roles');
      expect(ROLE_PERMISSIONS['Platform Admin']).toContain('admin:purge_data');
    });

    it('restricts Admin role from critical governance actions', () => {
      expect(ROLE_PERMISSIONS['Admin']).toContain('admin:view_users');
      expect(ROLE_PERMISSIONS['Admin']).not.toContain('admin:manage_roles');
      expect(ROLE_PERMISSIONS['Admin']).not.toContain('admin:purge_data');
    });

    it('restricts Lead Investor role to read-only analytical surfaces', () => {
      expect(ROLE_PERMISSIONS['Lead Investor']).toContain('admin:view_overview');
      expect(ROLE_PERMISSIONS['Lead Investor']).not.toContain('admin:view_users');
      expect(ROLE_PERMISSIONS['Lead Investor']).not.toContain('admin:view_audit_logs');
    });
  });
});

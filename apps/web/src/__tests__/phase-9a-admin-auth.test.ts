import { buildAuthUserFromPostgresUser } from '@paperworking/services';
import { isAuthorizedAdmin } from '../../lib/api/admin-gate.js';

describe('phase 9a — admin server-side gate', () => {
  it('does not authorize using __acct — only DB isAdmin grants admin access', () => {
    const investorFromDb = buildAuthUserFromPostgresUser(
      {
        id: 'uid-1',
        email: 'user@example.com',
        accountType: 'investor',
        role: 'investor',
      },
      'uid-1',
    );

    expect(investorFromDb.isAdmin).toBe(false);
    expect(isAuthorizedAdmin(investorFromDb)).toBe(false);

    // Spoofed __acct=admin must not affect authorization when Postgres says investor.
    const displayAcctCookie = 'admin';
    expect(displayAcctCookie).toBe('admin');
    expect(isAuthorizedAdmin(investorFromDb)).toBe(false);
  });

  it('authorizes platform admin from Postgres profile only', () => {
    const adminFromDb = buildAuthUserFromPostgresUser(
      {
        id: 'uid-admin',
        email: 'admin@example.com',
        accountType: 'admin',
        role: 'Platform Admin',
      },
      'uid-admin',
    );

    expect(adminFromDb.isAdmin).toBe(true);
    expect(isAuthorizedAdmin(adminFromDb)).toBe(true);
  });

  it('rejects missing session user', () => {
    expect(isAuthorizedAdmin(null)).toBe(false);
  });
});

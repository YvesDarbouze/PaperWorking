import { describe, expect, it } from '@jest/globals';
import {
  buildAuthMeResponse,
  handleAuthMeGet,
  type AuthMeDeps,
} from '../routes/auth/me/handler.js';

const investorUser = {
  uid: '11111111-1111-4111-8111-111111111111',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
  role: 'investor',
};

describe('GET /api/auth/me handler', () => {
  const deps: AuthMeDeps = {
    findUser: async (uid) => ({
      id: uid,
      email: 'investor@example.com',
      displayName: 'Investor User',
      name: 'Investor User',
    }),
    findSubscription: async () => ({
      plan: 'Individual',
      status: 'active',
    }),
    hasActiveEntitlement: () => true,
  };

  it('returns 401 when user is missing', async () => {
    const result = await handleAuthMeGet(null);
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns Nest-compatible profile shape', async () => {
    const result = await handleAuthMeGet(investorUser, deps);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      authenticated: true,
      uid: investorUser.uid,
      email: 'investor@example.com',
      displayName: 'Investor User',
      accountType: 'investor',
      isAdmin: false,
      subscriptionPlan: 'Individual',
      subscriptionStatus: 'active',
      hasActiveSubscription: true,
    });
  });

  it('uses Postgres accountType and isAdmin from AuthUser', async () => {
    const vendorUser = {
      uid: 'vendor-1',
      email: 'vendor@example.com',
      accountType: 'vendor',
      isAdmin: false,
      role: 'Vendor',
    };

    const body = await buildAuthMeResponse(vendorUser, {
      ...deps,
      findUser: async () => ({
        id: 'vendor-1',
        email: 'vendor@example.com',
        accountType: 'vendor',
        role: 'Vendor',
      }),
    });

    expect(body.accountType).toBe('vendor');
    expect(body.isAdmin).toBe(false);
  });

  it('uses Postgres isAdmin for platform admin', async () => {
    const adminUser = {
      uid: 'admin-1',
      email: 'admin@example.com',
      accountType: 'admin',
      isAdmin: true,
      role: 'Platform Admin',
    };

    const body = await buildAuthMeResponse(adminUser, deps);
    expect(body.isAdmin).toBe(true);
    expect(body.accountType).toBe('admin');
  });
});

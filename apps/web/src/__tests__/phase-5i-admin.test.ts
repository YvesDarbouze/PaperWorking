import {
  handleAdminAgentCrewGet,
  handleAdminLenderRatesGet,
  handleAdminRentcastUsageGet,
} from '@paperworking/api';
import { WEB_APP_STATUS } from '../index.js';
import {
  SEED_LENDER_RATES_DOC,
  SEED_RENTCAST_USAGE,
  getSeedSyntheticAgent,
  listSeedSyntheticAgents,
} from '../../lib/admin/seed-data.js';

describe('phase 5i — web app status', () => {
  it('includes admin routes on web app status', () => {
    expect(WEB_APP_STATUS.adminRoute).toBe('/admin');
    expect(WEB_APP_STATUS.adminRoutes).toContain('/admin/agent-crew');
  });
});

describe('phase 5i — admin seed data', () => {
  it('lists synthetic agents with stats', () => {
    const agents = listSeedSyntheticAgents();
    expect(agents.length).toBeGreaterThanOrEqual(2);
    expect(agents[0]?.stats.projectsCount).toBeGreaterThan(0);
  });

  it('returns agent detail by id', () => {
    const agent = getSeedSyntheticAgent('agent-scout');
    expect(agent?.persona).toBe('wholesaler');
    expect(agent?.projects?.length).toBeGreaterThan(0);
  });
});

describe('phase 5i — admin handlers', () => {
  const adminAuth = { uid: 'dev-admin-1', role: 'admin', isAdmin: true };

  it('returns lender rates from seed config', async () => {
    const result = await handleAdminLenderRatesGet({
      requireAdmin: async () => adminAuth,
      getConfigDoc: async () => SEED_LENDER_RATES_DOC,
    });
    expect(result.status).toBe(200);
    const body = result.body as { rates: Array<{ id: string }> };
    expect(body.rates.length).toBeGreaterThan(0);
  });

  it('returns rentcast usage stats', async () => {
    const result = await handleAdminRentcastUsageGet(
      {},
      {
        requireAdmin: async () => adminAuth,
        countCalls: async () => SEED_RENTCAST_USAGE.count,
        limit: SEED_RENTCAST_USAGE.limit,
      },
    );
    expect(result.status).toBe(200);
    const body = result.body as { count: number; limit: number };
    expect(body.count).toBe(87);
    expect(body.limit).toBe(500);
  });

  it('returns synthetic agent roster', async () => {
    const result = await handleAdminAgentCrewGet({
      requireAdmin: async () => adminAuth,
      listAgents: async () => listSeedSyntheticAgents(),
    });
    expect(result.status).toBe(200);
    const body = result.body as { count: number; agents: unknown[] };
    expect(body.count).toBeGreaterThan(0);
  });
});

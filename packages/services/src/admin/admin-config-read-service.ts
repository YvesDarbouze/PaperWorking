import type { AuthUser, AuthorizationService } from '@paperworking/authz';
import { assertAdminUser } from './assert-admin.js';
import type { AdminReadRepository } from './admin-read-repository.js';
import {
  DEFAULT_LENDER_CHECKLISTS,
  DEFAULT_LENDER_RATES,
  parseLenderChecklistsDoc,
  parseLenderRatesDoc,
  serializeLenderRateForApi,
} from './lender-config.js';

export type AdminRentcastReadServiceDeps = {
  authz: AuthorizationService;
  repository: AdminReadRepository;
  limit?: number;
};

export class AdminRentcastReadService {
  constructor(private readonly deps: AdminRentcastReadServiceDeps) {}

  async getUsage(user: AuthUser, query: { year?: number; month?: number } = {}) {
    assertAdminUser(user, this.deps.authz);
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1;
    const count = await this.deps.repository.countRentcastCalls(year, month);
    const config = await this.deps.repository.getAppConfigValue('rentcast.usage');
    const limit = Number(config?.limit ?? this.deps.limit ?? 500);
    return {
      success: true as const,
      year,
      month,
      count,
      limit: Number.isFinite(limit) ? limit : 500,
    };
  }
}

export type AdminLenderReadServiceDeps = {
  authz: AuthorizationService;
  repository: AdminReadRepository;
};

export class AdminLenderReadService {
  constructor(private readonly deps: AdminLenderReadServiceDeps) {}

  async getRates(user: AuthUser) {
    assertAdminUser(user, this.deps.authz);
    const doc = await this.deps.repository.getAppConfigValue('lender.rates');
    if (!doc) {
      return {
        rates: DEFAULT_LENDER_RATES.map(serializeLenderRateForApi),
        updatedAt: null,
        updatedByEmail: null,
      };
    }
    const rates = parseLenderRatesDoc(doc).map(serializeLenderRateForApi);
    return {
      rates: rates.length ? rates : DEFAULT_LENDER_RATES.map(serializeLenderRateForApi),
      updatedAt:
        typeof doc.updatedAt === 'string'
          ? doc.updatedAt
          : doc.updatedAt && typeof doc.updatedAt === 'object' &&
              typeof (doc.updatedAt as { toDate?: () => Date }).toDate === 'function'
            ? (doc.updatedAt as { toDate: () => Date }).toDate().toISOString()
            : null,
      updatedByEmail: typeof doc.updatedByEmail === 'string' ? doc.updatedByEmail : null,
    };
  }

  async getChecklists(user: AuthUser) {
    assertAdminUser(user, this.deps.authz);
    const doc = await this.deps.repository.getAppConfigValue('lender.checklists');
    if (!doc) {
      return {
        checklists: DEFAULT_LENDER_CHECKLISTS,
        updatedAt: null,
        updatedByEmail: null,
      };
    }
    return {
      checklists: parseLenderChecklistsDoc(doc),
      updatedAt:
        typeof doc.updatedAt === 'string'
          ? doc.updatedAt
          : doc.updatedAt && typeof doc.updatedAt === 'object' &&
              typeof (doc.updatedAt as { toDate?: () => Date }).toDate === 'function'
            ? (doc.updatedAt as { toDate: () => Date }).toDate().toISOString()
            : null,
      updatedByEmail: typeof doc.updatedByEmail === 'string' ? doc.updatedByEmail : null,
    };
  }
}

function serializeAgentSummary(row: {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  agentPersona: string | null;
  projectsCount: number;
  listingsCount: number;
  messagesCount: number;
}) {
  const name = row.displayName || row.name || row.email;
  const handle = `@${name.toLowerCase().replace(/\s+/g, '')}`;
  return {
    id: row.id,
    uid: row.id,
    name,
    email: row.email,
    persona: row.agentPersona || 'investor',
    handle,
    stats: {
      projectsCount: row.projectsCount,
      listingsCount: row.listingsCount,
      messagesCount: row.messagesCount,
    },
  };
}

export type AdminAgentCrewReadServiceDeps = {
  authz: AuthorizationService;
  repository: AdminReadRepository;
};

export class AdminAgentCrewReadService {
  constructor(private readonly deps: AdminAgentCrewReadServiceDeps) {}

  async listAgents(user: AuthUser) {
    assertAdminUser(user, this.deps.authz);
    const agents = await this.deps.repository.listSyntheticAgents();
    const mapped = agents.map(serializeAgentSummary);
    return { success: true as const, count: mapped.length, agents: mapped };
  }

  async getAgent(user: AuthUser, agentId: string) {
    assertAdminUser(user, this.deps.authz);
    const row = await this.deps.repository.getSyntheticAgentById(agentId);
    if (!row) {
      return { success: false as const, error: 'Agent not found' };
    }
    return {
      success: true as const,
      agent: {
        ...serializeAgentSummary(row),
        bio: `${row.displayName || row.name || row.email} synthetic agent.`,
        lastActiveAt: null,
        projects: [],
      },
    };
  }
}

export type AdminAgentCrewCommandServiceDeps = {
  authz: AuthorizationService;
  repository: AdminReadRepository;
};

export class AdminAgentCrewCommandService {
  constructor(private readonly deps: AdminAgentCrewCommandServiceDeps) {}

  async deleteAgent(user: AuthUser, agentId: string) {
    assertAdminUser(user, this.deps.authz);
    const deleted = await this.deps.repository.deleteSyntheticAgent(agentId);
    if (!deleted) {
      return { success: false as const, error: 'Agent not found' };
    }
    return {
      success: true as const,
      message: `Successfully deleted synthetic agent ${agentId} and all associated records.`,
    };
  }
}

export function createAdminRentcastReadService(deps: AdminRentcastReadServiceDeps) {
  return new AdminRentcastReadService(deps);
}

export function createAdminLenderReadService(deps: AdminLenderReadServiceDeps) {
  return new AdminLenderReadService(deps);
}

export function createAdminAgentCrewReadService(deps: AdminAgentCrewReadServiceDeps) {
  return new AdminAgentCrewReadService(deps);
}

export function createAdminAgentCrewCommandService(deps: AdminAgentCrewCommandServiceDeps) {
  return new AdminAgentCrewCommandService(deps);
}

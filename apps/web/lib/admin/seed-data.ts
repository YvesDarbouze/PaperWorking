export const SEED_SYNTHETIC_AGENTS = [
  {
    id: 'agent-scout',
    uid: 'uid-scout',
    name: 'Scout',
    email: 'scout@paperworking.test',
    persona: 'wholesaler',
    handle: '@scout',
    stats: { projectsCount: 3, listingsCount: 2, messagesCount: 14 },
  },
  {
    id: 'agent-atlas',
    uid: 'uid-atlas',
    name: 'Atlas',
    email: 'atlas@paperworking.test',
    persona: 'commercial',
    handle: '@atlas',
    stats: { projectsCount: 5, listingsCount: 1, messagesCount: 22 },
  },
  {
    id: 'agent-dana',
    uid: 'uid-dana',
    name: 'Dana',
    email: 'dana@paperworking.test',
    persona: 'flipper',
    handle: '@dana',
    stats: { projectsCount: 4, listingsCount: 3, messagesCount: 9 },
  },
];

export function listSeedSyntheticAgents() {
  return SEED_SYNTHETIC_AGENTS.map((agent) => ({ ...agent }));
}

export function getSeedSyntheticAgent(agentId: string) {
  const agent = SEED_SYNTHETIC_AGENTS.find((item) => item.id === agentId);
  if (!agent) return null;
  return {
    ...agent,
    bio: `${agent.name} synthetic agent for marketplace QA.`,
    createdAt: '2026-06-01T00:00:00.000Z',
    lastActiveAt: '2026-08-10T12:00:00.000Z',
    projects: ['deal-1', 'deal-2'],
  };
}

export function deleteSeedSyntheticAgent(agentId: string): { message: string } | null {
  const index = SEED_SYNTHETIC_AGENTS.findIndex((agent) => agent.id === agentId);
  if (index < 0) return null;
  SEED_SYNTHETIC_AGENTS.splice(index, 1);
  return { message: `Successfully deleted synthetic agent ${agentId} and all associated records.` };
}

export const SEED_RENTCAST_USAGE = { count: 87, limit: 500 };

export const SEED_LENDER_RATES_DOC = {
  rates: [
    {
      id: 'NEO',
      name: 'NEO Capital',
      interestRate: 6.125,
      points: 1,
      lenderFeesCents: 125000,
      asOf: { toDate: () => new Date('2026-07-01T00:00:00.000Z') },
    },
    {
      id: 'LEGACY',
      name: 'Legacy Bank',
      interestRate: 6.45,
      points: 1.5,
      lenderFeesCents: 150000,
      asOf: { toDate: () => new Date('2026-07-01T00:00:00.000Z') },
    },
  ],
  updatedAt: { toDate: () => new Date('2026-08-01T00:00:00.000Z') },
  updatedByEmail: 'admin@paperworking.test',
};

export const SEED_LENDER_CHECKLISTS_DOC = {
  Conventional: ['Tax Returns', 'Bank Statements', 'Purchase Contract'],
  'SBA 504': ['SBA Form 413', 'Business Plan'],
  'Hard Money': ['Scope of Work', 'Exit Strategy Memo'],
  Bridge: ['Bridge Term Sheet', 'Refinance Commitment'],
  updatedAt: '2026-08-01T00:00:00.000Z',
  updatedByEmail: 'admin@paperworking.test',
};

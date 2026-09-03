export const SEED_RAW_DEALS: Array<{
  id: string;
  slug: string;
  address: string;
  status: string;
  visibility?: string;
  purchasePrice?: number;
  rehabCost?: number;
  arv?: number;
  holdingCosts?: number;
  projectedRoi?: number;
  creatorId: string;
  createdAt: string;
  projectId?: string | null;
  projects?: Array<{
    id?: string;
    dealId?: string;
    name?: string;
    city?: string;
    state?: string;
    zip?: string;
    propertyType?: string;
    subStrategy?: string;
  }>;
  commitments?: Array<{ amount?: number; investorId?: string }>;
  invitations?: Array<{ inviteeUserId?: string; inviteeEmail?: string }>;
  creator?: { name?: string };
}> = [
  {
    id: 'deal-mp-1',
    slug: '1247elmst',
    address: '1247 Elm Street, Austin, TX 78702',
    status: 'published',
    visibility: 'marketplace',
    purchasePrice: 485_000,
    rehabCost: 62_000,
    arv: 620_000,
    holdingCosts: 18_000,
    projectedRoi: 18.4,
    creatorId: 'creator-1',
    createdAt: '2026-07-01T00:00:00.000Z',
    projectId: 'deal-1',
    projects: [{ id: 'deal-1', name: 'Elm Street Flip', city: 'Austin', state: 'TX', zip: '78702', propertyType: 'Single-family', subStrategy: 'FLIP' }],
    commitments: [{ amount: 120_000, investorId: 'inv-1' }],
    invitations: [],
    creator: { name: 'PaperWorking Capital' },
  },
  {
    id: 'deal-mp-2',
    slug: 'melroseduplex',
    address: '4208 Melrose Ave, Los Angeles, CA 90029',
    status: 'funding',
    visibility: 'marketplace',
    purchasePrice: 890_000,
    rehabCost: 110_000,
    arv: 1_150_000,
    holdingCosts: 32_000,
    projectedRoi: 14.2,
    creatorId: 'creator-2',
    createdAt: '2026-06-15T00:00:00.000Z',
    projects: [{ name: 'Melrose Duplex', city: 'Los Angeles', state: 'CA', zip: '90029', propertyType: 'Multi-family', subStrategy: 'BRRRR' }],
    commitments: [
      { amount: 250_000, investorId: 'inv-1' },
      { amount: 150_000, investorId: 'inv-2' },
    ],
    invitations: [],
    creator: { name: 'Atlas Syndicate' },
  },
  {
    id: 'deal-mp-3',
    slug: 'oakridgehold',
    address: '88 Oak Ridge Dr, Denver, CO 80202',
    status: 'draft',
    visibility: 'private',
    purchasePrice: 720_000,
    rehabCost: 0,
    arv: 780_000,
    holdingCosts: 12_000,
    projectedRoi: 9.5,
    creatorId: 'creator-private-3',
    createdAt: '2026-08-10T00:00:00.000Z',
    projects: [{ name: 'Oak Ridge Hold', city: 'Denver', state: 'CO', zip: '80202', propertyType: 'Single-family', subStrategy: 'BUY_AND_HOLD' }],
    commitments: [],
    invitations: [],
    creator: { name: 'Private Investor' },
  },
  {
    id: 'deal-mp-4',
    slug: 'riversideinvite',
    address: '210 Riverside Blvd, Nashville, TN 37201',
    status: 'published',
    visibility: 'invitation_only',
    purchasePrice: 540_000,
    rehabCost: 75_000,
    arv: 710_000,
    holdingCosts: 15_000,
    projectedRoi: 16.8,
    creatorId: 'creator-3',
    createdAt: '2026-07-25T00:00:00.000Z',
    projects: [{ name: 'Riverside Value-Add', city: 'Nashville', state: 'TN', zip: '37201', propertyType: 'Multi-family', subStrategy: 'VALUE_ADD' }],
    commitments: [{ amount: 80_000, investorId: 'inv-2' }],
    invitations: [{ inviteeUserId: 'dev-user-1', inviteeEmail: 'dev@paperworking.test' }],
    creator: { name: 'River Capital' },
  },
];

export function findSeedDealBySlug(normalizedSlug: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const searchNorm = norm(normalizedSlug);
  return (
    SEED_RAW_DEALS.find((deal) => {
      const dealSlugNorm = norm(deal.slug);
      const dealAddrNorm = norm(deal.address);
      const dealNameNorm = deal.projects?.[0]?.name ? norm(deal.projects[0].name) : '';
      return (
        dealSlugNorm === searchNorm ||
        dealAddrNorm.includes(searchNorm) ||
        searchNorm.includes(dealSlugNorm) ||
        (dealNameNorm && (dealNameNorm.includes(searchNorm) || searchNorm.includes(dealNameNorm)))
      );
    }) ?? null
  );
}

export function seedPublicDealsForOwner(ownerUid: string): Array<Record<string, unknown> & { id: string }> {
  return SEED_RAW_DEALS.filter((deal) => deal.creatorId === ownerUid).map((deal) => ({
    id: deal.id,
    address: deal.address,
    propertyName: deal.projects?.[0]?.name ?? deal.address,
    isPublicOnMarketplace: deal.visibility === 'marketplace' && deal.status !== 'draft',
    financials: { purchasePrice: Number(deal.purchasePrice ?? 0) },
    sellerName: deal.creator?.name ?? 'Creator',
  }));
}

export function addSeedDeal(rawDeal: (typeof SEED_RAW_DEALS)[number]): (typeof SEED_RAW_DEALS)[number] {
  const existingIdx = SEED_RAW_DEALS.findIndex((d) => d.id === rawDeal.id || d.slug === rawDeal.slug);
  if (existingIdx >= 0) {
    SEED_RAW_DEALS[existingIdx] = { ...SEED_RAW_DEALS[existingIdx], ...rawDeal };
    return SEED_RAW_DEALS[existingIdx];
  }
  SEED_RAW_DEALS.unshift(rawDeal);
  return rawDeal;
}

export interface SeedDealBroadcast {
  id: string;
  dealId: string;
  senderId: string;
  senderName: string;
  recipientEmails: string[];
  subject: string;
  message: string;
  includeBusinessCard: boolean;
  createdAt: string;
}

export const SEED_DEAL_BROADCASTS: SeedDealBroadcast[] = [];

export function addSeedBroadcast(broadcast: SeedDealBroadcast): SeedDealBroadcast {
  SEED_DEAL_BROADCASTS.unshift(broadcast);
  return broadcast;
}

export function getSeedBroadcasts(dealId?: string): SeedDealBroadcast[] {
  if (!dealId) return SEED_DEAL_BROADCASTS;
  return SEED_DEAL_BROADCASTS.filter((b) => b.dealId === dealId);
}

export interface SeedDealMessage {
  id: string;
  dealId: string;
  senderId?: string | null;
  senderEmail: string;
  content: string;
  source: 'platform' | 'email_inbound';
  createdAt: string;
}

export const SEED_DEAL_MESSAGES: SeedDealMessage[] = [];

export function addSeedDealMessage(msg: SeedDealMessage): SeedDealMessage {
  SEED_DEAL_MESSAGES.unshift(msg);
  return msg;
}

export function getSeedDealMessages(dealId?: string): SeedDealMessage[] {
  if (!dealId) return SEED_DEAL_MESSAGES;
  return SEED_DEAL_MESSAGES.filter((m) => m.dealId === dealId);
}

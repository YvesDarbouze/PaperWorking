export const SEED_MARKETPLACE_LISTINGS = [
  {
    id: 'listing-1',
    title: '1247 Elm Street — Fix & Flip',
    vendorType: 'General Contractor',
    visibility: 'PUBLIC',
    isNewListing: true,
    createdAt: '2026-08-01T10:00:00.000Z',
    city: 'Austin, TX',
    budgetRange: '$50k–$80k',
    responseTime: '< 24h',
  },
  {
    id: 'listing-2',
    title: 'Melrose Duplex — Property Management',
    vendorType: 'Property Manager',
    visibility: 'PUBLIC',
    createdAt: '2026-07-20T10:00:00.000Z',
    city: 'Los Angeles, CA',
    budgetRange: '$2k/mo',
    responseTime: '< 4h',
  },
  {
    id: 'listing-3',
    title: 'Oak Ridge — Legal Review',
    vendorType: 'Real Estate Attorney',
    visibility: 'PRIVATE',
    createdAt: '2026-07-10T10:00:00.000Z',
    city: 'Denver, CO',
    budgetRange: 'Invitation only',
    responseTime: 'Same day',
  },
];

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
  projects?: Array<{
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
    projects: [{ name: 'Elm Street Flip', city: 'Austin', state: 'TX', zip: '78702', propertyType: 'Single-family', subStrategy: 'FLIP' }],
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
    creatorId: 'dev-user-1',
    createdAt: '2026-08-10T00:00:00.000Z',
    projects: [{ name: 'Oak Ridge Hold', city: 'Denver', state: 'CO', zip: '80202', propertyType: 'Single-family', subStrategy: 'BUY_AND_HOLD' }],
    commitments: [],
    invitations: [],
    creator: { name: 'Dev User' },
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

export const SEED_INVESTOR_PROFILES: Array<{ uid: string; data: Record<string, unknown> }> = [
  {
    uid: 'inv-1',
    data: {
      displayName: 'Bob Capital',
      publicProfile: true,
      profileType: 'individual',
      publicBio: 'Buy-and-hold and value-add multifamily across Texas.',
      location: 'Austin, TX',
      strategies: ['buy_and_hold', 'multifamily'],
      followerCount: 128,
      followingCount: 42,
      isVerified: true,
      showRoiPublicly: true,
      avgRoiPct: 14.5,
    },
  },
  {
    uid: 'inv-2',
    data: {
      displayName: 'Atlas Syndicate',
      publicProfile: true,
      profileType: 'team',
      businessName: 'Atlas Syndicate',
      publicBio: 'Institutional-grade syndications with transparent reporting.',
      location: 'Los Angeles, CA',
      strategies: ['multifamily', 'commercial'],
      followerCount: 412,
      followingCount: 18,
      isVerified: true,
      showRoiPublicly: true,
      avgRoiPct: 12.1,
    },
  },
  {
    uid: 'inv-hidden',
    data: {
      displayName: 'Private Investor',
      publicProfile: false,
      profileType: 'individual',
    },
  },
];

export const SEED_DEV_USER_PROFILE: Record<string, unknown> = {
  displayName: 'Dev Investor',
  publicProfile: true,
  profileType: 'individual',
  publicBio: 'Migration preview account for marketplace flows.',
  location: 'Remote',
  strategies: ['flip', 'brrrr'],
  followerCount: 12,
  followingCount: 3,
};

const followingState = new Set<string>(['dev-user-1:inv-1']);

function followKey(followerUid: string, targetUid: string): string {
  return `${followerUid}:${targetUid}`;
}

export function listSeedFollowingIds(followerUid: string): string[] {
  return [...followingState]
    .filter((key) => key.startsWith(`${followerUid}:`))
    .map((key) => key.split(':')[1] ?? '')
    .filter(Boolean);
}

export function updateSeedFollowState(
  followerUid: string,
  targetUid: string,
  follow: boolean,
): { following: boolean; changed: boolean } {
  const key = followKey(followerUid, targetUid);
  const wasFollowing = followingState.has(key);
  if (follow && !wasFollowing) {
    followingState.add(key);
    return { following: true, changed: true };
  }
  if (!follow && wasFollowing) {
    followingState.delete(key);
    return { following: false, changed: true };
  }
  return { following: follow, changed: false };
}

export function isSeedFollowing(followerUid: string, targetUid: string): boolean {
  return followingState.has(followKey(followerUid, targetUid));
}

export function findSeedDealBySlug(normalizedSlug: string) {
  return SEED_RAW_DEALS.find((deal) => deal.slug === normalizedSlug) ?? null;
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

export function seedInvestorActivity(actorUid: string): Array<{ id: string; text: string; at: string }> {
  if (actorUid === 'inv-1') {
    return [
      { id: 'act-1', text: 'Committed to Melrose Duplex syndication', at: '2026-08-04T12:00:00.000Z' },
      { id: 'act-2', text: 'Published buy-and-hold thesis update', at: '2026-07-28T09:00:00.000Z' },
    ];
  }
  return [{ id: 'act-default', text: 'Joined PaperWorking marketplace', at: '2026-07-01T00:00:00.000Z' }];
}

export function formatDealCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateFundingProgress(committed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((committed / target) * 100));
}

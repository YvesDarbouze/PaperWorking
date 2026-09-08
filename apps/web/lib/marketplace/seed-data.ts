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
  targetIrr?: number;
  equityMultiple?: number;
  holdPeriod?: string;
  minInvestment?: number;
  dealType?: 'crowdfunding' | 'syndication';
  imageUrl?: string;
  isVerifiedOperator?: boolean;
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
    targetIrr: 18.4,
    equityMultiple: 1.85,
    holdPeriod: '2–3 Years',
    minInvestment: 25_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
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
    targetIrr: 14.2,
    equityMultiple: 1.60,
    holdPeriod: '3–5 Years',
    minInvestment: 50_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
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
    targetIrr: 9.5,
    equityMultiple: 1.45,
    holdPeriod: '5–7 Years',
    minInvestment: 20_000,
    dealType: 'crowdfunding',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: false,
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
    targetIrr: 16.8,
    equityMultiple: 1.75,
    holdPeriod: '3–5 Years',
    minInvestment: 30_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-3',
    createdAt: '2026-07-25T00:00:00.000Z',
    projects: [{ name: 'Riverside Value-Add', city: 'Nashville', state: 'TN', zip: '37201', propertyType: 'Multi-family', subStrategy: 'VALUE_ADD' }],
    commitments: [{ amount: 80_000, investorId: 'inv-2' }],
    invitations: [{ inviteeUserId: 'dev-user-1', inviteeEmail: 'dev@paperworking.test' }],
    creator: { name: 'River Capital' },
  },
  {
    id: 'deal-mp-5',
    slug: 'brickellgateway',
    address: '800 Brickell Ave, Miami, FL 33131',
    status: 'funding',
    visibility: 'catalog',
    purchasePrice: 2_400_000,
    rehabCost: 450_000,
    arv: 3_800_000,
    holdingCosts: 75_000,
    projectedRoi: 19.2,
    targetIrr: 19.2,
    equityMultiple: 2.10,
    holdPeriod: '3–5 Years',
    minInvestment: 50_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-miami-5',
    createdAt: '2026-08-01T00:00:00.000Z',
    projects: [{ name: 'Brickell Gateway Towers', city: 'Miami', state: 'FL', zip: '33131', propertyType: 'Multi-family', subStrategy: 'VALUE_ADD' }],
    commitments: [
      { amount: 1_200_000, investorId: 'inv-1' },
      { amount: 500_000, investorId: 'inv-3' },
    ],
    invitations: [],
    creator: { name: 'Sunbelt Equity Partners' },
  },
  {
    id: 'deal-mp-6',
    slug: 'trinitylogistics',
    address: '1400 Industrial Blvd, Dallas, TX 75207',
    status: 'funding',
    visibility: 'catalog',
    purchasePrice: 1_850_000,
    rehabCost: 200_000,
    arv: 2_600_000,
    holdingCosts: 40_000,
    projectedRoi: 17.5,
    targetIrr: 17.5,
    equityMultiple: 1.80,
    holdPeriod: '5–7 Years',
    minInvestment: 25_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-dallas-6',
    createdAt: '2026-07-15T00:00:00.000Z',
    projects: [{ name: 'Trinity Logistics Park', city: 'Dallas', state: 'TX', zip: '75207', propertyType: 'Industrial', subStrategy: 'CORE_PLUS' }],
    commitments: [{ amount: 850_000, investorId: 'inv-2' }],
    invitations: [],
    creator: { name: 'Lone Star Industrial' },
  },
  {
    id: 'deal-mp-7',
    slug: 'camelbackresort',
    address: '4900 E Camelback Rd, Phoenix, AZ 85018',
    status: 'published',
    visibility: 'catalog',
    purchasePrice: 3_200_000,
    rehabCost: 600_000,
    arv: 4_900_000,
    holdingCosts: 90_000,
    projectedRoi: 22.4,
    targetIrr: 22.4,
    equityMultiple: 2.25,
    holdPeriod: '3–5 Years',
    minInvestment: 50_000,
    dealType: 'crowdfunding',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-phx-7',
    createdAt: '2026-08-05T00:00:00.000Z',
    projects: [{ name: 'Camelback Luxury Villas', city: 'Phoenix', state: 'AZ', zip: '85018', propertyType: 'Hospitality', subStrategy: 'OPPORTUNISTIC' }],
    commitments: [{ amount: 400_000, investorId: 'inv-4' }],
    invitations: [],
    creator: { name: 'Desert Sun Hospitality' },
  },
  {
    id: 'deal-mp-8',
    slug: 'peachtreemedical',
    address: '1100 Peachtree St NE, Atlanta, GA 30309',
    status: 'published',
    visibility: 'catalog',
    purchasePrice: 1_600_000,
    rehabCost: 180_000,
    arv: 2_250_000,
    holdingCosts: 35_000,
    projectedRoi: 13.8,
    targetIrr: 13.8,
    equityMultiple: 1.55,
    holdPeriod: '5–7 Years',
    minInvestment: 35_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-atl-8',
    createdAt: '2026-07-20T00:00:00.000Z',
    projects: [{ name: 'Peachtree Health Plaza', city: 'Atlanta', state: 'GA', zip: '30309', propertyType: 'Office', subStrategy: 'VALUE_ADD' }],
    commitments: [{ amount: 650_000, investorId: 'inv-1' }],
    invitations: [],
    creator: { name: 'Midtown Capital Group' },
  },
  {
    id: 'deal-mp-9',
    slug: 'highlandmixeduse',
    address: '3200 Tejon St, Denver, CO 80211',
    status: 'funding',
    visibility: 'catalog',
    purchasePrice: 1_450_000,
    rehabCost: 220_000,
    arv: 2_100_000,
    holdingCosts: 30_000,
    projectedRoi: 16.5,
    targetIrr: 16.5,
    equityMultiple: 1.70,
    holdPeriod: '3–5 Years',
    minInvestment: 20_000,
    dealType: 'crowdfunding',
    imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-denver-9',
    createdAt: '2026-08-08T00:00:00.000Z',
    projects: [{ name: 'Highland Urban Center', city: 'Denver', state: 'CO', zip: '80211', propertyType: 'Mixed-Use', subStrategy: 'VALUE_ADD' }],
    commitments: [{ amount: 950_000, investorId: 'inv-3' }],
    invitations: [],
    creator: { name: 'Mile High Syndicate' },
  },
  {
    id: 'deal-mp-10',
    slug: 'southcongressretail',
    address: '1600 S Congress Ave, Austin, TX 78704',
    status: 'published',
    visibility: 'catalog',
    purchasePrice: 1_350_000,
    rehabCost: 150_000,
    arv: 1_900_000,
    holdingCosts: 25_000,
    projectedRoi: 15.0,
    targetIrr: 15.0,
    equityMultiple: 1.65,
    holdPeriod: '3–5 Years',
    minInvestment: 25_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-atx-10',
    createdAt: '2026-07-28T00:00:00.000Z',
    projects: [{ name: 'South Congress Galleria', city: 'Austin', state: 'TX', zip: '78704', propertyType: 'Retail', subStrategy: 'CORE_PLUS' }],
    commitments: [{ amount: 500_000, investorId: 'inv-2' }],
    invitations: [],
    creator: { name: 'ATX Prime Assets' },
  },
  {
    id: 'deal-mp-11',
    slug: 'bayshoreland',
    address: '2200 Bayshore Blvd, Tampa, FL 33606',
    status: 'published',
    visibility: 'catalog',
    purchasePrice: 2_800_000,
    rehabCost: 50_000,
    arv: 4_200_000,
    holdingCosts: 50_000,
    projectedRoi: 23.5,
    targetIrr: 23.5,
    equityMultiple: 2.30,
    holdPeriod: '7+ Years',
    minInvestment: 100_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-tampa-11',
    createdAt: '2026-08-02T00:00:00.000Z',
    projects: [{ name: 'Bayshore Waterfront Parcels', city: 'Tampa', state: 'FL', zip: '33606', propertyType: 'Land', subStrategy: 'OPPORTUNISTIC' }],
    commitments: [{ amount: 300_000, investorId: 'inv-5' }],
    invitations: [],
    creator: { name: 'Gulf Coast Land Trust' },
  },
  {
    id: 'deal-mp-funded-1',
    slug: 'lincolnheightsfunded',
    address: '1400 Lincoln Blvd, Santa Monica, CA 90401',
    status: 'funded',
    visibility: 'catalog',
    purchasePrice: 1_850_000,
    rehabCost: 150_000,
    arv: 2_600_000,
    holdingCosts: 45_000,
    projectedRoi: 17.8,
    targetIrr: 17.8,
    equityMultiple: 1.85,
    holdPeriod: '3–5 Years',
    minInvestment: 50_000,
    dealType: 'syndication',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    isVerifiedOperator: true,
    creatorId: 'creator-sm-12',
    createdAt: '2026-05-10T00:00:00.000Z',
    projects: [{ name: 'Lincoln Heights Flats', city: 'Santa Monica', state: 'CA', zip: '90401', propertyType: 'Multi-family', subStrategy: 'VALUE_ADD' }],
    commitments: [{ amount: 2_000_000, investorId: 'inv-1' }],
    invitations: [],
    creator: { name: 'Pacific Crest Partners' },
  },
];

/** Vendor directory seed for GET /api/vendors (ported from v0 marketplace). */
export const SEED_MARKETPLACE_VENDORS: Array<{
  id: string;
  uid: string;
  companyName: string;
  type: string;
  bio: string;
  specialties: string[];
  licensingStates: string[];
  serviceAreas: string[];
  city: string;
  location: string;
  zip: string;
  avgTurnaroundDays: number;
  overallRating: number;
  totalReviews: number;
  availability: 'Available' | 'Busy' | 'Available in 1 week';
  feeRangeLabel: string;
  verified: boolean;
  insuranceVerified: boolean;
}> = [
  {
    id: 'vendor-1',
    uid: 'vendor-1',
    companyName: 'Lone Star Inspections',
    type: 'Inspector',
    bio: 'Full residential and light-commercial inspections with same-week turnaround across Central Texas.',
    specialties: ['Pre-purchase', 'New construction', 'Sewer scope'],
    licensingStates: ['TX'],
    serviceAreas: ['Austin, TX', '78702', '78704'],
    city: 'Austin',
    location: 'Austin, TX',
    zip: '78702',
    avgTurnaroundDays: 2,
    overallRating: 4.8,
    totalReviews: 42,
    availability: 'Available',
    feeRangeLabel: '$450–$750',
    verified: true,
    insuranceVerified: true,
  },
  {
    id: 'vendor-2',
    uid: 'vendor-2',
    companyName: 'Summit Hard Money',
    type: 'Lender',
    bio: 'Bridge and fix-and-flip financing with 48-hour term sheets for experienced operators.',
    specialties: ['Bridge loans', 'Fix & flip', 'DSCR'],
    licensingStates: ['TX', 'CA', 'CO'],
    serviceAreas: ['Austin, TX', 'Los Angeles, CA', 'Denver, CO'],
    city: 'Austin',
    location: 'Austin, TX',
    zip: '78701',
    avgTurnaroundDays: 3,
    overallRating: 4.5,
    totalReviews: 28,
    availability: 'Available',
    feeRangeLabel: 'Points + rate quote',
    verified: true,
    insuranceVerified: false,
  },
  {
    id: 'vendor-3',
    uid: 'vendor-3',
    companyName: 'Harbor Title & Counsel',
    type: 'Lawyer',
    bio: 'Real estate closings, entity formation, and investor-side contract review.',
    specialties: ['Closings', 'Entity setup', 'Contract review'],
    licensingStates: ['CA', 'NV'],
    serviceAreas: ['Los Angeles, CA', '90029'],
    city: 'Los Angeles',
    location: 'Los Angeles, CA',
    zip: '90029',
    avgTurnaroundDays: 5,
    overallRating: 4.9,
    totalReviews: 61,
    availability: 'Busy',
    feeRangeLabel: '$1.2k–$3.5k',
    verified: true,
    insuranceVerified: true,
  },
  {
    id: 'vendor-4',
    uid: 'vendor-4',
    companyName: 'Ridge Line Builders',
    type: 'Contractor',
    bio: 'Value-add rehabs and punch-list crews specializing in kitchen, bath, and roof packages.',
    specialties: ['Rehab', 'Kitchen remodel', 'Roofing'],
    licensingStates: ['CO', 'TX'],
    serviceAreas: ['Denver, CO', '80202', 'Austin, TX'],
    city: 'Denver',
    location: 'Denver, CO',
    zip: '80202',
    avgTurnaroundDays: 7,
    overallRating: 0,
    totalReviews: 0,
    availability: 'Available in 1 week',
    feeRangeLabel: '$50k–$120k',
    verified: false,
    insuranceVerified: true,
  },
  {
    id: 'vendor-5',
    uid: 'vendor-5',
    companyName: 'Metro Stay Property Mgmt',
    type: 'Property Manager',
    bio: 'Full-service leasing and resident ops for small multifamily portfolios.',
    specialties: ['Leasing', 'Maintenance', 'Owner reporting'],
    licensingStates: ['TN', 'GA'],
    serviceAreas: ['Nashville, TN', '37201'],
    city: 'Nashville',
    location: 'Nashville, TN',
    zip: '37201',
    avgTurnaroundDays: 1,
    overallRating: 4.2,
    totalReviews: 19,
    availability: 'Available',
    feeRangeLabel: '8–10% of rent',
    verified: true,
    insuranceVerified: true,
  },
  {
    id: 'vendor-6',
    uid: 'vendor-6',
    companyName: 'Coastal Listing Partners',
    type: 'Listing Agent',
    bio: 'Investor-focused listing and acquisition brokerage for flips and BRRRR exits.',
    specialties: ['Off-market', 'ARV pricing', 'Buyer rep'],
    licensingStates: ['FL', 'TX'],
    serviceAreas: ['Miami, FL', '33101', 'Austin, TX'],
    city: 'Miami',
    location: 'Miami, FL',
    zip: '33101',
    avgTurnaroundDays: 4,
    overallRating: 4.6,
    totalReviews: 33,
    availability: 'Available',
    feeRangeLabel: '2.5–3% commission',
    verified: true,
    insuranceVerified: false,
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


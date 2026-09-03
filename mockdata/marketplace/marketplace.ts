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

export function seedInvestorActivity(actorUid: string): Array<{ id: string; text: string; at: string }> {
  if (actorUid === 'inv-1') {
    return [
      { id: 'act-1', text: 'Committed to Melrose Duplex syndication', at: '2026-08-04T12:00:00.000Z' },
      { id: 'act-2', text: 'Published buy-and-hold thesis update', at: '2026-07-28T09:00:00.000Z' },
    ];
  }
  return [{ id: 'act-default', text: 'Joined PaperWorking marketplace', at: '2026-07-01T00:00:00.000Z' }];
}

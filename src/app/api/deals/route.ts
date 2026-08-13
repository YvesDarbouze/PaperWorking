import { NextRequest, NextResponse } from 'next/server';

export interface ApiDealPayload {
  id: string;
  slug: string;
  address: string;
  propertyName: string;
  city: string;
  state: string;
  zipCode: string;
  assetClass: string;
  subStrategy: string;
  status: string;
  visibility?: 'marketplace' | 'invitation_only' | 'private';
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  holdingCosts: number;
  projectedRoi: number;
  fundingTarget: number;
  committedAmount: number;
  investorCount: number;
  creatorId: string;
  invitedUsers?: string[];
  createdAt: string;
}

// Seed published deal records with visibility
const SAMPLE_DEALS: ApiDealPayload[] = [
  {
    id: 'deal_123mainst',
    slug: '123mainstaustintx78701',
    address: '123 Main St, Austin, TX 78701',
    propertyName: 'Austin Core Multifamily Project',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    assetClass: 'Multi-family',
    subStrategy: 'FLIP',
    status: 'published',
    visibility: 'marketplace',
    purchasePrice: 350000,
    rehabCost: 50000,
    arv: 480000,
    holdingCosts: 12000,
    projectedRoi: 18.5,
    fundingTarget: 200000,
    committedAmount: 130000,
    investorCount: 5,
    creatorId: 'user_owner_1',
    invitedUsers: ['user_invited_1'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'deal_456congress',
    slug: '456congressaveaustintx78701',
    address: '456 Congress Ave, Austin, TX 78701',
    propertyName: 'Congress Ave Commercial Mixed-Use',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    assetClass: 'Commercial',
    subStrategy: 'BRRRR',
    status: 'published',
    visibility: 'marketplace',
    purchasePrice: 1250000,
    rehabCost: 150000,
    arv: 1750000,
    holdingCosts: 35000,
    projectedRoi: 22.4,
    fundingTarget: 500000,
    committedAmount: 420000,
    investorCount: 12,
    creatorId: 'user_owner_2',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'deal_789oak',
    slug: '789oaklandrddallastx75201',
    address: '789 Oakland Rd, Dallas, TX 75201',
    propertyName: 'Dallas Residential Value-Add Flip',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75201',
    assetClass: 'Residential',
    subStrategy: 'Flip',
    status: 'published',
    visibility: 'marketplace',
    purchasePrice: 280000,
    rehabCost: 45000,
    arv: 395000,
    holdingCosts: 9500,
    projectedRoi: 20.1,
    fundingTarget: 150000,
    committedAmount: 150000,
    investorCount: 4,
    creatorId: 'user_owner_3',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'deal_unlisted_invitation',
    slug: '555unlistedstsanantoniotx78205',
    address: '555 Unlisted St, San Antonio, TX 78205',
    propertyName: 'San Antonio Private Syndicate',
    city: 'San Antonio',
    state: 'TX',
    zipCode: '78205',
    assetClass: 'Multi-family',
    subStrategy: 'Buy and hold',
    status: 'published',
    visibility: 'invitation_only',
    purchasePrice: 600000,
    rehabCost: 80000,
    arv: 850000,
    holdingCosts: 18000,
    projectedRoi: 19.2,
    fundingTarget: 300000,
    committedAmount: 100000,
    investorCount: 2,
    creatorId: 'user_owner_4',
    invitedUsers: ['user_invited_2'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'deal_private_draft',
    slug: '999privatedraftaustintx78702',
    address: '999 Private Draft, Austin, TX 78702',
    propertyName: 'Private Draft Project',
    city: 'Austin',
    state: 'TX',
    zipCode: '78702',
    assetClass: 'Residential',
    subStrategy: 'Flip',
    status: 'draft',
    visibility: 'private',
    purchasePrice: 200000,
    rehabCost: 30000,
    arv: 300000,
    holdingCosts: 5000,
    projectedRoi: 21.0,
    fundingTarget: 100000,
    committedAmount: 0,
    investorCount: 0,
    creatorId: 'user_owner_creator_self',
    createdAt: new Date().toISOString(),
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const tab = (searchParams.get('tab') || 'discover').replace(/-/g, '_');
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const propertyType = searchParams.get('propertyType') || searchParams.get('assetClass') || 'All';
  const strategy = searchParams.get('strategy') || searchParams.get('subStrategy') || 'All';
  const status = searchParams.get('status') || 'All';
  const priceRange = searchParams.get('priceRange') || 'All';
  const sort = searchParams.get('sort') || 'newest';
  const userId = req.headers.get('x-user-id') || searchParams.get('userId') || 'user_123';

  // Visibility filtering rule:
  // Discover tab: return deals where visibility = 'marketplace' AND status IN ('published', 'funding')
  // My Activity tab: return deals where user is creator OR invitee OR has commitment (regardless of visibility)
  let filtered = SAMPLE_DEALS.filter((d) => {
    const isMarketplace = (d.visibility || 'marketplace') === 'marketplace';
    const isPublished = d.status === 'published' || d.status === 'funding';

    if (tab === 'my_activity') {
      const isCreator = d.creatorId === userId;
      const isInvited = d.invitedUsers?.includes(userId);
      return isCreator || isInvited;
    }

    // Default: Discover tab
    return isMarketplace && isPublished;
  });

  // Search query matching (address, city, zip, propertyName, slug)
  if (search) {
    const exactMatches = filtered.filter((d) => {
      const fullText = `${d.address} ${d.propertyName} ${d.city} ${d.zipCode} ${d.slug}`.toLowerCase();
      return fullText.includes(search);
    });

    if (exactMatches.length > 0) {
      filtered = exactMatches;
    } else {
      // Semantic Fallback: Return deals in same city or state
      const fallbackMatches = SAMPLE_DEALS.filter((d) => {
        const isMarketplace = (d.visibility || 'marketplace') === 'marketplace';
        const isPublished = d.status === 'published' || d.status === 'funding';
        if (!isMarketplace || !isPublished) return false;
        return search.includes(d.city.toLowerCase()) || search.includes(d.state.toLowerCase());
      });
      if (fallbackMatches.length > 0) {
        filtered = fallbackMatches;
      }
    }
  }

  // Property Type filter
  if (propertyType !== 'All') {
    filtered = filtered.filter((d) => d.assetClass.toLowerCase() === propertyType.toLowerCase());
  }

  // Strategy filter
  if (strategy !== 'All') {
    filtered = filtered.filter((d) => d.subStrategy.toLowerCase() === strategy.toLowerCase());
  }

  // Status filter
  if (status !== 'All') {
    filtered = filtered.filter((d) => d.status.toLowerCase() === status.toLowerCase());
  }

  // Price Range filter
  if (priceRange !== 'All') {
    filtered = filtered.filter((d) => {
      const price = d.purchasePrice;
      if (priceRange === 'Under $500K') return price < 500000;
      if (priceRange === '$500K – $1M') return price >= 500000 && price <= 1000000;
      if (priceRange === '$1M – $3M') return price >= 1000000 && price <= 3000000;
      if (priceRange === 'Over $3M') return price > 3000000;
      return true;
    });
  }

  // Sorting
  if (sort === 'price_asc') {
    filtered.sort((a, b) => a.purchasePrice - b.purchasePrice);
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => b.purchasePrice - a.purchasePrice);
  } else if (sort === 'funding') {
    filtered.sort((a, b) => (b.committedAmount / b.fundingTarget) - (a.committedAmount / a.fundingTarget));
  } else {
    // Newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return NextResponse.json({
    success: true,
    total: filtered.length,
    deals: filtered,
  });
}

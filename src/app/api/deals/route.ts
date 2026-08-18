import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { normalizeDealStatus } from '@/lib/deals/statuses';

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

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const { searchParams } = new URL(req.url);

  const tab = searchParams.get('tab') || 'discover';
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const propertyType = searchParams.get('propertyType') || searchParams.get('assetClass') || 'All';
  const strategy = searchParams.get('strategy') || searchParams.get('subStrategy') || 'All';
  const statusParam = searchParams.get('status') || 'All';
  const priceRange = searchParams.get('priceRange') || 'All';
  const sort = searchParams.get('sort') || 'newest';
  const userId = req.headers.get('x-user-id') || searchParams.get('userId') || uid;

  try {
    const rawDeals = await prisma.deal.findMany({
      include: {
        invitations: true,
        commitments: true,
        projects: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const mappedDeals: ApiDealPayload[] = (rawDeals || []).map((d: any) => {
      const project = d.projects?.[0];
      const committedAmount = (d.commitments || []).reduce(
        (sum: number, c: any) => sum + Number(c.amount || 0),
        0
      );
      const investorCount = new Set((d.commitments || []).map((c: any) => c.investorId)).size;
      const invitedUsers = (d.invitations || [])
        .map((inv: any) => inv.inviteeUserId || inv.inviteeEmail)
        .filter(Boolean);

      const addrParts = (d.address || '').split(',').map((s: string) => s.trim());
      const city = project?.city || (addrParts.length >= 2 ? addrParts[1] : '') || '';
      let state = project?.state || '';
      let zipCode = project?.zip || '';

      if (addrParts.length >= 3) {
        const stateZip = addrParts[2].split(' ').filter(Boolean);
        if (!state) state = stateZip[0] || '';
        if (!zipCode) zipCode = stateZip[1] || '';
      }

      const purchasePrice = Number(d.purchasePrice || 0);
      const rehabCost = Number(d.rehabCost || 0);
      const arv = Number(d.arv || 0);
      const holdingCosts = Number(d.holdingCosts || 0);
      const projectedRoi = Number(d.projectedRoi || 0);

      return {
        id: d.id,
        slug: d.slug,
        address: d.address,
        propertyName: project?.name || project?.title || d.address.split(',')[0] || 'Real Estate Deal',
        city,
        state,
        zipCode,
        assetClass: project?.propertyType || 'Multi-family',
        subStrategy: project?.subStrategy || 'FLIP',
        status: String(d.status),
        visibility: d.visibility as 'marketplace' | 'invitation_only' | 'private',
        purchasePrice,
        rehabCost,
        arv,
        holdingCosts,
        projectedRoi,
        fundingTarget: purchasePrice + rehabCost,
        committedAmount,
        investorCount,
        creatorId: d.creatorId,
        invitedUsers,
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
      };
    });

    // Visibility filtering rule:
    // Discover tab: return deals where visibility = 'marketplace' AND status IN ('published', 'funding')
    // My Activity tab: return deals where user is creator OR invitee OR has commitment (regardless of visibility)
    let filtered = mappedDeals.filter((d) => {
      const isMarketplace = (d.visibility || 'marketplace') === 'marketplace';
      const norm = normalizeDealStatus(d.status) || d.status.toLowerCase();
      const isPublished = norm === 'published' || norm === 'funding';

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
        // Fallback: Return deals in same city or state
        const fallbackMatches = mappedDeals.filter((d) => {
          const isMarketplace = (d.visibility || 'marketplace') === 'marketplace';
          const norm = normalizeDealStatus(d.status) || d.status.toLowerCase();
          const isPublished = norm === 'published' || norm === 'funding';
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
    if (statusParam !== 'All') {
      const targetStatus = normalizeDealStatus(statusParam);
      if (targetStatus) {
        filtered = filtered.filter((d) => {
          const norm = normalizeDealStatus(d.status) || d.status.toLowerCase();
          return norm === targetStatus;
        });
      } else {
        // Unknown or unrecognized status string -> returns 0 matching deals
        filtered = filtered.filter((d) => d.status.toLowerCase() === statusParam.toLowerCase());
      }
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
      filtered.sort((a, b) => (b.fundingTarget ? b.committedAmount / b.fundingTarget : 0) - (a.fundingTarget ? a.committedAmount / a.fundingTarget : 0));
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return NextResponse.json({
      success: true,
      total: filtered.length,
      deals: filtered,
    });
  } catch (error) {
    console.error('[GET /api/deals] Database query error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}

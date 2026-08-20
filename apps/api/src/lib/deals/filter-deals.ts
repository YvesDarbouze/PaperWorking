import { normalizeDealStatus } from './statuses.js';
import type { ApiDealPayload } from './types.js';

export interface DealsListQuery {
  tab?: string;
  search?: string;
  propertyType?: string;
  assetClass?: string;
  strategy?: string;
  subStrategy?: string;
  status?: string;
  priceRange?: string;
  sort?: string;
  userId?: string;
}

function isPublishedDeal(d: ApiDealPayload): boolean {
  const norm = normalizeDealStatus(d.status) || d.status.toLowerCase();
  return norm === 'published' || norm === 'funding';
}

function isMarketplaceDeal(d: ApiDealPayload): boolean {
  return (d.visibility ?? 'marketplace') === 'marketplace';
}

export function filterDealsByTab(
  deals: ApiDealPayload[],
  tab: string,
  userId: string,
): ApiDealPayload[] {
  return deals.filter((d) => {
    if (tab === 'my_activity') {
      const isCreator = d.creatorId === userId;
      const isInvited = d.invitedUsers?.includes(userId);
      return isCreator || isInvited;
    }
    return isMarketplaceDeal(d) && isPublishedDeal(d);
  });
}

export function applyDealsSearchFilter(
  filtered: ApiDealPayload[],
  allDeals: ApiDealPayload[],
  search: string,
): ApiDealPayload[] {
  const exactMatches = filtered.filter((d) => {
    const fullText =
      `${d.address} ${d.propertyName} ${d.city} ${d.zipCode} ${d.slug}`.toLowerCase();
    return fullText.includes(search);
  });

  if (exactMatches.length > 0) return exactMatches;

  const fallbackMatches = allDeals.filter((d) => {
    if (!isMarketplaceDeal(d) || !isPublishedDeal(d)) return false;
    return search.includes(d.city.toLowerCase()) || search.includes(d.state.toLowerCase());
  });

  return fallbackMatches.length > 0 ? fallbackMatches : filtered;
}

export function filterAndSortDeals(
  mappedDeals: ApiDealPayload[],
  query: DealsListQuery,
): ApiDealPayload[] {
  const tab = query.tab || 'discover';
  const search = (query.search || '').toLowerCase().trim();
  const propertyType = query.propertyType || query.assetClass || 'All';
  const strategy = query.strategy || query.subStrategy || 'All';
  const statusParam = query.status || 'All';
  const priceRange = query.priceRange || 'All';
  const sort = query.sort || 'newest';
  const userId = query.userId || '';

  let filtered = filterDealsByTab(mappedDeals, tab, userId);

  if (search) {
    filtered = applyDealsSearchFilter(filtered, mappedDeals, search);
  }

  if (propertyType !== 'All') {
    filtered = filtered.filter(
      (d) => d.assetClass.toLowerCase() === propertyType.toLowerCase(),
    );
  }

  if (strategy !== 'All') {
    filtered = filtered.filter(
      (d) => d.subStrategy.toLowerCase() === strategy.toLowerCase(),
    );
  }

  if (statusParam !== 'All') {
    const targetStatus = normalizeDealStatus(statusParam);
    if (targetStatus) {
      filtered = filtered.filter((d) => {
        const norm = normalizeDealStatus(d.status) || d.status.toLowerCase();
        return norm === targetStatus;
      });
    } else {
      filtered = filtered.filter(
        (d) => d.status.toLowerCase() === statusParam.toLowerCase(),
      );
    }
  }

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

  if (sort === 'price_asc') {
    filtered.sort((a, b) => a.purchasePrice - b.purchasePrice);
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => b.purchasePrice - a.purchasePrice);
  } else if (sort === 'funding') {
    filtered.sort(
      (a, b) =>
        (b.fundingTarget ? b.committedAmount / b.fundingTarget : 0) -
        (a.fundingTarget ? a.committedAmount / a.fundingTarget : 0),
    );
  } else {
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return filtered;
}

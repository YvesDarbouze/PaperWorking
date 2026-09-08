import type { DealCardData } from '@/components/marketplace/DealCard';

/**
 * Finds up to 3 similar deals for an investor considering a specific deal:
 * 1. Exclude the current deal (by id or slug).
 * 2. Prioritize same asset class AND same market (city/state).
 * 3. Fall back to same asset class across any market if < 3.
 * 4. Fall back to any active available deals if still < 3.
 */
export function getSimilarDeals(
  currentDeal: Partial<DealCardData> & { id?: string; slug?: string; assetClass?: string; city?: string; state?: string },
  allDeals: DealCardData[],
  limit = 3,
): DealCardData[] {
  const currentId = currentDeal.id;
  const currentSlug = currentDeal.slug;
  const currentAsset = (currentDeal.assetClass || '').toLowerCase().trim();
  const currentMarket = [currentDeal.city, currentDeal.state].filter(Boolean).join(', ').toLowerCase().trim();

  // Exclude current deal
  const candidatePool = allDeals.filter(
    (d) => d.id !== currentId && d.slug !== currentSlug,
  );

  const selected: DealCardData[] = [];
  const selectedIds = new Set<string>();

  const addDeal = (deal: DealCardData) => {
    if (!selectedIds.has(deal.id) && selected.length < limit) {
      selected.push(deal);
      selectedIds.add(deal.id);
    }
  };

  // Tier 1: Same Asset Class + Same Market
  if (currentAsset && currentMarket) {
    candidatePool.forEach((d) => {
      const asset = (d.assetClass || '').toLowerCase().trim();
      const market = [d.city, d.state].filter(Boolean).join(', ').toLowerCase().trim();
      if (asset === currentAsset && market === currentMarket) {
        addDeal(d);
      }
    });
  }

  // Tier 2: Same Asset Class (any market)
  if (selected.length < limit && currentAsset) {
    candidatePool.forEach((d) => {
      const asset = (d.assetClass || '').toLowerCase().trim();
      if (asset === currentAsset) {
        addDeal(d);
      }
    });
  }

  // Tier 3: Same Market (different asset class)
  if (selected.length < limit && currentMarket) {
    candidatePool.forEach((d) => {
      const market = [d.city, d.state].filter(Boolean).join(', ').toLowerCase().trim();
      if (market === currentMarket) {
        addDeal(d);
      }
    });
  }

  // Tier 4: Backfill with remaining active opportunities
  if (selected.length < limit) {
    candidatePool.forEach((d) => {
      addDeal(d);
    });
  }

  return selected.slice(0, limit);
}

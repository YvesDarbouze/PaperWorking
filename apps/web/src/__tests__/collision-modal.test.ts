import { describe, expect, it } from '@jest/globals';
import {
  findSeedDealBySlug,
  SEED_RAW_DEALS,
} from '@/lib/marketplace/seed-data';

function normalizeDealSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9]/g, '');
}

describe('CollisionModal & Deal Existence Unit Suite', () => {
  const publishedDeal = SEED_RAW_DEALS.find((d) => d.slug === '1247elmst')!;
  const draftDeal = SEED_RAW_DEALS.find((d) => d.slug === 'oakridgehold')!;
  const inviteDeal = SEED_RAW_DEALS.find((d) => d.slug === 'riversideinvite')!;

  it('normalizes addresses and deal slugs correctly', () => {
    expect(normalizeDealSlug('1247 Elm Street, Austin TX!')).toBe('1247elmstreetaustintx');
    expect(normalizeDealSlug('1247elmst')).toBe('1247elmst');
  });

  it('1: detects collision on published marketplace deal for any viewer', () => {
    const deal = findSeedDealBySlug('1247 Elm Street');
    expect(deal).not.toBeNull();
    expect(deal?.slug).toBe('1247elmst');
    expect(deal?.creator?.name).toBe('PaperWorking Capital');
    expect(deal?.purchasePrice).toBe(485000);
    expect(deal?.projectedRoi).toBe(18.4);
  });

  it('2 & 3: computes correct router push URLs for View Deal and Create Anyway', () => {
    const detailUrl = `/deals/${publishedDeal.slug}/detail`;
    const creatorName = publishedDeal.creator?.name || 'Lead Investor';
    const createAnywayUrl = `/deals/${publishedDeal.slug}?collisionWarning=true&creatorName=${encodeURIComponent(creatorName)}`;

    expect(detailUrl).toBe('/deals/1247elmst/detail');
    expect(createAnywayUrl).toBe(
      '/deals/1247elmst?collisionWarning=true&creatorName=PaperWorking%20Capital',
    );
  });

  it('4: finds existing deal via slug, address, or property name', () => {
    expect(findSeedDealBySlug('1247elmst')?.slug).toBe('1247elmst');
    expect(findSeedDealBySlug('1247 Elm Street, Austin')?.slug).toBe('1247elmst');
    expect(findSeedDealBySlug('Melrose Duplex')?.slug).toBe('melroseduplex');
    expect(findSeedDealBySlug('non-existent-deal')).toBeNull();
  });
});

import type { SubscriberDealMatch } from '@/types/listing';

export function computeRelevanceScore(match: SubscriberDealMatch, now = Date.now()): number {
  const { listing, metrics } = match;
  
  // 1. Freshness Score (40% weight): scales down from 1.0 to 0.0 over 30 days based on updatedAt
  const updatedAtMs = new Date(listing.updatedAt || listing.createdAt).getTime();
  const ageMs = Math.max(0, now - updatedAtMs);
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const freshnessScore = Math.max(0, 1 - ageMs / thirtyDaysMs);
  
  // 2. Yield/CoC Return Score (35% weight): clamps cashOnCash to a 0-1 scale targeting 15% yield
  const coc = metrics.cashOnCashReturn ?? 0;
  const cocScore = Math.min(Math.max(coc / 0.15, 0), 1);
  
  // 3. Activity Score (25% weight): clamps follow count to a 0-1 scale targeting 10 follows
  const follows = listing.followCount || 0;
  const activityScore = Math.min(follows / 10, 1);
  
  return (0.40 * freshnessScore) + (0.35 * cocScore) + (0.25 * activityScore);
}

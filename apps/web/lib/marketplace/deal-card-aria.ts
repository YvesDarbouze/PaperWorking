import type { DealCardData } from '@/components/marketplace/DealCard';

/**
 * Format a number as spoken thousands/millions words for clear screen reader pronunciation.
 * E.g., 25000 -> "25 thousand dollars", 1500000 -> "1.5 million dollars"
 */
function formatCurrencySpoken(amount: number): string {
  if (amount >= 1_000_000) {
    const m = (amount / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${m} million dollars`;
  }
  if (amount >= 1_000) {
    const k = Math.round(amount / 1_000);
    return `${k} thousand dollars`;
  }
  return `${amount} dollars`;
}

/**
 * Composes natural-speech screen reader aria-label for deal cards.
 * Formula: "[Status]. [Property Name], [Location]. Target IRR [X] percent, equity multiple [Y], minimum investment [Z]. [N] percent funded."
 * Example: "New. Meridian Crossing, Austin TX. Target IRR 18.5 percent, equity multiple 1.9, minimum investment 25 thousand dollars. 62 percent funded."
 */
export function composeDealCardAriaLabel(deal: DealCardData): string {
  const normStatus = (deal.status || 'published').toLowerCase();
  const target = deal.fundingTarget ?? deal.target ?? ((deal.purchasePrice ?? 500_000) + 100_000);
  const committed = deal.committedAmount ?? deal.committed ?? 0;
  const progressPercent = target > 0 ? Math.min(100, Math.round((committed / target) * 100)) : 0;

  const isFunded = normStatus === 'funded' || progressPercent >= 100;
  const isClosingSoon = normStatus === 'closing_soon' || progressPercent >= 85;

  let statusPrefix = 'Open.';
  if (isFunded) {
    statusPrefix = 'Fully Funded.';
  } else if (isClosingSoon) {
    statusPrefix = 'Closing Soon.';
  } else if (normStatus === 'funding' || normStatus === 'published') {
    statusPrefix = 'New.';
  }

  const name = deal.propertyName || deal.name || deal.address.split(',')[0] || 'Opportunity';
  const location = deal.city && deal.state ? `${deal.city} ${deal.state}` : deal.address;
  const irr = deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 18.4;
  const em = deal.equityMultiple ?? 1.85;
  const minInvest = deal.minInvestment ?? 25_000;

  return `${statusPrefix} ${name}, ${location}. Target IRR ${irr} percent, equity multiple ${em}, minimum investment ${formatCurrencySpoken(minInvest)}. ${progressPercent} percent funded.`;
}

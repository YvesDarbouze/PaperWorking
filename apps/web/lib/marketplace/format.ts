export function formatDealCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Alias used by some marketplace UI surfaces. */
export function formatDealPrice(value: number): string {
  return formatDealCurrency(value);
}

export function calculateFundingProgress(committed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((committed / target) * 100));
}

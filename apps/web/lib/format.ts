/**
 * Shared formatting utilities for PaperWorking commercial real estate metrics.
 * Provides consistent compact currency, percentages, equity multiples, and hold periods.
 */

/**
 * Formats a monetary amount into a compact human-readable string.
 * e.g. 1_250_000 -> "$1.25M", 485_000 -> "$485K", 25_000 -> "$25K"
 */
export function formatCurrencyCompact(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$0';
  }

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}$${val}B`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}$${val}M`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(0);
    return `${sign}$${val}K`;
  }
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

/**
 * Formats an amount with full commas and no decimal cents.
 * e.g. 1_250_000 -> "$1,250,000"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$0';
  }
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * Formats a percentage number with 1 decimal place (or specified decimals).
 * e.g. 18.42 -> "18.4%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0.0%';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats an equity multiple with 'x' suffix.
 * e.g. 1.85 -> "1.85x"
 */
export function formatMultiple(value: number, decimals: number = 2): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '1.00x';
  }
  return `${value.toFixed(decimals)}x`;
}

/**
 * Formats a hold period in years.
 * e.g. 3 -> "3 Years", "3–5" -> "3–5 Years"
 */
export function formatHoldPeriod(years: number | string): string {
  if (!years) return '3–5 Years';
  if (typeof years === 'string') {
    if (years.toLowerCase().includes('year')) return years;
    return `${years} Years`;
  }
  return `${years} Year${years === 1 ? '' : 's'}`;
}

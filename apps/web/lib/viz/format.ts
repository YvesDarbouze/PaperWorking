/**
 * Centralized Data Visualization Formatter (@/lib/viz/format.ts)
 * Governed by Article 1 & Article 2 of the Data Visualization Constitution.
 */

export interface CurrencyFormatOptions {
  compact?: boolean;
  decimals?: number;
  signDisplay?: 'auto' | 'always' | 'never';
  negativeParens?: boolean;
}

export interface PercentFormatOptions {
  decimals?: number;
  signDisplay?: 'auto' | 'always' | 'never';
  multiply?: boolean;
}

export interface MultipleFormatOptions {
  decimals?: number;
  symbol?: 'x' | '×';
}

/**
 * Formats a currency value with institutional accuracy and K/M/B rules.
 * Examples:
 *   formatCurrency(1250000, { compact: true }) => "$1.25M"
 *   formatCurrency(450000, { compact: true }) => "$450K"
 *   formatCurrency(1250000) => "$1,250,000"
 *   formatCurrency(-50000, { negativeParens: true }) => "($50,000)"
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '—';
  }

  const {
    compact = false,
    decimals,
    signDisplay = 'auto',
    negativeParens = false,
  } = options;

  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formattedNumber: string;

  if (compact) {
    if (abs >= 1_000_000_000) {
      const dec = decimals ?? 2;
      let numStr = (abs / 1_000_000_000).toFixed(dec);
      if (numStr.includes('.')) numStr = numStr.replace(/\.?0+$/, '');
      formattedNumber = `$${numStr}B`;
    } else if (abs >= 1_000_000) {
      const dec = decimals ?? 2;
      let numStr = (abs / 1_000_000).toFixed(dec);
      if (numStr.includes('.')) numStr = numStr.replace(/\.?0+$/, '');
      formattedNumber = `$${numStr}M`;
    } else if (abs >= 1_000) {
      const defaultDec = abs < 10_000 && abs % 1_000 !== 0 ? 1 : 0;
      const dec = decimals ?? defaultDec;
      let numStr = (abs / 1_000).toFixed(dec);
      if (numStr.includes('.')) numStr = numStr.replace(/\.?0+$/, '');
      formattedNumber = `$${numStr}K`;
    } else {
      const dec = decimals ?? 0;
      formattedNumber = `$${abs.toLocaleString('en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      })}`;
    }
  } else {
    const dec = decimals ?? 0;
    formattedNumber = `$${abs.toLocaleString('en-US', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    })}`;
  }

  if (isNegative) {
    if (negativeParens) {
      return `(${formattedNumber})`;
    }
    return `-${formattedNumber}`;
  }

  if (signDisplay === 'always' && amount > 0) {
    return `+${formattedNumber}`;
  }

  return formattedNumber;
}

/**
 * Formats a percentage with strict tabular decimal control.
 * Examples:
 *   formatPercent(18.42) => "18.4%"
 *   formatPercent(0.1842, { multiply: true }) => "18.4%"
 *   formatPercent(2.5, { signDisplay: 'always' }) => "+2.5%"
 */
export function formatPercent(
  value: number | null | undefined,
  options: PercentFormatOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  const { decimals = 1, signDisplay = 'auto', multiply = false } = options;
  const adjusted = multiply ? value * 100 : value;
  const isNegative = adjusted < 0;
  const abs = Math.abs(adjusted);

  const numStr = abs.toFixed(decimals);

  if (isNegative) {
    return `-${numStr}%`;
  }
  if (signDisplay === 'always' && adjusted > 0) {
    return `+${numStr}%`;
  }
  return `${numStr}%`;
}

/**
 * Formats an equity multiple with tabular standard.
 * Examples:
 *   formatMultiple(1.854) => "1.85×"
 */
export function formatMultiple(
  value: number | null | undefined,
  options: MultipleFormatOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  const { decimals = 2, symbol = '×' } = options;
  return `${value.toFixed(decimals)}${symbol}`;
}

/**
 * Formats a standard ratio without trailing unit.
 * Examples:
 *   formatRatio(1.254) => "1.25"
 */
export function formatRatio(
  value: number | null | undefined,
  decimals: number = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(decimals);
}

/**
 * Computes human-friendly round tick ranges per Article 2.
 * Produces uniform, cognitively pleasant intervals (0, 10, 20 or 0, 25, 50, etc.).
 */
export function niceTickRange(
  minVal: number,
  maxVal: number,
  targetTicks: number = 5,
): { min: number; max: number; step: number; ticks: number[] } {
  if (minVal === maxVal) {
    return {
      min: minVal,
      max: maxVal + 1,
      step: 1,
      ticks: [minVal, maxVal + 1],
    };
  }

  const range = Math.max(0.0001, maxVal - minVal);
  const roughStep = range / Math.max(1, targetTicks - 1);

  // Determine order of magnitude
  const exponent = Math.floor(Math.log10(roughStep));
  const fraction = roughStep / Math.pow(10, exponent);

  let niceFraction: number;
  if (fraction < 1.5) {
    niceFraction = 1;
  } else if (fraction < 2.25) {
    niceFraction = 2;
  } else if (fraction < 3.5) {
    niceFraction = 2.5;
  } else if (fraction < 7.5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  const step = niceFraction * Math.pow(10, exponent);
  const niceMin = Math.floor(minVal / step) * step;
  const niceMax = Math.ceil(maxVal / step) * step;

  const ticks: number[] = [];
  for (let t = niceMin; t <= niceMax + step * 0.5; t += step) {
    // Avoid IEEE 754 precision drift
    ticks.push(Number(t.toFixed(Math.max(0, -exponent + 2))));
  }

  return {
    min: niceMin,
    max: niceMax,
    step,
    ticks,
  };
}

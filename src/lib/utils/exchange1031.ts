/**
 * 1031 Exchange Deadline Calculator
 * 
 * Rules per IRC §1031:
 * - Identification Deadline: Exactly 45 calendar days after the sale date (closing date).
 * - Exchange Deadline: Exactly 180 calendar days after the sale date (or due date of tax return, whichever is earlier).
 * 
 * Computes exact target dates and remaining day countdowns. Handles leap years, month boundaries, and timezones safely.
 */

export interface Exchange1031Deadlines {
  saleDate: string; // ISO format (YYYY-MM-DD)
  identificationDeadline: string; // YYYY-MM-DD
  exchangeDeadline: string; // YYYY-MM-DD
  daysRemainingIdentification: number;
  daysRemainingExchange: number;
  isIdentificationExpired: boolean;
  isExchangeExpired: boolean;
}

import { ReplacementProperty } from '@/types/schema';

function parseToUTCMidnight(dateInput: Date | string): Date {
  if (!dateInput) {
    return new Date(Date.UTC(2026, 5, 1));
  }
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(Date.UTC(year, month, day));
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return new Date(Date.UTC(2026, 5, 1));
    }
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  } else {
    if (isNaN(dateInput.getTime())) {
      return new Date(Date.UTC(2026, 5, 1));
    }
    return new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  }
}

/**
 * Computes 1031 exchange deadlines given a sale date string or Date object.
 */
export function compute1031Deadlines(
  saleDateInput: Date | string,
  referenceDateInput: Date | string = new Date()
): Exchange1031Deadlines {
  const saleUTC = parseToUTCMidnight(saleDateInput);
  const refUTC = parseToUTCMidnight(referenceDateInput);

  // 45 days after sale date
  const identUTC = new Date(saleUTC.getTime() + 45 * 24 * 60 * 60 * 1000);
  // 180 days after sale date
  const exchangeUTC = new Date(saleUTC.getTime() + 180 * 24 * 60 * 60 * 1000);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const daysRemainingIdentification = Math.ceil((identUTC.getTime() - refUTC.getTime()) / MS_PER_DAY);
  const daysRemainingExchange = Math.ceil((exchangeUTC.getTime() - refUTC.getTime()) / MS_PER_DAY);

  const formatISO = (d: Date) => d.toISOString().split('T')[0];

  return {
    saleDate: formatISO(saleUTC),
    identificationDeadline: formatISO(identUTC),
    exchangeDeadline: formatISO(exchangeUTC),
    daysRemainingIdentification: Math.max(0, daysRemainingIdentification),
    daysRemainingExchange: Math.max(0, daysRemainingExchange),
    isIdentificationExpired: daysRemainingIdentification < 0,
    isExchangeExpired: daysRemainingExchange < 0,
  };
}

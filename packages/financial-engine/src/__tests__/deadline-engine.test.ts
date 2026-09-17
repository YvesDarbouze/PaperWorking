import { describe, expect, it } from '@jest/globals';
import {
  deriveIanaTimezoneFromAddress,
  computeContractualDeadline,
  addBusinessDaysToLocalDate,
  addCalendarDaysToLocalDate,
  createUtcInstantFromLocalWallClock,
  getLocalDateParts,
  isWeekend,
} from '../deadline-engine.js';

describe('Deadline Semantics & Timezone Engine', () => {
  // ===========================================================================
  // 1. IANA TIMEZONE DERIVATION FROM ADDRESS
  // ===========================================================================
  describe('1. IANA Timezone Derivation (deriveIanaTimezoneFromAddress)', () => {
    it('derives America/Chicago for Texas addresses', () => {
      expect(deriveIanaTimezoneFromAddress('742 Evergreen Terrace, Austin, TX 78704')).toBe(
        'America/Chicago',
      );
      expect(deriveIanaTimezoneFromAddress('100 Main St, Dallas, TX')).toBe('America/Chicago');
      expect(deriveIanaTimezoneFromAddress('Houston, Texas')).toBe('America/Chicago');
    });

    it('derives America/New_York for Eastern states', () => {
      expect(deriveIanaTimezoneFromAddress('350 5th Ave, New York, NY 10118')).toBe(
        'America/New_York',
      );
      expect(deriveIanaTimezoneFromAddress('100 Biscayne Blvd, Miami, FL 33132')).toBe(
        'America/New_York',
      );
      expect(deriveIanaTimezoneFromAddress('Atlanta, Georgia')).toBe('America/New_York');
    });

    it('derives America/Los_Angeles for Pacific states', () => {
      expect(deriveIanaTimezoneFromAddress('123 Market St, San Francisco, CA 94105')).toBe(
        'America/Los_Angeles',
      );
      expect(deriveIanaTimezoneFromAddress('Seattle, Washington')).toBe('America/Los_Angeles');
    });

    it('derives America/Phoenix for Arizona (no DST)', () => {
      expect(deriveIanaTimezoneFromAddress('400 E Van Buren St, Phoenix, AZ 85004')).toBe(
        'America/Phoenix',
      );
      expect(deriveIanaTimezoneFromAddress('Tucson, Arizona')).toBe('America/Phoenix');
    });

    it('derives America/Denver for Mountain states', () => {
      expect(deriveIanaTimezoneFromAddress('1600 Glenarm Pl, Denver, CO 80202')).toBe(
        'America/Denver',
      );
      expect(deriveIanaTimezoneFromAddress('Salt Lake City, Utah')).toBe('America/Denver');
    });

    it('falls back to America/New_York when no state identifiable', () => {
      expect(deriveIanaTimezoneFromAddress('')).toBe('America/New_York');
      expect(deriveIanaTimezoneFromAddress('Unknown Property Location')).toBe('America/New_York');
    });
  });

  // ===========================================================================
  // 2. CALENDAR DAYS VS BUSINESS DAYS VS EXACT HOURS
  // ===========================================================================
  describe('2. Calculation Modes (Calendar Days, Business Days, Exact Hours)', () => {
    it('computes calendar days adding weekend days', () => {
      // Friday 2026-06-05 + 3 calendar days = Monday 2026-06-08 at 5:00 PM local
      const res = computeContractualDeadline({
        baseDate: '2026-06-05T12:00:00Z',
        offsetValue: 3,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/New_York',
      });

      expect(res.localRepresentation.localDate).toBe('2026-06-08');
      expect(res.localRepresentation.localTime).toBe('17:00:00');
      expect(res.localRepresentation.timezone).toBe('America/New_York');
      expect(res.localRepresentation.formatted).toBe('2026-06-08 17:00:00 [America/New_York]');
    });

    it('computes business days correctly skipping weekends', () => {
      // Thursday 2026-06-04 + 3 business days:
      // Day 1 = Friday 2026-06-05
      // Saturday & Sunday skipped
      // Day 2 = Monday 2026-06-08
      // Day 3 = Tuesday 2026-06-09
      const res = computeContractualDeadline({
        baseDate: '2026-06-04T12:00:00Z',
        offsetValue: 3,
        offsetType: 'business_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/Chicago',
      });

      expect(res.localRepresentation.localDate).toBe('2026-06-09');
      expect(res.localRepresentation.localTime).toBe('17:00:00');
      expect(res.localRepresentation.timezone).toBe('America/Chicago');
    });

    it('computes exact hours offset backwards for progressive alert warning (T-48h)', () => {
      // Target deadline: 2026-06-10T17:00:00-04:00 (EDT)
      const targetInstant = new Date('2026-06-10T21:00:00.000Z'); // 17:00 EDT is 21:00 UTC
      const res = computeContractualDeadline({
        baseDate: targetInstant,
        offsetValue: -48,
        offsetType: 'exact_hours',
        ianaTimezone: 'America/New_York',
      });

      expect(res.utcIso).toBe('2026-06-08T21:00:00.000Z');
      expect(res.localRepresentation.localDate).toBe('2026-06-08');
      expect(res.localRepresentation.localTime).toBe('17:00:00');
    });
  });

  // ===========================================================================
  // 3. DST BOUNDARIES GOLDEN TESTS
  // ===========================================================================
  describe('3. Daylight Saving Time (DST) Golden Tests', () => {
    it('preserves 5:00 PM contractual wall-clock across Spring Forward (23-hour day)', () => {
      // Spring Forward in US in 2026 occurs on Sunday, March 8, 2026 at 2:00 AM (EST -> EDT).
      // On Friday March 6, New York is in standard time (EST, UTC-5).
      // A contract signed on Friday March 6 with a 5-calendar-day deadline falls on Wednesday March 11.
      // On March 11, New York is in daylight saving time (EDT, UTC-4).
      // Contractual 5:00 PM must evaluate to 17:00:00 EDT = 21:00:00 UTC (NOT 22:00:00 UTC!).
      const res = computeContractualDeadline({
        baseDate: '2026-03-06T12:00:00Z',
        offsetValue: 5,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/New_York',
      });

      expect(res.localRepresentation.localDate).toBe('2026-03-11');
      expect(res.localRepresentation.localTime).toBe('17:00:00');
      expect(res.localRepresentation.formatted).toBe('2026-03-11 17:00:00 [America/New_York]');
      // 17:00 EDT is 21:00:00.000Z
      expect(res.utcIso).toBe('2026-03-11T21:00:00.000Z');
    });

    it('preserves 5:00 PM contractual wall-clock before Spring Forward', () => {
      // Friday March 6, 2026 before DST: 17:00:00 EST = 22:00:00.000Z
      const res = computeContractualDeadline({
        baseDate: '2026-03-05T12:00:00Z',
        offsetValue: 1,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/New_York',
      });

      expect(res.localRepresentation.localDate).toBe('2026-03-06');
      expect(res.localRepresentation.localTime).toBe('17:00:00');
      // 17:00 EST is 22:00:00.000Z
      expect(res.utcIso).toBe('2026-03-06T22:00:00.000Z');
    });

    it('preserves 5:00 PM contractual wall-clock across Fall Back (25-hour day)', () => {
      // Fall Back in US in 2026 occurs on Sunday, November 1, 2026 at 2:00 AM (EDT -> EST).
      // Friday October 30 is in EDT (UTC-4).
      // 4 calendar days later is Tuesday November 3, which is in EST (UTC-5).
      // Contractual 5:00 PM must evaluate to 17:00:00 EST = 22:00:00 UTC (NOT 21:00:00 UTC!).
      const res = computeContractualDeadline({
        baseDate: '2026-10-30T12:00:00Z',
        offsetValue: 4,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/New_York',
      });

      expect(res.localRepresentation.localDate).toBe('2026-11-03');
      expect(res.localRepresentation.localTime).toBe('17:00:00');
      expect(res.utcIso).toBe('2026-11-03T22:00:00.000Z');
    });

    it('correctly handles non-DST Arizona timezone throughout year', () => {
      // America/Phoenix is always UTC-7 all year round
      const winterRes = computeContractualDeadline({
        baseDate: '2026-01-15T12:00:00Z',
        offsetValue: 5,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/Phoenix',
      });
      // 17:00 MST is 00:00 UTC next day
      expect(winterRes.utcIso).toBe('2026-01-21T00:00:00.000Z');

      const summerRes = computeContractualDeadline({
        baseDate: '2026-07-15T12:00:00Z',
        offsetValue: 5,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/Phoenix',
      });
      // Still UTC-7: 17:00 + 7h = 00:00 UTC next day
      expect(summerRes.utcIso).toBe('2026-07-21T00:00:00.000Z');
    });
  });

  // ===========================================================================
  // 4. MONTH-END BOUNDARIES GOLDEN TESTS
  // ===========================================================================
  describe('4. Month-End Boundaries Golden Tests', () => {
    it('correctly rolls over 30-day month (April -> May)', () => {
      const res = computeContractualDeadline({
        baseDate: '2026-04-28T12:00:00Z',
        offsetValue: 5,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/Chicago',
      });

      expect(res.localRepresentation.localDate).toBe('2026-05-03');
    });

    it('correctly handles February in non-leap year (28 days in 2026)', () => {
      const res = computeContractualDeadline({
        baseDate: '2026-02-26T12:00:00Z',
        offsetValue: 4,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/Chicago',
      });

      // Feb 26 + 4 days = March 2 in 2026 (non-leap year)
      expect(res.localRepresentation.localDate).toBe('2026-03-02');
    });

    it('correctly handles February in leap year (29 days in 2028)', () => {
      const res = computeContractualDeadline({
        baseDate: '2028-02-26T12:00:00Z',
        offsetValue: 4,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/Chicago',
      });

      // Feb 26 + 4 days = March 1 in 2028 (leap year)
      expect(res.localRepresentation.localDate).toBe('2028-03-01');
    });

    it('rolls over December to January of next year', () => {
      const res = computeContractualDeadline({
        baseDate: '2026-12-29T12:00:00Z',
        offsetValue: 5,
        offsetType: 'calendar_days',
        deadlineTime: '17:00:00',
        ianaTimezone: 'America/New_York',
      });

      expect(res.localRepresentation.localDate).toBe('2027-01-03');
    });
  });
});

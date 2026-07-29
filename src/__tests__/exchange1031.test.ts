import { compute1031Deadlines } from '@/lib/utils/exchange1031';

describe('1031 Exchange Deadline Calculator', () => {
  it('calculates 45-day and 180-day deadlines for a standard date', () => {
    // Sale Date: 2026-06-01
    const saleDate = '2026-06-01';
    const refDate = '2026-06-01';
    const result = compute1031Deadlines(saleDate, refDate);

    expect(result.saleDate).toBe('2026-06-01');
    // 45 days after June 1 = July 16
    expect(result.identificationDeadline).toBe('2026-07-16');
    // 180 days after June 1 = November 28
    expect(result.exchangeDeadline).toBe('2026-11-28');
    expect(result.daysRemainingIdentification).toBe(45);
    expect(result.daysRemainingExchange).toBe(180);
    expect(result.isIdentificationExpired).toBe(false);
    expect(result.isExchangeExpired).toBe(false);
  });

  it('handles leap year correctly (Feb 29, 2028)', () => {
    // 2028 is a leap year (February has 29 days)
    const saleDate = '2028-02-15';
    const refDate = '2028-02-15';
    const result = compute1031Deadlines(saleDate, refDate);

    // 45 days after Feb 15 in leap year:
    // Feb has 14 days left (16th..29th), March has 31 days (14+31 = 45 -> March 31)
    expect(result.identificationDeadline).toBe('2028-03-31');
    // 180 days after Feb 15, 2028
    expect(result.exchangeDeadline).toBe('2028-08-13');

    // Leap day sale date (Feb 29, 2028)
    const leapDayResult = compute1031Deadlines('2028-02-29', '2028-02-29');
    // 45 days after Feb 29, 2028 = April 14, 2028 (March 31 days + April 14 days = 45)
    expect(leapDayResult.identificationDeadline).toBe('2028-04-14');
    // 180 days after Feb 29, 2028 = August 27, 2028
    expect(leapDayResult.exchangeDeadline).toBe('2028-08-27');
  });

  it('handles month boundaries crossing year end', () => {
    const saleDate = '2026-12-01';
    const refDate = '2026-12-01';
    const result = compute1031Deadlines(saleDate, refDate);

    // 45 days after Dec 1 = Jan 15 of next year
    expect(result.identificationDeadline).toBe('2027-01-15');
    // 180 days after Dec 1 = May 30 of next year
    expect(result.exchangeDeadline).toBe('2027-05-30');
  });

  it('correctly tracks days remaining and expiry statuses', () => {
    const saleDate = '2026-01-01';
    // Reference date 50 days after sale
    const refDate = '2026-02-20';
    const result = compute1031Deadlines(saleDate, refDate);

    expect(result.daysRemainingIdentification).toBe(0); // Clamped at Math.max(0, ...)
    expect(result.isIdentificationExpired).toBe(true);
    expect(result.daysRemainingExchange).toBe(130);
    expect(result.isExchangeExpired).toBe(false);
  });
});

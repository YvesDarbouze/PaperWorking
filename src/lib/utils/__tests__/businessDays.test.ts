import { getBusinessDaysDiff, addBusinessDays } from '../businessDays';

describe('businessDays utility: getBusinessDaysDiff', () => {
  it('returns 0 if either date is missing or invalid', () => {
    expect(getBusinessDaysDiff('', '')).toBe(0);
    expect(getBusinessDaysDiff('invalid', '2026-07-01')).toBe(0);
    expect(getBusinessDaysDiff('2026-07-01', 'invalid')).toBe(0);
  });

  it('returns 0 if date1 is after or equal to date2', () => {
    expect(getBusinessDaysDiff('2026-07-05', '2026-07-01')).toBe(0);
    expect(getBusinessDaysDiff('2026-07-01', '2026-07-01')).toBe(0);
  });

  it('calculates strict business days diff excluding weekends correctly (Monday to Friday)', () => {
    // Mon Jul 20 to Fri Jul 24 (Tues, Wed, Thurs = 3 days)
    expect(getBusinessDaysDiff('2026-07-20', '2026-07-24')).toBe(3);
  });

  it('calculates strict business days diff excluding weekends correctly (Friday to Tuesday)', () => {
    // Fri Jul 17 to Tue Jul 21 (Mon = 1 day)
    expect(getBusinessDaysDiff('2026-07-17', '2026-07-21')).toBe(1);
  });

  it('calculates strict business days diff excluding weekends correctly (Friday to Wednesday)', () => {
    // Fri Jul 17 to Wed Jul 22 (Mon, Tue = 2 days)
    expect(getBusinessDaysDiff('2026-07-17', '2026-07-22')).toBe(2);
  });

  it('calculates strict business days diff excluding weekends correctly (Friday to Thursday)', () => {
    // Fri Jul 17 to Thu Jul 23 (Mon, Tue, Wed = 3 days)
    expect(getBusinessDaysDiff('2026-07-17', '2026-07-23')).toBe(3);
  });
});

describe('businessDays utility: addBusinessDays', () => {
  it('adds business days correctly skipping weekends', () => {
    // Mon Jul 20, 2026 + 3 business days = Thu Jul 23, 2026
    const start1 = new Date('2026-07-20T12:00:00Z');
    const result1 = addBusinessDays(start1, 3);
    expect(result1.toISOString().split('T')[0]).toBe('2026-07-23');

    // Fri Jul 17, 2026 + 3 business days = Wed Jul 22, 2026
    const start2 = new Date('2026-07-17T12:00:00Z');
    const result2 = addBusinessDays(start2, 3);
    expect(result2.toISOString().split('T')[0]).toBe('2026-07-22');
  });
});

import { getBusinessDaysDiff } from '../businessDays';

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

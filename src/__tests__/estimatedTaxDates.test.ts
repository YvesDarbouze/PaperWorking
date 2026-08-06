import {
  DUE_SOON_DAYS,
  daysUntil,
  estimatedPaymentDueSoon,
  estimatedTaxDueDates,
  nextEstimatedTaxDueDate,
} from '@/lib/reports/estimatedTaxDates';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('1040-ES estimated tax dates', () => {
  it('returns the four statutory deadlines', () => {
    const dates = estimatedTaxDueDates(2026);
    expect(dates.map((d) => d.quarter)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(dates[0].dueDate).toEqual(utc(2026, 4, 15));
    expect(dates[1].dueDate).toEqual(utc(2026, 6, 15));
    expect(dates[2].dueDate).toEqual(utc(2026, 9, 15));
  });

  it('places Q4 in January of the FOLLOWING year', () => {
    const q4 = estimatedTaxDueDates(2026)[3];
    expect(q4.dueDate).toEqual(utc(2027, 1, 15));
    // …while still belonging to the 2026 tax year.
    expect(q4.taxYear).toBe(2026);
  });

  describe('nextEstimatedTaxDueDate', () => {
    it('picks the upcoming quarter mid-year', () => {
      expect(nextEstimatedTaxDueDate(utc(2026, 8, 5)).quarter).toBe('Q3');
    });

    it('returns today when a deadline lands on it', () => {
      const next = nextEstimatedTaxDueDate(utc(2026, 9, 15));
      expect(next.quarter).toBe('Q3');
      expect(daysUntil(next.dueDate, utc(2026, 9, 15))).toBe(0);
    });

    it('rolls into the prior tax year Q4 during early January', () => {
      const next = nextEstimatedTaxDueDate(utc(2027, 1, 5));
      expect(next.quarter).toBe('Q4');
      expect(next.taxYear).toBe(2026);
      expect(next.dueDate).toEqual(utc(2027, 1, 15));
    });

    it('moves to the next year Q1 after the final deadline passes', () => {
      const next = nextEstimatedTaxDueDate(utc(2027, 1, 16));
      expect(next.quarter).toBe('Q1');
      expect(next.dueDate).toEqual(utc(2027, 4, 15));
    });
  });

  describe('daysUntil', () => {
    it('counts whole days', () => {
      expect(daysUntil(utc(2026, 9, 15), utc(2026, 9, 1))).toBe(14);
    });

    it('is zero on the day itself, ignoring time of day', () => {
      expect(daysUntil(utc(2026, 9, 15), new Date(Date.UTC(2026, 8, 15, 23, 59)))).toBe(0);
    });
  });

  describe('estimatedPaymentDueSoon', () => {
    it('alerts inside the 30-day window', () => {
      const s = estimatedPaymentDueSoon(utc(2026, 9, 1));
      expect(s.dueSoon).toBe(true);
      expect(s.quarter).toBe('Q3');
      expect(s.days).toBe(14);
      expect(s.label).toBe('Q3 estimated payment due in 14 days');
    });

    it('stays quiet outside the window', () => {
      // Aug 5 -> Sep 15 is 41 days.
      const s = estimatedPaymentDueSoon(utc(2026, 8, 5));
      expect(s.days).toBeGreaterThan(DUE_SOON_DAYS);
      expect(s.dueSoon).toBe(false);
    });

    it('reads naturally on the day and the day before', () => {
      expect(estimatedPaymentDueSoon(utc(2026, 9, 15)).label).toContain('due today');
      expect(estimatedPaymentDueSoon(utc(2026, 9, 14)).label).toContain('due in 1 day');
    });

    it('honours a custom window', () => {
      expect(estimatedPaymentDueSoon(utc(2026, 8, 5), 60).dueSoon).toBe(true);
    });
  });
});

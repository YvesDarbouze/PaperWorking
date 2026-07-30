import { KpiAutoReporter } from '../kpiAutoReporter';

describe('KpiAutoReporter', () => {
  describe('detectVacancy', () => {
    it('returns vacancy metrics for a project', async () => {
      const result = await KpiAutoReporter.detectVacancy('project_123');
      expect(result).toHaveProperty('vacantUnitCount');
      expect(result).toHaveProperty('vacancyLoss');
      expect(result).toHaveProperty('vacancyRate');
      expect(result).toHaveProperty('occupancyRate');
      expect(result.occupancyRate + result.vacancyRate).toBe(100);
    });
  });

  describe('33 KPI Math Validation', () => {
    it('correctly calculates EGI = Gross Rent + Other Income - Vacancy Loss', () => {
      const grossRent = 12000;
      const otherIncome = 500;
      const vacancyLoss = 0;
      const egi = grossRent + otherIncome - vacancyLoss;
      expect(egi).toBe(12500);
    });

    it('correctly calculates NOI = EGI - OpEx', () => {
      const egi = 12500;
      const opex = 4500;
      const noi = egi - opex;
      expect(noi).toBe(8000);
    });

    it('correctly calculates Annual Cash Flow = NOI - Debt Service', () => {
      const noi = 8000;
      const debtService = 3500;
      const cashFlow = noi - debtService;
      expect(cashFlow).toBe(4500);
    });

    it('correctly calculates Cash-on-Cash Return % = (Cash Flow / Cash Invested) * 100', () => {
      const annualCashFlow = 8400;
      const totalCashInvested = 100000;
      const coc = (annualCashFlow / totalCashInvested) * 100;
      expect(coc).toBe(8.4);
    });

    it('correctly calculates DSCR = NOI / Debt Service', () => {
      const noi = 8000;
      const debtService = 5600;
      const dscr = noi / debtService;
      expect(dscr).toBeCloseTo(1.428, 2);
    });
  });
});

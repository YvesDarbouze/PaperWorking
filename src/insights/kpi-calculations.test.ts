import { calculateKPIs } from '@/lib/insights/kpiEngine';
import seedData from '../test/fixtures/agent-crew-seed.json';

describe('Insights Tab KPI Stress Test Suite', () => {
  const marcusProjects = seedData.agents.find((a: any) => a.persona === 'wholesaler')?.projects || [];
  const danaProjects = seedData.agents.find((a: any) => a.persona === 'fix_and_flipper')?.projects || [];
  const whitmoreProjects = seedData.agents.find((a: any) => a.persona === 'buy_and_hold')?.projects || [];
  const atlasProjects = seedData.agents.find((a: any) => a.persona === 'commercial_investor')?.projects || [];
  const eleanorProjects = seedData.agents.find((a: any) => a.persona === 'syndicator')?.projects || [];

  describe('MARCUS (Wholesaler) Persona KPIs', () => {
    it('calculates all 8 Wholesaler KPIs accurately against catalog values', () => {
      const res = calculateKPIs(marcusProjects, 'wholesaler');
      const map = Object.fromEntries(res.metrics.map((m) => [m.id, m]));

      expect(map['kpi_marcus_total_deals'].value).toBe('3');
      expect(map['kpi_marcus_assignment_fee_volume'].value).toBe('$29,300');
      expect(map['kpi_marcus_avg_assignment_fee'].value).toBe('$9,767');
      expect(map['kpi_marcus_avg_days_to_close'].value).toBe('10 days');
      expect(map['kpi_marcus_deal_closure_rate'].value).toBe('100%');
      expect(map['kpi_marcus_active_assignments'].value).toBe('1');
      expect(map['kpi_marcus_avg_contract_price'].value).toBe('$95,000');
      expect(map['kpi_marcus_revenue_per_deal'].value).toBe('$9,767');
    });
  });

  describe('DANA (Fix and Flipper) Persona KPIs', () => {
    it('calculates all 8 Fix and Flipper KPIs accurately against catalog values', () => {
      const res = calculateKPIs(danaProjects, 'fix_and_flip');
      const map = Object.fromEntries(res.metrics.map((m) => [m.id, m]));

      expect(map['kpi_dana_total_flips'].value).toBe('3');
      expect(map['kpi_dana_total_rehab_spend'].value).toBe('$152,000');
      expect(map['kpi_dana_avg_rehab_per_project'].value).toBe('$50,667');
      expect(map['kpi_dana_avg_flip_profit'].value).toBe('$28,700');
      expect(map['kpi_dana_avg_roi'].value).toBe('9.5%');
      expect(map['kpi_dana_avg_hold_time'].value).toBe('75 days');
      expect(map['kpi_dana_arv_achievement_rate'].value).toBe('100%');
      expect(map['kpi_dana_budget_variance'].value).toBe('-3%');
    });
  });

  describe('WHITMORE (Buy and Hold) Persona KPIs', () => {
    it('calculates all 8 Buy and Hold KPIs accurately against catalog values', () => {
      const res = calculateKPIs(whitmoreProjects, 'buy_and_hold');
      const map = Object.fromEntries(res.metrics.map((m) => [m.id, m]));

      expect(map['kpi_whitmore_monthly_cash_flow'].value).toBe('$641/mo');
      expect(map['kpi_whitmore_avg_cap_rate'].value).toBe('7.15%');
      expect(map['kpi_whitmore_cash_on_cash'].value).toBe('4.39%');
      expect(map['kpi_whitmore_total_portfolio_value'].value).toBe('$1,855,000');
      expect(map['kpi_whitmore_occupancy_rate'].value).toBe('95%');
      expect(map['kpi_whitmore_avg_rent_per_unit'].value).toBe('$1,367/mo');
      expect(map['kpi_whitmore_dscr'].value).toBe('1.12x');
      expect(map['kpi_whitmore_expense_ratio'].value).toBe('38%');
    });

    it('identifies Austin 4-Plex negative cash flow warning state', () => {
      const austinOnly = whitmoreProjects.filter((p: any) => p.title.includes('Austin'));
      const res = calculateKPIs(austinOnly, 'buy_and_hold');
      const cfMetric = res.metrics.find((m) => m.id === 'kpi_whitmore_monthly_cash_flow');

      expect(cfMetric?.value).toBe('-$118/mo');
      expect(cfMetric?.isWarning).toBe(true);
    });
  });

  describe('ATLAS (Commercial Investor) Persona KPIs', () => {
    it('calculates all 5 Commercial Investor KPIs accurately against catalog values', () => {
      const res = calculateKPIs(atlasProjects, 'commercial');
      const map = Object.fromEntries(res.metrics.map((m) => [m.id, m]));

      expect(map['kpi_atlas_portfolio_noi'].value).toBe('$484,000/yr');
      expect(map['kpi_atlas_avg_cap_rate'].value).toBe('8.0%');
      expect(map['kpi_atlas_dscr'].value).toBe('1.47x');
      expect(map['kpi_atlas_tenant_mix'].value).toBe('50/50');
      expect(map['kpi_atlas_lease_expiration'].value).toBe('3 tenants (2-7 yrs)');
    });
  });

  describe('ELEANOR (Syndicator) Persona KPIs', () => {
    it('calculates all 4 Syndicator KPIs accurately against catalog values', () => {
      const res = calculateKPIs(eleanorProjects, 'syndicator');
      const map = Object.fromEntries(res.metrics.map((m) => [m.id, m]));

      expect(map['kpi_eleanor_capital_raised'].value).toBe('$7,300,000');
      expect(map['kpi_eleanor_projected_lp_irr'].value).toContain('18.4%');
      expect(map['kpi_eleanor_equity_multiple'].value).toContain('2.2x');
      expect(map['kpi_eleanor_preferred_return'].value).toBe('8%');
    });
  });

  describe('Edge Cases & Defensive Validation', () => {
    it('handles empty project array safely without NaN, null, or Infinity', () => {
      const res = calculateKPIs([], 'wholesaler');
      for (const m of res.metrics) {
        expect(m.value).not.toContain('NaN');
        expect(m.value).not.toContain('null');
        expect(m.value).not.toContain('Infinity');
        expect(m.value).toBeDefined();
      }
    });

    it('handles unknown persona gracefully by aggregating all projects into portfolio KPIs', () => {
      const res = calculateKPIs(marcusProjects, 'unknown_persona');
      expect(res.totalProjects).toBe(3);
      expect(res.metrics.length).toBeGreaterThan(0);
    });
  });
});

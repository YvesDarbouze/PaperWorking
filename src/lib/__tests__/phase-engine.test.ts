import {
  canAdvancePhase,
  advanceProjectPhase,
  calculateHoldingCost,
} from '../phase-engine';
import { getGovernanceLogs } from '../governance';

describe('Phase Engine - Transition & Governance Rules', () => {
  const sampleProject = {
    project_id: 'proj_test_999',
    phase: 'acquisition',
    phase_completion_pct: 100,
    answers: { property_address: '100 Main St' },
    todos: [],
  };

  test('allows phase advance when completion percentage is 100%', () => {
    const check = canAdvancePhase('acquisition', 100);
    expect(check.allowed).toBe(true);
  });

  test('blocks phase advance when completion percentage is under 100% without force advance', () => {
    const check = canAdvancePhase('acquisition', 60);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('60%');
  });

  test('allows force advance with valid governance reason note', () => {
    const check = canAdvancePhase('acquisition', 60, true, 'Urgent seller closing timeline override');
    expect(check.allowed).toBe(true);
  });

  test('blocks force advance if governance reason note is missing or too short', () => {
    const check = canAdvancePhase('acquisition', 60, true, 'a');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('valid explanation note');
  });

  test('advances project phase and logs governance override', () => {
    const res = advanceProjectPhase(
      { ...sampleProject, phase_completion_pct: 50 },
      'user_admin_123',
      true,
      'Approved by Team Admin'
    );

    expect(res.success).toBe(true);
    expect(res.project.phase).toBe('purchase');
    expect(res.governanceLog).toBeDefined();
    expect(res.governanceLog?.reason).toBe('Approved by Team Admin');

    const logs = getGovernanceLogs('proj_test_999');
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('FORCE_ADVANCE_PHASE');
  });

  test('calculates daily holding cost accurately', () => {
    const costs = calculateHoldingCost(400000, 50000, 30, {
      mortgage: 2000,
      insurance: 200,
      taxes: 400,
      utilities: 150,
      hoa: 0,
      maintenance: 250,
    });

    // Monthly total = 3000 -> Annual = 36000 -> Daily = 36000 / 365 = ~99/day
    expect(costs.dailyHoldingCost).toBe(99);
    expect(costs.totalHoldingCost).toBe(99 * 30);
    expect(costs.totalCapitalInvested).toBe(400000 + 50000 + 99 * 30);
  });
});

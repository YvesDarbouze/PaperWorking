import { PRICING_PLANS } from '../../lib/marketing/pricing-data.js';
import { HOW_IT_WORKS_STEPS } from '../../lib/marketing/how-it-works-data.js';
import { REIL_PHASE_ORDER } from '@paperworking/shared';

describe('phase 7c — marketing gap closure', () => {
  it('defines pricing plans aligned with stripe catalog tiers', () => {
    expect(PRICING_PLANS).toHaveLength(3);
    expect(PRICING_PLANS.map((p) => p.id)).toEqual(['individual', 'team', 'vendor']);
    expect(PRICING_PLANS[0]?.monthlyPrice).toBe(59);
  });

  it('maps REIL phases to how-it-works steps', () => {
    expect(HOW_IT_WORKS_STEPS).toHaveLength(REIL_PHASE_ORDER.length);
    expect(HOW_IT_WORKS_STEPS[0]?.title).toBe('Acquisition');
  });
});

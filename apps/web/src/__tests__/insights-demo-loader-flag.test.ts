import { shouldShowDemoLoader } from '@/components/insights/PortfolioInsightsPanel';

describe('Insights Empty State Demo Loader Flag-Conditional Logic', () => {
  describe('shouldShowDemoLoader', () => {
    test('flag on in development environment -> returns true (button visible)', () => {
      expect(shouldShowDemoLoader(true, 'development')).toBe(true);
    });

    test('flag on in test environment -> returns true (button visible)', () => {
      expect(shouldShowDemoLoader(true, 'test')).toBe(true);
    });

    test('flag off in development environment -> returns false (button absent)', () => {
      expect(shouldShowDemoLoader(false, 'development')).toBe(false);
    });

    test('flag off in test environment -> returns false (button absent)', () => {
      expect(shouldShowDemoLoader(false, 'test')).toBe(false);
    });

    test('flag off with undefined environment -> returns false (button absent)', () => {
      expect(shouldShowDemoLoader(false, undefined)).toBe(false);
    });

    test('production environment -> returns false regardless of flag value', () => {
      // Flag is ON (?demo=true), but production -> MUST BE ABSENT
      expect(shouldShowDemoLoader(true, 'production')).toBe(false);

      // Flag is OFF, production -> MUST BE ABSENT
      expect(shouldShowDemoLoader(false, 'production')).toBe(false);
    });
  });
});

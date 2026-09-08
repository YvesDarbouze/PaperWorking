import {
  evaluateValueMilestone,
  isSettingsSectionRestricted,
  MILESTONE_COOKIE,
  FIRST_DEAL_COOKIE,
} from '@/lib/auth/progressive-unlock';

describe('Progressive Unlock at Routing & Data Layer (§8.3)', () => {
  describe('Value Milestone Evaluation', () => {
    it('evaluates as locked when explicitly flagged by cookie during trial onboarding', () => {
      const mockCookieMap = {
        get: (key: string) => {
          if (key === MILESTONE_COOKIE) return { value: 'locked' };
          if (key === FIRST_DEAL_COOKIE) return { value: '0' };
          return undefined;
        },
      };

      const result = evaluateValueMilestone(mockCookieMap);
      expect(result.hasReachedMilestone).toBe(false);
      expect(result.dealsCreatedCount).toBe(0);
      expect(result.reason).toContain('Create your first project or deal');
    });

    it('evaluates as unlocked once first deal is established', () => {
      const mockCookieMap = {
        get: (key: string) => {
          if (key === MILESTONE_COOKIE) return { value: 'unlocked' };
          if (key === FIRST_DEAL_COOKIE) return { value: '1' };
          return undefined;
        },
      };

      const result = evaluateValueMilestone(mockCookieMap);
      expect(result.hasReachedMilestone).toBe(true);
      expect(result.dealsCreatedCount).toBe(1);
    });
  });

  describe('Settings Section Gating', () => {
    it('restricts complex billing and security settings when milestone is NOT reached', () => {
      expect(isSettingsSectionRestricted('billing', false)).toBe(true);
      expect(isSettingsSectionRestricted('security', false)).toBe(true);
      expect(isSettingsSectionRestricted('data-privacy', false)).toBe(true);
      expect(isSettingsSectionRestricted('general', false)).toBe(false);
    });

    it('permits all settings surfaces once value milestone is achieved', () => {
      expect(isSettingsSectionRestricted('billing', true)).toBe(false);
      expect(isSettingsSectionRestricted('security', true)).toBe(false);
      expect(isSettingsSectionRestricted('data-privacy', true)).toBe(false);
      expect(isSettingsSectionRestricted('general', true)).toBe(false);
    });
  });

  describe('Data-Layer Milestone Verification (§8.3)', () => {
    it('returns locked when data-layer count is 0', async () => {
      const mockProvider = async () => 0;
      const res = await (await import('@/lib/auth/progressive-unlock')).verifyDataLayerMilestone('user-123', mockProvider);
      expect(res.hasReachedMilestone).toBe(false);
      expect(res.dealsCreatedCount).toBe(0);
      expect(res.reason).toContain('Create your first project or deal');
    });

    it('returns unlocked when data-layer count is >= 1', async () => {
      const mockProvider = async () => 2;
      const res = await (await import('@/lib/auth/progressive-unlock')).verifyDataLayerMilestone('user-123', mockProvider);
      expect(res.hasReachedMilestone).toBe(true);
      expect(res.dealsCreatedCount).toBe(2);
      expect(res.reason).toBeUndefined();
    });
  });
});

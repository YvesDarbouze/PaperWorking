/**
 * Pure profile completeness meter calculation.
 * Computes an accurate equal-weight percentage score across the 6 public counterparty profile fields.
 */

export interface ProfileCompletenessInputs {
  displayName?: string | null;
  companyName?: string | null;
  businessName?: string | null;
  headline?: string | null;
  publicBio?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  location?: string | null;
  strategies?: Array<string> | null;
}

export interface CompletenessCriterion {
  id: string;
  label: string;
  weight: number;
  met: boolean;
}

export interface CompletenessResult {
  score: number; // 0 to 100
  criteria: CompletenessCriterion[];
}

const EQUAL_WEIGHT = Number((100 / 6).toFixed(2));

export function calculateProfileCompleteness(
  profile: ProfileCompletenessInputs | null | undefined,
): CompletenessResult {
  if (!profile) {
    return {
      score: 0,
      criteria: [
        { id: 'displayName', label: 'Display Name', weight: EQUAL_WEIGHT, met: false },
        { id: 'companyName', label: 'Company / Firm Name', weight: EQUAL_WEIGHT, met: false },
        { id: 'bio', label: 'Headline & Bio', weight: EQUAL_WEIGHT, met: false },
        { id: 'avatar', label: 'Profile Photo / Logo', weight: EQUAL_WEIGHT, met: false },
        { id: 'location', label: 'Location', weight: EQUAL_WEIGHT, met: false },
        { id: 'strategies', label: 'Investment Strategies', weight: EQUAL_WEIGHT, met: false },
      ],
    };
  }

  const hasDisplayName = Boolean(profile.displayName && profile.displayName.trim().length > 0);
  const hasCompany = Boolean(
    (profile.companyName && profile.companyName.trim().length > 0) ||
      (profile.businessName && profile.businessName.trim().length > 0),
  );
  const hasBio = Boolean(
    (profile.headline && profile.headline.trim().length > 0) ||
      (profile.publicBio && profile.publicBio.trim().length > 0),
  );
  const hasAvatar = Boolean(
    (profile.avatarUrl && profile.avatarUrl.trim().length > 0) ||
      (profile.avatar && profile.avatar.trim().length > 0),
  );
  const hasLocation = Boolean(profile.location && profile.location.trim().length > 0);
  const hasStrategies = Boolean(Array.isArray(profile.strategies) && profile.strategies.length > 0);

  const criteria: CompletenessCriterion[] = [
    { id: 'displayName', label: 'Display Name', weight: EQUAL_WEIGHT, met: hasDisplayName },
    { id: 'companyName', label: 'Company / Firm Name', weight: EQUAL_WEIGHT, met: hasCompany },
    { id: 'bio', label: 'Headline & Bio', weight: EQUAL_WEIGHT, met: hasBio },
    { id: 'avatar', label: 'Profile Photo / Logo', weight: EQUAL_WEIGHT, met: hasAvatar },
    { id: 'location', label: 'Location', weight: EQUAL_WEIGHT, met: hasLocation },
    { id: 'strategies', label: 'Investment Strategies', weight: EQUAL_WEIGHT, met: hasStrategies },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const score = Math.round((metCount / criteria.length) * 100);

  return {
    score: Math.min(100, Math.max(0, score)),
    criteria,
  };
}

import type { InvestorProfile } from './investor-profile.js';

export function mapUserDocToInvestorProfile(
  uid: string,
  data: Record<string, unknown>,
): InvestorProfile {
  return {
    uid,
    displayName: (data.displayName as string) ?? 'Investor',
    profileType: data.profileType === 'team' ? 'team' : 'individual',
    businessName: (data.businessName as string) ?? (data.companyName as string) ?? undefined,
    headline: (data.headline as string) ?? undefined,
    avatarUrl:
      (data.avatarUrl as string) ??
      (data.avatar as string) ??
      (data.photoURL as string) ??
      undefined,
    teamLogoUrl: (data.teamLogoUrl as string) ?? undefined,
    publicBio: (data.publicBio as string) ?? undefined,
    location: (data.location as string) ?? undefined,
    websiteUrl: (data.websiteUrl as string) ?? undefined,
    strategies: Array.isArray(data.strategies)
      ? (data.strategies as InvestorProfile['strategies'])
      : [],
    isVerified: data.isVerified === true,
    publicProfile: true,
    followerCount: (data.followerCount as number) ?? 0,
    followingCount: (data.followingCount as number) ?? 0,
    dealCount: ((data.publicDealCount ?? data.dealCount) as number) ?? 0,
    aumCents: (data.aumCents as number) ?? undefined,
    avgRoiPct: (data.avgRoiPct as number) ?? undefined,
    showRoiPublicly: data.showRoiPublicly === true,
    teamMembers: (data.teamMembers as InvestorProfile['teamMembers']) ?? [],
  };
}

export function mapUserDocToEditableProfile(
  uid: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const resolvedAvatarUrl =
    (data.avatarUrl as string) ||
    (data.avatar as string) ||
    (data.photoURL as string) ||
    '';

  return {
    uid,
    displayName: (data.displayName as string) ?? '',
    profileType: data.profileType === 'team' ? 'team' : 'individual',
    businessName: (data.businessName as string) ?? (data.companyName as string) ?? '',
    companyName: (data.companyName as string) ?? (data.businessName as string) ?? '',
    headline: (data.headline as string) ?? '',
    avatarUrl: resolvedAvatarUrl,
    avatar: resolvedAvatarUrl,
    teamLogoUrl: (data.teamLogoUrl as string) ?? '',
    publicBio: (data.publicBio as string) ?? '',
    location: (data.location as string) ?? '',
    websiteUrl: (data.websiteUrl as string) ?? '',
    strategies: Array.isArray(data.strategies)
      ? (data.strategies as InvestorProfile['strategies'])
      : [],
    publicProfile: data.publicProfile !== false,
    showRoiPublicly: data.showRoiPublicly === true,
    teamMembers: (data.teamMembers as InvestorProfile['teamMembers']) ?? [],
    isVerified: data.isVerified === true,
    onboardingCompleted: data.onboardingCompleted === true,
    vendorSkills: Array.isArray(data.vendorSkills) ? (data.vendorSkills as string[]) : [],
    ...(typeof data.aumCents === 'number' ? { aumCents: data.aumCents } : {}),
    ...(typeof data.avgRoiPct === 'number' ? { avgRoiPct: data.avgRoiPct } : {}),
    ...(typeof data.equityMultiple === 'number' ? { equityMultiple: data.equityMultiple } : {}),
    ...(typeof data.dealCount === 'number' ? { dealCount: data.dealCount } : {}),
    ...(data.updatedAt !== undefined ? { updatedAt: data.updatedAt } : {}),
  };
}


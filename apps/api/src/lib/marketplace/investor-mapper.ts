import type { InvestorProfile } from './investor-profile.js';

export function mapUserDocToInvestorProfile(
  uid: string,
  data: Record<string, unknown>,
): InvestorProfile {
  return {
    uid,
    displayName: (data.displayName as string) ?? 'Investor',
    profileType: data.profileType === 'team' ? 'team' : 'individual',
    businessName: (data.businessName as string) ?? undefined,
    avatarUrl: (data.avatar as string) ?? (data.photoURL as string) ?? undefined,
    teamLogoUrl: (data.teamLogoUrl as string) ?? undefined,
    publicBio: (data.publicBio as string) ?? undefined,
    location: (data.location as string) ?? undefined,
    websiteUrl: (data.websiteUrl as string) ?? undefined,
    strategies: (data.strategies as InvestorProfile['strategies']) ?? [],
    isVerified: data.isVerified === true,
    publicProfile: true,
    followerCount: (data.followerCount as number) ?? 0,
    followingCount: (data.followingCount as number) ?? 0,
    dealCount: (data.publicDealCount as number) ?? 0,
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
  return {
    uid,
    displayName: (data.displayName as string) ?? '',
    profileType: data.profileType === 'team' ? 'team' : 'individual',
    businessName: (data.businessName as string) ?? '',
    teamLogoUrl: (data.teamLogoUrl as string) ?? '',
    publicBio: (data.publicBio as string) ?? '',
    location: (data.location as string) ?? '',
    websiteUrl: (data.websiteUrl as string) ?? '',
    strategies: (data.strategies as InvestorProfile['strategies']) ?? [],
    publicProfile: data.publicProfile === true,
    showRoiPublicly: data.showRoiPublicly === true,
    teamMembers: (data.teamMembers as InvestorProfile['teamMembers']) ?? [],
    isVerified: data.isVerified === true,
  };
}

import { AccountType } from './permissions';

export type ProfileBadgeType = 'Person' | 'Company';

export const TEAM_PROFESSIONAL_ROLES = [
  'CEO/President',
  'Real Estate Attorney',
  'Loan Processor',
  'General Contractor',
  'Property Manager',
  'Accountant/CPA',
  'Other',
] as const;

export type ProfessionalRole = typeof TEAM_PROFESSIONAL_ROLES[number] | string;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  account_type: AccountType;
  badge: ProfileBadgeType;
  professionalRole?: ProfessionalRole;
  customRoleTitle?: string;
  companyName?: string;
  bio?: string;
  servicesListed?: string[];
}

export function getUserProfileBadges(profile: Partial<UserProfile>): {
  primaryBadge: string;
  roleBadge?: string;
} {
  const accountType = profile.account_type || 'investor';
  const badgeType = profile.badge || (accountType === 'investment_team' ? 'Company' : 'Person');

  const primaryBadge = badgeType === 'Company' ? 'Company' : 'Person';
  const roleBadge = profile.professionalRole || (accountType === 'vendor' ? 'Vendor Network' : undefined);

  return { primaryBadge, roleBadge };
}

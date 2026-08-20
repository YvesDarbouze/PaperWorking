/**
 * Account tiers — business source: docs/spec/ROLE-HIERARCHY.md
 */
export type AccountType = 'investor' | 'investment_team' | 'vendor' | 'admin';

export const ACCOUNT_TYPE = {
  INVESTOR: 'investor',
  INVESTMENT_TEAM: 'investment_team',
  VENDOR: 'vendor',
  MASTER_ADMIN: 'admin',
} as const satisfies Record<string, AccountType>;

export type AccountTypeKey = keyof typeof ACCOUNT_TYPE;

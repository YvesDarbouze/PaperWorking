export const DEFAULT_PLAID_PRODUCTS = ['transactions', 'liabilities'] as const;
export const DEFAULT_ADDITIONAL_PLAID_PRODUCTS = ['auth', 'balance'] as const;

export function shouldUseMockPlaid(bankingProvider: string | undefined): boolean {
  return bankingProvider !== undefined && bankingProvider !== 'plaid';
}

export function generateMockLinkToken(randomSuffix: () => string = () =>
  Math.random().toString(36).substring(7)): string {
  return `link-sandbox-mock-${randomSuffix()}`;
}

export interface CreateLinkTokenInput {
  uid: string;
  projectId?: string;
  connectionPurpose?: string;
  connectionId?: string;
  products?: string[];
  additionalConsentedProducts?: string[];
}

export interface CreateLinkTokenResult {
  link_token: string;
  mock?: boolean;
}

export interface AccountBalance {
  accountName: string;
  balance: number; // in cents
  lastUpdated: string;
}

export interface BankingTransaction {
  plaidId: string;
  accountId: string;
  amount: number; // in cents
  date: Date;
  name: string;
  category: string[];
  merchantName?: string | null;
  pending: boolean;
}

export interface BankingTransactionsResponse {
  added: BankingTransaction[];
  modified: BankingTransaction[];
  removed: string[];
  nextCursor: string;
  hasMore: boolean;
}

export interface BankingProvider {
  createLinkToken(userId: string): Promise<string>;
  exchangePublicToken(userId: string, publicToken: string): Promise<{ accessToken: string; itemId: string }>;
  getAccountBalance(accessToken: string, accountId?: string): Promise<AccountBalance>;
  getTransactions(params: {
    accessToken: string;
    startDate: string;
    endDate: string;
    cursor?: string;
  }): Promise<BankingTransactionsResponse>;
}

class MockBankingProvider implements BankingProvider {
  async createLinkToken(userId: string): Promise<string> {
    return `mock_link_token_${Math.random().toString(36).substring(7)}`;
  }

  async exchangePublicToken(userId: string, publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    return {
      accessToken: `mock_access_token_${Math.random().toString(36).substring(7)}`,
      itemId: `mock_item_id_${Math.random().toString(36).substring(7)}`,
    };
  }

  async getAccountBalance(accessToken: string, accountId?: string): Promise<AccountBalance> {
    return {
      accountName: 'Business Premier Savings (*8892)',
      balance: 75000_00, // $75,000 in cents
      lastUpdated: new Date().toISOString(),
    };
  }

  async getTransactions(params: {
    accessToken: string;
    startDate: string;
    endDate: string;
    cursor?: string;
  }): Promise<BankingTransactionsResponse> {
    const mockTransactions: BankingTransaction[] = [
      { plaidId: 't1', accountId: 'mock-account-id', amount: 2500, date: new Date(), name: 'RENT PAYMENT - TENANT LLC', category: ['Income'], merchantName: 'TENANT LLC', pending: false },
      { plaidId: 't2', accountId: 'mock-account-id', amount: -1800, date: new Date(), name: 'MORTGAGE PAYMENT - WELLS FARGO', category: ['Expense'], merchantName: 'WELLS FARGO', pending: false },
      { plaidId: 't3', accountId: 'mock-account-id', amount: -250, date: new Date(), name: 'HOA FEE - OAKWOOD ASSOC', category: ['Expense'], merchantName: 'OAKWOOD ASSOC', pending: false },
      { plaidId: 't4', accountId: 'mock-account-id', amount: -120, date: new Date(), name: 'STATE FARM INSURANCE', category: ['Expense'], merchantName: 'STATE FARM INSURANCE', pending: false },
      { plaidId: 't5', accountId: 'mock-account-id', amount: -500, date: new Date(), name: 'CHECK #1234', category: ['Expense'], merchantName: null, pending: false },
      { plaidId: 't6', accountId: 'mock-account-id', amount: -350, date: new Date(), name: 'REPAIR - ABC PLUMBING', category: ['Expense'], merchantName: 'ABC PLUMBING', pending: false },
      { plaidId: 't7', accountId: 'mock-account-id', amount: -180, date: new Date(), name: 'ELECTRIC BILL - CON EDISON', category: ['Expense'], merchantName: 'CON EDISON', pending: false },
      { plaidId: 't8', accountId: 'mock-account-id', amount: -300, date: new Date(), name: 'PROPERTY MANAGEMENT FEE', category: ['Expense'], merchantName: 'PROPERTY MANAGEMENT FEE', pending: false },
      { plaidId: 't9', accountId: 'mock-account-id', amount: -2000, date: new Date(), name: 'ESCROW PAYMENT - TITLE CO', category: ['Expense'], merchantName: 'TITLE CO', pending: false },
      { plaidId: 't10', accountId: 'mock-account-id', amount: -800, date: new Date(), name: 'STAGING FURNITURE RENTAL', category: ['Expense'], merchantName: 'STAGING FURNITURE RENTAL', pending: false },
    ];

    return {
      added: mockTransactions,
      modified: [],
      removed: [],
      nextCursor: 'mock_cursor_123',
      hasMore: false,
    };
  }
}

export function getBankingProvider(): BankingProvider {
  const providerType = process.env.BANKING_PROVIDER || 'mock';
  if (providerType === 'plaid') {
    // Dynamic import/require to prevent bundling server Plaid Node SDK on client components
    const { PlaidProvider } = require('./plaid-provider');
    return new PlaidProvider();
  }
  return new MockBankingProvider();
}

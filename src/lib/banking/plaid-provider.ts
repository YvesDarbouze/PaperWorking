import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { BankingProvider, AccountBalance, BankingTransactionsResponse, BankingTransaction } from './index';

export class PlaidProvider implements BankingProvider {
  private plaidClient: PlaidApi;

  constructor() {
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    const env = process.env.PLAID_ENV || 'sandbox';

    if (!clientId || !secret) {
      throw new Error('PLAID_CLIENT_ID and PLAID_SECRET are required for Plaid provider');
    }

    // Resolve plaid env
    const basePath = PlaidEnvironments[env];
    if (!basePath) {
      throw new Error(`Invalid PLAID_ENV: ${env}`);
    }

    const configuration = new Configuration({
      basePath,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
  }

  async createLinkToken(userId: string): Promise<string> {
    try {
      const response = await this.plaidClient.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'PaperWorking',
        products: [Products.Auth],
        country_codes: [CountryCode.Us],
        language: 'en',
      });
      return response.data.link_token;
    } catch (error: any) {
      console.error('[PlaidProvider] Failed to create link token:', error.response?.data ?? error.message);
      throw new Error(`Failed to create Plaid link token: ${error.response?.data?.error_message ?? error.message}`);
    }
  }

  async exchangePublicToken(userId: string, publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    try {
      const response = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });
      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      };
    } catch (error: any) {
      console.error('[PlaidProvider] Failed to exchange public token:', error.response?.data ?? error.message);
      throw new Error(`Failed to exchange Plaid public token: ${error.response?.data?.error_message ?? error.message}`);
    }
  }

  async getAccountBalance(accessToken: string, accountId?: string): Promise<AccountBalance> {
    try {
      const response = await this.plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });

      const accounts = response.data.accounts;
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found for Plaid connection');
      }

      // Select matching account or default to first depository, then fallback to first account
      const matchedAccount = accountId
        ? accounts.find((acc) => acc.account_id === accountId)
        : accounts.find((acc) => acc.type === 'depository') || accounts[0];

      if (!matchedAccount) {
        throw new Error(`Account matching ${accountId || 'depository'} not found`);
      }

      const currentBalance = matchedAccount.balances.current ?? 0;
      const balanceInCents = Math.round(currentBalance * 100);
      const name = `${matchedAccount.name} (*${matchedAccount.mask || '0000'})`;

      return {
        accountName: name,
        balance: balanceInCents,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[PlaidProvider] Failed to fetch account balance:', error.response?.data ?? error.message);
      throw new Error(`Failed to fetch Plaid balance: ${error.response?.data?.error_message ?? error.message}`);
    }
  }

  async getTransactions(params: {
    accessToken: string;
    startDate: string;
    endDate: string;
    cursor?: string;
  }): Promise<BankingTransactionsResponse> {
    try {
      const response = await this.plaidClient.transactionsSync({
        access_token: params.accessToken,
        cursor: params.cursor,
      });

      const data = response.data;
      const added = (data.added || []).map((t) => ({
        plaidId: t.transaction_id,
        accountId: t.account_id,
        amount: Math.round(t.amount * 100), // convert to cents
        date: new Date(t.date),
        name: t.name,
        category: t.category || [],
        merchantName: t.merchant_name || null,
        pending: t.pending,
      }));

      const modified = (data.modified || []).map((t) => ({
        plaidId: t.transaction_id,
        accountId: t.account_id,
        amount: Math.round(t.amount * 100),
        date: new Date(t.date),
        name: t.name,
        category: t.category || [],
        merchantName: t.merchant_name || null,
        pending: t.pending,
      }));

      const removed = (data.removed || []).map((t) => t.transaction_id).filter(Boolean) as string[];

      return {
        added,
        modified,
        removed,
        nextCursor: data.next_cursor,
        hasMore: data.has_more,
      };
    } catch (error: any) {
      console.error('[PlaidProvider] Failed to sync transactions:', error.response?.data ?? error.message);
      throw new Error(`Failed to sync Plaid transactions: ${error.response?.data?.error_message ?? error.message}`);
    }
  }
}

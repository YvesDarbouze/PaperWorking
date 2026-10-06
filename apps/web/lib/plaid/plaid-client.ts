export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

export class PlaidNotConfiguredError extends Error {
  constructor(message = 'Plaid credentials not configured (REQUIRES CREDENTIALS: PLAID_CLIENT_ID, PLAID_SECRET)') {
    super(message);
    this.name = 'PlaidNotConfiguredError';
  }
}

export function isPlaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID?.trim() && process.env.PLAID_SECRET?.trim());
}

export function getActivePlaidEnv(): PlaidEnvironment {
  const raw = (process.env.PLAID_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'))
    .toLowerCase()
    .trim();
  if (raw === 'production' || raw === 'development') return raw;
  return 'sandbox';
}

function baseUrl(env: PlaidEnvironment): string {
  if (env === 'production') return 'https://production.plaid.com';
  if (env === 'development') return 'https://development.plaid.com';
  return 'https://sandbox.plaid.com';
}

export interface PlaidLinkTokenResult {
  linkToken: string;
  expiration: string | null;
}

export interface PlaidExchangeResult {
  accessToken: string;
  itemId: string;
}

export class PlaidHttpClient {
  private readonly clientId: string | null;
  private readonly secret: string | null;
  private readonly env: PlaidEnvironment;

  constructor(options?: { clientId?: string; secret?: string; env?: PlaidEnvironment }) {
    this.clientId = options?.clientId ?? process.env.PLAID_CLIENT_ID?.trim() ?? null;
    this.secret = options?.secret ?? process.env.PLAID_SECRET?.trim() ?? null;
    this.env = options?.env ?? getActivePlaidEnv();
  }

  private credentials(): { client_id: string; secret: string } {
    if (!this.clientId || !this.secret) {
      throw new PlaidNotConfiguredError();
    }
    return { client_id: this.clientId, secret: this.secret };
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${baseUrl(this.env)}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...this.credentials(), ...body }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const errorCode = (data.error_code as string) || `HTTP_${response.status}`;
      throw new Error(`Plaid request failed (${errorCode}): ${(data.error_message as string) || 'unknown error'}`);
    }
    return data as T;
  }

  async createLinkToken(userId: string): Promise<PlaidLinkTokenResult> {
    const data = await this.post<{ link_token: string; expiration?: string }>('/link/token/create', {
      user: { client_user_id: userId },
      client_name: 'PaperWorking',
      products: ['transactions', 'liabilities', 'auth'],
      country_codes: ['US'],
      language: 'en',
    });
    return { linkToken: data.link_token, expiration: data.expiration ?? null };
  }

  async createUpdateLinkToken(userId: string, accessToken: string): Promise<PlaidLinkTokenResult> {
    const data = await this.post<{ link_token: string; expiration?: string }>('/link/token/create', {
      user: { client_user_id: userId },
      client_name: 'PaperWorking',
      country_codes: ['US'],
      language: 'en',
      access_token: accessToken,
    });
    return { linkToken: data.link_token, expiration: data.expiration ?? null };
  }

  async exchangePublicToken(publicToken: string): Promise<PlaidExchangeResult> {
    const data = await this.post<{ access_token: string; item_id: string }>('/item/public_token/exchange', {
      public_token: publicToken,
    });
    return { accessToken: data.access_token, itemId: data.item_id };
  }

  async removeItem(accessToken: string): Promise<boolean> {
    await this.post<{ request_id?: string }>('/item/remove', { access_token: accessToken });
    return true;
  }
}

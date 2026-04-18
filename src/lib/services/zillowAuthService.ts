import bridgeConfig from '../../config/bridge';
import redis from '../redis';

/**
 * 🔒 Zillow Bridge Authentication Service
 * 
 * Manages OAuth 2.0 Client Credentials flow for the Bridge Interactive API.
 * Ensures tokens are cached in Redis with a safety-buffered TTL.
 */

const TOKEN_KEY = 'zillow_bridge_access_token';

interface BridgeOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class ZillowAuthService {
  /**
   * Retrieves a valid access token.
   * Checks Redis first, falls back to fetching a new one if missing or expired.
   */
  async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      const cachedToken = await redis.get(TOKEN_KEY);
      if (cachedToken) {
        return cachedToken;
      }
    }

    const { access_token, expires_in } = await this.fetchNewToken();

    // Cache the token with sub-minute buffer for safety
    // Redis SET with EX (expiration in seconds)
    const ttl = Math.max(expires_in - 60, 60); // Minimum 1 minute cache
    await redis.set(TOKEN_KEY, access_token, 'EX', ttl);

    return access_token;
  }

  /**
   * Executes the OAuth 2.0 Client Credentials grant.
   */
  private async fetchNewToken(): Promise<BridgeOAuthResponse> {
    const clientId = bridgeConfig.BRIDGE_CLIENT_ID;
    const clientSecret = bridgeConfig.BRIDGE_CLIENT_SECRET;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(bridgeConfig.BRIDGE_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Bridge OAuth Failure:', errorBody);
      throw new Error(`Bridge OAuth failed with status ${response.status}`);
    }

    const data = (await response.json()) as BridgeOAuthResponse;
    return data;
  }
}

// Export a singleton instance
export const zillowAuthService = new ZillowAuthService();

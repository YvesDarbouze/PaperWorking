import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/encryption/tokenVault';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

/**
 * POST /api/plaid/create-link-token
 *
 * Creates a Plaid Link token for initializing Plaid Link in the browser.
 * Supports both new connections and update mode (re-link / reconnect).
 *
 * Request body:
 *   projectId?          string   — scopes the connection to a project
 *   connectionPurpose?  string   — e.g. 'RENT_COLLECTION'
 *   connectionId?       string   — if set → update mode (look up + decrypt access_token)
 *   products?           string[] — override default ['transactions', 'liabilities']
 *   additionalConsentedProducts? string[] — products for future consent
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

const PLAID_PRODUCT_MAP: Record<string, Products> = {
  transactions: Products.Transactions,
  liabilities:  Products.Liabilities,
  auth:         Products.Auth,
  balance:      Products.Balance,
  identity:     Products.Identity,
};

function buildPlaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret   = process.env.PLAID_SECRET;
  const env      = process.env.PLAID_ENV ?? 'sandbox';

  if (!clientId || !secret) {
    throw new Error('PLAID_CLIENT_ID and PLAID_SECRET are required');
  }

  const basePath = PlaidEnvironments[env];
  if (!basePath) throw new Error(`Invalid PLAID_ENV: ${env}`);

  return new PlaidApi(
    new Configuration({
      basePath,
      baseOptions: {
        headers: { 'PLAID-CLIENT-ID': clientId, 'PLAID-SECRET': secret },
      },
    })
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;

  let body: {
    projectId?: string;
    connectionPurpose?: string;
    connectionId?: string;
    products?: string[];
    additionalConsentedProducts?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    projectId,
    connectionPurpose,
    connectionId,
    products: requestedProducts,
    additionalConsentedProducts: requestedAdditional,
  } = body;

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const webhookUrl = `${appUrl}/api/webhooks/plaid`;

  // ── Mock provider shortcut ─────────────────────────────────────────────────
  if (process.env.BANKING_PROVIDER !== 'plaid') {
    const mockToken = `link-sandbox-mock-${Math.random().toString(36).substring(7)}`;
    return NextResponse.json({ success: true, link_token: mockToken, mock: true });
  }

  try {
    const client = buildPlaidClient();

    // ── Resolve products ──────────────────────────────────────────────────────
    const productList = (requestedProducts ?? ['transactions', 'liabilities'])
      .map((p) => PLAID_PRODUCT_MAP[p])
      .filter(Boolean) as Products[];

    const additionalList = (requestedAdditional ?? ['auth', 'balance'])
      .map((p) => PLAID_PRODUCT_MAP[p])
      .filter(Boolean) as Products[];

    // ── Update mode: look up the PlaidConnection access_token ─────────────────
    let accessToken: string | undefined;
    if (connectionId) {
      const conn = await prisma.plaidConnection.findUnique({
        where: { id: connectionId },
        select: { userId: true, accessToken: true, status: true },
      });

      if (!conn) {
        return NextResponse.json({ success: false, error: 'Connection not found' }, { status: 404 });
      }
      if (conn.userId !== uid) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      try {
        accessToken = decryptToken(conn.accessToken);
      } catch {
        return NextResponse.json({ success: false, error: 'Could not decrypt access token — contact support' }, { status: 500 });
      }
    }

    // ── Build link token payload ──────────────────────────────────────────────
    const payload: Parameters<PlaidApi['linkTokenCreate']>[0] = {
      user: { client_user_id: uid },
      client_name: 'PaperWorking',
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: webhookUrl,
      ...(projectId
        ? { redirect_uri: `${appUrl}/dashboard/projects/${projectId}/financials/callback` }
        : {}),
      ...(accessToken
        ? {
            // Update mode — no products array required; they come from the existing item
            access_token: accessToken,
          }
        : {
            products: productList,
            additional_consented_products: additionalList,
          }),
    };

    const response = await client.linkTokenCreate(payload);
    const token = response.data.link_token;

    return NextResponse.json({ success: true, link_token: token });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create link token';
    const plaidErr = (error as any)?.response?.data;
    console.error('[create-link-token] Failed:', plaidErr ?? msg);
    return NextResponse.json(
      { success: false, error: plaidErr?.error_message ?? msg },
      { status: 500 }
    );
  }
}

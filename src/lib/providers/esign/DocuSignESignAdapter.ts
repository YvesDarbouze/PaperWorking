/**
 * DocuSign E-Sign Adapter
 *
 * Implements IESignProvider using the DocuSign eSignature REST API (JWT Grant).
 *
 * Required env vars (see .env.example):
 *   DOCUSIGN_INTEGRATION_KEY   — OAuth integration key (client_id)
 *   DOCUSIGN_USER_ID           — User GUID to impersonate
 *   DOCUSIGN_PRIVATE_KEY       — RSA private key PEM (\\n-escaped)
 *   DOCUSIGN_ACCOUNT_ID        — DocuSign account ID
 *   DOCUSIGN_BASE_PATH         — REST API base (demo or prod)
 *   DOCUSIGN_WEBHOOK_HMAC_KEY  — Connect HMAC key for webhook validation
 *
 * Set ESIGN_PROVIDER=docusign to activate.
 *
 * IMPORTANT: All DocuSign SDK calls happen server-side only. This file is
 * imported only by server-side code (API routes / Server Actions).
 */

import type {
  IESignProvider,
  CreateEnvelopeParams,
  CreateEnvelopeResult,
  GetEnvelopeStatusResult,
  EnvelopeStatus,
} from './types';
import { logger } from '@/lib/logger';

// DocuSign REST API — no npm SDK to avoid bundle leakage
const DS_BASE        = process.env.DOCUSIGN_BASE_PATH ?? 'https://demo.docusign.net/restapi';
const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY ?? '';
const USER_ID         = process.env.DOCUSIGN_USER_ID ?? '';
const ACCOUNT_ID      = process.env.DOCUSIGN_ACCOUNT_ID ?? '';
const PRIVATE_KEY_RAW = process.env.DOCUSIGN_PRIVATE_KEY ?? '';

const DS_TOKEN_ENDPOINT = 'https://account-d.docusign.com/oauth/token'; // Demo; prod: account.docusign.com

// ── JWT token cache (in-process, reuse until near-expiry) ────────────────────

interface TokenCache { accessToken: string; expiresAt: number }
let _tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.accessToken;
  }

  // Build JWT assertion for JWT Grant
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  })).toString('base64url');

  const { createSign } = await import('crypto');
  const pem = PRIVATE_KEY_RAW.replace(/\\n/g, '\n');
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = signer.sign(pem, 'base64url');

  const assertion = `${header}.${payload}.${sig}`;

  const res = await fetch(DS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DocuSign token exchange failed (${res.status}): ${body}`);
  }

  const data: { access_token: string; expires_in: number } = await res.json();
  _tokenCache = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return _tokenCache.accessToken;
}

function mapDsStatus(status: string): EnvelopeStatus {
  switch (status.toLowerCase()) {
    case 'completed':    return 'completed';
    case 'declined':     return 'declined';
    case 'voided':       return 'voided';
    case 'sent':
    case 'delivered':    return 'sent';
    default:             return 'sent';
  }
}

// ── Adapter ──────────────────────────────────────────────────────────────────

export class DocuSignESignAdapter implements IESignProvider {
  readonly providerName = 'docusign' as const;

  async createEnvelope(params: CreateEnvelopeParams): Promise<CreateEnvelopeResult> {
    const token = await getAccessToken();

    // Fetch document bytes for embedding in the envelope
    const docRes = await fetch(params.documentUrl);
    if (!docRes.ok) throw new Error(`Failed to fetch document for signing: ${docRes.status}`);
    const docBytes = Buffer.from(await docRes.arrayBuffer());
    const docBase64 = docBytes.toString('base64');

    const envelopeBody = {
      emailSubject: `Please sign: ${params.documentName}`,
      status: 'sent',
      documents: [
        {
          documentId: '1',
          name: params.documentName,
          fileExtension: params.documentUrl.endsWith('.pdf') ? 'pdf' : 'pdf',
          documentBase64: docBase64,
        },
      ],
      recipients: {
        signers: [
          {
            email: params.signerEmail,
            name:  params.signerName,
            recipientId: '1',
            roleName: params.signerRole,
            tabs: {
              signHereTabs: [
                {
                  anchorString: '/sig1/',
                  anchorXOffset: '0',
                  anchorYOffset: '0',
                  anchorIgnoreIfNotPresent: 'true',
                  anchorUnits: 'inches',
                },
              ],
            },
          },
        ],
      },
    };

    const createRes = await fetch(`${DS_BASE}/v2.1/accounts/${ACCOUNT_ID}/envelopes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeBody),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      logger.error('[DocuSign] createEnvelope failed', new Error(`${createRes.status}: ${errBody}`));
      throw new Error(`DocuSign createEnvelope failed: ${createRes.status}`);
    }

    const created: { envelopeId: string; status: string; createdDateTime: string } = await createRes.json();

    return {
      envelopeId: created.envelopeId,
      status: mapDsStatus(created.status),
      createdAt: created.createdDateTime,
    };
  }

  async getEnvelopeStatus(envelopeId: string): Promise<GetEnvelopeStatusResult> {
    const token = await getAccessToken();

    const res = await fetch(`${DS_BASE}/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      logger.warn('[DocuSign] getEnvelopeStatus failed', { envelopeId, status: res.status });
      return { envelopeId, status: 'error' };
    }

    const data: {
      envelopeId: string;
      status: string;
      completedDateTime?: string;
      recipients?: { signers: Array<{ name: string }> };
    } = await res.json();

    return {
      envelopeId,
      status:      mapDsStatus(data.status),
      completedAt: data.completedDateTime,
      signerName:  data.recipients?.signers?.[0]?.name,
    };
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    const token = await getAccessToken();

    const res = await fetch(`${DS_BASE}/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'voided', voidedReason: reason }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error('[DocuSign] voidEnvelope failed', new Error(`${res.status}: ${errBody}`));
      throw new Error(`DocuSign voidEnvelope failed: ${res.status}`);
    }
  }
}

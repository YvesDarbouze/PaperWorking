/* ═══════════════════════════════════════════════════════════════
   MLS Provider (RESO / Bridge Interactive)
   ───────────────────────────────────────────────────────────────
   Provider interface + adapters for MLS feed connectivity.

   Real adapter:  uses BRIDGE_SERVER_TOKEN + BRIDGE_API_BASE_URL.
                  Makes a lightweight ping to verify credentials
                  are valid before storing connected status.
   Mock adapter:  always succeeds; used when BRIDGE_SERVER_TOKEN
                  is absent (dev / demo environments).

   Selected by factory: real when both env vars present, mock otherwise.
   ═══════════════════════════════════════════════════════════════ */

export interface MLSProvider {
  /** Returns true if credentials are valid and the feed is reachable. */
  testConnection(): Promise<{ ok: boolean; message: string }>;
  /** Provider identifier stored in Firestore. */
  readonly providerId: string;
}

// ── Real adapter (Bridge Interactive) ───────────────────────────

export class BridgeMLSProvider implements MLSProvider {
  readonly providerId = 'bridge';

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const token      = process.env.BRIDGE_SERVER_TOKEN;
    const baseUrl    = process.env.BRIDGE_API_BASE_URL ?? 'https://api.bridgedataoutput.com/api/v2';
    const datasetId  = process.env.BRIDGE_DATASET_ID ?? process.env.BRIDGE_VIRTUAL_DATASET_ID;

    if (!token) throw new Error('BRIDGE_SERVER_TOKEN is not configured');
    if (!datasetId) throw new Error('BRIDGE_DATASET_ID / BRIDGE_VIRTUAL_DATASET_ID is not configured');

    // Lightweight ping: fetch $top=1 listing to verify creds without large payload
    const url = `${baseUrl}/${datasetId}/listings?access_token=${token}&$top=1&$select=ListingId`;
    const res = await fetch(url, {
      method:  'GET',
      headers: { Accept: 'application/json' },
      signal:  AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Bridge API returned ${res.status}: ${body.slice(0, 200)}`);
    }

    return { ok: true, message: 'Bridge Interactive connection verified.' };
  }
}

// ── Mock adapter ─────────────────────────────────────────────────

export class MockMLSProvider implements MLSProvider {
  readonly providerId = 'mock';

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'MLS connection verified (mock — no credentials configured).' };
  }
}

// ── Factory ──────────────────────────────────────────────────────

export function getMLSProvider(): MLSProvider {
  const hasCredentials = !!(process.env.BRIDGE_SERVER_TOKEN);
  return hasCredentials ? new BridgeMLSProvider() : new MockMLSProvider();
}

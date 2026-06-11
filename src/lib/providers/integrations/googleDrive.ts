import { google } from 'googleapis';

/* ═══════════════════════════════════════════════════════════════
   Google Drive Provider
   ───────────────────────────────────────────────────────────────
   Provider interface + adapters for Google Drive OAuth2.

   Real adapter:  uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
                  Selected when both vars are present.
   Mock adapter:  no credentials needed; always returns
                  "disconnected" until the user explicitly connects,
                  then stores in-memory (resets on restart).

   The OAuth state parameter is HMAC-SHA256 signed using
   WORKER_SECRET to prevent CSRF.
   ═══════════════════════════════════════════════════════════════ */

export interface DriveProvider {
  /** Generate the Google consent-page URL for this user. */
  getAuthUrl(uid: string): string;
  /** Exchange the code from the callback for tokens and return the account email. */
  exchangeCode(code: string, state: string): Promise<{ uid: string; email: string }>;
}

export interface DriveConnection {
  connected: boolean;
  email?: string;
}

// ── State signing ───────────────────────────────────────────────

import crypto from 'crypto';

const STATE_SECRET = process.env.WORKER_SECRET ?? 'pw-dev-secret';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function signState(uid: string): string {
  const payload = { uid, ts: Date.now() };
  const raw     = JSON.stringify(payload);
  const sig     = crypto.createHmac('sha256', STATE_SECRET).update(raw).digest('hex');
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString('base64url');
}

export function verifyState(state: string): { uid: string } {
  let parsed: { uid: string; ts: number; sig: string };
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid state: malformed');
  }
  const { uid, ts, sig } = parsed;
  if (!uid || !ts || !sig) throw new Error('Invalid state: missing fields');
  if (Date.now() - ts > STATE_TTL_MS) throw new Error('Invalid state: expired');
  const expected = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(JSON.stringify({ uid, ts }))
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
    throw new Error('Invalid state: signature mismatch');
  }
  return { uid };
}

// ── Real adapter ─────────────────────────────────────────────────

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

function buildOAuth2Client() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectUri  = `${appUrl}/api/integrations/google-drive/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export class RealDriveProvider implements DriveProvider {
  getAuthUrl(uid: string): string {
    const client = buildOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt:       'consent',
      scope:        DRIVE_SCOPES,
      state:        signState(uid),
    });
  }

  async exchangeCode(code: string, state: string): Promise<{ uid: string; email: string }> {
    const { uid } = verifyState(state);
    const client  = buildOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Fetch the user's email so we can display which account was connected
    const oauth2   = google.oauth2({ version: 'v2', auth: client });
    const userInfo = await oauth2.userinfo.get();
    const email    = userInfo.data.email ?? '';

    // Store the refresh token in Firestore so the server can use Drive on behalf
    // of the user without re-prompting. Requires the tokens be written here.
    // The caller (callback route) does the actual Firestore write with these values.
    return { uid, email };
  }

  /** Expose tokens for the callback route to store. */
  async exchangeCodeWithTokens(code: string, state: string) {
    const { uid } = verifyState(state);
    const client  = buildOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2   = google.oauth2({ version: 'v2', auth: client });
    const userInfo = await oauth2.userinfo.get();
    const email    = userInfo.data.email ?? '';

    return { uid, email, refreshToken: tokens.refresh_token ?? null };
  }
}

// ── Mock adapter ─────────────────────────────────────────────────

export class MockDriveProvider implements DriveProvider {
  getAuthUrl(uid: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    // Mock flow: redirect straight to callback with a fake code+state
    const state = signState(uid);
    return `${appUrl}/api/integrations/google-drive/callback?code=mock_code&state=${state}&mock=1`;
  }

  async exchangeCode(_code: string, state: string): Promise<{ uid: string; email: string }> {
    const { uid } = verifyState(state);
    return { uid, email: 'mock-user@paperworking.co' };
  }
}

// ── Factory ─────────────────────────────────────────────────────

export function getDriveProvider(): DriveProvider {
  const hasCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return hasCredentials ? new RealDriveProvider() : new MockDriveProvider();
}

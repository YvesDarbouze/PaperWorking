import { describe, expect, it, beforeEach } from '@jest/globals';
import { POST as postVendorsRoute } from '../../app/api/vendors/route';
import { getVendorRequestFromStore } from '../../lib/vendor-portal/vendor-store';
import { secureRandomToken, secureRandomCode } from '../../lib/utils/secure-id';
import { updateSeedDealVisibility, shareSeedDealWith, SEED_RAW_DEALS } from '../../lib/marketplace/seed-data';

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/vendors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/vendors persists real quote requests', () => {
  beforeEach(() => {
    process.env.TEST_AUTH_UID = 'dev-user-1';
    process.env.TEST_AUTH_ORG = 'org-1';
  });

  it('creates a PENDING vendor request tied to the vendor and requester', async () => {
    const res = await postVendorsRoute(
      jsonRequest({ vendorId: 'vendor-1', projectLabel: '1247 Elm Street rehab', message: 'Kitchen + roof scope' }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.request.status).toBe('PENDING');

    const stored = await getVendorRequestFromStore(data.request.id);
    expect(stored).not.toBeNull();
    expect(stored?.vendorId).toBe('vendor-1');
    expect(stored?.projectLabel).toBe('1247 Elm Street rehab');
    expect(stored?.requesterUid).toBe('dev-user-1');
    expect(stored?.message).toBe('Kitchen + roof scope');
  });

  it('rejects requests missing vendorId or projectLabel with 400', async () => {
    const noVendor = await postVendorsRoute(jsonRequest({ projectLabel: 'Elm' }));
    expect(noVendor.status).toBe(400);
    const noProject = await postVendorsRoute(jsonRequest({ vendorId: 'vendor-1', projectLabel: '   ' }));
    expect(noProject.status).toBe(400);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await postVendorsRoute(
      new Request('http://localhost/api/vendors', { method: 'POST', body: '{not json' }),
    );
    expect(res.status).toBe(400);
  });
});

describe('secure-id helpers use the Web Crypto CSPRNG', () => {
  it('produces unique, url-safe tokens of the requested entropy', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => secureRandomToken(24)));
    expect(tokens.size).toBe(500);
    for (const t of tokens) {
      expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
    }
  });

  it('produces uppercase alphanumeric codes of exact length', () => {
    const codes = new Set(Array.from({ length: 500 }, () => secureRandomCode(10)));
    expect(codes.size).toBe(500);
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z0-9]{10}$/);
    }
  });
});

describe('Private deal share tokens are unguessable', () => {
  it('two deals with same-length ids get different, high-entropy tokens', () => {
    const sameLen = SEED_RAW_DEALS.filter((d) => d.id.length === SEED_RAW_DEALS[0].id.length);
    const [a, b] = sameLen;
    expect(a && b).toBeTruthy();
    delete a.shareToken;
    delete b.shareToken;
    updateSeedDealVisibility(a.id, 'private');
    shareSeedDealWith(b.id, 'partner@firm.com');
    expect(a.shareToken).toBeDefined();
    expect(b.shareToken).toBeDefined();
    const suffixA = a.shareToken!.split('_').pop()!;
    const suffixB = b.shareToken!.split('_').pop()!;
    expect(suffixA).not.toBe(suffixB);
    expect(suffixA).toMatch(/^[a-f0-9]{32}$/);
    expect(suffixB).toMatch(/^[a-f0-9]{32}$/);
  });
});

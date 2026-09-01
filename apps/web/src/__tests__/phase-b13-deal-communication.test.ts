import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { bffFetch, isBffApiPath } from '../../lib/api/bff-fetch.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

describe('phase B13 — bffFetch transport', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, dispatchedCount: 1 }), { status: 200 }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('isBffApiPath matches deal communication routes', () => {
    expect(isBffApiPath('/api/deals/broadcast')).toBe(true);
    expect(isBffApiPath('/api/deals/reply')).toBe(true);
  });

  it('bffFetch broadcast avoids NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/deals/broadcast', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ dealId: 'd1', recipientEmails: ['a@b.com'] }),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/deals/broadcast',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('phase B13 — Next route wiring', () => {
  it('routes delegate to shared communication services', () => {
    const broadcast = readFileSync(join(here, '../../app/api/deals/broadcast/route.ts'), 'utf8');
    const reply = readFileSync(join(here, '../../app/api/deals/reply/route.ts'), 'utf8');

    expect(broadcast).toContain('buildDealBroadcastService');
    expect(reply).toContain('buildDealReplyService');
    expect(reply).toContain('deal_reply_webhook_use_nest');
    expect(broadcast).not.toContain('prisma.');
  });
});

describe('phase B13 — browser transport migration', () => {
  it('browser callers use BFF helpers', () => {
    const broadcast = readFileSync(
      join(here, '../../components/marketplace/DealBroadcastModal.tsx'),
      'utf8',
    );
    const external = readFileSync(
      join(here, '../../app/(marketing)/deals/[slug]/external/page.tsx'),
      'utf8',
    );

    expect(broadcast).toContain('broadcastDealFromBff');
    expect(external).toContain('replyToDealFromBff');
    expect(external).toContain('checkDealExistsFromBff');
    expect(broadcast).not.toContain("apiFetch('/api/deals/broadcast'");
    expect(external).not.toContain("apiFetch('/api/deals/reply'");
  });
});

describe('phase B13 — B10 regression guard', () => {
  it('core deal routes unchanged', () => {
    const deals = readFileSync(join(here, '../../app/api/deals/route.ts'), 'utf8');
    expect(deals).toContain('buildDealsReadService');
    expect(deals).toContain('buildDealsCommandService');
  });
});

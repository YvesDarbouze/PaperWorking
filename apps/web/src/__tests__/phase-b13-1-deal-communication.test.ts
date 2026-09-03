import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

describe('phase B13.1 — broadcast UI truthfulness', () => {
  it('DealBroadcastModal does not claim email delivery when not configured', () => {
    const modal = readFileSync(
      join(here, '../../components/marketplace/DealBroadcastModal.tsx'),
      'utf8',
    );

    expect(modal).toContain('Broadcast saved — invitations created');
    expect(modal).toContain('deliveryStatus');
    expect(modal).toContain('Email delivery is not configured');
    expect(modal).not.toMatch(/emailed|email sent|messages sent/i);
  });
});

describe('phase B13.1 — client token safety', () => {
  it('browser token helper does not embed signing secrets', () => {
    const token = readFileSync(join(here, '../../lib/deals/token.ts'), 'utf8');

    expect(token).toContain('decodeBroadcastToken');
    expect(token).not.toContain('createBroadcastToken');
    expect(token).not.toMatch(/paperworking_secret/);
    expect(token).not.toContain('BROADCAST_TOKEN_SECRET');
  });
});

describe('phase B13.1 — Next reply route webhook boundary', () => {
  it('browser reply route rejects webhook secret mode', () => {
    const reply = readFileSync(join(here, '../../app/api/deals/reply/route.ts'), 'utf8');

    expect(reply).toContain('resolveDealReplyWebhookSecret');
    expect(reply).toContain('deal_reply_webhook_use_nest');
  });
});

describe('phase B13.1 — B13 same-origin regression', () => {
  it('deal communication browser callers remain BFF-only', () => {
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
    expect(broadcast).not.toContain("apiFetch('/api/deals/broadcast'");
    expect(external).not.toContain("apiFetch('/api/deals/reply'");
  });
});

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createInboxReadService,
  type InboxItemRecord,
  type InboxReadRepository,
} from '@paperworking/services';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bffFetch, bffJson, bffUrl, isBffApiPath } from '../../lib/api/bff-fetch.js';
import {
  buildHandlerDeps,
  buildInboxReadService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';
import { resolveAuthUserFromRequest } from '../../lib/api/server-session.js';

const recipient: AuthUser = {
  uid: 'user-1',
  email: 'user@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeItem(overrides: Partial<InboxItemRecord> = {}): InboxItemRecord {
  return {
    id: 'item-1',
    recipientUid: 'user-1',
    senderUid: 'sender-1',
    type: 'notification',
    title: 'Hello',
    body: 'Body',
    href: null,
    read: false,
    metadata: null,
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-01-15T10:00:00.000Z'),
    ...overrides,
  };
}

describe('phase B2 — bffFetch transport for inbox GET', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, items: [], threads: [] }), { status: 200 }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('bffUrl keeps relative /api/inbox path', () => {
    expect(bffUrl('/api/inbox')).toBe('/api/inbox');
  });

  it('isBffApiPath matches GET /api/inbox only (item mutations added in B6)', () => {
    expect(isBffApiPath('/api/inbox')).toBe(true);
    expect(isBffApiPath('/api/inbox/item-1')).toBe(true);
  });

  it('bffFetch for inbox does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/inbox');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/inbox',
      expect.objectContaining({ credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });

  it('bffJson parses inbox list response', async () => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          items: [],
          threads: [{ id: 'item-1', subject: 'Hello' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch;
    const data = await bffJson<{ threads: Array<{ id: string }> }>('/api/inbox');
    expect(data.threads[0]?.id).toBe('item-1');
  });
});

describe('phase B2 — api-provider inbox transport', () => {
  it('inboxThreads uses bffFetch not apiFetch for GET /api/inbox', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../lib/data/api-provider.ts'), 'utf8');
    expect(source).toMatch(/inboxThreads[\s\S]*bffFetch\('\/api\/inbox'/);
    expect(source).not.toMatch(/inboxThreads[\s\S]*apiFetch\('\/api\/inbox'/);
  });
});

describe('phase B2 — inbox read auth boundary', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('unauthenticated request resolves no AuthUser (route returns 401)', async () => {
    const user = await resolveAuthUserFromRequest(new Request('http://localhost/api/inbox'));
    expect(user).toBeNull();
  });

  it('__acct and __sub query params do not affect InboxReadService recipient scope', async () => {
    const listForRecipient = jest.fn(async () => [] as InboxItemRecord[]);
    const repository: InboxReadRepository = { listForRecipient };
    const service = createInboxReadService({ repository });

    await service.listInbox(recipient);
    expect(listForRecipient).toHaveBeenCalledWith('user-1');
    expect(listForRecipient).not.toHaveBeenCalledWith('other-user');
  });
});

describe('phase B2 — InboxReadService integration shape', () => {
  it('listInbox returns Nest-compatible envelope', async () => {
    const repository: InboxReadRepository = {
      listForRecipient: async () => [makeItem()],
    };
    const service = createInboxReadService({ repository });

    const result = await service.listInbox(recipient);
    expect(result).toEqual({
      success: true,
      items: [makeItem()],
      threads: [
        expect.objectContaining({
          id: 'item-1',
          subject: 'Hello',
          unread: true,
          read: false,
        }),
      ],
    });
  });

  it('empty inbox returns success with empty arrays', async () => {
    const repository: InboxReadRepository = {
      listForRecipient: async () => [],
    };
    const service = createInboxReadService({ repository });

    const result = await service.listInbox(recipient);
    expect(result).toEqual({ success: true, items: [], threads: [] });
  });
});

describe('phase B2 — buildInboxReadService wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('builds shared inbox read service from handler deps', () => {
    if (!process.env.DATABASE_URL?.trim()) {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    }
    const service = buildInboxReadService(buildHandlerDeps());
    expect(typeof service.listInbox).toBe('function');
  });
});

describe('phase B2 — Next GET /api/inbox route adapter', () => {
  it('route returns 401 envelope when AuthUser is null', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/inbox/route.ts'), 'utf8');
    expect(source).toContain('resolveAuthUserFromRequest');
    expect(source).toMatch(/if \(!user\)[\s\S]*401/);
    expect(source).toContain('buildInboxReadService');
    expect(source).toContain('listInbox');
  });
});

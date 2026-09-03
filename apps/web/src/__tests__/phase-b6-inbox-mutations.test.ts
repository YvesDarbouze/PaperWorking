import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createInboxCommandService,
  InboxItemNotFoundError,
  type InboxCommandRepository,
  type InboxItemRecord,
} from '@paperworking/services';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bffFetch, bffUrl, isBffApiPath } from '../../lib/api/bff-fetch.js';
import { inboxCommandErrorResponse } from '../../lib/api/inbox-route-errors.js';
import {
  buildHandlerDeps,
  buildInboxCommandService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';

const owner: AuthUser = {
  uid: 'user-1',
  email: 'owner@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function item(): InboxItemRecord {
  return {
    id: 'item-1',
    recipientUid: 'user-1',
    senderUid: null,
    type: 'notification',
    title: 'Hello',
    body: 'Body',
    href: null,
    read: true,
    metadata: { archived: true },
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
  };
}

describe('phase B6 — bffFetch transport for inbox mutations', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, item: { id: 'item-1', read: true } }), {
        status: 200,
      }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('bffUrl keeps relative /api/inbox/:id path', () => {
    expect(bffUrl('/api/inbox/item-1')).toBe('/api/inbox/item-1');
  });

  it('isBffApiPath matches inbox list and item mutation paths', () => {
    expect(isBffApiPath('/api/inbox')).toBe(true);
    expect(isBffApiPath('/api/inbox/item-1')).toBe(true);
    expect(isBffApiPath('/api/inbox/item-1/actions')).toBe(false);
  });

  it('bffFetch PATCH for inbox does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/inbox/item-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/inbox/item-1',
      expect.objectContaining({ method: 'PATCH', credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });

  it('bffFetch DELETE for inbox uses same-origin path', async () => {
    await bffFetch('/api/inbox/item-1', { method: 'DELETE' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/inbox/item-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('phase B6 — InboxNotificationCenter transport', () => {
  it('uses bffFetch not apiFetch for PATCH/DELETE /api/inbox/:id', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(here, '../../components/inbox/InboxNotificationCenter.tsx'),
      'utf8',
    );
    expect(source).toContain("bffFetch(`/api/inbox/${id}`");
    expect(source).toContain("bffFetch(`/api/inbox/${item.id}`");
    expect(source).not.toContain('apiFetch');
  });
});

describe('phase B6 — inbox command error mapping', () => {
  it('maps not found to 404 Nest-compatible payload', () => {
    const response = inboxCommandErrorResponse(new InboxItemNotFoundError());
    expect(response?.status).toBe(404);
  });
});

describe('phase B6 — buildInboxCommandService wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('builds shared inbox command service from handler deps', () => {
    if (!process.env.DATABASE_URL?.trim()) {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    }
    const service = buildInboxCommandService(buildHandlerDeps());
    expect(typeof service.updateInboxItem).toBe('function');
    expect(typeof service.deleteInboxItem).toBe('function');
  });
});

describe('phase B6 — shared service mutation shape', () => {
  it('Nest and Next adapters share identical update/delete results', async () => {
    const repository: InboxCommandRepository = {
      findOwnedItem: async () => item(),
      updateOwnedItem: async () => item(),
      deleteOwnedItem: async () => true,
    };
    const service = createInboxCommandService({ repository });

    const updated = await service.updateInboxItem(owner, 'item-1', { read: true });
    expect(updated).toEqual({ success: true, item: item() });

    const deleted = await service.deleteInboxItem(owner, 'item-1');
    expect(deleted).toEqual({ success: true, deleted: true });
  });
});

describe('phase B6 — Next PATCH/DELETE route adapter', () => {
  it('route delegates to buildInboxCommandService', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/inbox/[id]/route.ts'), 'utf8');
    expect(source).toContain('resolveAuthUserFromRequest');
    expect(source).toMatch(/if \(!user\)[\s\S]*401/);
    expect(source).toContain('buildInboxCommandService');
    expect(source).toContain('updateInboxItem');
    expect(source).toContain('deleteInboxItem');
  });
});

describe('phase B6 — inbox browser transport status', () => {
  it('inbox list and mutations are same-origin in api-provider and notification center', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const provider = readFileSync(join(here, '../../lib/data/api-provider.ts'), 'utf8');
    const center = readFileSync(
      join(here, '../../components/inbox/InboxNotificationCenter.tsx'),
      'utf8',
    );
    expect(provider).toContain("bffFetch('/api/inbox'");
    expect(center).toContain('bffFetch');
    expect(provider).not.toMatch(/apiFetch\('\/api\/inbox/);
    expect(center).not.toContain('apiFetch');
  });
});

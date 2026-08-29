/**
 * Sprint 2 P1 — Deals published OR authorization leak (pure logic mirror).
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

type Deal = {
  id: string;
  creatorId: string;
  status: 'draft' | 'published' | 'funding' | 'closed' | 'archived';
  visibility: 'marketplace' | 'invitation_only' | 'private';
  address: string;
};

function marketplaceVisible(d: Deal): boolean {
  return d.visibility === 'marketplace' && d.status === 'published';
}

function listDeals(
  user: { uid: string } | null,
  deals: Deal[],
  opts?: { tab?: string; q?: string },
): Deal[] {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });

  const access =
    opts?.tab === 'my_activity'
      ? deals.filter((d) => d.creatorId === user.uid)
      : opts?.tab === 'discover'
        ? deals.filter(marketplaceVisible)
        : deals.filter((d) => d.creatorId === user.uid || marketplaceVisible(d));

  if (!opts?.q?.trim()) return access;
  const q = opts.q.trim().toLowerCase();
  return access.filter((d) => d.address.toLowerCase().includes(q));
}

function assertDealRead(
  user: { uid: string; isAdmin?: boolean } | null,
  deal: Deal | undefined,
): Deal {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  if (!deal) throw new ForbiddenException({ error: 'Not found' });
  if (user.isAdmin || deal.creatorId === user.uid) return deal;
  if (marketplaceVisible(deal)) return deal;
  throw new ForbiddenException({ error: 'Forbidden', reason: 'deal' });
}

describe('Sprint 2 P1 — deals published OR leak', () => {
  const deals: Deal[] = [
    {
      id: 'own-private',
      creatorId: 'user-a',
      status: 'published',
      visibility: 'private',
      address: '100 Own St',
    },
    {
      id: 'foreign-private-pub',
      creatorId: 'user-b',
      status: 'published',
      visibility: 'private',
      address: '200 Foreign St',
    },
    {
      id: 'public-mkt',
      creatorId: 'user-b',
      status: 'published',
      visibility: 'marketplace',
      address: '300 Market St',
    },
    {
      id: 'foreign-draft',
      creatorId: 'user-b',
      status: 'draft',
      visibility: 'marketplace',
      address: '400 Draft St',
    },
  ];

  it('authorized private deal → visible', () => {
    const ids = listDeals({ uid: 'user-a' }, deals).map((d) => d.id);
    expect(ids).toContain('own-private');
  });

  it('foreign private published deal → hidden from list', () => {
    const ids = listDeals({ uid: 'user-a' }, deals).map((d) => d.id);
    expect(ids).not.toContain('foreign-private-pub');
  });

  it('intended public published marketplace deal → visible', () => {
    const ids = listDeals({ uid: 'user-a' }, deals, { tab: 'discover' }).map((d) => d.id);
    expect(ids).toContain('public-mkt');
  });

  it('unpublished foreign deal → hidden', () => {
    const ids = listDeals({ uid: 'user-a' }, deals).map((d) => d.id);
    expect(ids).not.toContain('foreign-draft');
  });

  it('mixed published/private query → no unauthorized leakage', () => {
    const ids = listDeals({ uid: 'user-a' }, deals, { q: 'St' }).map((d) => d.id);
    expect(ids).toContain('own-private');
    expect(ids).toContain('public-mkt');
    expect(ids).not.toContain('foreign-private-pub');
    expect(ids).not.toContain('foreign-draft');
  });

  it('pagination/search preserves authorization (discover tab)', () => {
    const ids = listDeals({ uid: 'user-a' }, deals, { tab: 'discover', q: 'Foreign' }).map(
      (d) => d.id,
    );
    expect(ids).toEqual([]);
  });

  it('detail: foreign private published → rejected', () => {
    expect(() =>
      assertDealRead(
        { uid: 'user-a' },
        deals.find((d) => d.id === 'foreign-private-pub'),
      ),
    ).toThrow(ForbiddenException);
  });

  it('unauthenticated → rejected', () => {
    expect(() => listDeals(null, deals)).toThrow(ForbiddenException);
  });
});

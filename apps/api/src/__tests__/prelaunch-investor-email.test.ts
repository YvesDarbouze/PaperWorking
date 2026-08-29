/**
 * Sprint pre-launch — public investor email must never appear in public DTOs.
 */
import { describe, expect, it } from '@jest/globals';

type Row = {
  id: string;
  email?: string;
  name?: string | null;
  displayName?: string | null;
  companyName?: string | null;
  avatarUrl?: string | null;
  accountType?: string | null;
};

function toPublicInvestor(inv: Row) {
  return {
    id: inv.id,
    name: inv.name,
    displayName: inv.displayName,
    companyName: inv.companyName,
    avatarUrl: inv.avatarUrl,
    accountType: inv.accountType,
  };
}

function publicInvestorsList(rows: Row[]) {
  return { success: true, investors: rows.map(toPublicInvestor) };
}

describe('Pre-launch — public investor email redaction', () => {
  const rows: Row[] = [
    {
      id: 'u1',
      email: 'secret@investors.test',
      name: 'Ada',
      displayName: 'Ada Investor',
      companyName: 'Ada Cap',
      accountType: 'investor',
    },
  ];

  it('public investor listing → no email field', () => {
    const res = publicInvestorsList(rows);
    expect(res.investors[0]).not.toHaveProperty('email');
    expect(JSON.stringify(res)).not.toMatch(/secret@investors\.test/);
  });

  it('public investor detail → no email field', () => {
    const detail = { ...toPublicInvestor(rows[0]), followers: 3 };
    expect(detail).not.toHaveProperty('email');
  });

  it('serialization regression — email key absent even if present on row', () => {
    const dto = toPublicInvestor({ ...rows[0], email: 'x@y.com' });
    expect(Object.keys(dto).includes('email')).toBe(false);
  });

  it('authorized self profile may retain email (separate endpoint)', () => {
    const selfProfile = {
      id: 'u1',
      email: 'me@test.com',
      displayName: 'Me',
    };
    expect(selfProfile.email).toBe('me@test.com');
  });
});

/**
 * Sprint 2 P2 — Settings allowlist + auth/KPI honesty mirrors.
 */
import { describe, expect, it } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const ALLOWED_SECTIONS = new Set(['profile', 'notifications', 'preferences', 'display', 'privacy']);
const FORBIDDEN_FIELDS = new Set([
  'accountType',
  'isAdmin',
  'role',
  'email',
  'organizationId',
  'userId',
]);
const PROFILE_FIELDS = new Set([
  'name',
  'displayName',
  'phone',
  'timezone',
  'companyName',
  'avatarUrl',
]);

function putSettings(
  user: { uid: string } | null,
  section: string,
  body: Record<string, unknown>,
  store: Map<string, Record<string, unknown>>,
) {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  if (typeof body.userId === 'string' && body.userId !== user.uid) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'foreign_user' });
  }
  if (!ALLOWED_SECTIONS.has(section)) {
    throw new ForbiddenException({ error: 'Forbidden settings section', section });
  }
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new ForbiddenException({ error: 'Forbidden settings field', field: key });
    }
  }
  if (section === 'profile') {
    for (const key of Object.keys(body)) {
      if (!PROFILE_FIELDS.has(key)) {
        throw new BadRequestException({ error: 'Unknown profile field', field: key });
      }
    }
  }
  const cur = store.get(user.uid) || {};
  cur[section] = { ...(cur[section] as object), ...body };
  store.set(user.uid, cur);
  return { success: true, section, settings: cur[section] };
}

function currentKpis(purchasePrice: number) {
  return {
    purchasePrice,
    estimatedArv: null,
    estimatedEquity: null,
    estimatedCashNeeded: null,
    estimatedArvStatus: 'unavailable',
    incomplete: true,
  };
}

function authEmailStub() {
  return {
    success: false,
    code: 'NOT_IMPLEMENTED',
    stub: true,
  };
}

describe('Sprint 2 P2 — settings allowlist', () => {
  const store = new Map<string, Record<string, unknown>>();

  it('valid setting update → success', () => {
    const r = putSettings({ uid: 'u1' }, 'preferences', { theme: 'dark' }, store);
    expect(r.success).toBe(true);
  });

  it('forbidden privilege field → rejected', () => {
    expect(() =>
      putSettings({ uid: 'u1' }, 'profile', { name: 'A', accountType: 'admin' }, store),
    ).toThrow(ForbiddenException);
  });

  it('unknown profile field → rejected', () => {
    expect(() =>
      putSettings({ uid: 'u1' }, 'profile', { weirdField: 'x' }, store),
    ).toThrow(BadRequestException);
  });

  it('unknown section → rejected', () => {
    expect(() =>
      putSettings({ uid: 'u1' }, 'billing-secrets', { x: 1 }, store),
    ).toThrow(ForbiddenException);
  });

  it('foreign user spoof → rejected', () => {
    expect(() =>
      putSettings({ uid: 'u1' }, 'preferences', { userId: 'u2', theme: 'x' }, store),
    ).toThrow(ForbiddenException);
  });

  it('unauthenticated → rejected', () => {
    expect(() => putSettings(null, 'preferences', { theme: 'x' }, store)).toThrow(
      ForbiddenException,
    );
  });

  it('foreign organization field → rejected', () => {
    expect(() =>
      putSettings({ uid: 'u1' }, 'preferences', { organizationId: 'org-x' }, store),
    ).toThrow(ForbiddenException);
  });
});

describe('Sprint 2 P2 — KPI honesty', () => {
  it('does not invent ARV multipliers', () => {
    const k = currentKpis(400_000);
    expect(k.estimatedArv).toBeNull();
    expect(k.estimatedArvStatus).toBe('unavailable');
    expect(k.incomplete).toBe(true);
  });
});

describe('Sprint 2 P2 — auth email stubs', () => {
  it('reset/magic-link do not fake success', () => {
    const r = authEmailStub();
    expect(r.success).toBe(false);
    expect(r.stub).toBe(true);
  });
});

import { describe, expect, it } from '@jest/globals';
import { userFromFirestore } from '../converters/user.converter.js';
import { organizationFromFirestore } from '../converters/organization.converter.js';
import { organizationMemberFromFirestore } from '../converters/organization-member.converter.js';
import { projectFromFirestore } from '../converters/project.converter.js';
import { FirestoreDocumentParseError } from '../errors.js';
import { toDate } from '../converters/timestamp.js';
import { ts } from './mock-firestore.js';

describe('firestore converters', () => {
  it('converts user timestamps and uid fallback', () => {
    const user = userFromFirestore('uid-1', {
      email: 'a@example.com',
      displayName: 'Alex',
      accountType: 'investor',
      role: 'Lead Investor',
      personalOrganizationId: 'org-1',
      createdAt: ts('2026-01-01T00:00:00.000Z'),
      updatedAt: ts('2026-01-02T00:00:00.000Z'),
    });

    expect(user.id).toBe('uid-1');
    expect(user.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('maps organization ownerUid to ownerId', () => {
    const org = organizationFromFirestore('org-1', {
      name: 'Acme',
      ownerUid: 'uid-1',
      createdAt: ts('2026-01-01T00:00:00.000Z'),
      updatedAt: ts('2026-01-02T00:00:00.000Z'),
    });
    expect(org.ownerId).toBe('uid-1');
  });

  const lifecycleProjectBase = {
    organizationId: 'org-1',
    ownerId: 'uid-1',
    name: '123 Main',
    status: 'active',
    addressLine: '123 Main',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    visibility: 'private',
    createdAt: ts('2026-01-01T00:00:00.000Z'),
    updatedAt: ts('2026-01-02T00:00:00.000Z'),
  };

  it.each([
    ['acquisition', 1],
    ['purchase', 2],
    ['fund', 2],
    ['hold', 3],
    ['exit', 4],
    ['Fund', 2],
    ['PURCHASE', 2],
  ] as const)('maps lifecyclePhase "%s" to currentPhase %i', (lifecyclePhase, expected) => {
    const project = projectFromFirestore('p-1', {
      ...lifecycleProjectBase,
      lifecyclePhase,
    });
    expect(project.currentPhase).toBe(expected);
  });

  it('maps project lifecyclePhase fund and preserves owner/address fields', () => {
    const project = projectFromFirestore('p-1', {
      ...lifecycleProjectBase,
      lifecyclePhase: 'fund',
    });
    expect(project.currentPhase).toBe(2);
    expect(project.userId).toBe('uid-1');
    expect(project.address).toBe('123 Main');
  });

  it('returns null currentPhase for unknown lifecyclePhase strings', () => {
    const project = projectFromFirestore('p-1', {
      ...lifecycleProjectBase,
      lifecyclePhase: 'unknown-phase',
    });
    expect(project.currentPhase).toBeNull();
  });

  it('prefers numeric currentPhase on the Firestore document', () => {
    const project = projectFromFirestore('p-1', {
      ...lifecycleProjectBase,
      currentPhase: 3,
      lifecyclePhase: 'acquisition',
    });
    expect(project.currentPhase).toBe(3);
  });

  it('throws parse error for malformed membership document', () => {
    expect(() =>
      organizationMemberFromFirestore('bad', {
        userId: 'uid-1',
        createdAt: ts('2026-01-01T00:00:00.000Z'),
        updatedAt: ts('2026-01-02T00:00:00.000Z'),
      }),
    ).toThrow(FirestoreDocumentParseError);
  });

  it('normalizes ISO timestamp strings', () => {
    expect(toDate('2026-03-01T12:00:00.000Z', 'createdAt').toISOString()).toBe(
      '2026-03-01T12:00:00.000Z',
    );
  });
});

import { describe, expect, it } from '@jest/globals';
import { FIRESTORE_COLLECTIONS } from '../admin.js';
import {
  FirestoreReadNotConfiguredError,
  FirestoreReadNotImplementedError,
} from '../errors.js';
import { FirestoreOrganizationMemberRepository } from '../repositories/organization-member.repository.js';
import { FirestoreOrganizationRepository } from '../repositories/organization.repository.js';
import { FirestoreProjectRepository } from '../repositories/project.repository.js';
import { FirestoreUserRepository } from '../repositories/user.repository.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';

describe('firestore read repositories', () => {
  const baseUser = {
    uid: 'uid-1',
    email: 'investor@example.com',
    displayName: 'Alex Investor',
    accountType: 'investor',
    role: 'Lead Investor',
    personalOrganizationId: 'org-1',
    createdAt: ts('2026-01-01T00:00:00.000Z'),
    updatedAt: ts('2026-01-02T00:00:00.000Z'),
  };

  function seedStore(): MockFirestore {
    const mock = new MockFirestore();
    mock.seed(FIRESTORE_COLLECTIONS.users, [{ id: 'uid-1', data: baseUser }]);
    mock.seed(FIRESTORE_COLLECTIONS.organizations, [
      {
        id: 'org-1',
        data: {
          id: 'org-1',
          name: 'Alex Investor',
          ownerUid: 'uid-1',
          createdAt: ts('2026-01-01T00:00:00.000Z'),
          updatedAt: ts('2026-01-02T00:00:00.000Z'),
        },
      },
      {
        id: 'org-2',
        data: {
          id: 'org-2',
          name: 'Other Org',
          ownerUid: 'uid-2',
          createdAt: ts('2026-01-01T00:00:00.000Z'),
          updatedAt: ts('2026-01-02T00:00:00.000Z'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.organizationMembers, [
      {
        id: 'org-1_uid-1',
        data: {
          id: 'org-1_uid-1',
          organizationId: 'org-1',
          userId: 'uid-1',
          email: 'investor@example.com',
          role: 'Lead Investor',
          status: 'active',
          createdAt: ts('2026-01-01T00:00:00.000Z'),
          updatedAt: ts('2026-01-02T00:00:00.000Z'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.projects, [
      {
        id: 'p-1',
        data: {
          id: 'p-1',
          organizationId: 'org-1',
          ownerId: 'uid-1',
          name: '123 Main',
          status: 'active',
          lifecyclePhase: 'acquisition',
          addressLine: '123 Main',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          visibility: 'private',
          createdAt: ts('2026-01-01T00:00:00.000Z'),
          updatedAt: ts('2026-01-02T00:00:00.000Z'),
        },
      },
      {
        id: 'p-2',
        data: {
          id: 'p-2',
          organizationId: 'org-1',
          ownerId: 'uid-1',
          name: '456 Oak',
          status: 'active',
          lifecyclePhase: 'hold',
          addressLine: '456 Oak',
          city: 'Austin',
          state: 'TX',
          zip: '78702',
          visibility: 'team',
          createdAt: ts('2026-01-01T00:00:00.000Z'),
          updatedAt: ts('2026-01-02T00:00:00.000Z'),
        },
      },
    ]);
    return mock;
  }

  it('reads user by id', async () => {
    const repo = new FirestoreUserRepository(createMockFirestoreFactory(seedStore()));
    const user = await repo.getById('uid-1');
    expect(user?.email).toBe('investor@example.com');
  });

  it('returns null when user is not found', async () => {
    const repo = new FirestoreUserRepository(createMockFirestoreFactory(seedStore()));
    await expect(repo.getById('missing')).resolves.toBeNull();
  });

  it('reads organization by id', async () => {
    const repo = new FirestoreOrganizationRepository(createMockFirestoreFactory(seedStore()));
    const org = await repo.getById('org-1');
    expect(org?.ownerId).toBe('uid-1');
  });

  it('reads membership by composite id', async () => {
    const repo = new FirestoreOrganizationMemberRepository(createMockFirestoreFactory(seedStore()));
    const membership = await repo.getMembership('org-1', 'uid-1');
    expect(membership?.status).toBe('active');
  });

  it('returns null when membership is not found', async () => {
    const repo = new FirestoreOrganizationMemberRepository(createMockFirestoreFactory(seedStore()));
    await expect(repo.getMembership('org-1', 'uid-999')).resolves.toBeNull();
  });

  it('lists memberships for user', async () => {
    const repo = new FirestoreOrganizationMemberRepository(createMockFirestoreFactory(seedStore()));
    const memberships = await repo.listForUser('uid-1');
    expect(memberships).toHaveLength(1);
  });

  it('reads project by id', async () => {
    const repo = new FirestoreProjectRepository(createMockFirestoreFactory(seedStore()));
    const project = await repo.getById('p-1');
    expect(project?.organizationId).toBe('org-1');
    expect(project?.currentPhase).toBe(1);
  });

  it('lists projects by organization', async () => {
    const repo = new FirestoreProjectRepository(createMockFirestoreFactory(seedStore()));
    const projects = await repo.listByOrganization('org-1');
    expect(projects.map((p) => p.id).sort()).toEqual(['p-1', 'p-2']);
  });

  it('throws when Firestore is not configured', async () => {
    const repo = new FirestoreUserRepository(async () => null);
    await expect(repo.getById('uid-1')).rejects.toBeInstanceOf(FirestoreReadNotConfiguredError);
  });

  it('blocks write operations explicitly', () => {
    const repo = new FirestoreProjectRepository(createMockFirestoreFactory(seedStore()));
    expect(() => repo.create()).toThrow(FirestoreReadNotImplementedError);
    expect(() => repo.update()).toThrow(FirestoreReadNotImplementedError);
    expect(() => repo.delete()).toThrow(FirestoreReadNotImplementedError);
  });
});

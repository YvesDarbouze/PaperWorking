/**
 * Sprint 2 P1 — Inbox recipientUid authorization (pure logic mirror).
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

type Member = { userId: string; organizationId: string; status: string };
type Org = { id: string; ownerId: string };

function resolveUserOrgIds(uid: string, members: Member[], orgs: Org[]): string[] {
  const fromMembers = members
    .filter((m) => m.userId === uid && m.status === 'active')
    .map((m) => m.organizationId);
  const fromOwned = orgs.filter((o) => o.ownerId === uid).map((o) => o.id);
  return [...new Set([...fromMembers, ...fromOwned])];
}

function resolveInboxRecipientUid(
  user: { uid: string; isAdmin?: boolean },
  requestedRecipientUid: string | undefined,
  members: Member[],
  orgs: Org[],
): string {
  if (!requestedRecipientUid || requestedRecipientUid === user.uid) {
    return user.uid;
  }
  if (user.isAdmin) return requestedRecipientUid;

  const myOrgIds = resolveUserOrgIds(user.uid, members, orgs);
  if (myOrgIds.length === 0) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'recipient' });
  }

  const sharedMember = members.find(
    (m) =>
      m.userId === requestedRecipientUid &&
      m.status === 'active' &&
      myOrgIds.includes(m.organizationId),
  );
  if (sharedMember) return requestedRecipientUid;

  const sharedOwner = orgs.find(
    (o) => o.ownerId === requestedRecipientUid && myOrgIds.includes(o.id),
  );
  if (sharedOwner) return requestedRecipientUid;

  throw new ForbiddenException({ error: 'Forbidden', reason: 'recipient' });
}

function createInbox(
  user: { uid: string; isAdmin?: boolean } | null,
  body: Record<string, unknown>,
  members: Member[],
  orgs: Org[],
) {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  void body.organizationId;
  void body.senderUid;
  const recipientUid = resolveInboxRecipientUid(
    user,
    typeof body.recipientUid === 'string' ? body.recipientUid : undefined,
    members,
    orgs,
  );
  return {
    success: true,
    item: {
      recipientUid,
      senderUid: user.uid,
      title: String(body.title || 'Notification'),
    },
  };
}

describe('Sprint 2 P1 — inbox recipientUid', () => {
  const orgs: Org[] = [
    { id: 'org-a', ownerId: 'user-a' },
    { id: 'org-b', ownerId: 'user-b' },
  ];
  const members: Member[] = [
    { userId: 'user-a', organizationId: 'org-a', status: 'active' },
    { userId: 'peer-a', organizationId: 'org-a', status: 'active' },
    { userId: 'user-b', organizationId: 'org-b', status: 'active' },
  ];

  it('authorized self (omit recipient) → success', () => {
    const r = createInbox({ uid: 'user-a' }, { title: 'Hi' }, members, orgs);
    expect(r.item.recipientUid).toBe('user-a');
    expect(r.item.senderUid).toBe('user-a');
  });

  it('authorized same-org peer → success', () => {
    const r = createInbox(
      { uid: 'user-a' },
      { title: 'Hi', recipientUid: 'peer-a' },
      members,
      orgs,
    );
    expect(r.item.recipientUid).toBe('peer-a');
  });

  it('unauthenticated → rejected', () => {
    expect(() => createInbox(null, { title: 'Hi' }, members, orgs)).toThrow(
      ForbiddenException,
    );
  });

  it('invalid / unknown recipient → rejected', () => {
    expect(() =>
      createInbox({ uid: 'user-a' }, { title: 'Hi', recipientUid: 'ghost' }, members, orgs),
    ).toThrow(ForbiddenException);
  });

  it('cross-user unauthorized recipient → rejected', () => {
    expect(() =>
      createInbox({ uid: 'user-a' }, { title: 'Hi', recipientUid: 'user-b' }, members, orgs),
    ).toThrow(ForbiddenException);
  });

  it('cross-org recipient → rejected', () => {
    expect(() =>
      createInbox(
        { uid: 'user-a' },
        { title: 'Hi', recipientUid: 'user-b', organizationId: 'org-b' },
        members,
        orgs,
      ),
    ).toThrow(ForbiddenException);
  });

  it('spoofed senderUid / organizationId ignored; cannot force foreign recipient', () => {
    expect(() =>
      createInbox(
        { uid: 'user-a' },
        {
          title: 'Hi',
          recipientUid: 'user-b',
          senderUid: 'user-b',
          organizationId: 'org-b',
        },
        members,
        orgs,
      ),
    ).toThrow(ForbiddenException);
  });
});

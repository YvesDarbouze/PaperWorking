/**
 * Sprint 2 P2 — Messages threadId injection (pure logic mirror).
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

type Msg = {
  threadId: string;
  senderId: string;
  recipientId: string;
  body: string;
};

function assertThreadAccess(
  user: { uid: string; isAdmin?: boolean } | null,
  threadId: string,
  messages: Msg[],
) {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  const mine = messages.find(
    (m) =>
      m.threadId === threadId &&
      (m.senderId === user.uid || m.recipientId === user.uid),
  );
  if (mine || user.isAdmin) return;
  const foreign = messages.find((m) => m.threadId === threadId);
  if (foreign) throw new ForbiddenException({ error: 'Forbidden', reason: 'thread' });
  throw new ForbiddenException({ error: 'Thread not found' });
}

function createMessage(
  user: { uid: string } | null,
  body: Record<string, unknown>,
  messages: Msg[],
): Msg {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  void body.senderId;
  void body.organizationId;

  let threadId: string;
  if (typeof body.threadId === 'string' && body.threadId) {
    assertThreadAccess(user, body.threadId, messages);
    threadId = body.threadId;
  } else {
    threadId = `thread-${messages.length + 1}`;
  }

  const msg: Msg = {
    threadId,
    senderId: user.uid,
    recipientId: String(body.recipientId),
    body: String(body.body),
  };
  messages.push(msg);
  return msg;
}

describe('Sprint 2 P2 — messages threadId', () => {
  const seed: Msg[] = [
    {
      threadId: 't-own',
      senderId: 'user-a',
      recipientId: 'user-b',
      body: 'hi',
    },
    {
      threadId: 't-foreign',
      senderId: 'user-x',
      recipientId: 'user-y',
      body: 'secret',
    },
  ];

  it('authorized thread reply → success', () => {
    const msgs = [...seed];
    const m = createMessage(
      { uid: 'user-a' },
      { threadId: 't-own', recipientId: 'user-b', body: 'reply' },
      msgs,
    );
    expect(m.threadId).toBe('t-own');
    expect(m.senderId).toBe('user-a');
  });

  it('unauthenticated → rejected', () => {
    expect(() =>
      createMessage(null, { recipientId: 'user-b', body: 'x' }, [...seed]),
    ).toThrow(ForbiddenException);
  });

  it('unauthorized / foreign thread → rejected', () => {
    expect(() =>
      createMessage(
        { uid: 'user-a' },
        { threadId: 't-foreign', recipientId: 'user-y', body: 'inject' },
        [...seed],
      ),
    ).toThrow(ForbiddenException);
  });

  it('spoofed threadId (unknown) → rejected', () => {
    expect(() =>
      createMessage(
        { uid: 'user-a' },
        { threadId: 't-ghost', recipientId: 'user-b', body: 'x' },
        [...seed],
      ),
    ).toThrow(ForbiddenException);
  });

  it('spoofed senderId ignored — session is sender', () => {
    const msgs = [...seed];
    const m = createMessage(
      { uid: 'user-a' },
      {
        threadId: 't-own',
        recipientId: 'user-b',
        body: 'ok',
        senderId: 'user-x',
        organizationId: 'org-foreign',
      },
      msgs,
    );
    expect(m.senderId).toBe('user-a');
  });

  it('cross-org spoof cannot unlock foreign thread', () => {
    expect(() =>
      assertThreadAccess({ uid: 'user-a' }, 't-foreign', seed),
    ).toThrow(ForbiddenException);
  });
});

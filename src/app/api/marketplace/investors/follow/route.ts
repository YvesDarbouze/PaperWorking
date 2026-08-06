import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/marketplace/investors/follow   { targetUid, follow }
   ───────────────────────────────────────────────────────────────────────────
   Creates or removes a follow edge.

   Model: the existing FLAT `investorFollowers` collection keyed
   `{followerUid}_{targetUid}`, matching `src/actions/follows.ts`. A nested
   followers/{uid}/following/{id} shape was considered and rejected: it would
   mean two writes per follow and a rewrite of the actions, the Follow button
   and the E2E helpers, for no query we actually need.

   Security:
   - The follower identity comes from the VERIFIED token, never the body, so a
     caller cannot forge a follow on someone else's behalf.
   - Self-follow is rejected.
   - Counts are maintained with atomic FieldValue.increment inside the same
     batch as the edge, so they cannot drift from the edges.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  let body: { targetUid?: unknown; follow?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const targetUid = typeof body.targetUid === 'string' ? body.targetUid.trim() : '';
  const follow = body.follow !== false; // default to follow

  if (!targetUid) {
    return NextResponse.json({ error: 'targetUid is required.' }, { status: 400 });
  }
  if (targetUid === auth.uid) {
    return NextResponse.json({ error: 'You cannot follow yourself.' }, { status: 400 });
  }

  const edgeId = `${auth.uid}_${targetUid}`;
  const edgeRef = adminDb.collection('investorFollowers').doc(edgeId);
  const followerRef = adminDb.collection('users').doc(auth.uid);
  const targetRef = adminDb.collection('users').doc(targetUid);

  try {
    const existing = await edgeRef.get();

    // Idempotent: following twice, or unfollowing what you don't follow, is a
    // no-op rather than an error or a double-counted increment.
    if (follow && existing.exists) {
      return NextResponse.json({ following: true, changed: false });
    }
    if (!follow && !existing.exists) {
      return NextResponse.json({ following: false, changed: false });
    }

    const batch = adminDb.batch();
    if (follow) {
      batch.set(edgeRef, {
        followerUid: auth.uid,
        targetUid,
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.set(followerRef, { followingCount: FieldValue.increment(1) }, { merge: true });
      batch.set(targetRef, { followerCount: FieldValue.increment(1) }, { merge: true });
    } else {
      batch.delete(edgeRef);
      batch.set(followerRef, { followingCount: FieldValue.increment(-1) }, { merge: true });
      batch.set(targetRef, { followerCount: FieldValue.increment(-1) }, { merge: true });
    }
    await batch.commit();

    // Inbox notification on follow — requirement 5. Non-fatal: a notification
    // failure must not roll back a successful follow.
    if (follow) {
      try {
        const me = await followerRef.get();
        const name = (me.data()?.displayName as string) ?? 'An investor';
        await adminDb.collection('notifications').add({
          userId: targetUid,
          type: 'investor_followed',
          tab: 'team',
          title: 'New follower',
          body: `${name} started following you.`,
          href: `/marketplace/investors/${auth.uid}`,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (notifyErr) {
        console.error('[follow] notification failed (follow itself succeeded)', notifyErr);
      }
    }

    return NextResponse.json({ following: follow, changed: true });
  } catch (err) {
    console.error('[api/marketplace/investors/follow] failed', err);
    return NextResponse.json({ error: 'Could not update follow state.' }, { status: 500 });
  }
}

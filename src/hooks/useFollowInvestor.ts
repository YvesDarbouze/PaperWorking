'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * useFollowInvestor — the single follow/unfollow path.
 *
 * Two implementations existed before this:
 *
 *   1. `FollowInvestorButton` → `actions/follows.ts` server actions. Had a
 *      consent modal and a PostHog event, but was NOT optimistic and wrote the
 *      edge WITHOUT maintaining follower/following counts or creating the
 *      inbox notification.
 *   2. The marketplace card / profile buttons → `POST /api/marketplace/
 *      investors/follow`. Optimistic with rollback, atomic counts in the same
 *      batch as the edge, and the notification — but no consent capture and no
 *      telemetry.
 *
 * Both wrote the same `investorFollowers` edges, so counts drifted depending on
 * which button a user happened to click. This hook keeps the API route as the
 * only writer (counts + notification) and exposes hooks for the consent and
 * telemetry the first implementation contributed.
 */

export interface UseFollowInvestorOptions {
  targetUid: string;
  initialFollowing?: boolean;
  /** Fired after a successful follow — used for consent capture and telemetry. */
  onFollowed?: () => void;
  /** Fired after a successful unfollow. */
  onUnfollowed?: () => void;
  /** Fired when the write fails and the optimistic state has been rolled back. */
  onError?: (err: unknown) => void;
}

export interface UseFollowInvestorResult {
  following: boolean;
  pending: boolean;
  /** Optimistic toggle. Resolves once the write settles. */
  toggle: () => Promise<void>;
  setFollowing: (v: boolean) => void;
}

export function useFollowInvestor({
  targetUid,
  initialFollowing = false,
  onFollowed,
  onUnfollowed,
  onError,
}: UseFollowInvestorOptions): UseFollowInvestorResult {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  const toggle = useCallback(async () => {
    if (!user || !targetUid || pending) return;

    const next = !following;
    setPending(true);
    setFollowing(next); // optimistic

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/marketplace/investors/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ targetUid, follow: next }),
      });
      if (!res.ok) throw new Error(`Follow request failed: ${res.status}`);

      if (next) onFollowed?.();
      else onUnfollowed?.();
    } catch (err) {
      console.error('[useFollowInvestor] write failed, rolling back', err);
      setFollowing(!next); // rollback
      onError?.(err);
    } finally {
      setPending(false);
    }
  }, [user, targetUid, following, pending, onFollowed, onUnfollowed, onError]);

  return { following, pending, toggle, setFollowing };
}

export default useFollowInvestor;

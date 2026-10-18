'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';

interface InvestorDetailPayload {
  profile?: {
    uid: string;
    displayName: string;
    publicBio?: string;
    location?: string;
    followerCount?: number;
    dealCount?: number;
  };
  deals?: Array<{ id: string; propertyName?: string; address?: string }>;
  activity?: Array<{ id: string; text: string; at?: string }>;
  isFollowing?: boolean;
}

export default function InvestorProfilePanel({ investorId }: { investorId: string }) {
  const [payload, setPayload] = useState<InvestorDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const auth = useOptionalAuth();
  const isAuthed = auth ? (auth.authenticated && !auth.loading) : true;

  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await bffFetch(
          `/api/marketplace/investors/${encodeURIComponent(investorId)}`,
          {
            cache: 'no-store',
          },
        );
        const body = (await response.json()) as InvestorDetailPayload & {
          error?: string | { message?: string };
        };
        const errMsg =
          typeof body.error === 'string'
            ? body.error
            : body.error?.message || 'Investor not found';
        if (!response.ok) throw new Error(errMsg);
        if (!cancelled) {
          setPayload(body);
          setIsFollowing(Boolean(body.isFollowing));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load investor');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [investorId, isAuthed]);

  const toggleFollow = async () => {
    const nextFollow = !isFollowing;
    const delta = nextFollow ? 1 : -1;

    setIsFollowing(nextFollow);
    setPayload((current) =>
      current?.profile
        ? {
            ...current,
            isFollowing: nextFollow,
            profile: {
              ...current.profile,
              followerCount: Math.max(0, (current.profile.followerCount ?? 0) + delta),
            },
          }
        : current,
    );

    try {
      const response = await bffFetch('/api/marketplace/investors/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid: investorId, follow: nextFollow }),
      });
      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }
    } catch {
      setIsFollowing(!nextFollow);
      setPayload((current) =>
        current?.profile
          ? {
              ...current,
              isFollowing: !nextFollow,
              profile: {
                ...current.profile,
                followerCount: Math.max(0, (current.profile.followerCount ?? 0) - delta),
              },
            }
          : current,
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-none border border-white/8 bg-white/[0.03] p-8 text-sm text-white/60">
        Loading investor profile…
      </div>
    );
  }

  if (error || !payload?.profile) {
    return (
      <div className="rounded-none border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-100">
        {error ?? 'Profile unavailable'}
      </div>
    );
  }

  const { profile } = payload;

  return (
    <div className="mx-auto max-w-[960px] space-y-8 px-4 py-6 md:px-8 md:py-8">
      <Link href="/dashboard/marketplace?tab=investors" className="text-sm text-white/60 underline-offset-4 hover:underline">
        ← Back to marketplace
      </Link>

      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{profile.displayName}</h1>
          <p className="mt-2 text-sm text-white/65">{profile.location}</p>
          {profile.publicBio ? <p className="mt-4 max-w-[60ch] text-white/75">{profile.publicBio}</p> : null}
        </div>
        <button
          type="button"
          data-testid="investor-profile-follow-btn"
          aria-pressed={isFollowing}
          onClick={toggleFollow}
          className={`min-h-[44px] cursor-pointer rounded-none border px-4 py-2 text-sm transition ${
            isFollowing
              ? 'border-neutral-200 bg-neutral-100 font-semibold text-neutral-950 hover:bg-white'
              : 'border-white/15 text-white hover:bg-white/5'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-none border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">Followers</p>
          <p className="mt-2 text-2xl font-semibold">{profile.followerCount ?? 0}</p>
        </article>
        <article className="rounded-none border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">Public deals</p>
          <p className="mt-2 text-2xl font-semibold">{profile.dealCount ?? 0}</p>
        </article>
      </section>

      {payload.deals?.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Public deal roster</h2>
          {payload.deals.map((deal) => (
            <article key={deal.id} className="rounded-none border border-white/8 px-4 py-3 text-sm">
              <p className="font-medium">{deal.propertyName ?? deal.address}</p>
            </article>
          ))}
        </section>
      ) : null}

      {payload.activity?.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          {payload.activity.map((item) => (
            <article key={item.id} className="rounded-none border border-white/8 px-4 py-3 text-sm">
              <p>{item.text}</p>
              {item.at ? <p className="mt-1 text-xs text-white/55">{new Date(item.at).toLocaleDateString()}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

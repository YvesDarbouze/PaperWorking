'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMarketplaceInvestorFromBff, setMarketplaceInvestorFollowFromBff } from '@/lib/marketplace/marketplace-api';

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const body = (await getMarketplaceInvestorFromBff(investorId)) as InvestorDetailPayload & {
          error?: string;
        };
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
  }, [investorId]);

  const toggleFollow = async () => {
    try {
      await setMarketplaceInvestorFollowFromBff({
        targetUid: investorId,
        follow: !isFollowing,
      });
      setIsFollowing((current) => !current);
    } catch {
      // keep server-authoritative follow state on failure
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-sm text-white/60">
        Loading investor profile…
      </div>
    );
  }

  if (error || !payload?.profile) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-100">
        {error ?? 'Profile unavailable'}
      </div>
    );
  }

  const { profile } = payload;

  return (
    <div className="w-full min-w-0 space-y-8 px-4 py-6 md:px-8 md:py-8">
      <Link href="/dashboard/marketplace" className="text-sm text-white/60 underline-offset-4 hover:underline">
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
          onClick={toggleFollow}
          className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">Followers</p>
          <p className="mt-2 text-2xl font-semibold">{profile.followerCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">Public deals</p>
          <p className="mt-2 text-2xl font-semibold">{profile.dealCount ?? 0}</p>
        </article>
      </section>

      {payload.deals?.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Public deal roster</h2>
          {payload.deals.map((deal) => (
            <article key={deal.id} className="rounded-xl border border-white/8 px-4 py-3 text-sm">
              <p className="font-medium">{deal.propertyName ?? deal.address}</p>
            </article>
          ))}
        </section>
      ) : null}

      {payload.activity?.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          {payload.activity.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/8 px-4 py-3 text-sm">
              <p>{item.text}</p>
              {item.at ? <p className="mt-1 text-xs text-white/55">{new Date(item.at).toLocaleDateString()}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

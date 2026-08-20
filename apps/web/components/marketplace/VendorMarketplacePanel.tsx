'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface ListingRecord {
  id: string;
  title: string;
  vendorType: string;
  city: string;
  budgetRange: string;
  responseTime: string;
  isNewListing?: boolean;
}

interface InvestorProfile {
  uid: string;
  displayName: string;
  publicBio?: string;
  location?: string;
  followerCount?: number;
  isVerified?: boolean;
}

interface ListingsPayload {
  count?: number;
  listings?: ListingRecord[];
  isAuthenticated?: boolean;
}

interface InvestorsPayload {
  profiles?: InvestorProfile[];
  following?: string[];
}

export default function VendorMarketplacePanel() {
  const [listings, setListings] = useState<ListingsPayload | null>(null);
  const [investors, setInvestors] = useState<InvestorsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [listingsRes, investorsRes] = await Promise.all([
          fetch('/api/marketplace/listings', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/marketplace/investors', { credentials: 'include', cache: 'no-store' }),
        ]);

        const listingsBody = (await listingsRes.json()) as ListingsPayload & { error?: string };
        const investorsBody = (await investorsRes.json()) as InvestorsPayload & { error?: string };

        if (!listingsRes.ok) throw new Error(listingsBody.error ?? 'Listings request failed');
        if (!investorsRes.ok) throw new Error(investorsBody.error ?? 'Investors request failed');

        if (!cancelled) {
          setListings(listingsBody);
          setInvestors(investorsBody);
          setFollowing(investorsBody.following ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load marketplace');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFollow = useCallback(async (targetUid: string) => {
    const isFollowing = following.includes(targetUid);
    const response = await fetch('/api/marketplace/investors/follow', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid, follow: !isFollowing }),
    });
    if (!response.ok) return;
    setFollowing((current) =>
      isFollowing ? current.filter((uid) => uid !== targetUid) : [...current, targetUid],
    );
  }, [following]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-sm text-white/60">
        Loading marketplace…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-5 py-6 lg:px-8 lg:py-7">
      <section>
        <div className="mb-1 flex items-center gap-2.5">
          <h1 className="text-[28px] font-bold leading-none tracking-[-0.03em] text-[#fdfffc]">
            Marketplace
          </h1>
          <span className="mt-0.5 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/45">
              Live
            </span>
          </span>
        </div>
        <p className="text-[13px] text-white/55">
          Vendor listings and investor directory from migrated marketplace adapters.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Vendor listings</h3>
          <span className="text-sm text-white/55">{listings?.count ?? 0} visible</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(listings?.listings ?? []).map((listing) => (
            <article key={listing.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.07em] text-white/45">{listing.vendorType}</p>
                {listing.isNewListing ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.06em]">
                    New
                  </span>
                ) : null}
              </div>
              <h4 className="text-lg font-semibold">{listing.title}</h4>
              <p className="mt-1 text-sm text-white/60">{listing.city}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span>{listing.budgetRange}</span>
                <span className="text-white/55">Response {listing.responseTime}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Investor directory</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {(investors?.profiles ?? []).map((profile) => (
            <article key={profile.uid} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold">
                    {profile.displayName}
                    {profile.isVerified ? (
                      <span className="ml-2 text-xs text-white/45">Verified</span>
                    ) : null}
                  </h4>
                  <p className="mt-1 text-sm text-white/60">{profile.location}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFollow(profile.uid)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:bg-white/5"
                >
                  {following.includes(profile.uid) ? 'Following' : 'Follow'}
                </button>
              </div>
              {profile.publicBio ? (
                <p className="mt-3 text-sm text-white/70">{profile.publicBio}</p>
              ) : null}
              <Link
                href={`/dashboard/marketplace/investors/${profile.uid}`}
                className="mt-4 inline-flex text-sm text-white/75 underline-offset-4 hover:underline"
              >
                View profile
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

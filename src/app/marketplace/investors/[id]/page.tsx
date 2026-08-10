'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BadgeCheck, Globe, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFollowInvestor } from '@/hooks/useFollowInvestor';
import { InvestorAvatar } from '@/components/marketplace/InvestorProfileCard';
import { MarketplaceSubnav } from '@/components/marketplace/MarketplaceSubnav';
import {
  STRATEGY_LABELS,
  formatAum,
  formatCompact,
  profileDisplayName,
  publicRoi,
  type InvestmentStrategy,
  type InvestorProfile,
  type PublicDeal,
} from '@/lib/marketplace/investorProfile';

type TabKey = 'deals' | 'activity' | 'about';

interface ActivityEntry {
  id: string;
  text: string;
  at?: string;
}

export default function InvestorProfilePage() {
  const params = useParams<{ id: string }>();
  const uid = params?.id ?? '';
  const { user } = useAuth();

  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [deals, setDeals] = useState<PublicDeal[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('deals');

  /* Shared follow path — see `useFollowInvestor`. */
  const { following: isFollowing, pending, toggle: toggleFollow, setFollowing } =
    useFollowInvestor({ targetUid: uid });

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    fetch(`/api/marketplace/investors/${uid}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProfile(data.profile ?? null);
        setDeals(data.deals ?? []);
        setActivity(data.activity ?? []);
        setFollowing(!!data.isFollowing);
      })
      .catch((err) => console.error('[investor profile] load failed', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [uid, setFollowing]);

  const isSelf = !!user && !!profile && user.uid === profile.uid;
  const name = useMemo(() => (profile ? profileDisplayName(profile) : ''), [profile]);

  if (loading) {
    return (
      <div className="min-h-screen px-6 py-8" data-testid="investor-profile-skeleton">
        <MarketplaceSubnav />
        <div className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--pw-surface)' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen px-6 py-16 text-center" data-testid="investor-profile-missing">
        <MarketplaceSubnav />
        <p className="text-sm text-slate-300 font-semibold">This profile isn&apos;t public.</p>
        <Link href="/marketplace/investors" className="text-xs text-slate-400 hover:underline mt-2 inline-block">
          Back to investors
        </Link>
      </div>
    );
  }

  const stats: Array<{ label: string; value: string }> = [
    { label: 'Deals', value: formatCompact(profile.dealCount ?? deals.length) },
    { label: 'AUM', value: formatAum(profile.aumCents) },
    { label: 'Followers', value: formatCompact(profile.followerCount ?? 0) },
    { label: 'Following', value: formatCompact(profile.followingCount ?? 0) },
    { label: 'Avg. ROI', value: publicRoi(profile) },
  ];

  return (
    <div className="min-h-screen px-6 py-8 space-y-6 max-w-7xl mx-auto" data-testid="investor-profile">
      <MarketplaceSubnav />

      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-start gap-5">
        <InvestorAvatar profile={profile} size={88} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate" data-testid="investor-profile-name">
              {name}
            </h1>
            {profile.isVerified && (
              <BadgeCheck
                className="w-5 h-5 text-emerald-400 flex-shrink-0"
                aria-label="Verified"
                data-testid="investor-verified"
              />
            )}
            {profile.profileType === 'team' && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Team
              </span>
            )}
          </div>

          {profile.businessName && (
            <p className="text-sm text-slate-400 font-medium">{profile.businessName}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {profile.location}
              </span>
            )}
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:underline text-slate-300"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                Website
              </a>
            )}
          </div>
        </div>

        {/* Follow CTA — hidden on own profile */}
        {!isSelf && user && (
          <button
            type="button"
            disabled={pending}
            onClick={() => toggleFollow()}
            data-testid="investor-follow-btn"
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] cursor-pointer ${
              isFollowing
                ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold'
            }`}
          >
            {pending ? 'Saving...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        )}

        {isSelf && (
          <Link
            href="/dashboard/settings/marketplace-profile"
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 min-h-[44px] flex items-center"
          >
            Edit profile
          </Link>
        )}
      </header>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-y border-slate-800/60">
        {stats.map((s) => (
          <div key={s.label} className="text-center px-2 py-1">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-bold text-white mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-800">
        {(['deals', 'activity', 'about'] as TabKey[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            data-testid={`investor-tab-${t}`}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all min-h-[44px] ${
              tab === t
                ? 'border-b-2 border-emerald-400 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Deals (B5 Clickable Deal Cards → Deal Detail View) ── */}
      {tab === 'deals' && (
        <div data-testid="investor-panel-deals">
          {deals.length === 0 ? (
            <p className="text-sm text-slate-500 py-8">No public deals yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map((d) => (
                <Link
                  key={d.id}
                  href={`/dashboard/deals/${(d as any).slug || d.id}`}
                  className="block transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-2xl"
                >
                  <article
                    data-testid="public-deal-card"
                    className="rounded-2xl border overflow-hidden h-full"
                    style={{ background: 'var(--pw-surface)', borderColor: 'var(--pw-border)' }}
                  >
                    <div className="h-36 bg-white/5 relative">
                      {d.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.photoUrl} alt={d.address ?? 'Property'} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-sm font-semibold text-white truncate">
                        {d.address ?? d.propertyName ?? 'Property'}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        {d.phaseStatus && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                            {d.phaseStatus}
                          </span>
                        )}
                        {d.headlineMetric && (
                          <span className="text-[11px] text-slate-400">{d.headlineMetric.value}</span>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Activity ── */}
      {tab === 'activity' && (
        <div data-testid="investor-panel-activity" className="space-y-2">
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500 py-8">No public activity yet.</p>
          ) : (
            activity.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border px-4 py-3 text-sm text-slate-300"
                style={{ borderColor: 'var(--pw-border)' }}
              >
                {a.text}
                {a.at && <span className="text-xs text-slate-500 ml-2">{a.at}</span>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── About ── */}
      {tab === 'about' && (
        <div data-testid="investor-panel-about" className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Bio</h2>
            <p className="text-sm text-slate-300">{profile.publicBio || 'No bio provided.'}</p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Investment strategy
            </h2>
            {(profile.strategies ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Not specified.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(profile.strategies ?? []).map((s: InvestmentStrategy) => (
                  <span
                    key={s}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border"
                    style={{ borderColor: 'var(--pw-border)' }}
                  >
                    {STRATEGY_LABELS[s] ?? s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {profile.profileType === 'team' && (
            <div data-testid="investor-team-members">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Team members
              </h2>
              {(profile.teamMembers ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No members listed.</p>
              ) : (
                <ul className="space-y-2">
                  {(profile.teamMembers ?? []).map((m) => (
                    <li key={m.uid || m.invitedEmail} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-300">
                        {m.displayName || m.invitedEmail}
                        {m.invitedEmail && !m.uid && (
                          <span className="text-xs text-slate-500 ml-2">(invited)</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500">{m.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Compliance Disclaimer Bar (B6) ── */}
      <div className="pt-6 border-t border-white/10">
        <p className="text-xs text-slate-400/70 leading-relaxed font-mono">
          PaperWorking facilitates introductions and interest tracking only. No funds, securities, or ownership interests are offered, sold, or transferred through the platform. All transactions occur outside PaperWorking, directly between the parties.
        </p>
      </div>
    </div>
  );
}

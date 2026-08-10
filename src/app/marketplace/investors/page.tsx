'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { InvestorProfileCard } from '@/components/marketplace/InvestorProfileCard';
import { MarketplaceSubnav } from '@/components/marketplace/MarketplaceSubnav';
import {
  STRATEGY_LABELS,
  filterProfiles,
  type InvestmentStrategy,
  type InvestorProfile,
  type ProfileType,
} from '@/lib/marketplace/investorProfile';

/* ═══════════════════════════════════════════════════════════════════════════
   Investor discovery — /marketplace/investors

   Deliberately NOT at /marketplace: that route is the public DEAL listings
   page and stays as-is. Profiles live at /marketplace/investors/[id].
   ═══════════════════════════════════════════════════════════════════════════ */

export default function InvestorDiscoveryPage() {
  const { user } = useAuth();

  const [profiles, setProfiles] = useState<InvestorProfile[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<ProfileType | 'all'>('all');
  const [strategy, setStrategy] = useState<InvestmentStrategy | 'all'>('all');
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/marketplace/investors')
      .then((r) => r.json())
      .then((data: { profiles?: InvestorProfile[]; following?: string[] }) => {
        if (cancelled) return;
        setProfiles(data.profiles ?? []);
        setFollowing(new Set(data.following ?? []));
      })
      .catch((err) => {
        console.error('[investors] discovery load failed', err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(
    () => filterProfiles(profiles, { type, strategy, location, query }),
    [profiles, type, strategy, location, query],
  );

  /**
   * Optimistic follow — requirement 5. The set flips immediately and only
   * rolls back if the write fails, so the button never feels laggy.
   */
  const toggleFollow = useCallback(
    async (uid: string, next: boolean) => {
      if (!user) return;
      setPendingUid(uid);
      setFollowing((prev) => {
        const s = new Set(prev);
        if (next) s.add(uid); else s.delete(uid);
        return s;
      });

      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/marketplace/investors/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ targetUid: uid, follow: next }),
        });
        if (!res.ok) throw new Error(`follow failed: ${res.status}`);
      } catch (err) {
        console.error('[investors] follow failed, rolling back', err);
        setFollowing((prev) => {
          const s = new Set(prev);
          if (next) s.delete(uid); else s.add(uid);
          return s;
        });
      } finally {
        setPendingUid(null);
      }
    },
    [user],
  );

  return (
    <div className="min-h-screen px-6 py-8 space-y-6 max-w-7xl mx-auto" data-testid="investor-discovery">
      <MarketplaceSubnav />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Investors</h1>
        <p className="text-sm text-slate-400 mt-1">
          Discover investors and investment teams on PaperWorking.
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-[420px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or company…"
            data-testid="investor-search"
            className="w-full h-10 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none px-3 pl-9 bg-surface-container-low/40 border border-white/10"
          />
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as ProfileType | 'all')}
          data-testid="investor-filter-type"
          className="h-10 rounded-xl px-3 text-xs bg-surface-container-low/40 border border-white/10 text-slate-200 outline-none min-h-[44px]"
        >
          <option value="all">All profile types</option>
          <option value="individual">Individual</option>
          <option value="team">Team</option>
        </select>

        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value as InvestmentStrategy | 'all')}
          data-testid="investor-filter-strategy"
          className="h-10 rounded-xl px-3 text-xs bg-surface-container-low/40 border border-white/10 text-slate-200 outline-none min-h-[44px]"
        >
          <option value="all">All strategies</option>
          {Object.entries(STRATEGY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (city/state)"
          data-testid="investor-filter-location"
          className="h-10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none px-3 bg-surface-container-low/40 border border-white/10 min-w-[160px]"
        />
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="investor-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border animate-pulse"
              style={{ background: 'var(--pw-surface)', borderColor: 'var(--pw-border)' }}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center" data-testid="investor-empty">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No investor profiles match your filters.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting search query or criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="investor-grid">
          {visible.map((profile) => (
            <InvestorProfileCard
              key={profile.uid}
              profile={profile}
              isFollowing={following.has(profile.uid)}
              pending={pendingUid === profile.uid}
              onToggleFollow={(next) => toggleFollow(profile.uid, next)}
            />
          ))}
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

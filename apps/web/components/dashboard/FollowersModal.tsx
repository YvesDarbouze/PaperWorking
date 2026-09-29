'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Users, X, MagnifyingGlass, EnvelopeSimple } from '@/components/icons/PhosphorIcons';

export interface FollowerItem {
  id: string;
  name: string;
  dealName?: string;
  email?: string;
  firm?: string;
  role?: string;
  followedDate?: string;
}

export interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  followers?: ReadonlyArray<FollowerItem>;
  totalCount?: number;
  initialSelectedFollower?: FollowerItem | null;
}

const DEFAULT_EXTENDED_FOLLOWERS: FollowerItem[] = [
  {
    id: 'f1',
    name: 'Alex Morgan',
    dealName: '1247 Elm Street',
    firm: 'Apex Commercial Capital',
    role: 'Acquisitions Director',
    email: 'alex@apexcommercial.com',
    followedDate: '2 weeks ago',
  },
  {
    id: 'f2',
    name: 'Jordan Lee',
    dealName: '88 Harbor Lane',
    firm: 'Harbor View Capital',
    role: 'Equity LP',
    email: 'jordan@harborviewcap.com',
    followedDate: '1 month ago',
  },
  {
    id: 'f3',
    name: 'Maya Patel',
    dealName: '4402 Congress Ave',
    firm: 'Beacon Street Ventures',
    role: 'General Partner',
    email: 'maya@beaconventures.com',
    followedDate: '3 weeks ago',
  },
  {
    id: 'f4',
    name: 'David Vance',
    dealName: '810 E 7th Street',
    firm: 'Lone Star Debt Partners',
    role: 'Commercial Debt Broker',
    email: 'david@lonestardebt.com',
    followedDate: '2 months ago',
  },
  {
    id: 'f5',
    name: 'Elena Rostova',
    dealName: '1904 Barton Springs',
    firm: 'Rostova Capital Management',
    role: 'Family Office Principal',
    email: 'elena@rostovacapital.com',
    followedDate: '4 days ago',
  },
  {
    id: 'f6',
    name: 'Carlos Ruiz',
    dealName: '302 Colorado St',
    firm: 'Sunbelt Urban Equity',
    role: 'Joint Venture Partner',
    email: 'carlos@sunbelturban.com',
    followedDate: '5 days ago',
  },
];

export default function FollowersModal({
  isOpen,
  onClose,
  followers = DEFAULT_EXTENDED_FOLLOWERS,
  totalCount,
  initialSelectedFollower = null,
}: FollowersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [selectedFollower, setSelectedFollower] = useState<FollowerItem | null>(initialSelectedFollower);
  const [messageSent, setMessageSent] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedFollower(null);
      setMessageSent(null);
      return;
    }

    if (initialSelectedFollower) {
      setSelectedFollower(initialSelectedFollower);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, initialSelectedFollower]);

  const allFollowers = useMemo(() => {
    if (followers && followers.length > 0) {
      // Merge unique by name
      const map = new Map<string, FollowerItem>();
      followers.forEach((f) => map.set(f.name, f));
      DEFAULT_EXTENDED_FOLLOWERS.forEach((f) => {
        if (!map.has(f.name)) map.set(f.name, f);
      });
      return Array.from(map.values());
    }
    return DEFAULT_EXTENDED_FOLLOWERS;
  }, [followers]);

  const filteredFollowers = useMemo(() => {
    if (!searchQuery.trim()) return allFollowers;
    const q = searchQuery.toLowerCase();
    return allFollowers.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.dealName && f.dealName.toLowerCase().includes(q)) ||
        (f.firm && f.firm.toLowerCase().includes(q)) ||
        (f.role && f.role.toLowerCase().includes(q))
    );
  }, [allFollowers, searchQuery]);

  if (!isOpen) return null;

  const countDisplay = totalCount ?? allFollowers.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="followers-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        ref={modalRef}
        data-testid="portfolio-followers-modal"
        className="w-full max-w-xl overflow-hidden rounded-none border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[85vh] text-card-foreground"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Investor Network
              </span>
            </div>
            <h2 id="followers-modal-title" className="mt-2 text-xl font-bold tracking-tight text-foreground">
              Portfolio Followers &amp; Network
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Investors, capital partners, and lenders actively tracking your deals and track record.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab & Search Controls */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="tab-followers"
              onClick={() => setActiveTab('followers')}
              className={`inline-flex min-h-[44px] items-center rounded-none px-3.5 py-1.5 text-xs font-semibold transition touch-target ${
                activeTab === 'followers'
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Followers ({countDisplay})
            </button>
            <button
              type="button"
              data-testid="tab-following"
              onClick={() => setActiveTab('following')}
              className={`inline-flex min-h-[44px] items-center rounded-none px-3.5 py-1.5 text-xs font-semibold transition touch-target ${
                activeTab === 'following'
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Following (8)
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 sm:max-w-xs">
            <MagnifyingGlass className="absolute left-2.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              data-testid="followers-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search investors or deals..."
              className="w-full min-h-[44px] rounded-none border border-border bg-background py-1.5 pl-8 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none sm:text-xs"
            />
          </div>
        </div>

        {messageSent && (
          <div className="mt-3 rounded-none border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
            {messageSent}
          </div>
        )}

        {/* List of Followers */}
        <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {filteredFollowers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No followers found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredFollowers.map((follower) => (
              <div
                key={follower.id}
                data-testid={`follower-row-${follower.id}`}
                className="flex items-center justify-between rounded-none border border-border bg-card p-3 text-xs hover:bg-muted/30 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-border bg-muted font-bold text-foreground uppercase text-xs">
                    {follower.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{follower.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {follower.role || 'Investor'} {follower.firm ? `· ${follower.firm}` : ''}
                    </p>
                    {follower.dealName && (
                      <p className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">
                        Tracking: {follower.dealName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/dashboard/inbox?to=${encodeURIComponent(follower.name)}`}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-none border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground hover:bg-muted transition touch-target"
                    onClick={() => {
                      setMessageSent(`Message thread opened with ${follower.name}`);
                    }}
                  >
                    <EnvelopeSimple className="h-4 w-4" />
                    <span>Message</span>
                  </Link>
                  <Button
                    size="sm"
                    variant="tertiary"
                    href="/dashboard/explore"
                    className="text-[11px]"
                  >
                    Deals
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[11px] text-muted-foreground">
            {filteredFollowers.length} active connection{filteredFollowers.length === 1 ? '' : 's'}
          </span>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

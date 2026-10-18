'use client';

import React, { useState } from 'react';
import { UserCircle, Users } from '@/components/icons/PhosphorIcons';
import FollowersModal, { FollowerItem } from '@/components/dashboard/FollowersModal';

export interface MarketplaceSocialProfileCardProps {
  displayName?: string;
  company?: string;
  roleLabel?: string;
  followersCount?: number;
  followingCount?: number;
  followers?: ReadonlyArray<FollowerItem>;
  variant?: 'sidebar' | 'banner';
  contextLabel?: string;
}

const DEFAULT_FOLLOWERS: ReadonlyArray<FollowerItem> = [
  { id: 'f1', name: 'Alex Morgan', dealName: '1247 Elm Street', role: 'Acquisitions Director', firm: 'Apex Commercial Capital' },
  { id: 'f2', name: 'Jordan Lee', dealName: '88 Harbor Lane', role: 'Equity LP', firm: 'Harbor View Capital' },
  { id: 'f3', name: 'Maya Patel', dealName: '4402 Congress Ave', role: 'General Partner', firm: 'Beacon Street Ventures' },
];

export default function MarketplaceSocialProfileCard({
  displayName = 'Avery Stone',
  company = 'Stonebridge Capital',
  roleLabel = 'Lead Principal',
  followersCount = 24,
  followingCount = 8,
  followers = DEFAULT_FOLLOWERS,
  variant = 'sidebar',
  contextLabel = 'Investor Network',
}: MarketplaceSocialProfileCardProps) {
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState<FollowerItem | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'followers' | 'following'>('followers');

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'PW';

  if (variant === 'banner') {
    return (
      <>
        <article
          data-testid="marketplace-social-profile-card"
          className="rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm"
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center">
            {/* Identity & Role */}
            <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center lg:col-span-5 lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-sm font-bold text-foreground">
                  {initials}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Profile
                    </span>
                    <span
                      data-testid="social-profile-role-badge"
                      className="inline-flex max-w-full items-center truncate rounded-none border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground"
                    >
                      {roleLabel}
                    </span>
                  </div>
                  <h2
                    data-testid="social-profile-display-name"
                    className="mt-0.5 break-words text-base font-bold text-foreground"
                  >
                    {displayName}
                  </h2>
                  <p
                    data-testid="social-profile-company"
                    className="break-words text-xs text-muted-foreground"
                  >
                    {company}
                  </p>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 shrink-0 sm:flex sm:w-auto sm:items-center lg:grid lg:w-full lg:grid-cols-2 xl:flex xl:w-auto">
                <button
                  type="button"
                  data-testid="followers-count-trigger"
                  onClick={() => {
                    setSelectedFollower(null);
                    setModalInitialTab('followers');
                    setIsFollowersModalOpen(true);
                  }}
                  className="group flex min-h-[44px] flex-col items-center justify-center rounded-none border border-border bg-muted/20 px-3.5 py-1.5 text-left transition hover:border-foreground/40 hover:bg-muted/50 touch-target"
                >
                  <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {followersCount}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                    Followers
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="following-count-trigger"
                  onClick={() => {
                    setSelectedFollower(null);
                    setModalInitialTab('following');
                    setIsFollowersModalOpen(true);
                  }}
                  className="group flex min-h-[44px] flex-col items-center justify-center rounded-none border border-border bg-muted/20 px-3.5 py-1.5 text-left transition hover:border-foreground/40 hover:bg-muted/50 touch-target"
                >
                  <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {followingCount}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                    Following
                  </span>
                </button>
              </div>
            </div>

            {/* Social Connections Preview */}
            <div className="border-t border-border pt-4 lg:col-span-7 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="mb-2.5 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <button
                  type="button"
                  data-testid="followers-heading-trigger"
                  onClick={() => {
                    setSelectedFollower(null);
                    setModalInitialTab('followers');
                    setIsFollowersModalOpen(true);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground touch-target"
                >
                  <Users className="h-3.5 w-3.5 text-foreground" />
                  <span>Followers &amp; {contextLabel} →</span>
                </button>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Active Co-Investors &amp; Partners
                </span>
              </div>

              {followers.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">No followers yet</p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {followers.slice(0, 3).map((follower) => (
                    <button
                      key={follower.id}
                      type="button"
                      data-testid={`follower-row-${follower.id}`}
                      onClick={() => {
                        setSelectedFollower(follower);
                        setModalInitialTab('followers');
                        setIsFollowersModalOpen(true);
                      }}
                      className="flex min-h-[44px] flex-col justify-between rounded-none border border-border bg-background/60 px-3 py-2 text-left text-xs transition hover:border-foreground/30 hover:bg-muted/40 touch-target"
                    >
                      <span className="break-words font-semibold text-foreground">
                        {follower.name}
                      </span>
                      {follower.dealName && (
                        <span className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                          {follower.dealName}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>

        <FollowersModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          followers={followers}
          totalCount={followersCount}
          initialSelectedFollower={selectedFollower}
          initialTab={modalInitialTab}
        />
      </>
    );
  }

  return (
    <>
      <article
        data-testid="marketplace-social-profile-card"
        className="flex flex-col justify-between rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Profile
            </span>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-sm font-bold text-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                data-testid="social-profile-display-name"
                className="break-words text-base font-bold text-foreground"
              >
                {displayName}
              </h2>
              <p
                data-testid="social-profile-company"
                className="break-words text-xs text-muted-foreground"
              >
                {company}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-none border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
              {roleLabel}
            </span>
            <span className="inline-flex items-center rounded-none border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {contextLabel}
            </span>
          </div>

          {/* Symmetric 2-Column Follower / Following Counters */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="followers-count-trigger"
              onClick={() => {
                setSelectedFollower(null);
                setModalInitialTab('followers');
                setIsFollowersModalOpen(true);
              }}
              className="flex min-h-[44px] flex-col items-start justify-center rounded-none border border-border bg-muted/20 px-3 py-2 text-left transition hover:border-foreground/30 hover:bg-muted/40 touch-target"
            >
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {followersCount}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Followers
              </span>
            </button>
            <button
              type="button"
              data-testid="following-count-trigger"
              onClick={() => {
                setSelectedFollower(null);
                setModalInitialTab('following');
                setIsFollowersModalOpen(true);
              }}
              className="flex min-h-[44px] flex-col items-start justify-center rounded-none border border-border bg-muted/20 px-3 py-2 text-left transition hover:border-foreground/30 hover:bg-muted/40 touch-target"
            >
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {followingCount}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Following
              </span>
            </button>
          </div>

          {/* Followers Preview */}
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                data-testid="followers-heading-trigger"
                onClick={() => {
                  setSelectedFollower(null);
                  setModalInitialTab('followers');
                  setIsFollowersModalOpen(true);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground touch-target"
              >
                <Users className="h-3.5 w-3.5 text-foreground" />
                <span>Followers →</span>
              </button>
              <span className="font-mono text-xs font-bold text-foreground">{followersCount}</span>
            </div>

            {followers.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No followers yet</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {followers.slice(0, 3).map((follower) => (
                  <li key={follower.id}>
                    <button
                      type="button"
                      data-testid={`follower-row-${follower.id}`}
                      onClick={() => {
                        setSelectedFollower(follower);
                        setModalInitialTab('followers');
                        setIsFollowersModalOpen(true);
                      }}
                      className="flex w-full min-h-[44px] items-center justify-between rounded-none border border-border bg-card px-3 py-2 text-left text-xs transition hover:border-foreground/30 hover:bg-muted/40 touch-target"
                    >
                      <span className="break-words font-semibold text-foreground">
                        {follower.name}
                      </span>
                      {follower.dealName && (
                        <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">
                          {follower.dealName}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </article>

      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        followers={followers}
        totalCount={followersCount}
        initialSelectedFollower={selectedFollower}
        initialTab={modalInitialTab}
      />
    </>
  );
}

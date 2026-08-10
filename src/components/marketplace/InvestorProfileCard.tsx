'use client';

import React from 'react';
import Link from 'next/link';
import { BadgeCheck, Users } from 'lucide-react';
import {
  formatCompact,
  gradientFor,
  initialsFor,
  profileDisplayName,
  type InvestorProfile,
} from '@/lib/marketplace/investorProfile';

/* ═══════════════════════════════════════════════════════════════════════════
   InvestorProfileCard — reusable across discovery and any embed.

   Dark surface, white text, hairline border. The verification badge is BLUE
   (#60a5fa), deliberately not green: green is reserved sprint-wide for CTAs,
   active states, and success confirmations, and a verified badge is none of
   those.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface InvestorProfileCardProps {
  profile: InvestorProfile;
  /** Whether the viewer already follows this investor. */
  isFollowing?: boolean;
  /** Omit to render the card without a follow control (e.g. your own card). */
  onToggleFollow?: (next: boolean) => void;
  /** Disables the control while a request is in flight. */
  pending?: boolean;
  href?: string;
  testId?: string;
}

export function InvestorAvatar({
  profile,
  size = 56,
  rounded = 'rounded-2xl',
}: {
  profile: InvestorProfile;
  size?: number;
  rounded?: string;
}) {
  const src = profile.profileType === 'team' ? profile.teamLogoUrl : profile.avatarUrl;
  const name = profileDisplayName(profile);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`${rounded} object-cover shrink-0`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  // No upload → initials on a deterministic gradient.
  return (
    <span
      className={`${rounded} shrink-0 flex items-center justify-center font-bold text-white select-none`}
      style={{
        width: size,
        height: size,
        background: gradientFor(profile.uid || name),
        fontSize: Math.round(size * 0.34),
      }}
      aria-hidden="true"
      data-testid="investor-avatar-initials"
    >
      {initialsFor(name)}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold text-white tabular-nums truncate">{value}</p>
      <p className="text-[11px] text-slate-500 truncate">{label}</p>
    </div>
  );
}

export function InvestorProfileCard({
  profile,
  isFollowing = false,
  onToggleFollow,
  pending = false,
  href,
  testId = 'investor-card',
}: InvestorProfileCardProps) {
  const name = profileDisplayName(profile);
  const target = href ?? `/marketplace/investors/${profile.uid}`;

  return (
    <article
      data-testid={testId}
      data-uid={profile.uid}
      className="rounded-2xl border p-5 flex flex-col gap-4 transition-colors hover:border-white/20"
      style={{ background: 'var(--pw-surface)', borderColor: 'var(--pw-border)' }}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <Link href={target} className="shrink-0" aria-label={`View ${name}'s profile`}>
          <InvestorAvatar profile={profile} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href={target}
              className="text-sm font-bold text-white truncate hover:underline"
              data-testid={`${testId}-name`}
            >
              {name}
            </Link>
            {profile.isVerified && (
              <BadgeCheck
                className="w-4 h-4 shrink-0"
                style={{ color: '#60a5fa' }}
                aria-label="Verified"
                data-testid={`${testId}-verified`}
              />
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            {profile.profileType === 'team' && <Users className="w-3 h-3" aria-hidden="true" />}
            <span className="truncate">
              {profile.profileType === 'team' ? 'Investment Team' : 'Individual Investor'}
              {profile.location ? ` · ${profile.location}` : ''}
            </span>
          </p>

          {profile.publicBio && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">{profile.publicBio}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid var(--pw-border)' }}>
        <Stat label="Deals" value={formatCompact(profile.dealCount ?? 0)} />
        <Stat label="Followers" value={formatCompact(profile.followerCount ?? 0)} />
        <Stat label="Following" value={formatCompact(profile.followingCount ?? 0)} />
      </div>

      {onToggleFollow && (
        <button
          type="button"
          onClick={() => onToggleFollow(!isFollowing)}
          disabled={pending}
          aria-pressed={isFollowing}
          data-testid={`${testId}-follow`}
          /* Outline by default, filled once followed — requirement 1. */
          className={`pw-interactive-custom w-full h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
            isFollowing
              ? 'bg-slate-100 text-slate-900 hover:bg-white'
              : 'border text-white hover:bg-white/5'
          }`}
          style={isFollowing ? undefined : { borderColor: 'var(--pw-border)' }}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </article>
  );
}

export default InvestorProfileCard;

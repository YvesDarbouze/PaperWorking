'use client';

import React from 'react';
import { Buildings, CheckCircle } from '@phosphor-icons/react';
import { STRATEGY_LABELS, type InvestmentStrategy } from '@/lib/profile/strategies';

export interface CounterpartyProfileData {
  displayName?: string;
  companyName?: string;
  businessName?: string;
  headline?: string;
  publicBio?: string;
  location?: string;
  websiteUrl?: string;
  avatarUrl?: string;
  strategies?: string[];
  isVerified?: boolean;
  aumCents?: number;
  avgRoiPct?: number;
  equityMultiple?: number;
  dealCount?: number;
}

interface CounterpartyPreviewCardProps {
  profile: CounterpartyProfileData;
  className?: string;
  isLivePreview?: boolean;
}

function getInitials(name?: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'OP';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatAum(cents?: number): string {
  if (!cents || cents <= 0) return 'N/A';
  const dollars = cents / 100;
  if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B+`;
  if (dollars >= 1_000_000) return `$${Math.round(dollars / 1_000_000)}M+`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
  return `$${Math.round(dollars)}`;
}

export default function CounterpartyPreviewCard({
  profile,
  className = '',
  isLivePreview = true,
}: CounterpartyPreviewCardProps) {
  const name = profile.displayName?.trim() || 'Operator';
  const company = (profile.companyName || profile.businessName)?.trim() || 'Independent Operator';
  const location = profile.location?.trim();
  const companySubtitle = location ? `${company} · ${location}` : company;
  const rawBio = profile.headline?.trim() || profile.publicBio?.trim();
  const hasBio = Boolean(rawBio);
  const bio = rawBio || 'Operator has not added an investment bio yet.';

  const hasAum = profile.aumCents != null && profile.aumCents > 0;
  const hasIrr = profile.avgRoiPct != null && !isNaN(profile.avgRoiPct);
  const hasMultiple = profile.equityMultiple != null && !isNaN(profile.equityMultiple);
  const hasExits = profile.dealCount != null && !isNaN(profile.dealCount);

  const hasAnyMetrics = hasAum || hasIrr || hasMultiple || hasExits;

  const aum = hasAum ? formatAum(profile.aumCents) : 'N/A';
  const irr = hasIrr ? `${profile.avgRoiPct!.toFixed(1)}%` : 'N/A';
  const multiple = hasMultiple ? `${profile.equityMultiple!.toFixed(2)}x` : 'N/A';
  const exits = hasExits ? `${profile.dealCount} Exits` : 'N/A';

  const strategies = (profile.strategies || []).filter((s) => s in STRATEGY_LABELS) as InvestmentStrategy[];

  return (
    <div
      data-testid="counterparty-preview-card"
      className={`relative rounded-none border border-neutral-800 bg-neutral-900 p-6 shadow-xl transition-all ${className}`}
    >
      {/* Header Badge */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Buildings className="h-4 w-4 text-white" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Public Profile &amp; Track Record
          </h3>
        </div>
        {isLivePreview ? (
          <span className="inline-flex items-center gap-1.5 rounded-none border border-neutral-700 bg-neutral-800 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-none bg-emerald-400" />
            Live Counterparty View
          </span>
        ) : (
          profile.isVerified !== false && (
            <span
              data-testid="verified-operator-badge"
              className="inline-flex items-center gap-1 rounded-none border border-neutral-700 bg-neutral-800 px-2.5 py-0.5 text-[11px] font-bold text-white"
            >
              <CheckCircle className="h-3.5 w-3.5 text-white" />
              Verified Operator
            </span>
          )
        )}
      </div>

      {/* Operator Details */}
      <div className="flex items-start gap-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={name}
            className="h-14 w-14 rounded-none border border-neutral-800 object-cover shadow"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            data-testid="operator-avatar-fallback"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-none border border-neutral-800 bg-neutral-800 text-base font-bold text-white shadow"
          >
            {getInitials(name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-bold text-white" data-testid="preview-operator-name">
              {name}
            </h4>
            {isLivePreview && profile.isVerified !== false && (
              <span
                data-testid="verified-operator-badge"
                className="inline-flex items-center gap-1 rounded-none border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-white"
              >
                <CheckCircle className="h-3 w-3 text-white" />
                Verified Operator
              </span>
            )}
          </div>
          <p className="truncate text-xs font-semibold text-neutral-400" data-testid="preview-company-name">
            {companySubtitle}
          </p>
          <p
            className={`mt-1 line-clamp-2 text-xs ${hasBio ? 'text-neutral-400' : 'italic text-neutral-500'}`}
            data-testid="preview-bio"
          >
            {bio}
          </p>
        </div>
      </div>

      {/* Track Record / 4-Metric Grid */}
      {hasAnyMetrics ? (
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-none border border-neutral-800 bg-neutral-800/40 p-3 text-center">
            <p className="font-mono text-sm font-bold text-white">{aum}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Assets Under Mgmt
            </p>
          </div>
          <div className="rounded-none border border-neutral-800 bg-neutral-800/40 p-3 text-center">
            <p className="font-mono text-sm font-bold text-white">{irr}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Realized IRR
            </p>
          </div>
          <div className="rounded-none border border-neutral-800 bg-neutral-800/40 p-3 text-center">
            <p className="font-mono text-sm font-bold text-white">{multiple}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Equity Multiple
            </p>
          </div>
          <div className="rounded-none border border-neutral-800 bg-neutral-800/40 p-3 text-center">
            <p className="font-mono text-sm font-bold text-white">{exits}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Track Record
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-none border border-neutral-800 bg-neutral-800/40 p-4 text-center">
          <p className="text-xs font-semibold text-neutral-300">
            Operator has not added track record yet
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            Performance metrics will appear here once verified track record data is submitted.
          </p>
        </div>
      )}

      {/* Strategies */}
      {strategies.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-neutral-800">
          {strategies.map((strat) => (
            <span
              key={strat}
              className="rounded-none border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-300"
            >
              {STRATEGY_LABELS[strat]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

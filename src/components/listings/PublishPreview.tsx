'use client';

import React from 'react';
import type { DealListing } from '@/types/listing';
import { buildTeaserFromListing } from '@/lib/listings/obfuscation';
import DealFullView from './DealFullView';
import DealTeaserView from './DealTeaserView';

/* ═══════════════════════════════════════════════════════
   PublishPreview (AQ-27)
   
   Dual-pane preview shown during the publish flow.
   Left: subscriber view (full deal).
   Right: public teaser (obfuscated).
   
   Lets the listing owner see exactly what each audience
   will see before publishing.
   ═══════════════════════════════════════════════════════ */

interface PublishPreviewProps {
  listing: DealListing;
}

export default function PublishPreview({ listing }: PublishPreviewProps) {
  const teaser = buildTeaserFromListing(listing);
  const mockFollowStatus = { followingDeal: false, followingInvestor: false };

  return (
    <div className="space-y-6">
      {/* Tab labels */}
      <div className="text-center">
        <p className="text-xs text-[var(--color-muted)] mb-1">
          Preview how your listing appears to different audiences
        </p>
      </div>

      {/* Dual panes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Subscriber view */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--color-positive)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm text-[var(--color-positive)]">
                verified_user
              </span>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-positive)]">
              Subscriber View
            </h3>
            <span className="text-[10px] text-[var(--color-muted)] ml-auto">
              Authenticated Investor / Team
            </span>
          </div>
          <div className="border-2 border-[var(--color-positive)]/20 rounded-2xl p-4 space-y-4">
            <DealFullView
              listing={listing}
              followStatus={mockFollowStatus}
            />
          </div>
        </div>

        {/* Teaser view */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm text-amber-500">
                public
              </span>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-[0.06em] text-amber-500">
              Public Teaser
            </h3>
            <span className="text-[10px] text-[var(--color-muted)] ml-auto">
              Non-subscriber / Logged Out
            </span>
          </div>
          <div className="border-2 border-amber-500/20 rounded-2xl p-4 space-y-4">
            <DealTeaserView teaser={teaser} />
          </div>
        </div>
      </div>
    </div>
  );
}

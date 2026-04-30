'use client';

import React from 'react';
import { Lock } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PhaseLockedBanner

   Rendered at the top of form sections in a COMPLETED phase.
   Informs the user that values are locked and downstream phases
   reference them. Does not block scrolling or reading.

   Usage:
     <PhaseLockedBanner
       phaseLabel="Phase 1: Acquisition"
       capturedAt={snapshot.capturedAt}
       referencedBy={['Phase 3', 'Phase 4']}
     />
   ═══════════════════════════════════════════════════════════════ */

interface PhaseLockedBannerProps {
  phaseLabel: string;
  capturedAt?: Date;
  referencedBy?: string[];
}

export function PhaseLockedBanner({
  phaseLabel,
  capturedAt,
  referencedBy = [],
}: PhaseLockedBannerProps) {
  const formatted = capturedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day:   'numeric',
        year:  'numeric',
      }).format(new Date(capturedAt))
    : null;

  return (
    <div
      role="status"
      aria-label={`${phaseLabel} data is locked`}
      style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          '10px',
        padding:      '10px 14px',
        borderRadius: '8px',
        border:       '1px solid rgba(89,89,89,0.18)',
        background:   'rgba(89,89,89,0.05)',
        marginBottom: '20px',
      }}
    >
      {/* Lock icon */}
      <div
        style={{
          width:          '28px',
          height:         '28px',
          borderRadius:   '6px',
          background:     'rgba(89,89,89,0.10)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          marginTop:      '1px',
        }}
      >
        <Lock size={13} strokeWidth={2} color="#595959" />
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin:     0,
            fontSize:   '11px',
            fontWeight: 700,
            color:      '#595959',
            lineHeight: 1.4,
          }}
        >
          {phaseLabel} data locked
          {formatted && (
            <span style={{ fontWeight: 400, color: '#7F7F7F', marginLeft: '6px' }}>
              — captured {formatted}
            </span>
          )}
        </p>

        {referencedBy.length > 0 && (
          <p
            style={{
              margin:     '3px 0 0',
              fontSize:   '10px',
              color:      '#7F7F7F',
              lineHeight: 1.5,
            }}
          >
            These values are referenced read-only by{' '}
            {referencedBy.join(' and ')}.
          </p>
        )}
      </div>
    </div>
  );
}

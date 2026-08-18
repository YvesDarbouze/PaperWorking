'use client';

import React from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  className?: string;
}

/**
 * LiveRegion Component (WCAG 2.1 AA)
 * 
 * Announces asynchronous updates (form submissions, notification counts, wizard steps)
 * to screen readers without shifting visual focus.
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = 'polite',
  className = 'sr-only',
}) => {
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className={className}
    >
      {message}
    </div>
  );
};

export default LiveRegion;

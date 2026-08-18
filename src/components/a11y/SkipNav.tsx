'use client';

import React from 'react';

interface SkipNavProps {
  contentId?: string;
  label?: string;
}

/**
 * SkipNav Component (WCAG 2.1 AA)
 * 
 * Provides keyboard and screen reader users a mechanism to bypass repeated
 * navigation header blocks and jump straight to main content.
 */
export const SkipNav: React.FC<SkipNavProps> = ({
  contentId = 'main-content',
  label = 'Skip to main content',
}) => {
  return (
    <a
      href={`#${contentId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
    >
      {label}
    </a>
  );
};

export default SkipNav;

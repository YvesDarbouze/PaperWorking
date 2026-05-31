'use client';

import React from 'react';
import { Info } from 'lucide-react';
import Link from 'next/link';

/**
 * SampleDataBanner — Subtle info banner shown when an Intelligence
 * sub-page is rendering DEMO_ constant data instead of live Firestore
 * metrics.  Renders nothing when `show` is false.
 */
export function SampleDataBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 px-4 py-2.5"
      style={{ background: 'rgba(245,158,11,0.06)' }}
    >
      <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <p className="text-xs text-slate-400 leading-relaxed">
        <span className="font-semibold text-amber-400/90">Showing sample data</span>
        {' — '}
        <Link
          href="/dashboard/projects/new"
          className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
        >
          add projects
        </Link>
        {' '}to see real metrics.
      </p>
    </div>
  );
}

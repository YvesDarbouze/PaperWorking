import type { Metadata } from 'next';
import { Suspense } from 'react';
import SettingsSectionRouter from './SettingsSectionRouter';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Private configuration — general preferences, security, billing, and data privacy.',
};

/**
 * Route: `/dashboard/settings`
 * Private configuration surface with internal sections (general, security, billing, data-privacy).
 */
export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--text-muted)]">Loading settings section…</div>}>
      <SettingsSectionRouter />
    </Suspense>
  );
}

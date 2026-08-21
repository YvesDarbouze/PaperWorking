import type { Metadata } from 'next';
import GeneralSettingsPanel from '@/components/settings/GeneralSettingsPanel';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'General workspace preferences — timezone, language, and account overview.',
};

/** Route: `/dashboard/settings` — mirrors PaperWorking `/dashboard/settings/general`. */
export default function SettingsPage() {
  return <GeneralSettingsPanel />;
}

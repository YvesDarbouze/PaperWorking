import type { Metadata } from 'next';
import ProfileSettingsPanel from '@/components/settings/ProfileSettingsPanel';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Profile & Security — personal details, MFA, sessions, and GDPR erasure.',
};

/** Route: `/dashboard/settings/profile` — mirrors PaperWorking profile settings. */
export default function ProfileSettingsPage() {
  return <ProfileSettingsPanel />;
}

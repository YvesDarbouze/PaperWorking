import type { Metadata } from 'next';
import PublicProfileEditor from '@/components/profile/PublicProfileEditor';

export const metadata: Metadata = {
  title: 'Public Profile',
  description: 'Public identity editor — operator persona, bio, track record, and counterparty provenance.',
};

/**
 * Route: `/dashboard/profile`
 * Canonical public-identity surface for Marketplace deals and operator provenance.
 */
export default function PublicProfilePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PublicProfileEditor />
    </div>
  );
}

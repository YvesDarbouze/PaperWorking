import type { Metadata } from 'next';
import VendorPortalShell from '@/components/vendor-portal/VendorPortalShell';
import { requireServerAuthUser } from '@/lib/api/server-session';

export const metadata: Metadata = {
  title: 'Vendor Portal',
  robots: 'noindex, nofollow',
};

export default async function VendorPortalLayout({ children }: { children: React.ReactNode }) {
  await requireServerAuthUser();

  return <VendorPortalShell>{children}</VendorPortalShell>;
}

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import VendorPortalShell from '@/components/vendor-portal/VendorPortalShell';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';

export const metadata: Metadata = {
  title: 'Vendor Portal',
  robots: 'noindex, nofollow',
};

export default async function VendorPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) {
    redirect('/login?reason=session_expired');
  }

  return <VendorPortalShell>{children}</VendorPortalShell>;
}

import type { Metadata } from 'next';
import { verifySessionTokenEdge } from '@/lib/auth/session-edge';

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
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET || 'paperworking_session_secure_key_2026_prod';
  const isSessionValid = session ? await verifySessionTokenEdge(session, secret) : false;

  if (!isSessionValid) {
    redirect('/login?accountType=vendor&redirectTo=/vendor-portal');
  }

  return <VendorPortalShell>{children}</VendorPortalShell>;
}

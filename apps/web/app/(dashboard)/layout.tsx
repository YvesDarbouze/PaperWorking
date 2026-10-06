import type { Metadata } from 'next';
import { verifySessionTokenEdge } from '@/lib/auth/session-edge';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardProviders from '@/components/dashboard/DashboardProviders';
import { SESSION_COOKIE, ACCT_COOKIE } from '@/lib/auth/session-cookies';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: 'noindex, nofollow',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  const acct = cookieStore.get(ACCT_COOKIE)?.value;

  
  const secret = process.env.SESSION_SECRET || 'paperworking_session_secure_key_2026_prod';
  const isSessionValid = session ? await verifySessionTokenEdge(session, secret) : false;

  if (!isSessionValid) {

    const headersList = await headers();
    const requestedPath = headersList.get('x-pathname') || '/dashboard';
    redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
  }

  if (acct === 'vendor') {
    redirect('/vendor-portal');
  }

  return <DashboardProviders>{children}</DashboardProviders>;
}

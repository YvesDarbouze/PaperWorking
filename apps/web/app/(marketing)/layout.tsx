import { cookies } from 'next/headers';
import { isValidSessionToken } from '@paperworking/api';
import MarketingLayoutShell from '@/components/marketing/MarketingLayoutShell';
import { ACCT_COOKIE, SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { verifySessionTokenEdge } from '@/lib/auth/session-edge';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let isSessionValid = false;
  let accountType = 'investor';

  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    accountType = cookieStore.get(ACCT_COOKIE)?.value || 'investor';
    if (session) {
      const secret = process.env.SESSION_SECRET || 'paperworking_session_secure_key_2026_prod';
      isSessionValid =
        isValidSessionToken(session) || (await verifySessionTokenEdge(session, secret));
    }
  } catch {
    // Non-request context fallback
  }

  return (
    <MarketingLayoutShell
      initialAuthenticated={isSessionValid}
      initialAccountType={accountType}
    >
      {children}
    </MarketingLayoutShell>
  );
}

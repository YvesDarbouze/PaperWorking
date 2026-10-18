import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { isValidSessionToken } from '@paperworking/api';
import DealCalculatorView from '@/components/marketing/DealCalculatorView';
import {
  decodeSubCookie,
  SESSION_COOKIE,
  SUB_COOKIE,
} from '@/lib/auth/session-cookies';
import { verifySessionTokenEdge } from '@/lib/auth/session-edge';

export const metadata: Metadata = {
  title: 'Deal Calculator — PaperWorking',
  description:
    'Calculate critical investment numbers with institutional precision using the PaperWorking Deal Calculator before acquiring real estate. Stress-test cap rate, IRR, cash-on-cash, and rehab budgets.',
  alternates: {
    canonical: '/deal-calculator',
  },
  openGraph: {
    title: 'Deal Calculator — PaperWorking',
    description:
      'Calculate critical investment numbers with institutional precision using the PaperWorking Deal Calculator before acquiring real estate. Stress-test cap rate, IRR, cash-on-cash, and rehab budgets.',
    url: 'https://paperworking.co/deal-calculator',
    siteName: 'PaperWorking',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deal Calculator — PaperWorking',
    description:
      'Calculate critical investment numbers with institutional precision using the PaperWorking Deal Calculator before acquiring real estate. Stress-test cap rate, IRR, cash-on-cash, and rehab budgets.',
  },
};

export default async function DealCalculatorPage() {
  let isSessionValid = false;
  let subscription = { plan: 'Individual', status: 'active' };

  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    const subCookie = cookieStore.get(SUB_COOKIE)?.value;
    subscription = decodeSubCookie(subCookie);
    if (session) {
      const secret = process.env.SESSION_SECRET || 'paperworking_session_secure_key_2026_prod';
      isSessionValid =
        isValidSessionToken(session) || (await verifySessionTokenEdge(session, secret));
    }
  } catch {
    // Non-request context fallback
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#0a0a0f] text-white/50">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent" />
            <span className="text-xs uppercase tracking-wider font-semibold">Loading Deal Calculator...</span>
          </div>
        </div>
      }
    >
      <DealCalculatorView
        initialAuthenticated={isSessionValid}
        initialSubscriptionStatus={subscription.status}
      />
    </Suspense>
  );
}

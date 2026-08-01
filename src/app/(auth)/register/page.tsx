'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Wrench, CheckCircle2, ArrowRight } from 'lucide-react';
import type { AccountType } from '@/types/user';
import { buildSignupForPricingLoginUrl } from '@/lib/auth/postAuthRedirect';

/* ═══════════════════════════════════════════════════════
   Account Type Selection — Stitch Schema: ccb42a8a (Black)

   Two-card selection gate before signup. Sets the
   account type in localStorage (for social auth) and
   passes it as a query param to /login (for email auth).
   ═══════════════════════════════════════════════════════ */

const accountTypes: {
  key: AccountType;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    key: 'investor',
    icon: <Building2 className="w-7 h-7" />,
    title: 'Real Estate Investor',
    description:
      'Create and manage deals, track acquisitions, run financials, and oversee your portfolio.',
  },
  {
    key: 'vendor',
    icon: <Wrench className="w-7 h-7" />,
    title: 'Service Provider / Vendor',
    description:
      'List your services, receive qualified leads from investors, and submit bids.',
  },
];

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="w-full animate-pulse" style={{ height: '480px' }} />}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get('invite');
  const [selectedType, setSelectedType] = useState<AccountType>('investor');
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (invite && typeof window !== 'undefined') {
      window.sessionStorage.setItem('pw_pending_invite_token', invite);
    }
  }, [invite]);

  const handleContinue = () => {
    setIsNavigating(true);
    // Persist for social auth path (provisionSocialUser reads this)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pw_pending_account_type', selectedType);
    }
    const name = searchParams.get('name') || '';
    const email = searchParams.get('email') || '';
    const loginUrl = invite
      ? `/login?accountType=${selectedType}&mode=signup&redirectTo=${encodeURIComponent('/invest/' + invite)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`
      : buildSignupForPricingLoginUrl({ accountType: selectedType });
    router.push(loginUrl);
  };

  return (
    <div className="register-card-container flex flex-col gap-8 animate-in fade-in duration-700">

      <div className="text-center flex flex-col gap-2">
        <h1
          className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-on-surface"
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            color: '#e2e2e2',
          }}
        >
          Select Account Type
        </h1>
        <p
          className="text-sm md:text-base mx-auto"
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            color: '#9E9DA0',
            maxWidth: '400px',
          }}
        >
          Create your account and start your first Project. 14-day trial, no charge until day 15.
        </p>
      </div>

      {/* ── Selection Container ── */}
      <div className="flex flex-col gap-4">
        {accountTypes.map((acct) => {
          const active = selectedType === acct.key;
          return (
            <button
              key={acct.key}
              type="button"
              onClick={() => setSelectedType(acct.key)}
              className={`pw-interactive-custom register-type-btn group ${active ? 'active' : ''}`}
            >
              {/* Icon */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={
                  active
                    ? { backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }
                    : { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--pw-muted)' }
                }
              >
                {acct.icon}
              </div>

              {/* Text */}
              <div className="flex flex-col gap-1 pr-6 flex-grow">
                <h3
                  className="text-lg md:text-xl font-semibold text-on-surface"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  }}
                >
                  {acct.title}
                </h3>
                <p
                  className="text-xs md:text-sm leading-relaxed"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    color: 'rgba(186, 202, 197, 0.8)',
                  }}
                >
                  {acct.description}
                </p>
              </div>

              {/* Selection Check Indicator */}
              <div
                className={`flex-shrink-0 ml-auto mt-1 transition-opacity duration-200 ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <CheckCircle2
                  className="w-6 h-6"
                  style={{
                    color: '#ffffff',
                    fill: 'rgba(255, 255, 255, 0.1)',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col gap-4 pt-2 items-center">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isNavigating}
          className="w-full luminous-button font-semibold py-4 rounded-full uppercase tracking-wider text-xs md:text-sm disabled:opacity-50 cursor-pointer"
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          {isNavigating ? 'Loading...' : 'Continue'}
        </button>

        <Link
          href={invite ? `/login?redirectTo=${encodeURIComponent('/invest/' + invite)}` : '/login'}
          className="text-xs md:text-sm hover:text-pw-primary transition-colors py-2 flex items-center gap-1 group"
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            color: '#9E9DA0',
          }}
        >
          Already have an account?{' '}
          <span className="font-bold group-hover:underline text-white">Log in</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

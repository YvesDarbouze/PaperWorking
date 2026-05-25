'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import { Building2, Wrench, CheckCircle2, ArrowRight } from 'lucide-react';
import type { AccountType } from '@/types/user';

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
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<AccountType>('investor');
  const [isNavigating, setIsNavigating] = useState(false);

  const handleContinue = () => {
    setIsNavigating(true);
    // Persist for social auth path (provisionSocialUser reads this)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pw_pending_account_type', selectedType);
    }
    router.push(`/login?accountType=${selectedType}&mode=signup`);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[800px] mx-auto animate-in fade-in duration-700">

      {/* ── Logo + Header ── */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4">
          <Logo href="/" size="md" />
        </div>
        <h1
          className="text-2xl md:text-[32px] font-semibold tracking-tight leading-tight"
          style={{
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            color: '#e2e2e2',
            letterSpacing: '-0.01em',
          }}
        >
          Welcome to PaperWorking
        </h1>
        <p
          className="mt-2 max-w-md mx-auto"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '16px',
            lineHeight: '24px',
            color: 'rgba(186, 202, 197, 0.9)',
          }}
        >
          Select your professional track to start managing your real estate
          business with precision.
        </p>
      </div>

      {/* ── Selection Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
        {accountTypes.map((acct) => {
          const active = selectedType === acct.key;
          return (
            <button
              key={acct.key}
              type="button"
              onClick={() => setSelectedType(acct.key)}
              className="group relative text-left p-6 rounded-xl flex flex-col h-full cursor-pointer transition-all duration-300 active:scale-[0.98]"
              style={{
                background: active
                  ? 'linear-gradient(135deg, rgba(87, 241, 219, 0.12) 0%, rgba(87, 241, 219, 0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                backdropFilter: 'blur(20px)',
                border: active
                  ? '1px solid rgba(87, 241, 219, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: active
                  ? 'inset 0 0 15px rgba(87, 241, 219, 0.05)'
                  : 'none',
              }}
            >
              {/* Icon + Check */}
              <div className="flex justify-between items-start mb-4">
                <div
                  className="p-3 rounded-lg transition-transform group-hover:scale-110"
                  style={{
                    background: active
                      ? 'rgba(87, 241, 219, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: active
                      ? '1px solid rgba(87, 241, 219, 0.2)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    color: active ? '#57f1db' : 'rgba(186, 202, 197, 0.7)',
                  }}
                >
                  {acct.icon}
                </div>
                {/* Selection indicator */}
                <CheckCircle2
                  className="w-6 h-6 transition-opacity duration-200"
                  style={{
                    color: '#57f1db',
                    opacity: active ? 1 : 0,
                    fill: active ? '#57f1db' : 'none',
                  }}
                />
              </div>

              {/* Title */}
              <h3
                className="mb-1"
                style={{
                  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                  fontSize: '20px',
                  fontWeight: 600,
                  lineHeight: '28px',
                  color: '#e2e2e2',
                }}
              >
                {acct.title}
              </h3>

              {/* Description */}
              <p
                className="leading-relaxed"
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: 'rgba(186, 202, 197, 0.7)',
                }}
              >
                {acct.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── CTA ── */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isNavigating}
          className="w-full py-4 px-8 rounded-full uppercase tracking-widest font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            lineHeight: '16px',
            letterSpacing: '0.05em',
            backgroundColor: '#57f1db',
            color: '#00201c',
            boxShadow: '0 0 20px -5px rgba(87, 241, 219, 0.5)',
          }}
        >
          {isNavigating ? 'Loading...' : 'Continue'}
        </button>

        <Link
          href="/login"
          className="flex items-center gap-2 group transition-colors"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            lineHeight: '14px',
            letterSpacing: '0.05em',
            fontWeight: 500,
            color: 'rgba(186, 202, 197, 0.7)',
          }}
        >
          Already have an account?{' '}
          <span
            className="font-semibold group-hover:text-[#57f1db] transition-colors"
            style={{ color: '#e2e2e2' }}
          >
            Log in
          </span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ── Ethereal glow ── */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-[120px]" style={{ background: 'rgba(87, 241, 219, 0.03)' }} />
        <div className="absolute bottom-[20%] left-[10%] w-[30vw] h-[30vw] rounded-full blur-[100px]" style={{ background: 'rgba(87, 241, 219, 0.02)' }} />
      </div>
    </div>
  );
}

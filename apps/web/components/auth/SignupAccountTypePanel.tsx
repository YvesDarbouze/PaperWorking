'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthCard from '@/components/auth/AuthCard';
import { buildSignupLoginUrl } from '@/lib/auth/post-auth-redirect';
import { SIGNUP_ACCOUNT_TYPES, type SignupAccountType } from '@/lib/auth/routes';

export default function SignupAccountTypePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get('invite');
  const [selectedType, setSelectedType] = useState<SignupAccountType>('investor');
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (invite && typeof window !== 'undefined') {
      window.sessionStorage.setItem('pw_pending_invite_token', invite);
    }
  }, [invite]);

  const handleContinue = () => {
    setIsNavigating(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pw_pending_account_type', selectedType);
    }
    const loginUrl = buildSignupLoginUrl({
      accountType: selectedType,
      invite,
      name: searchParams.get('name') ?? '',
      email: searchParams.get('email') ?? '',
    });
    router.push(loginUrl);
  };

  return (
    <AuthCard className="w-full max-w-[520px]">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">Select account type</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-[rgba(253,255,252,0.65)]">
          Create your account and start your first project. 14-day trial, no charge until day 15.
        </p>
      </div>

      <div className="mb-6 space-y-3">
        {SIGNUP_ACCOUNT_TYPES.map((account) => (
          <button
            key={account.key}
            type="button"
            className="auth-type-button"
            data-active={selectedType === account.key}
            onClick={() => setSelectedType(account.key)}
          >
            <p className="mb-1 text-base font-semibold">{account.title}</p>
            <p className="text-sm leading-relaxed text-[rgba(253,255,252,0.65)]">{account.description}</p>
          </button>
        ))}
      </div>

      <button type="button" className="auth-button-primary" disabled={isNavigating} onClick={handleContinue}>
        {isNavigating ? 'Continuing…' : 'Continue to sign up'}
      </button>
    </AuthCard>
  );
}

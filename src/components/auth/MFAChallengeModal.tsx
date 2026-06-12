'use client';
import React, { useState, useCallback } from 'react';
import { MultiFactorResolver, TotpMultiFactorGenerator } from 'firebase/auth';
import posthog from 'posthog-js';

interface Props {
  resolver: MultiFactorResolver;
  onResolved: () => void;
  onCancel: () => void;
}

export default function MFAChallengeModal({ resolver, onResolved, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Find the TOTP hint from the resolver
  const totpHint = resolver.hints.find((h) => h.factorId === 'totp');

  const handleSubmit = useCallback(async () => {
    if (!totpHint || code.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code);
      await resolver.resolveSignIn(assertion);
      try { posthog.capture('mfa_challenge_success', { factorId: 'totp' }); } catch { /* non-fatal */ }
      onResolved();
    } catch (err: any) {
      const next = attempts + 1;
      setAttempts(next);
      setCode('');

      if (err.code === 'auth/invalid-verification-code') {
        setError('Incorrect code. Check your authenticator app and try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('Code expired — wait for the next rotation.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait before trying again.');
        try { posthog.capture('mfa_challenge_failed', { reason: 'too_many_requests', attempts: next }); } catch { /* non-fatal */ }
      } else {
        setError(err.message || 'Verification failed.');
      }
      try { posthog.capture('mfa_challenge_failed', { reason: err.code, attempts: next }); } catch { /* non-fatal */ }
    } finally {
      setLoading(false);
    }
  }, [totpHint, code, resolver, attempts, onResolved]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm glass-card rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-pw-primary text-2xl select-none">shield_lock</span>
          <h2 className="text-xl font-bold text-pw-black">Two-Factor Authentication</h2>
        </div>

        <p className="text-sm text-pw-muted mb-6 leading-relaxed">
          Enter the 6-digit code from your authenticator app to sign in.
        </p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="000000"
          autoFocus
          className="glass-input w-full text-center font-mono text-2xl tracking-[0.4em] py-4 mb-4 text-pw-black"
        />

        {error && (
          <p className="text-xs text-red-400 mb-4 text-center leading-relaxed">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || code.length !== 6}
          className="w-full py-3 rounded-xl bg-pw-primary text-white font-semibold text-sm hover:bg-pw-primary/90 transition-colors disabled:opacity-50 mb-3"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>

        <button
          onClick={onCancel}
          className="w-full py-2 text-xs text-pw-muted hover:text-pw-black transition-colors"
        >
          Cancel sign-in
        </button>

        {attempts >= 3 && (
          <p className="text-[11px] text-pw-muted text-center mt-4 leading-relaxed">
            Lost access to your authenticator? Contact{' '}
            <a href="mailto:support@paperworking.co" className="text-pw-primary underline">
              support@paperworking.co
            </a>{' '}
            with proof of identity.
          </p>
        )}
      </div>
    </div>
  );
}

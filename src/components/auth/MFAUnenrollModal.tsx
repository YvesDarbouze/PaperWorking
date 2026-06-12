'use client';
import React, { useState, useCallback } from 'react';
import {
  multiFactor,
  reauthenticateWithCredential,
  EmailAuthProvider,
  MultiFactorInfo,
} from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import posthog from 'posthog-js';

interface Props {
  totpFactor: MultiFactorInfo;
  onClose: () => void;
  onUnenrolled: () => void;
}

export default function MFAUnenrollModal({ totpFactor, onClose, onUnenrolled }: Props) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnenroll = useCallback(async () => {
    if (!user?.email) return;
    setError(null);
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await multiFactor(user).unenroll(totpFactor);
      try { posthog.capture('mfa_unenrolled', { factorId: 'totp' }); } catch { /* non-fatal */ }
      onUnenrolled();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password.');
      } else {
        setError(err.message || 'Failed to disable 2FA.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, password, totpFactor, onClose, onUnenrolled]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm glass-card rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-red-400 text-2xl select-none">shield_lock</span>
          <h2 className="text-xl font-bold text-pw-black">Disable Two-Factor Auth</h2>
        </div>

        <p className="text-sm text-pw-muted mb-1">
          Disabling 2FA removes the extra security layer from your account.
        </p>
        <p className="text-xs text-pw-muted mb-6 leading-relaxed">
          Enter your password to confirm. This action takes effect immediately.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUnenroll()}
          placeholder="Current password"
          autoFocus
          className="glass-input w-full text-sm px-4 py-3 text-pw-black mb-4"
        />

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-pw-border text-sm font-semibold text-pw-muted hover:text-pw-black transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUnenroll}
            disabled={loading || !password}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Disabling…' : 'Disable 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';
import React, { useState, useCallback } from 'react';
import QRCode from 'react-qr-code';
import {
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import posthog from 'posthog-js';

type Step = 'reauth' | 'qr' | 'verify' | 'success';

interface Props {
  onClose: () => void;
  onEnrolled: () => void;
}

export default function MFAEnrollmentModal({ onClose, onEnrolled }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('reauth');
  const [password, setPassword] = useState('');
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [code, setCode] = useState('');
  const [recoveryAcked, setRecoveryAcked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = (['reauth', 'qr', 'verify', 'success'] as Step[]).indexOf(step);

  const handleReauth = useCallback(async () => {
    if (!user?.email) return;
    setError(null);
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      setTotpSecret(secret);
      setQrUrl(secret.generateQrCodeUrl(user.email, 'PaperWorking'));
      setSecretKey(secret.secretKey);
      setStep('qr');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password.');
      } else {
        setError(err.message || 'Re-authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, password]);

  const handleVerify = useCallback(async () => {
    if (!user || !totpSecret) return;
    if (!recoveryAcked) {
      setError('Please acknowledge the recovery notice before continuing.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
      await multiFactor(user).enroll(assertion, 'TOTP Authenticator');
      try { posthog.capture('mfa_enrolled', { factorId: 'totp' }); } catch { /* non-fatal */ }
      setStep('success');
    } catch (err: any) {
      if (err.code === 'auth/invalid-verification-code') {
        setError('Incorrect code. Check your authenticator app and try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('Code expired. Wait for the next rotation in your authenticator app.');
      } else {
        setError(err.message || 'Enrollment failed.');
      }
      try { posthog.capture('mfa_enrollment_failed', { error: err.code }); } catch { /* non-fatal */ }
    } finally {
      setLoading(false);
    }
  }, [user, totpSecret, code, recoveryAcked]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={step === 'success' ? undefined : onClose}
    >
      <div
        className="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-pw-primary text-2xl select-none">security</span>
            <h2 className="text-xl font-bold text-pw-black">Enable Two-Factor Auth</h2>
          </div>
          {step !== 'success' && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-pw-glass-bg text-pw-muted hover:text-pw-black transition-colors"
            >
              <span className="material-symbols-outlined text-xl select-none">close</span>
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-8">
          {(['reauth', 'qr', 'verify', 'success'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                stepIndex >= i ? 'bg-pw-primary' : 'bg-pw-border'
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Re-authenticate ── */}
        {step === 'reauth' && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-pw-black mb-1">Confirm your password</p>
              <p className="text-xs text-pw-muted mb-4">
                Security requires re-verification before enrolling a second factor.
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReauth()}
                placeholder="Current password"
                autoFocus
                className="glass-input w-full text-sm px-4 py-3 text-pw-black"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleReauth}
              disabled={loading || !password}
              className="w-full py-3 rounded-xl bg-pw-primary text-white font-semibold text-sm hover:bg-pw-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Continue'}
            </button>
          </div>
        )}

        {/* ── Step 2: QR Code + manual key ── */}
        {step === 'qr' && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-pw-black mb-1">Scan with your authenticator app</p>
              <p className="text-xs text-pw-muted">
                Use Google Authenticator, Authy, 1Password, or any TOTP-compatible app.
              </p>
            </div>

            <div className="flex justify-center p-5 bg-white rounded-xl border border-pw-border">
              <QRCode value={qrUrl} size={180} />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-pw-muted uppercase tracking-wider">Can&apos;t scan? Enter manually</p>
              <div
                className="font-mono text-sm text-pw-black bg-pw-glass-bg rounded-lg px-4 py-3 border border-pw-border select-all break-all leading-relaxed cursor-pointer hover:border-pw-primary/40 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(secretKey);
                  toast.success('Secret key copied');
                }}
              >
                {secretKey}
              </div>
              <p className="text-[11px] text-pw-muted">Click to copy. Enter as the account key in your authenticator app.</p>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full py-3 rounded-xl bg-pw-primary text-white font-semibold text-sm hover:bg-pw-primary/90 transition-colors"
            >
              I&apos;ve added the account →
            </button>
          </div>
        )}

        {/* ── Step 3: Verify code + recovery acknowledgment ── */}
        {step === 'verify' && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-pw-black mb-1">Enter the 6-digit code</p>
              <p className="text-xs text-pw-muted mb-4">
                Open your authenticator app and enter the current code for PaperWorking.
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="000000"
                autoFocus
                className="glass-input w-full text-center font-mono text-xl tracking-[0.4em] py-4 text-pw-black"
              />
            </div>

            {/* Recovery guidance — must be acknowledged */}
            <div className="p-4 rounded-xl border border-amber-400/30 bg-amber-400/5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-lg select-none">warning</span>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Recovery Notice</p>
              </div>
              <p className="text-[11px] text-pw-muted leading-relaxed">
                Firebase Identity Platform does not generate backup recovery codes for TOTP.
                If you lose access to your authenticator app, account recovery requires contacting
                PaperWorking support with proof of identity — there is no self-service recovery path.
              </p>
              <p className="text-[11px] text-pw-muted leading-relaxed">
                <strong className="text-pw-black">Recommendation:</strong> save the secret key shown
                in the previous step in a secure password manager as a TOTP seed backup.
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recoveryAcked}
                  onChange={(e) => setRecoveryAcked(e.target.checked)}
                  className="mt-0.5 accent-pw-primary flex-shrink-0"
                />
                <span className="text-xs text-pw-black font-medium leading-relaxed">
                  I understand that losing my authenticator app requires identity-verified support to recover my account.
                </span>
              </label>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setCode(''); setError(null); setStep('qr'); }}
                className="flex-1 py-3 rounded-xl border border-pw-border text-sm font-semibold text-pw-muted hover:text-pw-black transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleVerify}
                disabled={loading || code.length !== 6 || !recoveryAcked}
                className="flex-1 py-3 rounded-xl bg-pw-primary text-white font-semibold text-sm hover:bg-pw-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Enrolling…' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 'success' && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-pw-primary/15 border border-pw-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-pw-primary text-3xl select-none">check_circle</span>
            </div>
            <div>
              <p className="text-lg font-bold text-pw-black mb-2">2FA Enabled</p>
              <p className="text-sm text-pw-muted leading-relaxed">
                Your account is now protected with TOTP two-factor authentication.
                You&apos;ll be asked for a code from your authenticator app on every sign-in.
              </p>
            </div>
            <button
              onClick={() => { onEnrolled(); onClose(); }}
              className="w-full py-3 rounded-xl bg-pw-primary text-white font-semibold text-sm hover:bg-pw-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

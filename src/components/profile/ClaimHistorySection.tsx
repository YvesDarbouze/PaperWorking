'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, KeyRound, CheckCircle2, RefreshCw, Send, HelpCircle } from 'lucide-react';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { settingsTokens, panelStyle, inputStyle } from '@/components/settings/settingsTheme';

export default function ClaimHistorySection() {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = settingsTokens(isDark);
  const panel = panelStyle(t);
  const field = inputStyle(t);

  const [emailToClaim, setEmailToClaim] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'start' | 'verify' | 'success'>('start');
  const [loading, setLoading] = useState(false);

  const claimedEmails = profile?.claimedEmails || [];

  const handleStartClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToClaim || !emailToClaim.trim()) return;

    setLoading(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        toast.error('You must be signed in.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/identity/claim/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ claimEmail: emailToClaim.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start claim.');
      }

      toast.success('Verification code sent successfully!');
      setStep('verify');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !verificationCode.trim()) return;

    setLoading(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        toast.error('You must be signed in.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/identity/claim/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          claimEmail: emailToClaim.trim(),
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify code.');
      }

      toast.success(data.message || 'Identity claimed successfully!');
      setStep('success');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmailToClaim('');
    setVerificationCode('');
    setStep('start');
  };

  if (!user) return null;

  return (
    <section className="col-span-12 p-5 sm:p-6 flex flex-col" style={panel}>
      <div className="flex items-center gap-2 pb-4 mb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>history</span>
        <h4 className="text-base font-semibold" style={{ color: t.heading }}>
          Claim prior email history
        </h4>
      </div>

      <p className="text-sm mb-5 leading-relaxed max-w-2xl" style={{ color: t.muted }}>
        Received deals or invites under another email? Claim it to merge that history into this account.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div>
          {step === 'start' && (
            <form onSubmit={handleStartClaim} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                  Email to claim
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.muted }}>
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={emailToClaim}
                    onChange={(e) => setEmailToClaim(e.target.value)}
                    placeholder="prior-email@example.com"
                    required
                    disabled={loading}
                    className="w-full text-sm pl-10 pr-3 h-10 outline-none"
                    style={field}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !emailToClaim}
                className="pw-interactive-custom w-full inline-flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '10px 16px' }}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Request verification code
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyClaim} className="space-y-4">
              <div
                className="p-3.5 mb-1 flex gap-3"
                style={{ background: t.accentMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
              >
                <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: t.accent }} />
                <p className="text-xs leading-relaxed" style={{ color: t.muted }}>
                  We sent a 6-digit code to <strong style={{ color: t.heading }}>{emailToClaim}</strong>.
                  Enter it below to confirm ownership.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                  6-digit code
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.muted }}>
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    required
                    maxLength={6}
                    disabled={loading}
                    className="w-full text-sm pl-10 pr-3 h-10 tracking-[0.2em] font-mono outline-none"
                    style={field}
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="pw-interactive-custom w-1/3 text-xs font-semibold"
                  style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '10px 12px', color: t.muted }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="pw-interactive-custom w-2/3 inline-flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '10px 16px' }}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Verify & claim
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div
              className="space-y-3 text-center py-6 px-4"
              style={{ background: t.successMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
            >
              <div
                className="inline-flex items-center justify-center w-11 h-11 mb-1"
                style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, color: t.success }}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h5 className="text-base font-semibold" style={{ color: t.heading }}>Identity history merged</h5>
              <p className="text-xs leading-relaxed max-w-sm mx-auto" style={{ color: t.muted }}>
                Records for <strong style={{ color: t.heading }}>{emailToClaim}</strong> are linked to this profile.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="pw-interactive-custom mt-2 text-xs font-semibold"
                style={{ background: 'transparent', border: 'none', padding: 0, color: t.accent }}
              >
                Claim another email
              </button>
            </div>
          )}
        </div>

        <div
          className="p-4 h-full flex flex-col"
          style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
        >
          <h5
            className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5 pb-2"
            style={{ color: t.muted, borderBottom: `1px solid ${t.divider}` }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: t.success }} />
            Claimed emails
          </h5>

          {claimedEmails.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: t.muted }}>
              No external email histories claimed yet.
            </div>
          ) : (
            <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {claimedEmails.map((email: string, idx: number) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-sm px-3 py-2 gap-2"
                  style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 }}
                >
                  <span className="font-medium truncate" style={{ color: t.heading }}>{email}</span>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold shrink-0 px-1.5 py-0.5"
                    style={{ background: t.successMuted, color: t.success, borderRadius: 2 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.success }} />
                    Merged
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

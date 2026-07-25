'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, KeyRound, CheckCircle2, AlertCircle, RefreshCw, Send, HelpCircle } from 'lucide-react';

export default function ClaimHistorySection() {
  const { user, profile } = useAuth();
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
    <section className="col-span-12 glass-card rounded-2xl p-8 border border-white/5 relative overflow-hidden flex flex-col justify-between">
      {/* Ambient glow effect */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-pw-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-pw-primary text-xl select-none">history</span>
          <h4 className="text-2xl font-bold text-pw-black tracking-tight">Claim Prior Email History</h4>
        </div>
      </div>

      <p className="text-sm text-pw-muted/95 mb-6 leading-relaxed max-w-2xl">
        Did you receive deal invitations, commitments, or team workspace invites under a different email address? 
        Claim that email to merge its transaction history and permissions into this account.
      </p>

      {/* Form content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-6">
        <div>
          {step === 'start' && (
            <form onSubmit={handleStartClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">
                  Email Address to Claim
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pw-muted/50">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={emailToClaim}
                    onChange={(e) => setEmailToClaim(e.target.value)}
                    placeholder="prior-email@example.com"
                    required
                    disabled={loading}
                    className="glass-input w-full text-sm pl-11 pr-4 py-3 text-pw-black placeholder:text-pw-muted/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !emailToClaim}
                className="luminous-button w-full inline-flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wider px-8 py-3.5 rounded-xl disabled:opacity-50 cursor-pointer transition-all duration-300 hover:scale-[1.01]"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Request Verification Code
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyClaim} className="space-y-4">
              <div className="bg-pw-primary/5 border border-pw-primary/10 rounded-xl p-4 mb-4 flex gap-3">
                <HelpCircle className="w-5 h-5 text-pw-primary shrink-0 mt-0.5" />
                <p className="text-xs text-pw-muted leading-relaxed">
                  We sent a 6-digit verification code to <strong>{emailToClaim}</strong>. 
                  Check your inbox and enter it below to confirm you own this address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">
                  6-Digit Code
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pw-muted/50">
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
                    className="glass-input w-full text-sm pl-11 pr-4 py-3 tracking-[0.2em] font-mono text-pw-black placeholder:text-pw-muted/30 placeholder:tracking-normal"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="glass-button w-1/3 text-xs font-semibold uppercase tracking-wider py-3.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-pw-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="luminous-button w-2/3 inline-flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wider py-3.5 rounded-xl disabled:opacity-50 cursor-pointer transition-all duration-300 hover:scale-[1.01]"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Verify & Claim
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center py-6 px-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              </div>
              <h5 className="text-lg font-bold text-pw-black">Identity History Merged</h5>
              <p className="text-xs text-pw-muted leading-relaxed max-w-sm mx-auto">
                Success! The transaction records, invitations, and permissions for <strong>{emailToClaim}</strong> have been linked to your profile.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 text-xs font-semibold text-pw-primary hover:underline uppercase tracking-wider"
              >
                Claim Another Email
              </button>
            </div>
          )}
        </div>

        {/* Claimed list */}
        <div className="bg-pw-glass-bg/30 border border-white/5 rounded-2xl p-6 h-full flex flex-col justify-between">
          <div>
            <h5 className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <CheckCircle2 className="w-4 h-4 text-pw-primary" />
              Claimed Email History
            </h5>

            {claimedEmails.length === 0 ? (
              <div className="py-8 text-center text-xs text-pw-muted/65 italic">
                No external email histories claimed yet.
              </div>
            ) : (
              <ul className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {claimedEmails.map((email: string, idx: number) => (
                  <li 
                    key={idx} 
                    className="flex items-center justify-between text-sm px-3.5 py-2.5 rounded-xl bg-pw-glass-bg/60 border border-white/5"
                  >
                    <span className="text-pw-black font-medium">{email}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Verified & Merged
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

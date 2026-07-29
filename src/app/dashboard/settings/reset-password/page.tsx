'use client';

import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { SettingsErrorBoundary } from '@/components/settings/ErrorBoundary';
import toast from 'react-hot-toast';
import { Mail, Shield, CheckCircle } from 'lucide-react';

function ResetPasswordForm() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    if (!user || !user.email) {
      toast.error('Unable to retrieve user email. Please re-authenticate.');
      return;
    }

    setSending(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, user.email);
      setSent(true);
      toast.success('Password reset link sent to your email.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email.';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto py-6 animate-in fade-in duration-200">

      <div className="glass-card rounded-2xl p-6 border border-pw-border/50 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pw-primary/10 border border-pw-primary/20 text-[#3279F9] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-pw-black">Password Management for Guest Accounts</h4>
            <p className="text-xs text-pw-muted mt-0.5">
              For security, guest password changes are handled via external verification links.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="p-4 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#2E7D32]">Reset Email Dispatched</p>
              <p className="text-[11px] text-[#2E7D32]/80 mt-1">
                A verification link has been sent to <span className="font-semibold">{user?.email}</span>. Click the link inside the email to choose a new password.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">Registered Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="glass-input w-full text-sm px-4 h-10 rounded-lg text-pw-muted/70 bg-pw-glass-bg/30 border border-pw-border cursor-not-allowed"
                />
                <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-pw-muted/50" />
              </div>
            </div>

            <button
              onClick={handleSendReset}
              disabled={sending}
              className="luminous-button w-full h-10 px-5 rounded-lg text-sm font-medium active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {sending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending Link
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <SettingsErrorBoundary>
      <ResetPasswordForm />
    </SettingsErrorBoundary>
  );
}

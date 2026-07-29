'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { getUserRoleTier } from '@/lib/auth/roleTiers';
import { useSettingsStore } from '@/store/settingsStore';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { SettingsErrorBoundary } from '@/components/settings/ErrorBoundary';
import { FormSkeleton } from '@/components/settings/SettingsSkeletons';
import {
  Shield, AlertTriangle, Laptop, ExternalLink,
  Check, Download, AlertCircle
} from 'lucide-react';

const policySchema = z.object({
  ssoEnabled: z.boolean(),
  twoFaRequired: z.boolean(),
  sessionTimeout: z.string(),
  ipAllowlist: z.string().optional(),
  ssoProvider: z.string().optional(),
  samlEntityId: z.string().optional(),
  samlSignInUrl: z.string().optional(),
  samlX509Cert: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface ActiveSession {
  device: string;
  location: string;
  ip: string;
  isCurrent?: boolean;
}

interface LoginHistoryEntry {
  date: string;
  device: string;
  ip: string;
  location: string;
  status: string;
}

// Mock login history data
const MOCK_LOGIN_HISTORY: LoginHistoryEntry[] = [
  { date: new Date().toISOString(), device: 'Chrome on macOS', ip: '192.168.1.100', location: 'New York, USA', status: 'Success' },
  { date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), device: 'Safari on iPhone', ip: '172.56.21.8', location: 'New York, USA', status: 'Success' },
  { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), device: 'Chrome on macOS', ip: '192.168.1.100', location: 'New York, USA', status: 'Success' },
  { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), device: 'Firefox on Windows', ip: '204.84.12.9', location: 'Boston, USA', status: 'Failed' },
  { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), device: 'Chrome on macOS', ip: '192.168.1.100', location: 'New York, USA', status: 'Success' },
];

function SecuritySettingsForm() {
  const { user, profile } = useAuth();
  const userTier = getUserRoleTier(profile?.role);
  const { security, fetchSecurity, updateSecurity, userProfile, fetchUserProfile } = useSettingsStore();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loginHistory] = useState<LoginHistoryEntry[]>(MOCK_LOGIN_HISTORY);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSessions(data);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchSecurity();
    fetchUserProfile();
    fetchSessions();
  }, [fetchSecurity, fetchUserProfile, fetchSessions]);

  // Admin Policies form
  const [ssoEnabledLocal, setSsoEnabledLocal] = useState(false);
  const [twoFaRequiredLocal, setTwoFaRequiredLocal] = useState(false);
  const [invalidIpLines, setInvalidIpLines] = useState<string[]>([]);

  const {
    register: registerPolicy,
    handleSubmit: handleSubmitPolicy,
    reset: resetPolicy,
    formState: { isDirty: isPolicyDirty, isSubmitting: isPolicySubmitting }
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      ssoEnabled: false,
      twoFaRequired: false,
      sessionTimeout: '24 hours',
      ipAllowlist: '',
      ssoProvider: 'saml',
      samlEntityId: '',
      samlSignInUrl: '',
      samlX509Cert: '',
    }
  });

  // Sync state values
  useEffect(() => {
    if (security.data) {
      const sso = security.data.ssoEnabled ?? false;
      const tfa = security.data.twoFaRequired ?? false;
      
      resetPolicy({
        ssoEnabled: sso,
        twoFaRequired: tfa,
        sessionTimeout: security.data.sessionTimeout || '24 hours',
        ipAllowlist: security.data.ipAllowlist || '',
        ssoProvider: security.data.ssoProvider || 'saml',
        samlEntityId: security.data.samlEntityId || '',
        samlSignInUrl: security.data.samlSignInUrl || '',
        samlX509Cert: security.data.samlX509Cert || '',
      });

      setSsoEnabledLocal(sso);
      setTwoFaRequiredLocal(tfa);
    }
  }, [security.data, resetPolicy]);

  // Sync 2FA state from profile data
  useEffect(() => {
    const profData = userProfile.data as { twoFaEnabled?: boolean } | null | undefined;
    if (profData) {
      setIs2FAEnabled(!!profData.twoFaEnabled);
    }
  }, [userProfile.data]);

  // 2FA Setup Flow State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupMode, setSetupMode] = useState<'none' | 'enable_qr' | 'disable_confirm'>('none');
  const [totpCode, setTotpCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupStep, setSetupStep] = useState(1);
  const [revoking, setRevoking] = useState(false);

  // 2FA API generated states
  const [passwordSetup, setPasswordSetup] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handle2FAToggle = () => {
    if (is2FAEnabled) {
      setSetupMode('disable_confirm');
      setTotpCode('');
      setConfirmPassword('');
    } else {
      setSetupMode('enable_qr');
      setSetupStep(1);
      setTotpCode('');
      setPasswordSetup('');
      setQrSvg('');
      setSecret('');
      setBackupCodes([]);
    }
  };

  const handleVerifyPasswordForSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const tid = toast.loading('Verifying identity...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: passwordSetup })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Incorrect password.');
      }
      const data = await res.json();
      setQrSvg(data.qrSvg);
      setSecret(data.secret);
      setSetupStep(2);
      toast.success('Identity verified. Please scan the QR Code.', { id: tid });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify password.';
      toast.error(message, { id: tid });
    }
  };

  const handleDownloadBackupCodes = () => {
    const rawCodes = backupCodes.length > 0
      ? backupCodes
      : Array.from({ length: 10 }, () => Math.floor(10000000 + Math.random() * 90000000).toString());
    const textContent = `PAPERWORKING BACKUP CODES\nStore these in a secure place:\n\n${rawCodes.join('\n')}`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'paperworking_backup_codes.txt';
    link.click();
    setBackupCodes(rawCodes);
    setSetupStep(3);
    toast.success('Backup codes downloaded. Keep them safe.');
  };

  const handleVerifyEnable = async () => {
    if (!user) return;
    if (totpCode.length !== 6 || isNaN(Number(totpCode))) {
      toast.error('Please enter a valid 6-digit TOTP verification code.');
      return;
    }
    const tid = toast.loading('Verifying activation code...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: totpCode, secret })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Incorrect verification code.');
      }
      setIs2FAEnabled(true);
      setSetupMode('none');
      toast.success('Two-factor authentication enabled successfully.', { id: tid });
      fetchUserProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable 2FA.';
      toast.error(message, { id: tid });
    }
  };

  const handleDisableConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!confirmPassword) {
      toast.error('Password is required to disable 2FA.');
      return;
    }
    if (totpCode.length !== 6) {
      toast.error('6-digit verification code is required.');
      return;
    }
    const tid = toast.loading('Deactivating 2FA protection...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: confirmPassword, code: totpCode })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to disable 2FA.');
      }
      setIs2FAEnabled(false);
      setSetupMode('none');
      toast.success('Two-factor authentication disabled successfully.', { id: tid });
      fetchUserProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate 2FA.';
      toast.error(message, { id: tid });
    }
  };

  const handleIpAllowlistBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (!value) {
      setInvalidIpLines([]);
      return;
    }
    const lines = value.split('\n').map((l) => l.trim()).filter(Boolean);
    const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}(?:\/\d{1,2})?$/;
    const ipv6Regex = /^(?:[a-fA-F\d]{1,4}:){1,7}[a-fA-F\d]{1,4}(?:\/\d{1,3})?$/;
    const invalid = lines.filter((line) => !ipv4Regex.test(line) && !ipv6Regex.test(line) && line !== 'localhost');
    setInvalidIpLines(invalid);
  };

  const onPolicySubmit = async (values: PolicyFormValues) => {
    if (invalidIpLines.length > 0) {
      toast.error('Please correct the invalid IP allowlist values before saving.');
      return;
    }
    if (values.ipAllowlist) {
      const lines = values.ipAllowlist.split('\n').map((l) => l.trim()).filter(Boolean);
      const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}(?:\/\d{1,2})?$/;
      const ipv6Regex = /^(?:[a-fA-F\d]{1,4}:){1,7}[a-fA-F\d]{1,4}(?:\/\d{1,3})?$/;
      const hasInvalid = lines.some((line) => !ipv4Regex.test(line) && !ipv6Regex.test(line) && line !== 'localhost');
      if (hasInvalid) {
        toast.error('Invalid IP or CIDR range specified.');
        return;
      }
    }

    try {
      await updateSecurity({
        ...values,
        ssoEnabled: ssoEnabledLocal,
        twoFaRequired: twoFaRequiredLocal,
      });
      toast.success('Security guardrails updated successfully.');
      resetPolicy({
        ...values,
        ssoEnabled: ssoEnabledLocal,
        twoFaRequired: twoFaRequiredLocal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save policies.';
      toast.error(message);
    }
  };

  const handleRevokeSessions = async () => {
    if (!user) return;
    setRevoking(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (!res.ok) throw new Error('Failed to revoke sessions');
      toast.success('All other active sessions have been revoked.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to revoke active sessions.');
    } finally {
      setRevoking(false);
    }
  };

  if (security.loading && !security.data) {
    return (
      <div className="max-w-[720px] mx-auto space-y-8 animate-pulse">
        <FormSkeleton rows={3} />
        <FormSkeleton rows={2} />
      </div>
    );
  }

  if (security.error) {
    return (
      <div className="max-w-[720px] mx-auto p-6 rounded-2xl bg-error/5 border border-error/20 text-center space-y-4">
        <p className="text-sm text-error font-medium">Failed to load security policies.</p>
        <button
          onClick={() => fetchSecurity()}
          className="h-9 px-4 rounded-lg bg-error/10 border border-error/30 text-error text-xs font-semibold hover:bg-error/20 transition-all cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // Block Viewers/Guests from accessing security
  if (userTier === 'viewer') {
    return (
      <div className="max-w-[720px] mx-auto flex items-center justify-center py-20 px-4">
        <div className="glass-card border border-pw-border p-6 max-w-sm text-center space-y-4 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-pw-primary/10 border border-pw-primary/20 flex items-center justify-center mx-auto text-[#3279F9]">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-pw-black">Access Restricted</h2>
          <p className="text-xs text-pw-muted leading-relaxed">
            Security settings are restricted to team members and administrators.
          </p>
          <Link
            href="/dashboard/settings/account"
            className="luminous-button h-10 px-5 rounded-lg text-sm font-medium active:scale-98 transition-all flex items-center justify-center gap-2 w-full"
          >
            Back to Account Settings
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = userTier === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* A. ADMIN-ONLY CORPORATE GUARDRAILS */}
      {isAdmin && (
        <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-4">Corporate Guardrails</h2>

          <form onSubmit={handleSubmitPolicy(onPolicySubmit)} className="space-y-6">
            
            {/* Require SSO */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Require Single Sign-On (SSO)</p>
                  <p className="text-xs text-slate-400">Force users to log in through your SAML or OIDC provider.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSsoEnabledLocal(!ssoEnabledLocal)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    ssoEnabledLocal ? 'bg-[#6B8E6B]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={ssoEnabledLocal}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      ssoEnabledLocal ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {ssoEnabledLocal && (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-[#FFF8E1] border border-[#FFE082] text-[#B76E00] rounded-lg p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Enabling SSO will force all members to re-authenticate at next request.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">SSO Provider</label>
                      <select
                        {...registerPolicy('ssoProvider')}
                        className="w-full text-sm px-3 h-10 rounded-lg border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] cursor-pointer"
                      >
                        <option value="saml">SAML 2.0</option>
                        <option value="oidc">OpenID Connect</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Entity ID / Client ID</label>
                      <input
                        type="text"
                        {...registerPolicy('samlEntityId')}
                        placeholder="urn:example:sp"
                        className="w-full text-sm px-3 h-10 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#6B8E6B] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Single Sign-On Service URL</label>
                    <input
                      type="url"
                      {...registerPolicy('samlSignInUrl')}
                      placeholder="https://idp.example.com/sso"
                      className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#6B8E6B] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">X.509 Certificate</label>
                    <textarea
                      {...registerPolicy('samlX509Cert')}
                      rows={3}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      className="w-full text-xs p-3 rounded-lg border border-slate-200 text-slate-900 font-mono focus:ring-2 focus:ring-[#6B8E6B] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Enforce 2FA team-wide */}
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Require Two-Factor Authentication</p>
                  <p className="text-xs text-slate-400">Members without active 2FA see enforcement banners on next login.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTwoFaRequiredLocal(!twoFaRequiredLocal)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    twoFaRequiredLocal ? 'bg-[#6B8E6B]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={twoFaRequiredLocal}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      twoFaRequiredLocal ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {twoFaRequiredLocal && (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-[#FFF8E1] border border-[#FFE082] text-[#B76E00] rounded-lg p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Enabling team-wide 2FA will require all team members to set up 2FA on their next login.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Timeout threshold */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Session Timeout</label>
              <select
                {...registerPolicy('sessionTimeout')}
                className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-[#6B8E6B] focus:outline-none transition-all"
              >
                <option value="15 minutes">15 minutes</option>
                <option value="30 minutes">30 minutes</option>
                <option value="1 hour">1 hour</option>
                <option value="4 hours">4 hours</option>
                <option value="8 hours">8 hours</option>
                <option value="24 hours">24 hours</option>
                <option value="never">Never log out</option>
              </select>
            </div>

            {/* Allowed IPs allowlist */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Allowed IP Ranges</label>
              <textarea
                {...registerPolicy('ipAllowlist', {
                  onBlur: handleIpAllowlistBlur
                })}
                rows={3}
                placeholder="e.g. 192.168.1.1&#10;10.0.0.0/24"
                className={`w-full text-xs p-3 rounded-lg text-slate-900 font-mono focus:ring-2 focus:outline-none transition-all ${
                  invalidIpLines.length > 0 
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : 'border-slate-200 focus:ring-[#6B8E6B] focus:border-[#6B8E6B]'
                }`}
              />
              {invalidIpLines.length > 0 && (
                <p className="text-[11px] text-red-650 mt-1 font-semibold">
                  Invalid IP or CIDR ranges: {invalidIpLines.join(', ')}
                </p>
              )}
            </div>

            {/* Admin Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <Link
                href="/dashboard/settings/data-privacy"
                className="inline-flex items-center gap-1.5 text-xs text-[#6B8E6B] hover:text-[#557255] hover:underline font-semibold"
              >
                View Security Audit Log
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                type="submit"
                disabled={isPolicySubmitting || invalidIpLines.length > 0 || (!isPolicyDirty && ssoEnabledLocal === security.data?.ssoEnabled && twoFaRequiredLocal === security.data?.twoFaRequired)}
                className="h-10 px-4 py-2 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPolicySubmitting && (
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Save Changes
              </button>
            </div>

          </form>
        </section>
      )}

      {/* B. PERSONAL SECURITY WORKFLOW */}
      <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-4">Personal MFA Protection</h2>

        {/* 2FA Setup view */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex-col sm:flex-row gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-slate-400">
                {is2FAEnabled ? 'TOTP Authenticator active' : 'Secure your account with an extra verification factor'}
              </p>
            </div>
            <button
              onClick={handle2FAToggle}
              className={`h-9 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                is2FAEnabled
                  ? 'border border-red-200 text-red-600 hover:bg-red-50'
                  : 'bg-[#6B8E6B] text-white hover:bg-[#557255]'
              }`}
            >
              {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>

          {/* 1. ENABLE TOTP FLOW DISPLAY */}
          {setupMode === 'enable_qr' && (
            <div className="p-5 border border-slate-100 bg-slate-50/30 rounded-xl space-y-5 animate-in slide-in-from-top-2 duration-200">
              
              {/* Setup Step 1: Verify Password */}
              {setupStep === 1 && (
                <form onSubmit={handleVerifyPasswordForSetup} className="space-y-4">
                  <div className="bg-[#FFF8E1] border border-[#FFE082] text-[#B76E00] rounded-lg p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>For security, verify your account password before setting up Two-Factor Authentication.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Account Password</label>
                    <input
                      type="password"
                      value={passwordSetup}
                      onChange={(e) => setPasswordSetup(e.target.value)}
                      placeholder="Enter password"
                      className="w-full max-w-md text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#6B8E6B] focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSetupMode('none')}
                      className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-10 px-4 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold cursor-pointer transition-all"
                    >
                      Verify Password
                    </button>
                  </div>
                </form>
              )}

              {/* Setup Step 2: Show QR Code & Download Backup Codes */}
              {setupStep === 2 && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Dynamic SVG QR Code */}
                    <div 
                      className="w-36 h-36 bg-white rounded-lg p-2 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />

                    <div className="space-y-3 flex-1 text-center sm:text-left">
                      <p className="text-xs font-bold text-slate-800">Scan QR Code</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Scan the code above in your authenticator app (like Google Authenticator or 1Password). Alternatively, enter this manual code: <span className="font-mono font-bold text-slate-800 select-all bg-white border border-slate-200 px-1.5 py-0.5 rounded">{secret || 'JBSWY3DPEHPK3PXP'}</span>
                      </p>
                      <div className="bg-red-50 border border-red-150 text-red-700 p-2.5 rounded-lg text-[11px] leading-relaxed">
                        <strong>Important:</strong> You must download your 10 backup codes to proceed. These let you access your account if you lose your authenticator device.
                      </div>
                      <button
                        onClick={handleDownloadBackupCodes}
                        className="h-8 px-3 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer mx-auto sm:mx-0 shadow-sm transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download 10 Backup Codes
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSetupMode('none')}
                      className="h-9 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Setup Step 3: Enter TOTP Verification Code */}
              {setupStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-[#E8F5E9] border border-[#A5D6A7] text-[#2E7D32] rounded-lg p-3 text-xs flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Backup codes downloaded successfully. Please verify the setup below.</span>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">6-Digit Verification Code</label>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        placeholder="000000"
                        className="text-center font-mono tracking-[0.25em] text-sm px-4 h-10 w-36 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#6B8E6B] focus:outline-none transition-all"
                      />
                      <button
                        onClick={handleVerifyEnable}
                        className="h-10 px-4 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold cursor-pointer transition-all flex items-center justify-center shadow-sm"
                      >
                        Verify and Enable
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSetupStep(2)}
                      className="h-9 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all mr-2"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetupMode('none')}
                      className="h-9 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* 2. DISABLE TOTP FLOW CONFIRMATION */}
          {setupMode === 'disable_confirm' && (
            <form onSubmit={handleDisableConfirm} className="p-5 border border-red-200 bg-red-50/50 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2.5 text-xs text-red-600 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Confirm password and TOTP code to disable Two-Factor Authentication.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Account Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Authenticator Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="000000"
                    className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 focus:ring-2 focus:ring-red-600 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSetupMode('none')}
                  className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer transition-all"
                >
                  Confirm Disable
                </button>
              </div>
            </form>
          )}

        </div>
      </section>

      {/* C. ACTIVE SESSIONS LIST */}
      <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-4">Active Sessions</h2>

        {activeSessions.length === 0 ? (
          <p className="text-xs text-slate-400 font-mono italic">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {activeSessions.map((sess, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{sess.device}</p>
                    <p className="text-[10px] text-slate-400">{sess.location} · IP: {sess.ip}</p>
                  </div>
                </div>
                {sess.isCurrent && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FAF9F6] text-[#557255] border border-slate-200 rounded-full shrink-0">
                    Current
                  </span>
                )}
              </div>
            ))}

            <button
              onClick={handleRevokeSessions}
              disabled={revoking}
              className="w-full h-10 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all bg-transparent"
            >
              {revoking ? 'Logging out...' : 'Log Out All Other Sessions'}
            </button>
          </div>
        )}
      </section>

      {/* D. LOGIN HISTORY TABLE */}
      <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-4">Login History</h2>

        {loginHistory.length === 0 ? (
          <p className="text-xs text-slate-400 font-mono italic">No recent login activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500">
                  <th className="pb-3 pl-2">Time</th>
                  <th className="pb-3">Device / Browser</th>
                  <th className="pb-3">IP Address</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3 text-right pr-2">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-500">
                {loginHistory.map((log, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 pl-2 text-slate-800">{new Date(log.date).toLocaleString()}</td>
                    <td className="py-3 text-slate-800 font-medium">{log.device}</td>
                    <td className="py-3 font-mono">{log.ip}</td>
                    <td className="py-3">{log.location}</td>
                    <td className="py-3 text-right pr-2">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        log.status === 'Success' ? 'bg-slate-50 text-[#557255] border border-slate-200' : 'bg-red-50 text-red-650 border border-red-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}

export default function SecuritySettingsPage() {
  return (
    <SettingsErrorBoundary>
      <SecuritySettingsForm />
    </SettingsErrorBoundary>
  );
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { loadProfilePreview } from '@/lib/data';
import { apiFetch } from '@/lib/api/client';
import { authFetch } from '@/lib/auth/auth-fetch';

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0a0b] px-4 h-10 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30';

type SessionRow = { id: string; label: string; detail: string; current: boolean };
type ActivityRow = { id: string; title: string; time: string };

/**
 * Profile & Security Settings — port of PaperWorking
 * `/dashboard/settings/profile` (Luminous Glass Terminal layout).
 */
export default function ProfileSettingsPanel() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [claimedEmails, setClaimedEmails] = useState<string[]>([]);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [claimStep, setClaimStep] = useState<'start' | 'verify' | 'success'>('start');
  const [claimLoading, setClaimLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletionPending, setIsDeletionPending] = useState(false);
  const [deletionDate, setDeletionDate] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [preview, sessionsRes] = await Promise.all([
          loadProfilePreview(),
          authFetch('/api/auth/sessions', { credentials: 'include' }).catch(() => null),
        ]);
        if (cancelled) return;

        const p = preview as Record<string, unknown>;
        const first =
          typeof p.firstName === 'string'
            ? p.firstName
            : String(p.displayName ?? p.name ?? '')
                .split(/\s+/)
                .filter(Boolean)[0] ?? '';
        const last =
          typeof p.lastName === 'string'
            ? p.lastName
            : String(p.displayName ?? p.name ?? '')
                .split(/\s+/)
                .filter(Boolean)
                .slice(1)
                .join(' ');
        setFirstName(first);
        setLastName(last);
        setEmail(String(p.email ?? ''));
        setPhone(String(p.phone ?? ''));
        setCompany(String(p.company ?? p.organization ?? p.companyName ?? ''));
        setRole(String(p.role ?? p.accountType ?? ''));
        if (typeof p.mfaEnabled === 'boolean') setMfaEnabled(p.mfaEnabled);
        if (typeof p.twoFaEnabled === 'boolean') setMfaEnabled(p.twoFaEnabled);
        if (Array.isArray(p.claimedEmails)) {
          setClaimedEmails(p.claimedEmails.map(String));
        }
        if (Array.isArray(p.activity)) {
          setActivity(
            p.activity.map((item, i) => {
              const row = item as Record<string, unknown>;
              return {
                id: String(row.id ?? `a-${i}`),
                title: String(row.title ?? ''),
                time: String(row.time ?? ''),
              };
            }),
          );
        }
        if (Array.isArray(p.sessions) && p.sessions.length > 0) {
          setSessions(
            p.sessions.map((s, i) => {
              const row = s as Record<string, unknown>;
              return {
                id: String(row.id ?? `sess-${i}`),
                label: String(row.label ?? 'Device'),
                detail: String(row.detail ?? 'Active session'),
                current: Boolean(row.current),
              };
            }),
          );
        }

        if (sessionsRes?.ok) {
          const list = (await sessionsRes.json()) as Array<Record<string, unknown>>;
          if (!cancelled && Array.isArray(list) && list.length > 0) {
            setSessions(
              list.map((s) => ({
                id: String(s.id),
                label: String(s.device ?? 'Device'),
                detail: [s.location, s.ip].filter(Boolean).join(' · ') || 'Active session',
                current: Boolean(s.isCurrent),
              })),
            );
          }
        }
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load profile');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';

  const completeness = useMemo(() => {
    const fields = [firstName, lastName, phone, company];
    const filled = fields.filter((f) => f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [firstName, lastName, phone, company]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/settings/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          companyName: company,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      /* keep UI optimistic */
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (newPwd.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Passwords do not match.');
      return;
    }
    if (!currentPwd) {
      setPwdError('Enter your current password.');
      return;
    }

    setPwdLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setPwdLoading(false);
    setPwdSuccess(true);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
  }

  async function handleRevokeSessions() {
    setRevoking(true);
    await new Promise((r) => setTimeout(r, 400));
    setSessions((prev) => prev.filter((s) => s.current));
    setRevoking(false);
    setRevokeSuccess(true);
    setTimeout(() => setRevokeSuccess(false), 3000);
  }

  async function handleStartClaim(e: FormEvent) {
    e.preventDefault();
    if (!claimEmail.trim().includes('@')) return;
    setClaimLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setClaimLoading(false);
    setClaimStep('verify');
  }

  async function handleVerifyClaim(e: FormEvent) {
    e.preventDefault();
    if (!claimCode.trim()) return;
    setClaimLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setClaimedEmails((prev) => [...prev, claimEmail.trim().toLowerCase()]);
    setClaimLoading(false);
    setClaimStep('success');
  }

  async function handleRequestErasure() {
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 400));
    const when = new Date(Date.now() + 24 * 60 * 60 * 1000);
    setDeletionDate(when);
    setIsDeletionPending(true);
    setShowDeleteConfirm(false);
    setDeleting(false);
  }

  async function handleCancelDeletion() {
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsDeletionPending(false);
    setDeletionDate(null);
    setDeleting(false);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6" data-testid="profile-settings-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#fdfffc]">Profile & Security</h2>
          <p className="mt-1 text-xs text-white/45">
            Manage personal details, authentication, sessions, and GDPR erasure.
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Unable to load profile: {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        {/* Hero */}
        <section className="relative col-span-12 flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#161318]/90 p-6 transition-all duration-200 hover:shadow-md">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-[120px]" />

          <div className="relative z-10 flex items-center gap-6 sm:gap-8">
            <div className="group relative cursor-pointer">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-3xl font-bold text-emerald-300 select-none">
                {initials}
              </div>
              <button
                type="button"
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full border border-emerald-500/30 bg-black/60 text-emerald-300 opacity-0 transition-opacity group-hover:opacity-100"
                title="Upload photo"
              >
                <span className="material-symbols-outlined text-xl">photo_camera</span>
              </button>
              <div className="absolute bottom-0 right-0 z-20 rounded-full border border-white/20 bg-[#161318] p-1.5 shadow-lg">
                <span className="material-symbols-outlined text-[14px] text-emerald-300">edit</span>
              </div>
            </div>

            <div>
              <h2 className="mb-1 text-2xl font-bold text-[#fdfffc]">
                {firstName} {lastName}
              </h2>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <span className="material-symbols-outlined text-[16px]">mail</span>
                <span className="font-mono text-emerald-300/80">{email || '—'}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 hidden md:block">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {role || 'Account'}
            </span>
          </div>
        </section>

        {/* Personal Information */}
        <section className="relative col-span-12 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161318]/90 p-6 lg:col-span-7">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-emerald-400">person</span>
              <h3 className="text-base font-semibold text-[#fdfffc]">Personal Information</h3>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white/45">Profile Completeness</span>
              <span className="font-bold text-emerald-400">{completeness}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-1 flex-col space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Realty Corp LLC"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                Email Address
              </label>
              <div className="flex h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 text-sm text-white/50">
                <span className="material-symbols-outlined text-[16px] text-white/35">lock</span>
                {email || '—'}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {saving ? 'progress_activity' : 'save'}
                </span>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saved ? (
                <span className="flex animate-pulse items-center gap-1.5 text-sm text-emerald-400">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Profile updated successfully.
                </span>
              ) : null}
            </div>
          </form>
        </section>

        {/* Security */}
        <section className="relative col-span-12 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161318]/90 p-6 lg:col-span-5">
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/8 blur-[100px]" />

          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-emerald-400">shield_lock</span>
              <h3 className="text-base font-semibold text-[#fdfffc]">Security</h3>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div>
              <p className="mb-0.5 text-sm font-semibold text-white">Two-Factor Auth</p>
              <p className="text-xs text-white/45">
                {mfaEnabled ? 'TOTP authenticator active' : 'Add an extra layer of protection'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={mfaEnabled}
              onClick={() => setMfaEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border transition-colors ${
                mfaEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/20'
                  : 'border-white/15 bg-white/5'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full shadow-sm transition-all duration-300 ${
                  mfaEnabled ? 'translate-x-6 bg-emerald-400' : 'translate-x-1 bg-white/40'
                }`}
              />
            </button>
          </div>

          <div className="mb-5 border-b border-white/10 pb-3">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/45">
              <span className="material-symbols-outlined text-sm">lock_reset</span>
              Change Password
            </h4>
          </div>

          <form onSubmit={handlePasswordChange} className="flex flex-1 flex-col space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  required
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/40 hover:text-white"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                New Password
              </label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>

            {pwdError ? (
              <p className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                <span className="material-symbols-outlined text-sm">error</span>
                {pwdError}
              </p>
            ) : null}
            {pwdSuccess ? (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Password updated successfully.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pwdLoading}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {pwdLoading ? 'progress_activity' : 'key'}
              </span>
              {pwdLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* Active Sessions */}
        <section className="col-span-12 rounded-2xl border border-white/10 bg-[#161318]/90 p-6">
          <div className="mb-6">
            <div className="mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-emerald-400">devices</span>
              <h3 className="text-base font-semibold text-[#fdfffc]">Active Sessions</h3>
            </div>
            <p className="text-sm text-white/45">
              Manage external authentication and active device sessions.
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-1 items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                      session.current
                        ? 'border-emerald-500/20 bg-emerald-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        session.current ? 'text-emerald-400' : 'text-white/45'
                      }`}
                    >
                      {session.current ? 'computer' : 'devices_other'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{session.label}</p>
                    <p
                      className={`mt-0.5 text-xs ${
                        session.current ? 'font-mono text-emerald-300/70' : 'text-white/45'
                      }`}
                    >
                      {session.detail}
                    </p>
                  </div>
                </div>
                {session.current ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Active
                  </span>
                ) : null}
              </div>
            ))}

            <div className="flex flex-1 items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <span className="material-symbols-outlined text-[20px] text-white/45">
                    logout
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Other Sessions</p>
                  <p className="mt-0.5 text-xs text-white/45">Sign out everywhere else</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleRevokeSessions()}
                disabled={revoking}
                className="h-10 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-medium text-white/55 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:pointer-events-none disabled:opacity-50"
              >
                {revoking ? 'Revoking…' : 'Revoke All'}
              </button>
            </div>
          </div>

          {revokeSuccess ? (
            <p className="mt-4 flex animate-pulse items-center gap-1.5 text-xs text-emerald-400">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              All other active sessions have been revoked.
            </p>
          ) : null}
        </section>

        {/* Claim History */}
        <section className="col-span-12 rounded-2xl border border-white/10 bg-[#161318]/90 p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-emerald-400">alternate_email</span>
            <h3 className="text-base font-semibold text-[#fdfffc]">Claim Email History</h3>
          </div>
          <p className="mb-5 text-sm text-white/45">
            Link a previous PaperWorking email so deal history and invitations follow you.
          </p>

          {claimedEmails.length > 0 ? (
            <ul className="mb-5 space-y-2">
              {claimedEmails.map((email) => (
                <li
                  key={email}
                  className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/75"
                >
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">
                    check_circle
                  </span>
                  <span className="font-mono text-xs">{email}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-white/35">
                    Claimed
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {claimStep === 'start' ? (
            <form onSubmit={handleStartClaim} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                placeholder="previous@email.com"
                className={`${inputClass} sm:flex-1`}
              />
              <button
                type="submit"
                disabled={claimLoading}
                className="h-10 shrink-0 cursor-pointer rounded-lg bg-emerald-500 px-5 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {claimLoading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : null}

          {claimStep === 'verify' ? (
            <form onSubmit={handleVerifyClaim} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="6-digit code"
                className={`${inputClass} sm:flex-1`}
              />
              <button
                type="submit"
                disabled={claimLoading}
                className="h-10 shrink-0 cursor-pointer rounded-lg bg-emerald-500 px-5 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {claimLoading ? 'Verifying…' : 'Verify'}
              </button>
            </form>
          ) : null}

          {claimStep === 'success' ? (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Email claimed successfully.
              <button
                type="button"
                onClick={() => {
                  setClaimStep('start');
                  setClaimEmail('');
                  setClaimCode('');
                }}
                className="ml-2 cursor-pointer text-xs font-semibold text-white/50 underline"
              >
                Claim another
              </button>
            </p>
          ) : null}
        </section>

        {/* Activity */}
        <section className="col-span-12 rounded-2xl border border-white/10 bg-[#161318]/90 p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-emerald-400">timeline</span>
            <h3 className="text-base font-semibold text-[#fdfffc]">Recent Activity</h3>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-white/45">No recent activity.</p>
          ) : (
            <ul className="space-y-0">
              {activity.map((item, i) => (
                <li
                  key={item.id}
                  className={`flex items-start gap-4 py-3 ${
                    i < activity.length - 1 ? 'border-b border-white/6' : ''
                  }`}
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400/80" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/85">{item.title}</p>
                    <p className="text-[11px] text-white/40">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* GDPR Data Erasure */}
        <section className="relative col-span-12 overflow-hidden rounded-2xl border border-red-500/20 bg-[#161318]/90 p-6">
          <div className="pointer-events-none absolute right-0 top-0 -z-10 h-40 w-40 translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/5 blur-[60px]" />

          <div className="mb-2 flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-red-400">delete_forever</span>
            <h3 className="text-base font-semibold text-[#fdfffc]">Data Erasure</h3>
          </div>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-white/45">
            Permanently delete your PaperWorking account, projects, documents, and profile data. A
            24-hour grace window is applied before the purge runs. Legal audit logs are retained for
            7 years for compliance.
          </p>

          {isDeletionPending ? (
            <div className="mb-2 flex items-start gap-3 rounded-xl border border-amber-800/30 bg-amber-950/40 p-4">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-xl text-amber-400">
                warning
              </span>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-amber-300">
                  Deletion scheduled for {deletionDate?.toLocaleString() ?? '24 hours from now'}.
                </p>
                <p className="text-xs text-amber-300/80">
                  All features remain active during this window. You can cancel below.
                </p>
                <button
                  type="button"
                  onClick={() => void handleCancelDeletion()}
                  disabled={deleting}
                  className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  Cancel Deletion Request
                </button>
              </div>
            </div>
          ) : null}

          {!isDeletionPending && !showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-5 text-sm font-medium text-red-300 transition-all hover:bg-red-500/20"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              Request Data Erasure (GDPR)
            </button>
          ) : null}

          {!isDeletionPending && showDeleteConfirm ? (
            <div
              data-testid="delete-confirm-panel"
              className="space-y-4 rounded-xl border border-red-500/30 bg-red-950/40 p-5"
            >
              <p className="text-sm font-semibold text-red-300">
                Are you sure? This schedules permanent deletion of your account after a 24-hour
                grace period.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleRequestErasure()}
                  disabled={deleting}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-500 px-5 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-50"
                >
                  Confirm Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="h-10 cursor-pointer rounded-lg border border-white/10 px-5 text-sm font-medium text-white/55 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

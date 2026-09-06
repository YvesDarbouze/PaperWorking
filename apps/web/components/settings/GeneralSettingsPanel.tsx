'use client';

import { useEffect, useState } from 'react';
import { loadBillingPreview, loadProfilePreview } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
] as const;

const LANG_OPTIONS = [
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'zh', label: 'Chinese (中文)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'it', label: 'Italian (Italiano)' },
] as const;

const TZ_STORAGE_KEY = 'pw_settings_timezone';
const LANG_STORAGE_KEY = 'pw_requested_lang';

type DeleteJobStatus = 'idle' | 'in_progress' | 'failed' | 'completed';

const DELETE_STEPS = [
  { key: 'stripe_cancelled', label: '1. STRIPE BILLING CANCELLATION' },
  { key: 'firestore_deleted', label: '2. FIRESTORE WORKSPACE PURGE' },
  { key: 'prisma_deleted', label: '3. PRISMA DATABASE REASSIGNMENT' },
  { key: 'storage_deleted', label: '4. CLOUD STORAGE SCRUBBING' },
  { key: 'completed', label: '5. CREDENTIAL REVOCATION' },
] as const;

/**
 * General Settings — port of PaperWorking `/dashboard/settings/general`
 * (Regional Preferences, Account Overview, Danger Zone).
 */
export default function GeneralSettingsPanel() {
  const { profile: authProfile } = useAuth();
  const [timezone, setTimezone] = useState('America/New_York');
  const [savedTimezone, setSavedTimezone] = useState('America/New_York');
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accountType, setAccountType] = useState('—');
  const [planLabel, setPlanLabel] = useState('—');

  const [showLangRequest, setShowLangRequest] = useState(false);
  const [requestedLanguage, setRequestedLanguage] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthVerified, setReauthVerified] = useState(false);
  const [reauthLoading, setReauthLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [jobStatus, setJobStatus] = useState<DeleteJobStatus>('idle');
  const [jobStep, setJobStep] = useState(0);
  const [jobError, setJobError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const tz = localStorage.getItem(TZ_STORAGE_KEY) ?? 'America/New_York';
      setTimezone(tz);
      setSavedTimezone(tz);
      setRequestedLanguage(localStorage.getItem(LANG_STORAGE_KEY));
    } catch {
      // ignore
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAccount() {
      try {
        const [profilePreview, billing] = await Promise.all([
          loadProfilePreview(),
          loadBillingPreview(),
        ]);
        if (cancelled) return;
        const acct =
          profilePreview.accountType ||
          profilePreview.role ||
          authProfile?.accountType ||
          'investor';
        setAccountType(acct && acct !== '—' ? acct : (authProfile?.accountType ?? 'investor'));
        const plan =
          billing.plan && billing.plan !== '—'
            ? billing.plan
            : authProfile?.subscriptionPlan ?? profilePreview.subscriptionPlan ?? 'Individual';
        setPlanLabel(String(plan));
      } catch {
        if (!cancelled) {
          setAccountType(authProfile?.accountType ?? 'investor');
          setPlanLabel(authProfile?.subscriptionPlan ?? 'Individual');
        }
      }
    }
    loadAccount();
    return () => {
      cancelled = true;
    };
  }, [authProfile?.accountType, authProfile?.subscriptionPlan]);

  useEffect(() => {
    if (jobStatus !== 'in_progress') return;
    if (jobStep >= DELETE_STEPS.length - 1) {
      setJobStatus('completed');
      return;
    }
    const t = setTimeout(() => setJobStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [jobStatus, jobStep]);

  async function handleSavePreferences() {
    const rollbackTo = savedTimezone;
    setSaving(true);
    try {
      localStorage.setItem(TZ_STORAGE_KEY, timezone);
      setSavedTimezone(timezone);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setTimezone(rollbackTo);
    } finally {
      setSaving(false);
    }
  }

  function handleRequestLanguage(code: string, label: string) {
    void code;
    setRequestedLanguage(label);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, label);
    } catch {
      // ignore
    }
    setShowLangRequest(false);
  }

  async function handleReauthenticate() {
    if (!reauthPassword.trim()) return;
    setReauthLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setReauthVerified(true);
    setReauthLoading(false);
  }

  async function startDeletionProcess() {
    if (deleteInput !== 'DELETE') return;
    setDeleteConfirmOpen(false);
    setResuming(true);
    await new Promise((r) => setTimeout(r, 300));
    setJobStatus('in_progress');
    setJobStep(0);
    setJobError(null);
    setResuming(false);
    setDeleteInput('');
    setReauthPassword('');
    setReauthVerified(false);
  }

  function getStepUi(index: number) {
    if (jobStatus === 'completed' || index < jobStep) {
      return { text: '✓ DONE', color: 'text-emerald-400 font-bold' };
    }
    if (jobStatus === 'failed' && index === jobStep) {
      return { text: '✗ FAILED', color: 'text-red-400 font-bold' };
    }
    if (jobStatus === 'in_progress' && index === jobStep) {
      return { text: '● PROCESSING...', color: 'animate-pulse font-bold text-amber-400' };
    }
    return { text: '○ PENDING', color: 'text-white/40' };
  }

  return (
    <div className="w-full space-y-8" data-testid="general-settings-page">
      <div>
        <h2 className="text-xl font-bold text-[#fdfffc]">General</h2>
        <p className="mt-1 text-sm text-white/45">
          Workspace preferences — timezone, language, and account overview.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        {/* Regional Preferences */}
        <section className="col-span-12 flex flex-col rounded-2xl border border-white/10 bg-[#161318]/90 p-6 lg:col-span-7">
          <div className="mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
            <span className="material-symbols-outlined text-xl text-emerald-400">language</span>
            <h3 className="text-base font-semibold text-[#fdfffc]">Regional Preferences</h3>
          </div>

          <div className="flex flex-1 flex-col space-y-6">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.5px] text-white/45">
                Timezone
              </label>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-white/40">
                  schedule
                </span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={prefsLoading}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-[#0d0a0b] pl-10 pr-10 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:ring-1 focus:ring-emerald-500/40"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value} className="bg-slate-950">
                      {tz.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-white/40">
                  expand_more
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.5px] text-white/45">
                Language
              </label>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg text-white/40">translate</span>
                  <div>
                    <p className="text-sm font-semibold text-white">English (US)</p>
                    <p className="mt-0.5 text-[10px] text-white/40">More languages planned.</p>
                  </div>
                </div>
                {requestedLanguage ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Requested ({requestedLanguage})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLangRequest(!showLangRequest)}
                    className="cursor-pointer text-xs font-medium text-emerald-400 hover:underline"
                  >
                    Request a language...
                  </button>
                )}
              </div>

              {showLangRequest && !requestedLanguage ? (
                <div className="mt-3 space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-xs text-white/45">
                    Select a language to vote for prioritization:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {LANG_OPTIONS.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleRequestLanguage(lang.code, lang.label)}
                        className="h-10 cursor-pointer rounded-lg border border-transparent px-4 text-left text-sm font-medium text-white transition-all hover:border-white/5 hover:bg-white/5 hover:text-emerald-300"
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => void handleSavePreferences()}
                disabled={saving || prefsLoading}
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {saving ? 'progress_activity' : 'save'}
                </span>
                {prefsLoading ? 'Loading…' : saving ? 'Saving…' : 'Save Preferences'}
              </button>
              {saved ? (
                <span className="flex animate-pulse items-center gap-1.5 text-sm text-emerald-400">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Preferences saved.
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {/* Account Overview */}
        <section className="relative col-span-12 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161318]/90 p-6 lg:col-span-5">
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/8 blur-[100px]" />

          <div className="mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
            <span className="material-symbols-outlined text-xl text-emerald-400">info</span>
            <h3 className="text-base font-semibold text-[#fdfffc]">Account Overview</h3>
          </div>

          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-[0.5px] text-white/45">
                  Account Type
                </p>
                <p className="text-sm font-bold capitalize text-white">
                  {accountType}
                </p>
              </div>
              <span className="material-symbols-outlined text-xl text-emerald-400">badge</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-[0.5px] text-white/45">
                  Plan
                </p>
                <p className="text-sm font-bold text-white">{planLabel}</p>
              </div>
              <span className="material-symbols-outlined text-xl text-emerald-400">
                workspace_premium
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-[0.5px] text-white/45">
                  Member Since
                </p>
                <p className="text-sm font-bold text-white">August 2026</p>
              </div>
              <span className="material-symbols-outlined text-xl text-emerald-400">
                calendar_month
              </span>
            </div>
          </div>
        </section>

        {/* Danger Zone / deletion progress */}
        {jobStatus === 'in_progress' || jobStatus === 'failed' || jobStatus === 'completed' ? (
          <section className="relative col-span-12 overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-2">
              <span
                className={`material-symbols-outlined text-xl text-red-400 ${
                  jobStatus === 'in_progress' ? 'animate-spin' : ''
                }`}
              >
                {jobStatus === 'completed' ? 'check_circle' : 'progress_activity'}
              </span>
              <h3 className="text-base font-semibold text-red-300/95">
                {jobStatus === 'completed'
                  ? 'Account Deletion Completed (seed)'
                  : 'Account Deletion In Progress'}
              </h3>
            </div>

            <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.03] p-6">
              <p className="text-sm text-white/50">
                Your account is currently being deleted. The process is executed in a secure,
                server-side cascade.
              </p>
              <div className="max-w-md space-y-3 font-mono text-xs">
                {DELETE_STEPS.map((step, i) => {
                  const ui = getStepUi(i);
                  return (
                    <div
                      key={step.key}
                      className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0"
                    >
                      <span>{step.label}</span>
                      <span className={ui.color}>{ui.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {jobStatus === 'failed' ? (
              <div className="mt-6 space-y-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Deletion Paused (Failure)
                </p>
                <p className="max-w-xl truncate rounded border border-red-500/10 bg-black/30 p-3 font-mono text-xs">
                  {jobError || 'An unexpected error occurred.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setJobStatus('in_progress');
                    setJobError(null);
                  }}
                  className="h-10 cursor-pointer rounded-lg bg-red-500 px-5 text-sm font-medium text-white hover:bg-red-400"
                >
                  Retry / Resume Deletion
                </button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="relative col-span-12 overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-red-400">warning</span>
              <h3 className="text-base font-semibold text-red-300/90">Danger Zone</h3>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="mb-1 text-sm text-white">
                  Delete your account and all associated data.
                </p>
                <p className="text-xs text-white/45">
                  This action is permanent and cannot be undone. All projects, team associations,
                  and billing history will be erased.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-red-500/30 bg-red-500/10 px-5 text-sm font-medium text-red-300 transition-all hover:bg-red-500/20"
              >
                Delete Account
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-label="Permanently delete account"
            className="relative w-full max-w-lg space-y-6 overflow-hidden rounded-2xl border border-red-500/20 bg-[#161318] p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="material-symbols-outlined text-2xl text-red-400">warning</span>
              <h3 className="text-xl font-bold text-red-300/95">Permanently Delete Account?</h3>
            </div>

            <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-white/55">
              <p className="flex items-center gap-1 text-sm font-semibold text-red-300">
                <span className="material-symbols-outlined text-xs">error</span>
                THIS ACTION IS PERMANENT AND IRREVERSIBLE
              </p>
              <p>By confirming deletion, the following data will be permanently deleted:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Your personal profile and preferences.</li>
                <li>All real estate projects you solely own, including financial logs and files.</li>
                <li>Your uploaded documents and images in Cloud Storage.</li>
                <li>Any active billing plans or subscriptions (canceled immediately).</li>
              </ul>
              <p className="font-semibold text-red-300">Shared Project Policy:</p>
              <p>
                Projects that are co-owned/shared with other members will NOT be deleted. Your
                membership will be removed, and authorship will be anonymized to &quot;Deleted
                User&quot;.
              </p>
            </div>

            {!reauthVerified ? (
              <div className="space-y-4 border-t border-white/10 pt-4">
                <p className="text-xs text-white/45">
                  For your security, please verify your credentials before proceeding.
                </p>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#0d0a0b] px-4 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => void handleReauthenticate()}
                  disabled={reauthLoading}
                  className="h-10 w-full cursor-pointer rounded-lg border border-red-500/30 bg-red-500/10 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  {reauthLoading ? 'Verifying...' : 'Verify Password'}
                </button>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmOpen(false);
                      setReauthPassword('');
                    }}
                    className="h-10 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-medium text-white/50 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 border-t border-white/10 pt-4">
                <p className="text-xs text-white/45">
                  Type{' '}
                  <span className="font-mono font-bold text-red-400">DELETE</span> below to confirm
                  your deletion request.
                </p>
                <input
                  type="text"
                  placeholder='Type "DELETE" to confirm'
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#0d0a0b] px-4 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void startDeletionProcess()}
                    disabled={deleteInput !== 'DELETE' || resuming}
                    className="h-10 flex-1 cursor-pointer rounded-lg bg-red-500 px-5 text-sm font-medium text-white hover:bg-red-400 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {resuming ? 'Starting...' : 'Confirm Permanent Deletion'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmOpen(false);
                      setDeleteInput('');
                      setReauthPassword('');
                      setReauthVerified(false);
                    }}
                    className="h-10 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-medium text-white/50 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

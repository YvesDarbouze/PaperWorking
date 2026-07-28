'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';
import {
  getAuth,
  EmailAuthProvider,
  GoogleAuthProvider,
  FacebookAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import { settingsTokens, panelStyle, inputStyle } from '@/components/settings/settingsTheme';

/* General settings — workspace preferences desk */

function AppearanceThemePicker() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const t = settingsTokens(isDark);
  const storeTheme = useSettingsStore((s) => s.theme);
  const setStoreTheme = useSettingsStore((s) => s.setTheme);

  const options: { id: ThemePreference; label: string; icon: string }[] = [
    { id: 'light', label: 'Light', icon: 'light_mode' },
    { id: 'dark', label: 'Dark', icon: 'dark_mode' },
    { id: 'system', label: 'System', icon: 'contrast' },
  ];

  const active = storeTheme === 'system' ? 'system' : theme;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = active === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setStoreTheme(opt.id);
              if (opt.id === 'light' || opt.id === 'dark') {
                setTheme(opt.id);
              } else if (typeof window !== 'undefined') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setTheme(prefersDark ? 'dark' : 'light');
              }
            }}
            className="pw-interactive-custom inline-flex items-center gap-2 text-sm font-semibold transition-opacity"
            style={{
              background: selected ? t.accentMuted : t.surfaceMuted,
              border: `1px solid ${selected ? t.accent : t.border}`,
              color: selected ? t.heading : t.muted,
              borderRadius: 2,
              padding: '8px 14px',
            }}
            aria-pressed={selected}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {opt.icon}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern Time (ET)' },
  { value: 'America/Chicago',     label: 'Central Time (CT)' },
  { value: 'America/Denver',      label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage',   label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii Time (HT)' },
  { value: 'Europe/London',       label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris',        label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo',          label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney',    label: 'Australian Eastern Time (AET)' },
] as const;

interface ConnectedService {
  id: string;
  name: string;
  iconName: string;
  /** true = always on (platform service, no user OAuth needed) */
  platform?: boolean;
  connected: boolean;
  description: string;
  /** Set by status API; shown below the description */
  detail?: string;
}

const BASE_SERVICES: ConnectedService[] = [
  {
    id: 'firebase',
    name: 'Firebase',
    iconName: 'cloud_done',
    platform: true,
    connected: true,
    description: 'Authentication, Firestore database, and cloud storage.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    iconName: 'payments',
    platform: true,
    connected: true,
    description: 'Subscription billing and payment processing.',
  },
  {
    id: 'mls',
    name: 'MLS Data Feed',
    iconName: 'apartment',
    connected: false,
    description: 'Real-time property listings and market comps.',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    iconName: 'folder_open',
    connected: false,
    description: 'Document storage and file sharing integration.',
  },
];

export default function GeneralSettingsPage() {
  const { profile, user, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = settingsTokens(isDark);
  const panel = panelStyle(t);
  const field = inputStyle(t);

  // ─── Deletion Cockpit State ────────────────────────────
  const [activeJob, setActiveJob] = useState<{ status: string; step?: string; error?: string } | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthVerified, setReauthVerified] = useState(false);
  const [reauthLoading, setReauthLoading] = useState(false);

  const checkJobStatus = useCallback(async () => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/account/data/delete', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          setActiveJob(data.job);
        } else {
          setActiveJob(null);
        }
      }
    } catch (err) {
      console.warn('[GDPR Delete] Failed checking job status:', err);
    } finally {
      setLoadingJob(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkJobStatus();
  }, [checkJobStatus]);

  useEffect(() => {
    if (activeJob && activeJob.status === 'in_progress') {
      const interval = setInterval(() => {
        checkJobStatus();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeJob, checkJobStatus]);

  useEffect(() => {
    if (user) {
      const isDemo = user.uid === 'demo_user' || user.email === 'demo@paperworking.co' || (typeof document !== 'undefined' && document.cookie.includes('mock_session_token_123'));
      if (isDemo) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReauthVerified(true);
      }
    }
  }, [user]);

  useEffect(() => {
    if (activeJob && activeJob.status === 'completed') {
      toast.success('Account successfully deleted.', { duration: 5000 });
      logout().catch(() => {}).finally(() => {
        window.location.href = '/login';
      });
    }
  }, [activeJob, logout]);

  const getAuthProviderId = () => {
    if (!user) return 'password';
    const provider = user.providerData[0]?.providerId;
    return provider || 'password';
  };

  const handleReauthenticate = async () => {
    if (!user) return;
    setReauthLoading(true);
    try {
      const providerId = getAuthProviderId();
      if (providerId === 'password') {
        if (!reauthPassword) {
          toast.error('Please enter your password.');
          setReauthLoading(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email!, reauthPassword);
        await reauthenticateWithCredential(user, credential);
      } else if (providerId === 'google.com') {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else if (providerId === 'facebook.com') {
        const provider = new FacebookAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else {
        console.warn('Reauthentication not supported for provider:', providerId);
      }
      setReauthVerified(true);
      toast.success('Re-authentication successful.');
    } catch (err) {
      console.error('[GDPR Delete] Re-auth failed:', err);
      toast.error(err instanceof Error ? err.message : 'Re-authentication failed. Please try again.');
    } finally {
      setReauthLoading(false);
    }
  };

  const startDeletionProcess = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleteConfirmOpen(false);
    setResuming(true);
    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/account/data/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success('Deletion process started.');
        checkJobStatus();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to start account deletion.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setResuming(false);
    }
  };

  const handleResumeDeletion = async () => {
    setResuming(true);
    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/account/data/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success('Deletion resumed.');
        checkJobStatus();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to resume deletion.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setResuming(false);
    }
  };

  // ─── Regional preferences ──────────────────────────────
  // `timezone`      — current input value (may differ from what's saved)
  // `savedTimezone` — last value confirmed written to Firestore (rollback target)
  const [timezone, setTimezone]           = useState('America/New_York');
  const [savedTimezone, setSavedTimezone] = useState('America/New_York');
  const [prefsLoading, setPrefsLoading]   = useState(true);

  const [showLangRequest, setShowLangRequest] = useState(false);
  const [requestedLanguage, setRequestedLanguage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pw_requested_lang');
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRequestedLanguage(saved);
      }
    }
  }, []);

  const handleRequestLanguage = async (code: string, label: string) => {
    try {
      const { default: posthog } = await import('posthog-js');
      posthog.capture('language_request_submitted', {
        requestedLocale: code,
        requestedLanguageLabel: label,
      });
    } catch (err) {
      console.warn('[Telemetry] PostHog capture failed:', err);
    }
    
    setRequestedLanguage(label);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pw_requested_lang', label);
    }
    toast.success(`Request for ${label} submitted. Thank you!`);
    setShowLangRequest(false);
  };

  // Load preferences from users/{uid} on mount — survives refresh & device change
  useEffect(() => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrefsLoading(false);
      return;
    }
    getDoc(doc(db, 'users', currentUser.uid))
      .then((snap) => {
        if (snap.exists()) {
          const tz = snap.data().timezone ?? 'America/New_York';
          setTimezone(tz);
          setSavedTimezone(tz);
        }
      })
      .catch((err) => console.warn('[settings/prefs] load error:', err))
      .finally(() => setPrefsLoading(false));
  }, []); // run once on mount; getAuth().currentUser is stable

  // ─── Connected Services ────────────────────────────────
  const [services, setServices] = useState<ConnectedService[]>(BASE_SERVICES);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Load real connection status from Firestore on mount
  const loadStatus = useCallback(async () => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch('/api/integrations/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as {
        google_drive: { connected: boolean; email: string | null };
        mls:          { connected: boolean; provider: string | null };
      };
      setServices((prev) =>
        prev.map((s) => {
          if (s.id === 'google-drive') {
            return {
              ...s,
              connected: data.google_drive.connected,
              detail:    data.google_drive.email ?? undefined,
            };
          }
          if (s.id === 'mls') {
            return { ...s, connected: data.mls.connected };
          }
          return s;
        })
      );
    } catch (err) {
      console.warn('[settings/general] status load error:', err);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadStatus(); }, [loadStatus]);

  // ─── Danger Zone ───────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // ─── Save Preferences ──────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleSavePreferences = async () => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      toast.error('Not signed in.');
      return;
    }

    // Capture rollback target before the write
    const rollbackTo = savedTimezone;
    setSaving(true);

    try {
      // Merge into users/{uid} — creates the doc if it doesn't exist yet
      await setDoc(
        doc(db, 'users', currentUser.uid),
        { timezone, updatedAt: serverTimestamp() },
        { merge: true }
      );
      // Write confirmed — update the rollback anchor
      setSavedTimezone(timezone);
      setSaved(true);
      toast.success('Preferences saved.', {
        icon: '✓',
        style: { background: '#0d0d0d', color: '#fff' },
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      // Roll back to last confirmed value so the UI reflects reality
      setTimezone(rollbackTo);
      const errorMessage = err instanceof Error ? err.message : 'write failed';
      toast.error(`Preferences not saved: ${errorMessage}`, {
        style: { background: '#0d0d0d', color: '#fff' },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async (serviceId: string) => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) { toast.error('Not signed in.'); return; }

    setConnectingId(serviceId);
    try {
      const token = await currentUser.getIdToken();

      if (serviceId === 'google-drive') {
        // 1. Get the OAuth URL from the server (token-authed)
        const authRes = await fetch('/api/integrations/google-drive/authorize', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!authRes.ok) {
          const body = await authRes.json().catch(() => ({}));
          throw new Error(body.error ?? `Server error ${authRes.status}`);
        }
        const { authUrl } = await authRes.json() as { authUrl: string };

        // 2. Open consent popup and wait for the callback page to post a message
        await new Promise<void>((resolve, reject) => {
          const popup = window.open(authUrl, 'google-drive-oauth', 'width=520,height=640,left=200,top=100');
          if (!popup) {
            reject(new Error('Popup blocked. Please allow popups for this site and try again.'));
            return;
          }
          const handler = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const msg = event.data as { type?: string; success?: boolean; error?: string };
            if (msg?.type !== 'google-drive-connected') return;
            window.removeEventListener('message', handler);
            if (msg.success) resolve();
            else reject(new Error(msg.error ?? 'Connection failed'));
          };
          window.addEventListener('message', handler);
          // Fallback: close listener if popup closes without posting
          const poll = setInterval(() => {
            if (popup.closed) {
              clearInterval(poll);
              window.removeEventListener('message', handler);
              reject(new Error('Popup closed before completing authorization.'));
            }
          }, 500);
        });

      } else if (serviceId === 'mls') {
        const res = await fetch('/api/integrations/mls/connect', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? body.error ?? `Server error ${res.status}`);
        }
      } else {
        throw new Error(`No connect handler for service: ${serviceId}`);
      }

      // Reload statuses from Firestore after successful connect
      await loadStatus();
      toast.success('Service connected successfully.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed.';
      toast.error(errorMessage, {
        style: { background: '#0d0d0d', color: '#fff' },
      });
    } finally {
      setConnectingId(null);
    }
  };


  return (
    <div className="w-full space-y-6" style={{ color: t.body }}>
      <header className="pb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <p className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1" style={{ color: t.accent }}>
          Workspace
        </p>
        <h2 className="text-[1.35rem] font-semibold tracking-tight" style={{ color: t.heading }}>
          General
        </h2>
        <p className="text-sm mt-1.5 leading-relaxed max-w-xl" style={{ color: t.muted }}>
          Theme, regional defaults, integrations, and account controls.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-5">

        <section className="col-span-12 p-5 sm:p-6 flex flex-col" style={panel}>
          <div className="flex items-center gap-2 pb-4 mb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>palette</span>
            <h4 className="text-base font-semibold" style={{ color: t.heading }}>Appearance</h4>
          </div>
          <AppearanceThemePicker />
        </section>

        <section className="col-span-12 lg:col-span-7 p-5 sm:p-6 flex flex-col" style={panel}>
          <div className="flex items-center gap-2 pb-4 mb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>language</span>
            <h4 className="text-base font-semibold" style={{ color: t.heading }}>Regional preferences</h4>
          </div>

          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: t.muted }}>
                Timezone
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none select-none" style={{ color: t.muted }}>
                  schedule
                </span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={prefsLoading}
                  className="w-full text-sm pl-10 pr-9 h-10 appearance-none outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={field}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none select-none" style={{ color: t.muted }}>
                  expand_more
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: t.muted }}>
                Language
              </label>
              <div
                className="flex items-center justify-between p-4 gap-3"
                style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-lg select-none" style={{ color: t.muted }}>
                    translate
                  </span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: t.heading }}>English (US)</p>
                    <p className="text-[10px] mt-0.5" style={{ color: t.muted }}>More languages planned.</p>
                  </div>
                </div>

                <div className="relative shrink-0">
                  {requestedLanguage ? (
                    <span className="text-xs flex items-center gap-1.5 font-semibold" style={{ color: t.success }}>
                      <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                      Requested ({requestedLanguage})
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLangRequest(!showLangRequest)}
                      className="pw-interactive-custom text-xs font-semibold"
                      style={{ background: 'transparent', border: 'none', padding: 0, color: t.accent }}
                    >
                      Request a language…
                    </button>
                  )}
                </div>
              </div>

              {showLangRequest && !requestedLanguage && (
                <div
                  className="mt-3 p-4 space-y-3"
                  style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
                >
                  <p className="text-xs" style={{ color: t.muted }}>Select a language to vote for prioritization:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'es', label: 'Spanish (Español)' },
                      { code: 'fr', label: 'French (Français)' },
                      { code: 'de', label: 'German (Deutsch)' },
                      { code: 'zh', label: 'Chinese (中文)' },
                      { code: 'pt', label: 'Portuguese (Português)' },
                      { code: 'it', label: 'Italian (Italiano)' }
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleRequestLanguage(lang.code, lang.label)}
                        className="pw-interactive-custom text-left text-sm font-medium transition-colors"
                        style={{
                          background: t.surface,
                          border: `1px solid ${t.border}`,
                          borderRadius: 2,
                          padding: '8px 12px',
                          color: t.heading,
                        }}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={saving || prefsLoading}
                className="pw-interactive-custom flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 16px' }}
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px] select-none">save</span>
                )}
                {prefsLoading ? 'Loading…' : saving ? 'Saving…' : 'Save preferences'}
              </button>
              {saved && (
                <span className="text-sm flex items-center gap-1.5" style={{ color: t.success }}>
                  <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                  Preferences saved.
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-5 p-5 sm:p-6 flex flex-col" style={panel}>
          <div className="flex items-center gap-2 pb-4 mb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>info</span>
            <h4 className="text-base font-semibold" style={{ color: t.heading }}>Account overview</h4>
          </div>

          <div className="space-y-3">
            {[
              {
                label: 'Account type',
                value: profile?.accountType || 'Investor',
                icon: 'badge',
                capitalize: true,
              },
              {
                label: 'Plan',
                value: profile?.subscriptionPlan || 'None',
                icon: 'workspace_premium',
                capitalize: false,
              },
              {
                label: 'Member since',
                value: profile?.createdAt
                  ? new Date((profile.createdAt as { seconds: number }).seconds * 1000).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Recently joined',
                icon: 'calendar_month',
                capitalize: false,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between p-3.5"
                style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5" style={{ color: t.muted }}>
                    {row.label}
                  </p>
                  <p className={`text-sm font-semibold ${row.capitalize ? 'capitalize' : ''}`} style={{ color: t.heading }}>
                    {row.value}
                  </p>
                </div>
                <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>{row.icon}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-12 p-5 sm:p-6" style={panel}>
          <div className="flex items-center gap-2 pb-4 mb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>hub</span>
            <h4 className="text-base font-semibold" style={{ color: t.heading }}>Connected services</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((service) => {
              const on = service.connected || !!service.platform;
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 gap-3"
                  style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{
                        borderRadius: 2,
                        border: `1px solid ${t.border}`,
                        background: on ? t.successMuted : t.surface,
                        color: on ? t.success : t.muted,
                      }}
                    >
                      <span className="material-symbols-outlined text-xl">{service.iconName}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: t.heading }}>{service.name}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.muted }}>{service.description}</p>
                      {service.detail && (
                        <p className="text-[10px] mt-1 font-mono truncate" style={{ color: t.accent }}>
                          {service.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {on ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: t.successMuted, color: t.success, border: `1px solid ${t.border}`, borderRadius: 2 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.success }} />
                        Connected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnect(service.id)}
                        disabled={connectingId === service.id}
                        className="pw-interactive-custom flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-50"
                        style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 12px' }}
                      >
                        {connectingId === service.id ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                            Connecting…
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px] select-none">add_link</span>
                            Connect
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {(() => {
          const stepsOrder = ['start', 'stripe_cancelled', 'firestore_deleted', 'prisma_deleted', 'storage_deleted', 'completed'];

          const getStepStatus = (stepKey: string) => {
            if (!activeJob) return 'PENDING';
            const currentStepIdx = stepsOrder.indexOf(activeJob.step || '');
            const targetStepIdx = stepsOrder.indexOf(stepKey);

            if (activeJob.status === 'completed') return 'COMPLETED';

            if (targetStepIdx < currentStepIdx) {
              return 'COMPLETED';
            } else if (targetStepIdx === currentStepIdx) {
              if (activeJob.status === 'failed') return 'FAILED';
              return 'IN_PROGRESS';
            } else {
              return 'PENDING';
            }
          };

          const getStepStatusText = (stepKey: string) => {
            const status = getStepStatus(stepKey);
            if (status === 'COMPLETED') return 'Done';
            if (status === 'FAILED') return 'Failed';
            if (status === 'IN_PROGRESS') return 'Processing…';
            return 'Pending';
          };

          const getStepStatusColor = (stepKey: string) => {
            const status = getStepStatus(stepKey);
            if (status === 'COMPLETED') return t.success;
            if (status === 'FAILED') return t.alert;
            if (status === 'IN_PROGRESS') return t.warn;
            return t.muted;
          };

          if (loadingJob) {
            return (
              <section className="col-span-12 p-5 sm:p-6" style={panel}>
                <div className="flex items-center gap-2 justify-center py-6">
                  <span className="material-symbols-outlined animate-spin text-2xl" style={{ color: t.accent }}>progress_activity</span>
                  <span className="text-sm font-mono" style={{ color: t.muted }}>Verifying deletion status…</span>
                </div>
              </section>
            );
          }

          if (activeJob) {
            return (
              <section
                className="col-span-12 p-5 sm:p-6"
                style={{ ...panel, borderColor: t.alert, background: t.alertMuted }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-xl animate-spin" style={{ color: t.alert }}>progress_activity</span>
                  <h4 className="text-base font-semibold" style={{ color: t.alert }}>Account deletion in progress</h4>
                </div>

                <div className="p-4 space-y-4" style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2 }}>
                  <p className="text-sm" style={{ color: t.muted }}>
                    Your account is being deleted in a secure, server-side cascade.
                  </p>

                  <div className="space-y-2.5 font-mono text-xs max-w-md">
                    {[
                      ['stripe_cancelled', '1. Stripe billing cancellation'],
                      ['firestore_deleted', '2. Firestore workspace purge'],
                      ['prisma_deleted', '3. Prisma database reassignment'],
                      ['storage_deleted', '4. Cloud storage scrubbing'],
                      ['completed', '5. Credential revocation'],
                    ].map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between pb-2"
                        style={{ borderBottom: key === 'completed' ? 'none' : `1px solid ${t.divider}` }}
                      >
                        <span style={{ color: t.heading }}>{label}</span>
                        <span className="font-semibold" style={{ color: getStepStatusColor(key) }}>
                          {getStepStatusText(key)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {activeJob.status === 'failed' && (
                  <div className="mt-5 p-4 space-y-2" style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, color: t.alert }}>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Deletion paused (failure)
                    </p>
                    <p className="text-xs font-mono p-3 max-w-xl truncate" style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}>
                      {activeJob.error || 'An unexpected error occurred.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleResumeDeletion}
                      disabled={resuming}
                      className="pw-interactive-custom text-sm font-semibold disabled:opacity-50"
                      style={{ background: t.alert, color: '#fff', border: 'none', borderRadius: 2, padding: '8px 16px' }}
                    >
                      {resuming ? 'Resuming…' : 'Retry / resume deletion'}
                    </button>
                  </div>
                )}
              </section>
            );
          }

          return (
            <section
              className="col-span-12 p-5 sm:p-6"
              style={{ ...panel, borderColor: t.alert }}
            >
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-xl select-none" style={{ color: t.alert }}>warning</span>
                <h4 className="text-base font-semibold" style={{ color: t.alert }}>Danger zone</h4>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm mb-1" style={{ color: t.heading }}>Delete your account and all associated data.</p>
                  <p className="text-xs leading-relaxed" style={{ color: t.muted }}>
                    Permanent. Projects, team associations, and billing history will be erased.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="pw-interactive-custom text-sm font-semibold whitespace-nowrap"
                  style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 16px', color: t.alert }}
                >
                  Delete account
                </button>
              </div>

              {deleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div
                    className="max-w-lg w-full p-6 space-y-5"
                    style={{
                      ...panel,
                      borderColor: t.alert,
                      boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 16px 48px rgba(20,22,28,0.16)',
                    }}
                  >
                    <div className="flex items-center gap-2 pb-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
                      <span className="material-symbols-outlined text-2xl select-none" style={{ color: t.alert }}>warning</span>
                      <h3 className="text-lg font-semibold" style={{ color: t.alert }}>Permanently delete account?</h3>
                    </div>

                    <div className="p-4 text-xs space-y-3" style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.muted }}>
                      <p className="font-semibold text-sm flex items-center gap-1" style={{ color: t.alert }}>
                        <span className="material-symbols-outlined text-xs">error</span>
                        This action is permanent and irreversible
                      </p>
                      <p>By confirming, the following will be permanently deleted:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Your personal profile and preferences.</li>
                        <li>All real estate projects you solely own, including financial logs, activities, and files.</li>
                        <li>Uploaded documents and images in Cloud Storage.</li>
                        <li>Active billing plans or subscriptions (canceled immediately).</li>
                      </ul>
                      <p className="font-semibold" style={{ color: t.alert }}>Shared project policy:</p>
                      <p>
                        Co-owned projects will not be deleted. Your membership will be removed, and your contributions will be attributed to &quot;Deleted User&quot;.
                      </p>
                    </div>

                    {!reauthVerified ? (
                      <div className="space-y-4 pt-4" style={{ borderTop: `1px solid ${t.divider}` }}>
                        <p className="text-xs" style={{ color: t.muted }}>Verify your credentials before proceeding.</p>

                        {getAuthProviderId() === 'password' ? (
                          <div className="space-y-3">
                            <input
                              type="password"
                              placeholder="Confirm password"
                              value={reauthPassword}
                              onChange={(e) => setReauthPassword(e.target.value)}
                              className="w-full text-sm px-3 h-10 outline-none"
                              style={field}
                            />
                            <button
                              type="button"
                              onClick={handleReauthenticate}
                              disabled={reauthLoading}
                              className="pw-interactive-custom w-full text-sm font-semibold"
                              style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 16px', color: t.alert }}
                            >
                              {reauthLoading ? 'Verifying…' : 'Verify password'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleReauthenticate}
                            disabled={reauthLoading}
                            className="pw-interactive-custom w-full flex items-center justify-center gap-2 text-sm font-semibold"
                            style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 16px' }}
                          >
                            <span className="material-symbols-outlined text-[16px]">login</span>
                            {reauthLoading ? 'Verifying…' : `Re-authenticate with ${getAuthProviderId() === 'google.com' ? 'Google' : 'Facebook'}`}
                          </button>
                        )}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmOpen(false);
                              setReauthPassword('');
                            }}
                            className="pw-interactive-custom text-sm font-semibold"
                            style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 14px', color: t.muted }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-4" style={{ borderTop: `1px solid ${t.divider}` }}>
                        <p className="text-xs" style={{ color: t.muted }}>
                          Type <span className="font-mono font-bold" style={{ color: t.alert }}>DELETE</span> below to confirm.
                        </p>

                        <input
                          type="text"
                          placeholder='Type "DELETE" to confirm'
                          value={deleteInput}
                          onChange={(e) => setDeleteInput(e.target.value)}
                          className="w-full text-sm px-3 h-10 outline-none"
                          style={field}
                        />

                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={startDeletionProcess}
                            disabled={deleteInput !== 'DELETE' || resuming}
                            className="pw-interactive-custom flex-1 text-sm font-semibold disabled:opacity-50"
                            style={{ background: t.alert, color: '#fff', border: 'none', borderRadius: 2, padding: '8px 16px' }}
                          >
                            {resuming ? 'Starting…' : 'Confirm permanent deletion'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmOpen(false);
                              setDeleteInput('');
                              setReauthPassword('');
                            }}
                            className="pw-interactive-custom text-sm font-semibold"
                            style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 14px', color: t.muted }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

      </div>
    </div>
  );
}

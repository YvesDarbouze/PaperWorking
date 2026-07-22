'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
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

/* ═══════════════════════════════════════════════════════
   General Settings — Luminous Glass Terminal
   
   Sections:
   1. Appearance (Theme toggle)
   2. Regional Preferences (Timezone, Language)
   3. Connected Services (Firebase, Stripe, MLS, Drive)
   4. Danger Zone (Account deletion)
   ═══════════════════════════════════════════════════════ */

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

  // ─── Deletion Cockpit State ────────────────────────────
  const [activeJob, setActiveJob] = useState<any>(null);
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
    } catch (err: any) {
      console.error('[GDPR Delete] Re-auth failed:', err);
      toast.error(err.message || 'Re-authentication failed. Please try again.');
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
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
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
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
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
  const [language] = useState('en');

  const [showLangRequest, setShowLangRequest] = useState(false);
  const [requestedLanguage, setRequestedLanguage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pw_requested_lang');
      if (saved) {
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
    if (!currentUser) { setPrefsLoading(false); return; }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (err: any) {
      // Roll back to last confirmed value so the UI reflects reality
      setTimezone(rollbackTo);
      toast.error(`Preferences not saved: ${err?.message ?? 'write failed'}`, {
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
    } catch (err: any) {
      toast.error(err?.message ?? 'Connection failed.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
    } finally {
      setConnectingId(null);
    }
  };


  return (
    <div className="w-full space-y-0">
      <div className="grid grid-cols-12 gap-6">



        {/* ════════════════════════════════════════════════
            2 · REGIONAL PREFERENCES (col-span-7)
            ════════════════════════════════════════════════ */}
        <section className="col-span-12 lg:col-span-7 glass-card rounded-2xl p-8 flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-6">
            <span className="material-symbols-outlined text-pw-primary text-xl select-none">language</span>
            <h4 className="text-2xl font-bold text-pw-black">Regional Preferences</h4>
          </div>

          <div className="space-y-6 flex-1">
            {/* Timezone */}
            <div>
              <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">
                Timezone
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted text-lg pointer-events-none select-none">
                  schedule
                </span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={prefsLoading}
                  className="glass-input w-full text-sm pl-10 pr-4 py-3 text-pw-black appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value} className="bg-[#161318] text-pw-black">
                      {tz.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-pw-muted text-lg pointer-events-none select-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">
                Language
              </label>
              <div className="flex items-center justify-between p-4 rounded-xl bg-pw-glass-bg/50 border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-pw-muted text-lg select-none">
                    translate
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-pw-black">English (US)</p>
                    <p className="text-[10px] text-pw-muted mt-0.5">More languages planned.</p>
                  </div>
                </div>

                <div className="relative">
                  {requestedLanguage ? (
                    <span className="text-xs text-pw-primary flex items-center gap-1.5 font-semibold">
                      <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                      Requested ({requestedLanguage})
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowLangRequest(!showLangRequest)}
                      className="text-xs font-bold text-pw-primary hover:underline cursor-pointer"
                    >
                      Request a language...
                    </button>
                  )}
                </div>
              </div>

              {showLangRequest && !requestedLanguage && (
                <div className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <p className="text-xs text-pw-muted">Select a language to vote for prioritization:</p>
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
                        onClick={() => handleRequestLanguage(lang.code, lang.label)}
                        className="text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 text-pw-black hover:text-pw-primary transition-colors border border-transparent hover:border-white/5 cursor-pointer"
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Save Preferences */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleSavePreferences}
                disabled={saving || prefsLoading}
                className="luminous-button inline-flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wider px-8 py-3 rounded-xl disabled:opacity-50 cursor-pointer transition-all"
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm select-none">save</span>
                )}
                {prefsLoading ? 'Loading…' : saving ? 'Saving…' : 'Save Preferences'}
              </button>
              {saved && (
                <span className="text-sm text-pw-primary flex items-center gap-1.5 animate-pulse">
                  <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                  Preferences saved.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            3 · QUICK STATS CARD (col-span-5)
            ════════════════════════════════════════════════ */}
        <section className="col-span-12 lg:col-span-5 glass-card rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-pw-primary/8 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-6">
            <span className="material-symbols-outlined text-pw-primary text-xl select-none">info</span>
            <h4 className="text-2xl font-bold text-pw-black">Account Overview</h4>
          </div>

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between p-4 rounded-xl bg-pw-glass-bg/50 border border-white/5">
              <div>
                <p className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-0.5">Account Type</p>
                <p className="text-sm font-bold text-pw-black capitalize">
                  {profile?.accountType || 'Investor'}
                </p>
              </div>
              <span className="material-symbols-outlined text-pw-primary text-2xl select-none">badge</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-pw-glass-bg/50 border border-white/5">
              <div>
                <p className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-0.5">Plan</p>
                <p className="text-sm font-bold text-pw-black">
                  {profile?.subscriptionPlan || 'None'}
                </p>
              </div>
              <span className="material-symbols-outlined text-pw-primary text-2xl select-none">workspace_premium</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-pw-glass-bg/50 border border-white/5">
              <div>
                <p className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-0.5">Member Since</p>
                <p className="text-sm font-bold text-pw-black">
                  {profile?.createdAt
                    ? new Date((profile.createdAt as { seconds: number }).seconds * 1000).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Recently joined'}
                </p>
              </div>
              <span className="material-symbols-outlined text-pw-primary text-2xl select-none">calendar_month</span>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            4 · CONNECTED SERVICES (col-span-12)
            ════════════════════════════════════════════════ */}
        <section className="col-span-12 glass-card rounded-2xl p-8 relative overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-6">
            <span className="material-symbols-outlined text-pw-primary text-xl select-none">hub</span>
            <h4 className="text-2xl font-bold text-pw-black">Connected Services</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-5 rounded-xl bg-pw-glass-bg/30 border border-white/5 hover:bg-pw-glass-bg/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-11 h-11 rounded-xl flex items-center justify-center border transition-colors
                    ${service.connected
                      ? 'bg-pw-primary/10 border-pw-primary/20 text-pw-primary'
                      : 'bg-white/5 border-white/10 text-pw-muted'
                    }
                  `}>
                    <span className="material-symbols-outlined text-xl">{service.iconName}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-pw-black">{service.name}</p>
                    <p className="text-xs text-pw-muted mt-0.5 max-w-[200px]">{service.description}</p>
                    {service.detail && (
                      <p className="text-[10px] text-pw-primary/70 mt-1 font-mono truncate max-w-[200px]">
                        {service.detail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {service.connected || service.platform ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pw-primary/10 text-pw-primary text-[10px] font-bold border border-pw-primary/20 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-pw-primary" />
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnect(service.id)}
                      disabled={connectingId === service.id}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                    >
                      {connectingId === service.id ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-xs select-none">progress_activity</span>
                          Connecting…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs select-none">add_link</span>
                          Connect
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            5 · DANGER ZONE (col-span-12)
            ════════════════════════════════════════════════ */}
        {(() => {
          const stepsOrder = ['start', 'stripe_cancelled', 'firestore_deleted', 'prisma_deleted', 'storage_deleted', 'completed'];

          const getStepStatus = (stepKey: string) => {
            if (!activeJob) return 'PENDING';
            const currentStepIdx = stepsOrder.indexOf(activeJob.step);
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
            if (status === 'COMPLETED') return '✓ DONE';
            if (status === 'FAILED') return '✗ FAILED';
            if (status === 'IN_PROGRESS') return '● PROCESSING...';
            return '○ PENDING';
          };

          const getStepStatusColor = (stepKey: string) => {
            const status = getStepStatus(stepKey);
            if (status === 'COMPLETED') return 'text-pw-primary font-bold';
            if (status === 'FAILED') return 'text-error font-bold';
            if (status === 'IN_PROGRESS') return 'text-amber-400 font-bold animate-pulse';
            return 'text-pw-muted';
          };

          if (loadingJob) {
            return (
              <section className="col-span-12 rounded-2xl p-8 border border-white/10 bg-white/[0.02] backdrop-blur-xl">
                <div className="flex items-center gap-2 justify-center py-6">
                  <span className="material-symbols-outlined text-pw-primary animate-spin text-2xl">progress_activity</span>
                  <span className="text-sm text-pw-muted font-mono">Verifying Deletion Status...</span>
                </div>
              </section>
            );
          }

          if (activeJob) {
            return (
              <section className="col-span-12 rounded-2xl p-8 relative overflow-hidden border border-error/20 bg-error/[0.02] backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-error text-xl animate-spin">progress_activity</span>
                  <h4 className="text-2xl font-bold text-error/95">Account Deletion In Progress</h4>
                </div>

                <div className="p-6 rounded-xl bg-pw-glass-bg/50 border border-white/5 space-y-4">
                  <p className="text-sm text-pw-muted">
                    Your account is currently being deleted. The process is executed in a secure, server-side cascade.
                  </p>
                  
                  {/* Steps List */}
                  <div className="space-y-3 font-mono text-xs max-w-md">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span>1. STRIPE BILLING CANCELLATION</span>
                      <span className={getStepStatusColor('stripe_cancelled')}>
                        {getStepStatusText('stripe_cancelled')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span>2. FIRESTORE WORKSPACE PURGE</span>
                      <span className={getStepStatusColor('firestore_deleted')}>
                        {getStepStatusText('firestore_deleted')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span>3. PRISMA DATABASE REASSIGNMENT</span>
                      <span className={getStepStatusColor('prisma_deleted')}>
                        {getStepStatusText('prisma_deleted')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span>4. CLOUD STORAGE SCRUBBING</span>
                      <span className={getStepStatusColor('storage_deleted')}>
                        {getStepStatusText('storage_deleted')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <span>5. CREDENTIAL REVOCATION</span>
                      <span className={getStepStatusColor('completed')}>
                        {getStepStatusText('completed')}
                      </span>
                    </div>
                  </div>
                </div>

                {activeJob.status === 'failed' && (
                  <div className="mt-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Deletion Paused (Failure)
                    </p>
                    <p className="text-xs font-mono bg-black/30 p-3 rounded border border-error/10 max-w-xl truncate">{activeJob.error || 'An unexpected error occurred.'}</p>
                    <button
                      onClick={handleResumeDeletion}
                      disabled={resuming}
                      className="px-6 py-2.5 bg-error text-white rounded-xl text-xs font-bold hover:bg-error/80 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {resuming ? 'Resuming...' : 'Retry / Resume Deletion'}
                    </button>
                  </div>
                )}
              </section>
            );
          }

          return (
            <section className="col-span-12 rounded-2xl p-8 relative overflow-hidden border border-error/20 bg-error/[0.02] backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-error text-xl select-none">warning</span>
                <h4 className="text-2xl font-bold text-error/90">Danger Zone</h4>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-pw-black mb-1">Delete your account and all associated data.</p>
                  <p className="text-xs text-pw-muted">
                    This action is permanent and cannot be undone. All projects, team associations, and billing history will be erased.
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-error/10 border border-error/30 text-error text-sm font-bold hover:bg-error/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  Delete Account
                </button>
              </div>

              {/* Confirmation Modal */}
              {deleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
                  <div className="glass-card max-w-lg w-full mx-4 rounded-2xl p-8 border border-error/20 bg-pw-night-bg/98 relative overflow-hidden shadow-2xl space-y-6">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                      <span className="material-symbols-outlined text-error text-2xl select-none">warning</span>
                      <h3 className="text-xl font-bold text-error/95">Permanently Delete Account?</h3>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-xs text-pw-muted space-y-3">
                      <p className="font-semibold text-error text-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        THIS ACTION IS PERMANENT AND IRREVERSIBLE
                      </p>
                      <p>By confirming deletion, the following data will be permanently deleted from our servers:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Your personal profile and preferences.</li>
                        <li>All real estate projects you solely own, including their financial logs, activities, and uploaded files.</li>
                        <li>Your uploaded documents and images in Cloud Storage.</li>
                        <li>Any active billing plans or subscriptions (these will be canceled immediately).</li>
                      </ul>
                      <p className="font-semibold text-error">Shared Project Policy:</p>
                      <p>
                        Projects that are co-owned/shared with other members will NOT be deleted. 
                        However, your membership will be removed, and any status updates or task assignments you authored on them will be anonymized and attributed to "Deleted User".
                      </p>
                    </div>

                    {!reauthVerified ? (
                      <div className="space-y-4 border-t border-white/10 pt-4">
                        <p className="text-xs text-pw-muted">For your security, please verify your credentials before proceeding.</p>
                        
                        {getAuthProviderId() === 'password' ? (
                          <div className="space-y-3">
                            <input
                              type="password"
                              placeholder="Confirm Password"
                              value={reauthPassword}
                              onChange={(e) => setReauthPassword(e.target.value)}
                              className="glass-input w-full text-sm px-4 py-3 text-pw-black"
                            />
                            <button
                              onClick={handleReauthenticate}
                              disabled={reauthLoading}
                              className="w-full py-2.5 rounded-xl bg-error/10 border border-error/30 text-error hover:bg-error/20 font-bold text-xs transition-colors cursor-pointer"
                            >
                              {reauthLoading ? 'Verifying...' : 'Verify Password'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleReauthenticate}
                            disabled={reauthLoading}
                            className="w-full py-3 rounded-xl bg-pw-primary text-pw-black font-bold text-xs transition-colors hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">login</span>
                            {reauthLoading ? 'Verifying...' : `Re-authenticate with ${getAuthProviderId() === 'google.com' ? 'Google' : 'Facebook'}`}
                          </button>
                        )}
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => {
                              setDeleteConfirmOpen(false);
                              setReauthPassword('');
                            }}
                            className="px-5 py-2.5 rounded-xl bg-pw-glass-bg border border-white/10 text-pw-muted text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 border-t border-white/10 pt-4">
                        <p className="text-xs text-pw-muted">
                          Type <span className="font-mono font-bold text-error">DELETE</span> below to confirm your deletion request.
                        </p>
                        
                        <input
                          type="text"
                          placeholder='Type "DELETE" to confirm'
                          value={deleteInput}
                          onChange={(e) => setDeleteInput(e.target.value)}
                          className="glass-input w-full text-sm px-4 py-3 text-pw-black"
                        />

                        <div className="flex gap-3">
                          <button
                            onClick={startDeletionProcess}
                            disabled={deleteInput !== 'DELETE' || resuming}
                            className="flex-1 py-3 rounded-xl bg-error text-white text-xs font-bold disabled:opacity-30 transition-all cursor-pointer"
                          >
                            {resuming ? 'Starting...' : 'Confirm Permanent Deletion'}
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmOpen(false);
                              setDeleteInput('');
                              setReauthPassword('');
                            }}
                            className="px-5 py-3 rounded-xl bg-pw-glass-bg border border-white/10 text-pw-muted text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer"
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

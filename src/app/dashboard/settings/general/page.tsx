'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
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
  connected: boolean;
  description: string;
}

const SERVICES: ConnectedService[] = [
  {
    id: 'firebase',
    name: 'Firebase',
    iconName: 'cloud_done',
    connected: true,
    description: 'Authentication, Firestore database, and cloud storage.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    iconName: 'payments',
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
  const { profile } = useAuth();



  // ─── Regional ──────────────────────────────────────────
  const [timezone, setTimezone] = useState('America/New_York');
  const [language] = useState('en');

  // ─── Connected Services ────────────────────────────────
  const [services, setServices] = useState<ConnectedService[]>(SERVICES);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // ─── Danger Zone ───────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // ─── Save Preferences ──────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSavePreferences = async () => {
    setSaving(true);
    // Simulate API call — in production this writes to Firestore
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    toast.success('Preferences saved.', {
      icon: '✓',
      style: { background: '#0d0d0d', color: '#fff' },
    });
    setTimeout(() => setSaved(false), 3000);
  };

  const handleConnect = async (serviceId: string) => {
    setConnectingId(serviceId);
    // Simulate OAuth/connection flow
    await new Promise((r) => setTimeout(r, 1200));
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, connected: true } : s))
    );
    setConnectingId(null);
    toast.success(`Service connected successfully.`, {
      style: { background: '#0d0d0d', color: '#fff' },
    });
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== 'DELETE') return;
    toast.error('Account deletion is not available in demo mode.', {
      style: { background: '#0d0d0d', color: '#fff' },
    });
    setDeleteConfirmOpen(false);
    setDeleteInput('');
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
                  className="glass-input w-full text-sm pl-10 pr-4 py-3 text-pw-black appearance-none cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value} className="bg-[#141d23] text-pw-black">
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
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted text-lg pointer-events-none select-none">
                  translate
                </span>
                <select
                  value={language}
                  disabled
                  className="glass-input w-full text-sm pl-10 pr-4 py-3 text-pw-black appearance-none cursor-not-allowed opacity-60"
                >
                  <option value="en" className="bg-[#141d23] text-pw-black">English (US)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-pw-muted text-lg pointer-events-none select-none">
                  expand_more
                </span>
              </div>
              <p className="text-[10px] text-pw-muted mt-1.5 font-mono uppercase tracking-wider">
                Additional languages coming soon
              </p>
            </div>

            {/* Save Preferences */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="luminous-button inline-flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wider px-8 py-3 rounded-xl disabled:opacity-50 cursor-pointer transition-all"
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm select-none">save</span>
                )}
                {saving ? 'Saving…' : 'Save Preferences'}
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
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {service.connected ? (
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
        <section className="col-span-12 rounded-2xl p-8 relative overflow-hidden border border-error/20 bg-error/[0.02] backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-error text-xl select-none">warning</span>
            <h4 className="text-2xl font-bold text-error/90">Danger Zone</h4>
          </div>

          {!deleteConfirmOpen ? (
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
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-error/10 border border-error/30">
                <p className="text-sm text-error font-semibold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm select-none">error</span>
                  This action is irreversible
                </p>
                <p className="text-xs text-pw-muted">
                  All of your projects, team memberships, documents, billing records, and notification history will be permanently deleted.
                  Type <span className="text-error font-bold font-mono">DELETE</span> to confirm.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="glass-input text-sm px-4 py-3 text-pw-black flex-1 placeholder:text-pw-muted/40"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== 'DELETE'}
                  className="px-6 py-3 rounded-xl bg-error text-on-error text-sm font-bold disabled:opacity-30 cursor-pointer transition-all whitespace-nowrap"
                >
                  Confirm Deletion
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteInput('');
                  }}
                  className="px-4 py-3 rounded-xl bg-pw-glass-bg border border-white/10 text-pw-muted text-sm font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

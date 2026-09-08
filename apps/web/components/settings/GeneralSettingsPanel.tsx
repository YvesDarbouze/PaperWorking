'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

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

const LOCALES = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'es-ES', label: 'Spanish (Español)' },
  { value: 'fr-FR', label: 'French (Français)' },
  { value: 'de-DE', label: 'German (Deutsch)' },
] as const;

export default function GeneralSettingsPanel() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [locale, setLocale] = useState('en-US');
  const [companyName, setCompanyName] = useState('Apex Capital Partners');

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/profile');
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings');
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load general settings (${res.status})`);
      }
      const data = await res.json();
      setEmail(data.email || 'alex@apexcap.internal');
      setTimezone(data.timezone || 'America/Chicago');
      setCompanyName(data.companyName || 'Apex Capital Partners');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          timezone,
          companyName,
        }),
      });

      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings');
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to save preferences (${res.status})`);
      }

      // Sync to localStorage
      try {
        localStorage.setItem('pw_settings_timezone', timezone);
      } catch {
        // ignore
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="material-symbols-outlined animate-spin text-[var(--accent)]">
            progress_activity
          </span>
          Loading general preferences…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6" data-testid="general-settings-panel">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">General Settings</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your contact credentials, workspace identity, and regional localization.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
          <span>{error}</span>
          <Button type="button" variant="secondary" size="sm" onClick={fetchSettings}>
            Retry
          </Button>
        </div>
      )}

      {saved && (
        <div data-testid="general-save-success" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <span className="material-symbols-outlined text-base">check_circle</span>
          General preferences saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Account & Contact Overview */}
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            Account Credentials
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-email" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Primary Contact Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label htmlFor="workspace-name" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Workspace / Syndicate Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </section>

        {/* Regional Preferences */}
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            Regional Preferences
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tz-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Default Timezone
              </label>
              <select
                id="tz-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="locale-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Interface Language &amp; Locale
              </label>
              <select
                id="locale-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              >
                {LOCALES.map((loc) => (
                  <option key={loc.value} value={loc.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Single Primary Action per Constitution */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            data-variant="primary"
            data-testid="general-save-button"
            className="px-6"
          >
            {saving ? 'Saving Preferences…' : 'Save Preferences'}
          </Button>
        </div>
      </form>
    </div>
  );
}

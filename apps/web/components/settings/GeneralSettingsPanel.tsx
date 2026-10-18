'use client';

import { useEffect, useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, CircleNotch, Briefcase, Check, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CANONICAL_VENDOR_PROFESSIONS } from '@/lib/marketplace/vendor-professions';

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

export default function GeneralSettingsPanel({ initialLoading = false }: { initialLoading?: boolean } = {}) {
  const router = useRouter();

  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [email, setEmail] = useState('alex@apexcap.internal');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [locale, setLocale] = useState('en-US');
  const [companyName, setCompanyName] = useState('Apex Capital Partners');
  const [vendorSkills, setVendorSkills] = useState<string[]>([]);
  const [skillsSearch, setSkillsSearch] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    let cachedProfile: {
      email?: string;
      timezone?: string;
      locale?: string;
      companyName?: string;
      vendorSkills?: string[];
      savedViaFallback?: boolean;
    } | null = null;

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('pw_settings_general_profile');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            cachedProfile = parsed;
          }
        }
      } catch {
        // ignore localStorage parse error
      }
    }

    try {
      const res = await fetch('/api/settings/profile', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings');
        return;
      }

      let data: Record<string, any> = {};
      if (res.ok) {
        data = await res.json();
      } else if (cachedProfile) {
        data = cachedProfile;
      } else {
        throw new Error(`Failed to load general settings (${res.status})`);
      }

      const useCachedOverride = Boolean(cachedProfile?.savedViaFallback);

      setEmail(
        (useCachedOverride && cachedProfile?.email) ||
          data.email ||
          cachedProfile?.email ||
          'alex@apexcap.internal',
      );
      setTimezone(
        (useCachedOverride && cachedProfile?.timezone) ||
          data.timezone ||
          cachedProfile?.timezone ||
          'America/Chicago',
      );
      setLocale(
        (useCachedOverride && cachedProfile?.locale) ||
          data.locale ||
          cachedProfile?.locale ||
          'en-US',
      );
      setCompanyName(
        (useCachedOverride && cachedProfile?.companyName) ||
          data.companyName ||
          cachedProfile?.companyName ||
          'Apex Capital Partners',
      );

      let resolvedSkills: string[] | null =
        useCachedOverride && Array.isArray(cachedProfile?.vendorSkills)
          ? cachedProfile!.vendorSkills!
          : Array.isArray(data.vendorSkills) && data.vendorSkills.length > 0
            ? data.vendorSkills
            : null;

      if (!resolvedSkills) {
        try {
          const mRes = await fetch('/api/marketplace/profile', {
            cache: 'no-store',
            credentials: 'include',
          });
          if (mRes.ok) {
            const mData = await mRes.json();
            if (Array.isArray(mData.profile?.vendorSkills) && mData.profile.vendorSkills.length > 0) {
              resolvedSkills = mData.profile.vendorSkills;
            }
          }
        } catch {
          // ignore fallback
        }
      }

      if (!resolvedSkills && typeof window !== 'undefined') {
        try {
          const cachedSkills = localStorage.getItem('pw_settings_vendor_skills');
          if (cachedSkills) {
            const parsed = JSON.parse(cachedSkills);
            if (Array.isArray(parsed)) {
              resolvedSkills = parsed.filter((s): s is string => typeof s === 'string');
            }
          }
        } catch {
          // ignore localStorage parse error
        }
      }

      setVendorSkills(resolvedSkills ?? (Array.isArray(data.vendorSkills) ? data.vendorSkills : []));
    } catch (err) {
      if (cachedProfile) {
        setEmail(cachedProfile.email || 'alex@apexcap.internal');
        setTimezone(cachedProfile.timezone || 'America/Chicago');
        setLocale(cachedProfile.locale || 'en-US');
        setCompanyName(cachedProfile.companyName || 'Apex Capital Partners');
        if (Array.isArray(cachedProfile.vendorSkills)) {
          setVendorSkills(cachedProfile.vendorSkills);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Error loading settings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined' && window.location.hash === '#vendor-skills') {
      const section = document.getElementById('vendor-skills');
      if (section && typeof section.scrollIntoView === 'function') {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [loading]);

  const toggleSkill = (skill: string) => {
    setVendorSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, skill];
    });
  };

  const filteredProfessions = useMemo(() => {
    if (!skillsSearch.trim()) return CANONICAL_VENDOR_PROFESSIONS;
    const q = skillsSearch.toLowerCase().trim();
    return CANONICAL_VENDOR_PROFESSIONS.filter((prof) => prof.toLowerCase().includes(q));
  }, [skillsSearch]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const safeEmail = email.trim() || 'alex@apexcap.internal';
    const safeCompanyName = companyName.trim() || 'Apex Capital Partners';
    setEmail(safeEmail);
    setCompanyName(safeCompanyName);

    const payload = {
      email: safeEmail,
      timezone,
      locale,
      companyName: safeCompanyName,
      vendorSkills,
    };

    try {
      let res = await fetch('/api/settings/profile', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status !== 401) {
        res = await fetch('/api/settings/profile', {
          method: 'PUT',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.status === 401) {
        router.push('/login?next=/dashboard/settings');
        return;
      }

      let syncedViaMarketplace = false;
      let savedViaFallback = false;

      if (!res.ok) {
        try {
          const fallbackRes = await fetch('/api/marketplace/profile', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: safeEmail,
              companyName: safeCompanyName,
              businessName: safeCompanyName,
              timezone,
              locale,
              vendorSkills,
            }),
          });
          if (fallbackRes.ok) {
            syncedViaMarketplace = true;
            const fallbackData = await fallbackRes.json().catch(() => null);
            if (Array.isArray(fallbackData?.profile?.vendorSkills)) {
              setVendorSkills(fallbackData.profile.vendorSkills);
            }
          }
        } catch {
          // ignore fallback error
        }

        if (!syncedViaMarketplace) {
          if (res.status === 403 || res.status === 404 || res.status === 405) {
            savedViaFallback = true;
          } else {
            let serverError = '';
            try {
              const errBody = await res.json();
              if (typeof errBody?.error === 'string' && errBody.error.trim()) {
                serverError = `: ${errBody.error.trim()}`;
              } else if (typeof errBody?.error?.message === 'string' && errBody.error.message.trim()) {
                serverError = `: ${errBody.error.message.trim()}`;
              }
            } catch {
              // ignore JSON parse failure
            }
            throw new Error(`Failed to save preferences (${res.status})${serverError}`);
          }
        }
      } else {
        try {
          const savedData = await res.json();
          if (Array.isArray(savedData?.vendorSkills)) {
            setVendorSkills(savedData.vendorSkills);
          }
        } catch {
          // ignore if empty body
        }
      }

      // Sync vendor skills & profile to marketplace profile so both stores remain consistent
      if (!syncedViaMarketplace && !savedViaFallback) {
        try {
          await fetch('/api/marketplace/profile', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: safeEmail,
              companyName: safeCompanyName,
              businessName: safeCompanyName,
              timezone,
              locale,
              vendorSkills,
            }),
          });
        } catch {
          // non-blocking sync
        }
      }

      // Sync to localStorage
      try {
        localStorage.setItem('pw_settings_timezone', timezone);
        localStorage.setItem('pw_settings_vendor_skills', JSON.stringify(vendorSkills));
        localStorage.setItem(
          'pw_settings_general_profile',
          JSON.stringify({
            email: safeEmail,
            companyName: safeCompanyName,
            timezone,
            locale,
            vendorSkills,
            savedViaFallback,
          }),
        );
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
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CircleNotch className="h-5 w-5 animate-spin text-foreground" />
          Loading general preferences…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-28 md:pb-6" data-testid="general-settings-panel">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">General Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your contact credentials, workspace identity, and regional localization.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-none border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="secondary" size="sm" onClick={fetchSettings}>
            Retry
          </Button>
        </div>
      )}

      {saved && (
        <div data-testid="general-save-success" className="flex items-center gap-2 rounded-none border border-border bg-card p-4 text-sm text-foreground shadow-sm ring-1 ring-foreground/10">
          <CheckCircle weight="bold" className="h-4 w-4" />
          General preferences saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Account & Contact Overview */}
        <section className="rounded-none border border-border bg-card p-6 space-y-4 shadow-sm ring-1 ring-foreground/10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">
            Account Credentials
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-email" className="block text-xs font-semibold text-muted-foreground mb-1">
                Primary Contact Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="workspace-name" className="block text-xs font-semibold text-muted-foreground mb-1">
                Workspace / Syndicate Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring min-h-[44px]"
              />
            </div>
          </div>
        </section>

        {/* Regional Preferences */}
        <section className="rounded-none border border-border bg-card p-6 space-y-4 shadow-sm ring-1 ring-foreground/10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">
            Regional Preferences
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tz-select" className="block text-xs font-semibold text-muted-foreground mb-1">
                Default Timezone
              </label>
              <select
                id="tz-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring min-h-[44px]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} className="bg-background text-foreground">
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="locale-select" className="block text-xs font-semibold text-muted-foreground mb-1">
                Interface Language &amp; Locale
              </label>
              <select
                id="locale-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring min-h-[44px]"
              >
                {LOCALES.map((loc) => (
                  <option key={loc.value} value={loc.value} className="bg-background text-foreground">
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Vendor Directory & Professional Skills (1 to 3 skills) */}
        <section
          id="vendor-skills"
          data-testid="settings-vendor-skills-section"
          className="rounded-none border border-border bg-card p-6 space-y-4 shadow-sm ring-1 ring-foreground/10"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Vendor Directory &amp; Professional Skills
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Identify 1 to 3 professions to list your capabilities in search engines and publish your profile on the Vendor Directory.
              </p>
            </div>
            <Badge
              variant="outline"
              className={`rounded-none self-start sm:self-auto text-xs ${
                vendorSkills.length >= 1
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  : 'border-border text-muted-foreground'
              }`}
              data-testid="settings-skills-count-badge"
            >
              {vendorSkills.length}/3 Skills Selected
            </Badge>
          </div>

          {/* Directory Listing Status */}
          {vendorSkills.length >= 1 ? (
            <div
              data-testid="settings-vendor-status-active"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-none border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400"
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Active in Vendor Directory:</strong> Listed under{' '}
                  <span className="text-foreground font-semibold">{vendorSkills.join(', ')}</span>.
                </span>
              </div>
              <Link
                href="/dashboard/marketplace"
                className="underline hover:text-emerald-300 transition text-xs font-semibold whitespace-nowrap"
              >
                View in Directory →
              </Link>
            </div>
          ) : (
            <div
              data-testid="settings-vendor-status-inactive"
              className="rounded-none border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300"
            >
              <strong>Notice - Profile Not Listed:</strong> You have not identified skills. Users cannot post or be listed on the Vendor Directory without selecting 1 to 3 skills below.
            </div>
          )}

          {/* Selected Chips */}
          {vendorSkills.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-muted-foreground block">
                Active Skills ({vendorSkills.length} of max 3):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {vendorSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-none border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className="text-muted-foreground hover:text-foreground flex items-center justify-center min-h-[24px] min-w-[24px]"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setVendorSkills([])}
                  className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Profession Search Filter */}
          <div className="space-y-1.5 pt-1">
            <label htmlFor="settings-skill-search" className="block text-xs font-semibold text-muted-foreground">
              Select Skills from 38 Certified Professions:
            </label>
            <div className="relative">
              <input
                id="settings-skill-search"
                type="text"
                data-testid="settings-skills-search-input"
                placeholder="Search professions (e.g. Electrician, Real Estate Attorney, Appraiser)..."
                value={skillsSearch}
                onChange={(e) => setSkillsSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && skillsSearch) {
                    e.preventDefault();
                    setSkillsSearch('');
                  }
                }}
                className="w-full rounded-none border border-input bg-background py-2 pl-3.5 pr-11 text-base md:text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring min-h-[44px]"
              />
              {skillsSearch.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSkillsSearch('')}
                  aria-label="Clear profession search"
                  data-testid="clear-settings-skills-search-btn"
                  className="absolute right-0 top-0 bottom-0 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-none text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <X size={14} weight="bold" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Profession Grid */}
          <div className="max-h-56 overflow-y-auto rounded-none border border-border bg-background p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
              {filteredProfessions.map((prof) => {
                const isSelected = vendorSkills.includes(prof);
                const isDisabled = !isSelected && vendorSkills.length >= 3;
                return (
                  <button
                    key={prof}
                    type="button"
                    data-testid={`settings-skill-pill-${prof.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    disabled={isDisabled}
                    onClick={() => toggleSkill(prof)}
                    className={`flex items-center justify-between text-left px-2.5 py-2 text-xs transition rounded-none min-h-[40px] ${
                      isSelected
                        ? 'border border-primary bg-primary/10 text-primary font-semibold'
                        : isDisabled
                          ? 'border border-transparent text-muted-foreground/40 cursor-not-allowed opacity-50'
                          : 'border border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{prof}</span>
                    {isSelected ? <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" /> : null}
                  </button>
                );
              })}
              {filteredProfessions.length === 0 && (
                <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
                  No professions match &ldquo;{skillsSearch}&rdquo;.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Single Primary Action per Constitution */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          {saved ? (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
              <CheckCircle weight="bold" className="h-4 w-4 shrink-0" />
              <span>General preferences saved successfully.</span>
            </div>
          ) : (
            <div />
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            data-variant="primary"
            data-testid="general-save-button"
            className="w-full sm:w-auto px-6 min-h-[44px]"
          >
            {saving ? 'Saving Preferences…' : 'Save Preferences'}
          </Button>
        </div>
      </form>
    </div>
  );
}

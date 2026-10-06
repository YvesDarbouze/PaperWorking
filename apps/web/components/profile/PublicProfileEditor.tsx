'use client';

import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import CounterpartyPreviewCard from './CounterpartyPreviewCard';
import { calculateProfileCompleteness } from '@/lib/profile/completeness';
import { STRATEGY_LABELS, type InvestmentStrategy } from '@/lib/profile/strategies';
import { getReil33KpiTrackRecord } from '@/lib/profile/reil-track-record';

const ALL_STRATEGIES = Object.keys(STRATEGY_LABELS) as InvestmentStrategy[];

export interface PublicProfileEditorProps {
  initialLoading?: boolean;
}

export default function PublicProfileEditor({ initialLoading = true }: PublicProfileEditorProps = {}) {
  const router = useRouter();

  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Authoritative REIL 33 Underwriting KPIs Track Record (System-Generated, Non-Editable)
  const reilTrackRecord = useMemo(() => getReil33KpiTrackRecord(), []);

  // Profile form state (Bio & Counterparty presentation)
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [headline, setHeadline] = useState('');
  const [publicBio, setPublicBio] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [strategies, setStrategies] = useState<InvestmentStrategy[]>([]);
  const [isVerified, setIsVerified] = useState(true);

  // Load profile from API
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/marketplace/profile', {
        headers: { Accept: 'application/json' },
      });

      if (res.status === 401) {
        // Expired or unauthenticated session -> redirect to login
        router.push('/login?next=/dashboard/profile');
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load profile (status ${res.status})`);
      }

      const data = await res.json();
      const p = data.profile || {};
      setDisplayName(p.displayName || '');
      setCompanyName(p.businessName || p.companyName || '');
      setHeadline(p.headline || '');
      setPublicBio(p.publicBio || '');
      setLocation(p.location || '');
      setWebsiteUrl(p.websiteUrl || '');
      setAvatarUrl(p.avatarUrl || p.avatar || '');
      setStrategies(p.strategies || ['buy_and_hold', 'multifamily']);
      if (typeof p.isVerified === 'boolean') setIsVerified(p.isVerified);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Compute profile data for live preview
  const previewProfile = useMemo(() => {
    return {
      displayName,
      companyName,
      headline,
      publicBio,
      location,
      websiteUrl,
      avatarUrl,
      strategies,
      isVerified,
      aumCents: Math.round(reilTrackRecord.aumMillions * 1_000_000 * 100),
      avgRoiPct: reilTrackRecord.avgRoiPct,
      equityMultiple: reilTrackRecord.equityMultiple,
      dealCount: reilTrackRecord.dealCount,
    };
  }, [
    displayName,
    companyName,
    headline,
    publicBio,
    location,
    websiteUrl,
    avatarUrl,
    strategies,
    isVerified,
    reilTrackRecord,
  ]);

  // Pure completeness calculation
  const completeness = useMemo(() => {
    return calculateProfileCompleteness(previewProfile);
  }, [previewProfile]);

  const toggleStrategy = (strat: InvestmentStrategy) => {
    setStrategies((prev) =>
      prev.includes(strat) ? prev.filter((s) => s !== strat) : [...prev, strat],
    );
  };

  const handleAvatarFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file size must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display Name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const payload = {
        displayName: displayName.trim(),
        businessName: companyName.trim(),
        headline: headline.trim(),
        publicBio: publicBio.trim(),
        location: location.trim(),
        websiteUrl: websiteUrl.trim(),
        avatarUrl: avatarUrl.trim(),
        strategies,
        aumCents: Math.round(reilTrackRecord.aumMillions * 1_000_000 * 100),
        avgRoiPct: reilTrackRecord.avgRoiPct,
        equityMultiple: reilTrackRecord.equityMultiple,
        dealCount: reilTrackRecord.dealCount,
        publicProfile: true,
      };

      const res = await fetch('/api/marketplace/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push('/login?next=/dashboard/profile');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save profile (${res.status})`);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="material-symbols-outlined animate-spin text-primary">
            progress_activity
          </span>
          Loading public profile…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 data-testid="profile-editor-heading" className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Public Profile
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          How counterparties, syndication partners, and capital allocators see you across Marketplace deals.
        </p>
      </div>

      {/* Completeness Meter */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Profile Completeness
            </h2>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {completeness.score}% Complete
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              completeness.score === 100
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
            }`}
          >
            {completeness.score === 100 ? 'Fully Verified' : 'In Progress'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${completeness.score}%` }}
          />
        </div>

        {/* Remaining Criteria Checklist */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {completeness.criteria.map((c) => (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${
                c.met
                  ? 'text-emerald-400/80'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {c.met ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Error and Success Banners */}
      {error && (
        <div
          data-testid="profile-error-banner"
          className="flex items-center justify-between rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={fetchProfile}
            className="border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/20"
          >
            Retry
          </Button>
        </div>
      )}

      {savedSuccess && (
        <div
          data-testid="profile-success-banner"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400"
        >
          <span className="material-symbols-outlined">check_circle</span>
          Profile successfully saved and synchronized with Marketplace identity!
        </div>
      )}

      {/* Editor & Live Preview 2-Column Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Editor Form (7 cols) */}
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-7">
          {/* Identity Section */}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              Operator Identity
            </h3>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Display Name <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="displayName"
                data-testid="profile-display-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                required
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Firm / Syndicate Name
              </label>
              <input
                id="companyName"
                data-testid="profile-company-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Capital Partners"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Headline */}
            <div>
              <label htmlFor="headline" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Professional Headline
              </label>
              <input
                id="headline"
                data-testid="profile-headline-input"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Austin & National Commercial Syndicator · 12 years active"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Public Bio */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="publicBio" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Public Bio &amp; Strategy Statement
                </label>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {publicBio.length}/600 chars
                </span>
              </div>
              <textarea
                id="publicBio"
                data-testid="profile-bio-input"
                rows={3}
                maxLength={600}
                value={publicBio}
                onChange={(e) => setPublicBio(e.target.value)}
                placeholder="Describe your asset focus, value-add playbook, and market coverage..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Location & Website */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="location" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Primary Market / Location
                </label>
                <input
                  id="location"
                  data-testid="profile-location-input"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Austin, TX"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label htmlFor="websiteUrl" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Website URL
                </label>
                <input
                  id="websiteUrl"
                  data-testid="profile-website-input"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://apexcapitalpartners.internal"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            {/* Avatar / Photo Upload */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Avatar / Firm Logo
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">cloud_upload</span>
                  Upload Image
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  >
                    Remove Photo
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Investment Strategies */}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              Investment Strategies
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Select all strategies that describe your acquisition parameters:
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_STRATEGIES.map((strat) => {
                const selected = strategies.includes(strat);
                return (
                  <button
                    key={strat}
                    type="button"
                    onClick={() => toggleStrategy(strat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      selected
                        ? 'border border-primary bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {selected && '✓ '}
                    {STRATEGY_LABELS[strat]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Provenance & Track Record Stats — Derived from REIL 33 KPIs (Non-Editable) */}
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Historical Track Record &amp; Metrics
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Derived from REIL system 33 Underwriting KPIs. Non-editable by operators.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/support/metrics"
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] no-underline transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">menu_book</span>
                  The Playbook (33 KPIs)
                </Link>
                <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  System Generated · REIL 33 KPIs
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-[var(--text-muted)] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-base text-emerald-400 shrink-0 mt-0.5">verified</span>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Institutional Track Record Verification</p>
                <p className="mt-0.5 leading-relaxed text-[11px] text-[var(--text-muted)]">
                  Performance metrics are derived directly from the Real Estate Investment Lifecycle (REIL) system and the 33 Underwriting KPIs. Operators cannot manually edit these values, guaranteeing verified provenance for counterparties, syndication partners, and capital allocators.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    AUM ($M)
                  </label>
                  <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-emerald-400">
                    <span className="material-symbols-outlined text-[11px]">lock</span>
                    KPI #1 &amp; #3
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-sm text-[var(--text-muted)]">$</span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    data-testid="profile-aum-input"
                    value={reilTrackRecord.aumMillions}
                    className="w-full font-mono text-lg font-bold text-[var(--text-primary)] bg-transparent border-0 p-0 outline-none cursor-not-allowed select-none"
                    aria-label="Assets Under Management in millions"
                  />
                  <span className="font-mono text-sm font-semibold text-[var(--text-muted)]">M</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] truncate" title="Gross Purchase & Total Capitalized Basis">
                  Gross Purchase &amp; Basis
                </p>
              </div>

              <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Realized IRR %
                  </label>
                  <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-emerald-400">
                    <span className="material-symbols-outlined text-[11px]">lock</span>
                    KPI #10
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    data-testid="profile-roi-input"
                    value={reilTrackRecord.avgRoiPct}
                    className="w-full font-mono text-lg font-bold text-[var(--text-primary)] bg-transparent border-0 p-0 outline-none cursor-not-allowed select-none"
                    aria-label="Realized Internal Rate of Return percentage"
                  />
                  <span className="font-mono text-sm font-semibold text-[var(--text-muted)]">%</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] truncate" title="Levered Internal Rate of Return">
                  Levered IRR (Annualized)
                </p>
              </div>

              <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Equity Multiple
                  </label>
                  <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-emerald-400">
                    <span className="material-symbols-outlined text-[11px]">lock</span>
                    KPI #11
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    data-testid="profile-multiple-input"
                    value={reilTrackRecord.equityMultiple}
                    className="w-full font-mono text-lg font-bold text-[var(--text-primary)] bg-transparent border-0 p-0 outline-none cursor-not-allowed select-none"
                    aria-label="Equity Multiple MOIC"
                  />
                  <span className="font-mono text-sm font-semibold text-[var(--text-muted)]">×</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] truncate" title="Multiple on Invested Capital (MOIC)">
                  Multiple on Invested Capital
                </p>
              </div>

              <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Exits / Deals
                  </label>
                  <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-emerald-400">
                    <span className="material-symbols-outlined text-[11px]">lock</span>
                    KPIs #27–#33
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    data-testid="profile-deals-input"
                    value={reilTrackRecord.dealCount}
                    className="w-full font-mono text-lg font-bold text-[var(--text-primary)] bg-transparent border-0 p-0 outline-none cursor-not-allowed select-none"
                    aria-label="Completed Exits and Deals"
                  />
                  <span className="font-mono text-sm font-semibold text-[var(--text-muted)]">closed</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] truncate" title="Executed REIL Phase 4 Dispositions">
                  Executed Dispositions
                </p>
              </div>
            </div>
          </section>

          {/* Form Action: Single Primary Button per Constitution */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving}
              data-variant="primary"
              data-testid="profile-save-button"
              className="px-6"
            >
              {saving ? 'Saving Profile…' : 'Save Profile'}
            </Button>
          </div>
        </form>

        {/* Right Column: Live Counterparty Preview (5 cols, sticky) */}
        <aside className="lg:col-span-5">
          <div className="sticky top-20 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              This is how others see you:
            </p>
            <CounterpartyPreviewCard profile={previewProfile} />
          </div>
        </aside>
      </div>
    </div>
  );
}

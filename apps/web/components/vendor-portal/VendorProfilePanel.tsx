'use client';

import { useEffect, useState, useMemo } from 'react';
import type { VendorProfileData } from '@/lib/vendor-portal/seed-data';
import { bffFetch } from '@/lib/api/bff-fetch';
import { CANONICAL_VENDOR_PROFESSIONS } from '@/lib/marketplace/vendor-professions';
import { Briefcase, Check, X } from '@phosphor-icons/react';

export default function VendorProfilePanel({
  initialProfile = null,
  initialLoading = initialProfile === null,
  initialSkillsSearch = '',
}: {
  initialProfile?: VendorProfileData | null;
  initialLoading?: boolean;
  initialSkillsSearch?: string;
} = {}) {
  const [profile, setProfile] = useState<VendorProfileData | null>(initialProfile);
  const [loading, setLoading] = useState(initialLoading);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [skillsSearch, setSkillsSearch] = useState(initialSkillsSearch);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await bffFetch('/api/vendor-portal/profile', {
          cache: 'no-store',
        });
        const body = (await response.json()) as {
          profile?: VendorProfileData;
          error?: string | { message?: string };
        };
        const errMsg =
          typeof body.error === 'string'
            ? body.error
            : body.error?.message || 'Failed to load profile';
        if (!response.ok) throw new Error(errMsg);
        if (!cancelled) setProfile(body.profile ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof VendorProfileData>(key: K, value: VendorProfileData[K]) => {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  };

  const toggleSkill = (skill: string) => {
    if (!profile) return;
    const current = profile.vendorSkills ?? [];
    let updated: string[];
    if (current.includes(skill)) {
      updated = current.filter((s) => s !== skill);
    } else {
      if (current.length >= 3) return;
      updated = [...current, skill];
    }
    setProfile({
      ...profile,
      vendorSkills: updated,
      type: updated[0] || profile.type,
      specialties: updated,
    });
    setSaved(false);
  };

  const filteredProfessions = useMemo(() => {
    if (!skillsSearch.trim()) return CANONICAL_VENDOR_PROFESSIONS;
    const q = skillsSearch.toLowerCase().trim();
    return CANONICAL_VENDOR_PROFESSIONS.filter((prof) => prof.toLowerCase().includes(q));
  }, [skillsSearch]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    if (!profile.vendorSkills || profile.vendorSkills.length === 0) {
      setError('Please select between 1 and 3 professional skills to post on the Vendor Directory.');
      return;
    }
    if (profile.vendorSkills.length > 3) {
      setError('You can select a maximum of 3 professional skills.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await bffFetch('/api/vendor-portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const body = (await response.json()) as {
        profile?: VendorProfileData;
        error?: string | { message?: string };
      };
      const errMsg =
        typeof body.error === 'string'
          ? body.error
          : body.error?.message || 'Failed to save profile';
      if (!response.ok) throw new Error(errMsg);
      setProfile(body.profile ?? profile);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[960px] px-4 py-8 text-sm text-white/60 md:px-8">
        Loading vendor profile...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-[960px] px-4 py-8 md:px-8">
        <div className="rounded-none border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-100">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-[960px] space-y-6 px-4 py-6 md:px-8 md:py-8">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Vendor profile
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.02em]">Marketplace presence</h2>
        <p className="mt-2 text-sm text-white/65">
          Manage your vendor directory profile, certified trade specialties, and availability for incoming quote requests.
        </p>
      </section>

      {error ? (
        <div className="rounded-none border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-none border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-100">
          Profile saved.
        </div>
      ) : null}

      <section>
        <label className="block text-sm">
          <span className="text-white/65">Company name</span>
          <input
            value={profile.companyName}
            onChange={(event) => updateField('companyName', event.target.value)}
            className="mt-2 w-full rounded-none border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
      </section>

      {/* 1 to 3 Vendor Professions Selection */}
      <section className="space-y-3 rounded-none border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-white/80" />
              <span className="text-sm font-semibold text-white">Vendor Directory Skills (1–3 Skills)</span>
            </div>
            <p className="text-xs text-white/60">
              Select 1 to 3 skills to identify your trade in search engines and publish your listing on the directory.
            </p>
          </div>
          <span className="text-xs text-white/80 border border-white/20 bg-white/5 px-2.5 py-1 rounded-none self-start sm:self-auto">
            {(profile.vendorSkills ?? []).length}/3 Skills Selected
          </span>
        </div>

        {/* Selected skills */}
        {(profile.vendorSkills ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {(profile.vendorSkills ?? []).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-none border border-white/20 bg-white/10 px-3 py-1 text-xs text-white"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="text-white/60 hover:text-white"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Filter input */}
        <div className="relative">
          <input
            type="text"
            aria-label="Search professions"
            data-testid="vendor-profile-skills-search-input"
            placeholder="Filter 38 certified professions..."
            value={skillsSearch}
            onChange={(e) => setSkillsSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && skillsSearch) {
                e.preventDefault();
                setSkillsSearch('');
              }
            }}
            className="w-full min-h-[44px] rounded-none border border-white/10 bg-black/30 py-2 pl-3 pr-11 text-base md:text-xs text-white placeholder:text-white/40 outline-none focus:border-white/30"
          />
          {skillsSearch.length > 0 ? (
            <button
              type="button"
              onClick={() => setSkillsSearch('')}
              aria-label="Clear search"
              data-testid="clear-vendor-profile-skills-search-btn"
              className="absolute right-0 top-0 bottom-0 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-none text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            >
              <X size={14} weight="bold" />
            </button>
          ) : null}
        </div>

        {/* Grid */}
        <div className="max-h-48 overflow-y-auto rounded-none border border-white/10 bg-black/40 p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
            {filteredProfessions.map((prof) => {
              const isSelected = (profile.vendorSkills ?? []).includes(prof);
              const isDisabled = !isSelected && (profile.vendorSkills ?? []).length >= 3;
              return (
                <button
                  key={prof}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggleSkill(prof)}
                  className={`flex items-center justify-between text-left px-2.5 py-1.5 text-xs rounded-none transition ${
                    isSelected
                      ? 'border border-white/40 bg-white/20 text-white font-semibold'
                      : isDisabled
                        ? 'border border-transparent text-white/30 cursor-not-allowed opacity-40'
                        : 'border border-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">{prof}</span>
                  {isSelected ? <Check className="h-3 w-3 text-white shrink-0 ml-1" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <label className="block text-sm">
        <span className="text-white/65">Bio</span>
        <textarea
          value={profile.bio}
          onChange={(event) => updateField('bio', event.target.value)}
          className="mt-2 min-h-28 w-full rounded-none border border-white/10 bg-black/30 px-3 py-2"
        />
      </label>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-white/65">Fee range label</span>
          <input
            value={profile.feeRangeLabel}
            onChange={(event) => updateField('feeRangeLabel', event.target.value)}
            className="mt-2 w-full rounded-none border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/65">Avg turnaround (days)</span>
          <input
            type="number"
            min={1}
            value={profile.avgTurnaroundDays}
            onChange={(event) => updateField('avgTurnaroundDays', Number(event.target.value))}
            className="mt-2 w-full rounded-none border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
      </section>

      <label className="block text-sm">
        <span className="text-white/65">Availability</span>
        <select
          value={profile.availability}
          onChange={(event) =>
            updateField('availability', event.target.value as VendorProfileData['availability'])
          }
          className="mt-2 w-full rounded-none border border-white/10 bg-black/30 px-3 py-2 md:max-w-sm"
        >
          <option value="Available">Available</option>
          <option value="Busy">Busy</option>
          <option value="Available in 1 week">Available in 1 week</option>
        </select>
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] rounded-none bg-white px-5 py-2 text-sm text-black disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}

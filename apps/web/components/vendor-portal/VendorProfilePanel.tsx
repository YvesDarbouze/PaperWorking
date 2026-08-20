'use client';

import { useEffect, useState } from 'react';
import type { VendorProfileData } from '@/lib/vendor-portal/seed-data';

const VENDOR_TYPES = [
  'General Contractor',
  'Property Manager',
  'Real Estate Attorney',
  'Inspector',
  'Title Company',
];

export default function VendorProfilePanel() {
  const [profile, setProfile] = useState<VendorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/vendor-portal/profile', {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = (await response.json()) as { profile?: VendorProfileData; error?: string };
        if (!response.ok) throw new Error(body.error ?? 'Failed to load profile');
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

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/vendor-portal/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const body = (await response.json()) as { profile?: VendorProfileData; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to save profile');
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
        Loading vendor profile…
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-[960px] px-4 py-8 md:px-8">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-100">
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
          Dev profile store backed by `/api/vendor-portal/profile` for migration preview.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-100">
          Profile saved.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-white/65">Company name</span>
          <input
            value={profile.companyName}
            onChange={(event) => updateField('companyName', event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/65">Vendor type</span>
          <select
            value={profile.type}
            onChange={(event) => updateField('type', event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          >
            {VENDOR_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </section>

      <label className="block text-sm">
        <span className="text-white/65">Bio</span>
        <textarea
          value={profile.bio}
          onChange={(event) => updateField('bio', event.target.value)}
          className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
        />
      </label>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-white/65">Fee range label</span>
          <input
            value={profile.feeRangeLabel}
            onChange={(event) => updateField('feeRangeLabel', event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/65">Avg turnaround (days)</span>
          <input
            type="number"
            min={1}
            value={profile.avgTurnaroundDays}
            onChange={(event) => updateField('avgTurnaroundDays', Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
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
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 md:max-w-sm"
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
          className="rounded-full bg-white px-5 py-2 text-sm text-black disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}

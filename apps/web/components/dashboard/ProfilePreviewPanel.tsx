'use client';

import Link from 'next/link';
import { useState } from 'react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { PROFILE_PREVIEW } from '@/lib/dashboard/shell-seed';

export default function ProfilePreviewPanel() {
  const [name, setName] = useState(PROFILE_PREVIEW.name);
  const [phone, setPhone] = useState(PROFILE_PREVIEW.phone);
  const [org, setOrg] = useState(PROFILE_PREVIEW.organization);
  const [saved, setSaved] = useState(false);

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <Link href="/dashboard/settings" className="text-sm text-[#7A9EAA] no-underline hover:underline">
        ← Settings
      </Link>

      <DashboardPageHeader title="Profile" subtitle={`${PROFILE_PREVIEW.role} · ${PROFILE_PREVIEW.email}`} />

      <section className="rounded-2xl border border-white/10 bg-[#121014]/90 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#454955] text-xl font-bold text-white">
              {initials}
            </div>
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-[#121014]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#fdfffc]">{name}</h2>
            <p className="text-sm text-white/55">{org}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#627C85]">
              {PROFILE_PREVIEW.role}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#121014]/90 p-6">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
          Personal details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block text-white/45">Display name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-white/45">Email</span>
            <input
              value={PROFILE_PREVIEW.email}
              readOnly
              className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-white/60"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-white/45">Phone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-white/45">Organization</span>
            <input
              value={org}
              onChange={(event) => setOrg(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="mt-5 rounded-lg bg-[#454955] px-4 py-2 text-[12px] font-semibold text-white"
        >
          {saved ? 'Saved (seed preview)' : 'Save changes'}
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#121014]/90 p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
            Security
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-3">
              <div>
                <p className="font-medium text-white/85">Two-factor authentication</p>
                <p className="text-xs text-white/45">
                  {PROFILE_PREVIEW.mfaEnabled ? 'Enabled' : 'Not enabled (mock)'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/70"
              >
                Configure
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-3">
              <div>
                <p className="font-medium text-white/85">Password</p>
                <p className="text-xs text-white/45">Last changed · seed preview</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/70"
              >
                Reset
              </button>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#121014]/90 p-5">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">
            Recent activity
          </h3>
          <ul className="space-y-3">
            {PROFILE_PREVIEW.activity.map((item) => (
              <li key={item.id} className="border-b border-white/6 pb-2 last:border-0">
                <p className="text-sm text-white/85">{item.title}</p>
                <p className="text-[11px] text-white/40">{item.time}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.05] p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-rose-300">Danger zone</h3>
        <p className="mt-2 text-sm text-white/65">
          Account deletion and data export remain disabled until GDPR handlers are cut over.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 rounded-lg border border-rose-400/30 px-3 py-2 text-[12px] font-semibold text-rose-300/60"
        >
          Delete account (unavailable)
        </button>
      </section>
    </div>
  );
}

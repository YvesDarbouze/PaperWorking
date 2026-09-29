'use client';

import Link from 'next/link';
import { useState } from 'react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { PROFILE_PREVIEW } from '@/lib/dashboard/shell-seed';

export default function ProfilePreviewPanel() {
  const [name, setName] = useState<string>(PROFILE_PREVIEW.name);
  const [phone, setPhone] = useState<string>(PROFILE_PREVIEW.phone);
  const [org, setOrg] = useState<string>(PROFILE_PREVIEW.organization);
  const [saved, setSaved] = useState(false);

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <Link href="/dashboard/settings" className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground no-underline hover:text-foreground hover:underline">
        ← Settings
      </Link>

      <DashboardPageHeader title="Profile" subtitle={`${PROFILE_PREVIEW.role} · ${PROFILE_PREVIEW.email}`} />

      <section className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-none border border-border bg-muted text-xl font-bold text-foreground">
              {initials}
            </div>
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-none bg-[var(--status-live)] ring-2 ring-card" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{name}</h2>
            <p className="text-sm text-muted-foreground">{org}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {PROFILE_PREVIEW.role}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Personal details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Display name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Email</span>
            <input
              value={PROFILE_PREVIEW.email}
              readOnly
              className="w-full min-h-[44px] rounded-none border border-border bg-muted/30 px-3 py-2 text-base sm:text-xs text-muted-foreground focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Phone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Organization</span>
            <input
              value={org}
              onChange={(event) => setOrg(event.target.value)}
              className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-none bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 touch-target"
        >
          {saved ? 'Saved (seed preview)' : 'Save changes'}
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Security
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-muted/20 px-3 py-3">
              <div>
                <p className="font-medium text-foreground">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">
                  {PROFILE_PREVIEW.mfaEnabled ? 'Enabled' : 'Not enabled'}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center rounded-none border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground hover:bg-muted touch-target"
              >
                Configure
              </button>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-muted/20 px-3 py-3">
              <div>
                <p className="font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground">Last changed · seed preview</p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center rounded-none border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground hover:bg-muted touch-target"
              >
                Reset
              </button>
            </div>
          </div>
        </article>

        <article className="rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Recent activity
          </h3>
          <ul className="space-y-3">
            {PROFILE_PREVIEW.activity.map((item) => (
              <li key={item.id} className="border-b border-border/50 pb-2 last:border-0">
                <p className="text-sm text-foreground/80">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.time}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-none border border-rose-500/25 bg-rose-500/[0.05] p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-rose-300">Danger zone</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Account deletion and data export remain disabled until GDPR handlers are cut over.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 inline-flex min-h-[44px] items-center rounded-none border border-rose-400/30 px-4 py-2 text-xs font-semibold text-rose-300/60"
        >
          Delete account (unavailable)
        </button>
      </section>
    </div>
  );
}

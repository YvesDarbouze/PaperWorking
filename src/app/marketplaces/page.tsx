'use client';

import { useState } from 'react';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /marketplaces — Public Marketplaces Hub

   Two tabs (Find Professionals is default):
     [Find Professionals]  [Find Deals]
   ═══════════════════════════════════════════════════════ */

const TABS = [
  { id: 'professionals', label: 'Find Professionals' },
  { id: 'deals',         label: 'Find Deals' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/* ─── Stub data ──────────────────────────────────────── */

const PROFESSIONAL_CATEGORIES = [
  { icon: 'gavel',             label: 'Real Estate Attorneys',    count: 142 },
  { icon: 'home_work',         label: 'Title Companies',          count: 89  },
  { icon: 'account_balance',   label: 'Hard Money Lenders',       count: 217 },
  { icon: 'construction',      label: 'General Contractors',      count: 384 },
  { icon: 'search_home',       label: 'Property Inspectors',      count: 156 },
  { icon: 'real_estate_agent', label: 'Buyer\'s Agents',         count: 521 },
  { icon: 'calculate',         label: 'CPA / Tax Advisors',       count: 98  },
  { icon: 'groups',            label: 'Property Managers',        count: 203 },
];

const DEAL_LISTINGS = [
  {
    id: '1',
    address: '3812 Maple Ave, Dallas TX',
    type: 'Fix & Flip',
    askingPrice: '$385,000',
    arv: '$510,000',
    rehab: '$52,000',
    irr: '22.4%',
    daysListed: 3,
    badge: 'HOT',
    badgeColor: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    id: '2',
    address: '906 Riverside Dr, Austin TX',
    type: 'Buy & Hold',
    askingPrice: '$460,000',
    arv: '$580,000',
    rehab: '$28,000',
    irr: '18.7%',
    daysListed: 7,
    badge: 'NEW',
    badgeColor: 'text-secondary bg-secondary/10 border-secondary/20',
  },
  {
    id: '3',
    address: '1204 Oak Blvd, Houston TX',
    type: 'BRRRR',
    askingPrice: '$320,000',
    arv: '$440,000',
    rehab: '$61,000',
    irr: '26.1%',
    daysListed: 14,
    badge: null,
    badgeColor: '',
  },
  {
    id: '4',
    address: '78 Lakeview Cir, San Antonio TX',
    type: 'Fix & Flip',
    askingPrice: '$215,000',
    arv: '$298,000',
    rehab: '$34,000',
    irr: '19.9%',
    daysListed: 21,
    badge: null,
    badgeColor: '',
  },
  {
    id: '5',
    address: '2290 Pinewood St, Fort Worth TX',
    type: 'Wholesale',
    askingPrice: '$175,000',
    arv: '$265,000',
    rehab: '$46,000',
    irr: '31.2%',
    daysListed: 2,
    badge: 'HOT',
    badgeColor: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    id: '6',
    address: '5501 Birchwood Dr, Plano TX',
    type: 'Buy & Hold',
    askingPrice: '$540,000',
    arv: '$660,000',
    rehab: '$18,000',
    irr: '14.2%',
    daysListed: 9,
    badge: null,
    badgeColor: '',
  },
];

/* ─── Find Professionals tab content ─────────────────── */

function FindProfessionals() {
  return (
    <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-12">

      {/* Search bar */}
      <div className="flex gap-3 mb-10">
        <div
          className="flex-1 flex items-center gap-3 px-4 h-12 rounded-xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'color-mix(in srgb, var(--color-on-background) 10%, transparent)' }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--color-on-surface)', opacity: 0.4 }}>search</span>
          <input
            type="text"
            placeholder="Search by specialty, name, or location…"
            className="flex-1 text-[14px] bg-transparent outline-none"
            style={{ color: 'var(--color-on-surface)' }}
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-5 h-12 rounded-xl text-[13.5px] font-semibold transition-opacity duration-150"
          style={{
            background: 'var(--color-on-surface)',
            color: 'var(--color-surface)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
          Filter
        </button>
      </div>

      {/* Category grid */}
      <h2
        className="text-[15px] font-semibold mb-5"
        style={{ color: 'var(--color-on-surface)' }}
      >
        Browse by Category
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-14">
        {PROFESSIONAL_CATEGORIES.map(({ icon, label, count }) => (
          <button
            key={label}
            type="button"
            className="flex flex-col items-start gap-3 p-5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid color-mix(in srgb, var(--color-on-background) 8%, transparent)',
              cursor: 'pointer',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ color: 'var(--color-primary)', fontVariationSettings: "'FILL' 0" }}
              >
                {icon}
              </span>
            </div>
            <div>
              <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-on-surface)' }}>{label}</div>
              <div className="text-[12px] mt-0.5" style={{ color: 'var(--color-on-surface)', opacity: 0.45 }}>
                {count.toLocaleString()} listed
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* CTA for vendors */}
      <div
        className="rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        style={{
          background: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))',
          border: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)',
        }}
      >
        <div>
          <h3 className="text-[16px] font-bold mb-1" style={{ color: 'var(--color-on-surface)' }}>
            Are you a real estate professional?
          </h3>
          <p className="text-[14px]" style={{ color: 'var(--color-on-surface)', opacity: 0.6 }}>
            List your services and connect with active investors in your market.
          </p>
        </div>
        <Link
          href="/for-pros"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13.5px] font-semibold whitespace-nowrap transition-opacity"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Get Listed
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

/* ─── Find Deals tab content ─────────────────────────── */

function FindDeals() {
  return (
    <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-12">

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <div
          className="flex-1 flex items-center gap-3 px-4 h-12 rounded-xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'color-mix(in srgb, var(--color-on-background) 10%, transparent)' }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--color-on-surface)', opacity: 0.4 }}>location_on</span>
          <input
            type="text"
            placeholder="City, zip, or address…"
            className="flex-1 text-[14px] bg-transparent outline-none"
            style={{ color: 'var(--color-on-surface)' }}
          />
        </div>
        <div
          className="flex items-center gap-3 px-4 h-12 rounded-xl border sm:w-48"
          style={{ background: 'var(--color-surface)', borderColor: 'color-mix(in srgb, var(--color-on-background) 10%, transparent)' }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--color-on-surface)', opacity: 0.4 }}>filter_list</span>
          <select
            className="flex-1 text-[14px] bg-transparent outline-none"
            style={{ color: 'var(--color-on-surface)', border: 'none' }}
          >
            <option>All types</option>
            <option>Fix &amp; Flip</option>
            <option>Buy &amp; Hold</option>
            <option>BRRRR</option>
            <option>Wholesale</option>
          </select>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 px-5 h-12 rounded-xl text-[13.5px] font-semibold"
          style={{ background: 'var(--color-on-surface)', color: 'var(--color-surface)', border: 'none', cursor: 'pointer' }}
        >
          Search
        </button>
      </div>

      {/* Results count */}
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-on-surface)', opacity: 0.5 }}>
        {DEAL_LISTINGS.length} active listings · Sorted by date added
      </p>

      {/* Deal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {DEAL_LISTINGS.map(({ id, address, type, askingPrice, arv, rehab, irr, daysListed, badge, badgeColor }) => (
          <div
            key={id}
            className="rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.015] active:scale-[0.99]"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid color-mix(in srgb, var(--color-on-background) 8%, transparent)',
            }}
          >
            {/* Map placeholder */}
            <div
              className="h-32 flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-surface-container))' }}
            >
              <span
                className="material-symbols-outlined text-[36px]"
                style={{ color: 'var(--color-primary)', opacity: 0.3, fontVariationSettings: "'FILL' 1" }}
              >
                home_pin
              </span>
            </div>

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <div className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--color-on-surface)' }}>
                    {address}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-on-surface)', opacity: 0.45 }}>
                    {type} · {daysListed}d ago
                  </div>
                </div>
                {badge && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Asking', value: askingPrice },
                  { label: 'ARV',    value: arv         },
                  { label: 'Rehab',  value: rehab        },
                  { label: 'IRR',    value: irr,  highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div
                    key={label}
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: 'color-mix(in srgb, var(--color-on-background) 4%, transparent)' }}
                  >
                    <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-on-surface)', opacity: 0.35 }}>
                      {label}
                    </div>
                    <div
                      className="text-[14px] font-bold"
                      style={{ color: highlight ? 'var(--color-primary)' : 'var(--color-on-surface)' }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity"
                style={{
                  border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                  color: 'var(--color-primary)',
                  background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)',
                  cursor: 'pointer',
                }}
              >
                View Deal Details
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Post a deal CTA */}
      <div
        className="rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        style={{
          background: 'color-mix(in srgb, var(--color-secondary) 6%, var(--color-surface))',
          border: '1px solid color-mix(in srgb, var(--color-secondary) 15%, transparent)',
        }}
      >
        <div>
          <h3 className="text-[16px] font-bold mb-1" style={{ color: 'var(--color-on-surface)' }}>
            Have a deal to share?
          </h3>
          <p className="text-[14px]" style={{ color: 'var(--color-on-surface)', opacity: 0.6 }}>
            Post your property to reach thousands of active investors on the platform.
          </p>
        </div>
        <Link
          href="/register"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13.5px] font-semibold whitespace-nowrap transition-opacity"
          style={{
            background: 'var(--color-secondary)',
            color: 'var(--color-on-secondary)',
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Post a Deal
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────── */

export default function MarketplacesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('professionals');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)', color: 'var(--color-on-background)' }}>
      <LandingHeader />

      {/* Page header */}
      <div
        className="pt-[72px]"
        style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-on-background) 6%, transparent)' }}
      >
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 pt-10 pb-0">
          <h1 className="text-[28px] md:text-[36px] font-bold tracking-[-0.03em] mb-2" style={{ color: 'var(--color-on-surface)' }}>
            Marketplaces
          </h1>
          <p className="text-[15px] mb-8" style={{ color: 'var(--color-on-surface)', opacity: 0.55 }}>
            Connect with vetted professionals and discover off-market investment opportunities.
          </p>

          {/* Tab bar */}
          <div className="flex gap-1" role="tablist" aria-label="Marketplace tabs">
            {TABS.map(({ id, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(id)}
                  className="relative px-5 py-3 text-[14px] font-semibold transition-colors duration-150"
                  style={{
                    color: active ? 'var(--color-primary)' : 'var(--color-on-surface)',
                    opacity: active ? 1 : 0.5,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                  {/* Active underline */}
                  {active && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                      style={{ background: 'var(--color-primary)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <main className="flex-1">
        {activeTab === 'professionals' ? <FindProfessionals /> : <FindDeals />}
      </main>

      <LandingFooter />
    </div>
  );
}

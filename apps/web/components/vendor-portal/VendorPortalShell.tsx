'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/vendor-portal', label: 'Requests' },
  { href: '/vendor-portal/profile', label: 'Profile' },
];

export default function VendorPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      <header className="border-b border-white/8 bg-black/30">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">Vendor portal</p>
            <h1 className="text-xl font-semibold">Lead inbox & profile</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-white/65 underline-offset-4 hover:underline">
            Investor dashboard
          </Link>
        </div>
        <nav className="mx-auto flex max-w-[1280px] gap-2 px-4 pb-4 md:px-8">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  active
                    ? 'bg-white text-black'
                    : 'border border-white/15 text-white/70 hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/subscriptions', label: 'Billing' },
  { href: '/admin/tickets', label: 'Tickets' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/marketplace', label: 'Marketplace' },
  { href: '/admin/agent-crew', label: 'Agent crew' },
  { href: '/admin/lender-config', label: 'Lender config' },
];

export default function AdminPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#111]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">
              Platform admin
            </p>
            <h1 className="text-xl font-semibold">PaperWorking Admin</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-black/60 underline-offset-4 hover:underline">
            Exit to dashboard
          </Link>
        </div>
        <nav className="mx-auto flex max-w-[1280px] gap-2 overflow-x-auto px-4 pb-4 md:px-8">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : Boolean(pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                  active
                    ? 'bg-black text-white'
                    : 'border border-black/10 text-black/70 hover:bg-black/5'
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

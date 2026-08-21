import Link from 'next/link';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { SETTINGS_SECTIONS } from '@/lib/dashboard/shell-seed';

export default function SettingsHubPanel() {
  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-7 xl:px-8">
      <DashboardPageHeader
        title="Settings"
        subtitle="Workspace preferences — matching the classic eight-section settings shell"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => (
          <article
            key={section.id}
            className="flex flex-col rounded-2xl border border-white/10 bg-[#121014]/90 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          >
            <h3 className="mb-2 text-lg font-semibold text-[#fdfffc]">{section.title}</h3>
            <p className="mb-5 flex-1 text-sm text-white/65">{section.description}</p>
            {section.disabled ? (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/35">
                Coming post-cutover
              </span>
            ) : (
              <Link
                href={section.href}
                className="inline-flex w-fit rounded-lg bg-[#fdfffc] px-4 py-2 text-sm font-semibold text-[#0d0a0b] no-underline"
              >
                Open
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

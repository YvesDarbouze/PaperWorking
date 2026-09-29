import Link from 'next/link';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { SETTINGS_SECTIONS } from '@/lib/dashboard/shell-seed';

export default function SettingsHubPanel() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Settings"
        subtitle="Workspace preferences: matching the classic eight-section settings shell"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => (
          <article
            key={section.id}
            className="flex flex-col rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10"
          >
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">{section.title}</h3>
            <p className="mb-5 flex-1 text-sm text-muted-foreground">{section.description}</p>
            {section.disabled ? (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                Coming post-cutover
              </span>
            ) : (
              <Link
                href={section.href}
                className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-none bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground no-underline shadow-sm transition hover:opacity-90 touch-target"
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

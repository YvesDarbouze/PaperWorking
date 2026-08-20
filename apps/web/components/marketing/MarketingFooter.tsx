import Link from 'next/link';
import Logo from '@/components/marketing/Logo';
import { FOOTER_COLUMNS } from '@/lib/marketing/content';

export default function MarketingFooter() {
  return (
    <footer className="w-full border-t" style={{ borderColor: 'var(--nav-border)' }}>
      <div className="mx-auto max-w-[1280px] px-5 pb-12 pt-16 md:px-10">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-5 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo href="/home" className="mb-5 block" />
            <p
              className="mb-6 max-w-[220px] text-[13.5px] leading-relaxed"
              style={{ color: 'var(--color-on-surface-variant)', opacity: 0.75 }}
            >
              Precision deal management for serious real estate investors.
            </p>
            <Link href="/pricing" className="pw-pill-cta inline-flex text-[12.5px]">
              Start Free Trial
            </Link>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="pw-section-eyebrow mb-4">{column.heading}</p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] transition-opacity duration-150"
                      style={{ color: 'var(--color-on-surface-variant)', opacity: 0.8, textDecoration: 'none' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-[12px]" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>
          © {new Date().getFullYear()} PaperWorking. Architecture migration preview.
        </p>
      </div>
    </footer>
  );
}

import Link from 'next/link';
import Logo from '@/components/brand/Logo';

/* Inline SVGs — Twitter/X and Facebook were removed from lucide-react.
   Using raw paths avoids any icon library version coupling. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.696 4.533-4.696 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-[var(--pw-border)] py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
        <div className="flex items-center gap-8">
          <Logo size="sm" />
          <span className="text-xs font-bold text-[var(--pw-muted)] uppercase tracking-widest">
            © 2026 PaperWorking Corp
          </span>
        </div>
        <nav className="flex items-center gap-8" aria-label="Footer navigation">
          <Link
            href="#faq"
            className="text-xs font-bold text-[var(--pw-subtle)] uppercase tracking-widest hover:text-[var(--pw-black)] transition-colors"
          >
            FAQ
          </Link>
          <div className="flex items-center gap-4 border-l border-[var(--pw-border)] pl-8">
            <Link
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors"
            >
              <span className="sr-only">X (Twitter)</span>
              <XIcon className="h-5 w-5" />
            </Link>
            <Link
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors"
            >
              <span className="sr-only">Facebook</span>
              <FacebookIcon className="h-5 w-5" />
            </Link>
          </div>
        </nav>
      </div>
    </footer>
  );
}

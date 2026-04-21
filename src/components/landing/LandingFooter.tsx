import Link from 'next/link';
import { Twitter, Facebook } from 'lucide-react';
import Logo from '@/components/brand/Logo';

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
            <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors">
              <span className="sr-only">Twitter</span>
              <Twitter className="h-5 w-5" />
            </Link>
            <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors">
              <span className="sr-only">Facebook</span>
              <Facebook className="h-5 w-5" />
            </Link>
          </div>
        </nav>
      </div>
    </footer>
  );
}

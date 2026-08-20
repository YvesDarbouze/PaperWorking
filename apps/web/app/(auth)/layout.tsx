import Link from 'next/link';
import type { Metadata } from 'next';
import Logo from '@/components/marketing/Logo';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout relative flex min-h-screen flex-col overflow-x-hidden">
      <nav className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-center border-b border-white/5 bg-[#0d0a0b]/40 px-6 backdrop-blur-md md:px-10">
        <div className="flex w-full max-w-7xl items-center justify-between">
          <Logo href="/" tone="auth" />
        </div>
      </nav>

      <main className="z-10 mt-16 flex w-full flex-grow items-center justify-center px-4 py-8">
        {children}
      </main>

      <footer className="relative z-10 mt-auto flex w-full flex-col items-center gap-2 bg-transparent py-8">
        <div className="mb-2 flex items-center gap-6">
          <Link href="/privacy" className="text-xs text-[#859490] transition-colors hover:text-[#454955]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-xs text-[#859490] transition-colors hover:text-[#454955]">
            Terms of Service
          </Link>
        </div>
        <p className="text-xs text-[#859490]/60">© {new Date().getFullYear()} PaperWorking. Secure Infrastructure.</p>
      </footer>
    </div>
  );
}

import Link from 'next/link';
import Logo from '@/components/marketing/Logo';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function AuthCard({ children, className = '' }: AuthCardProps) {
  return (
    <div className={`auth-card relative overflow-hidden p-6 md:p-10 ${className}`}>
      <div
        className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-tr-xl border-r border-t"
        style={{ borderColor: 'rgba(69, 73, 85, 0.2)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-16 w-16 rounded-bl-xl border-b border-l"
        style={{ borderColor: 'rgba(69, 73, 85, 0.2)' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function AuthFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-[#ffb4ab]">{message}</p>;
}

export function AuthNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border px-4 py-3 text-sm leading-relaxed" style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(253,255,252,0.72)' }}>
      {children}
    </p>
  );
}

export function AuthBackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-[rgba(253,255,252,0.65)] no-underline transition-opacity hover:opacity-100">
      {children}
    </Link>
  );
}

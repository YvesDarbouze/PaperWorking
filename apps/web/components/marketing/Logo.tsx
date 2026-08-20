import Link from 'next/link';

interface LogoProps {
  href?: string;
  className?: string;
  tone?: 'marketing' | 'auth';
}

export default function Logo({ href = '/', className = '', tone = 'marketing' }: LogoProps) {
  const colorClass = tone === 'auth' ? 'text-[#fdfffc]' : 'text-[var(--color-on-surface)]';
  const mark = (
    <span className={`inline-flex items-baseline gap-0.5 ${className}`}>
      <span className="font-bold tracking-[-0.01em]">Paper</span>
      <span className="font-light tracking-[-0.01em]">Working</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={`${colorClass} no-underline`}>
        {mark}
      </Link>
    );
  }

  return mark;
}

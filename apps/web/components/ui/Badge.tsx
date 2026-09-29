import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link';

export function badgeVariants({
  variant = 'default',
  className = '',
}: {
  variant?: BadgeVariant;
  className?: string;
} = {}) {
  const base =
    'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-transparent px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 [&>svg]:size-3';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground border-border',
    destructive: 'bg-destructive/15 text-destructive dark:bg-destructive/25',
    outline: 'border-border text-foreground bg-transparent',
    ghost: 'hover:bg-muted hover:text-muted-foreground bg-transparent',
    link: 'text-primary underline-offset-4',
  };

  return cn(base, variants[variant], className);
}

function Badge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={badgeVariants({ variant, className })}
      {...props}
    />
  );
}

export { Badge };
export default Badge;

'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'tertiary'
  | 'destructive'
  | 'danger'
  | 'link';

export type ButtonSize =
  | 'default'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg';

export type ButtonRoleVariant = 'default' | 'cta' | 'icon' | 'dropdown' | 'toggle' | 'fab';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  roleVariant?: ButtonRoleVariant;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isIconOnly?: boolean;
  isDropdown?: boolean;
  isPressed?: boolean;
  loading?: boolean;
  confirmDanger?: boolean;
  confirmDangerLabel?: string;
  onConfirmDanger?: () => void;
  asChild?: boolean;
}

export function buttonVariants({
  variant = 'default',
  size = 'default',
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive' || variant === 'danger';
  const isGhost = variant === 'ghost' || variant === 'tertiary';
  const isLink = variant === 'link';

  const baseClasses =
    "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 min-h-[44px] md:min-h-0 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

  let variantClass = 'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50';
  if (isPrimary) {
    variantClass = 'bg-primary text-primary-foreground hover:bg-primary/80';
  } else if (isDestructive) {
    variantClass = 'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40';
  } else if (isGhost) {
    variantClass = 'border-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50';
  } else if (isLink) {
    variantClass = 'text-primary underline-offset-4 hover:underline';
  }

  let sizeClass = 'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2';
  if (size === 'xs') {
    sizeClass = "h-6 gap-1 rounded-none px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3";
  } else if (size === 'sm') {
    sizeClass = "h-7 gap-1 rounded-none px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5";
  } else if (size === 'lg') {
    sizeClass = 'h-9 gap-1.5 rounded-none px-3 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5';
  } else if (size === 'icon') {
    sizeClass = 'size-8 rounded-none';
  } else if (size === 'icon-xs') {
    sizeClass = 'size-6 rounded-none [&_svg]:size-3';
  } else if (size === 'icon-sm') {
    sizeClass = 'size-7 rounded-none [&_svg]:size-3.5';
  } else if (size === 'icon-lg') {
    sizeClass = 'size-9 rounded-none';
  }

  return cn(baseClasses, variantClass, sizeClass, className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'default',
      roleVariant = 'default',
      icon,
      iconPosition = 'left',
      isIconOnly,
      isDropdown,
      isPressed,
      loading,
      confirmDanger,
      confirmDangerLabel = 'Confirm Delete',
      onConfirmDanger,
      children,
      onClick,
      disabled,
      href,
      type = 'button',
      asChild = false,
      ...props
    },
    ref,
  ) => {
    // Role variant mapping
    const effectiveVariant: ButtonVariant =
      roleVariant === 'cta' ? 'primary' : variant;
    const effectiveSize: ButtonSize =
      roleVariant === 'cta' ? 'lg' : size;
    const effectiveIconOnly = roleVariant === 'icon' || isIconOnly;
    const effectiveDropdown = roleVariant === 'dropdown' || isDropdown;

    // Danger confirmation state
    const [confirming, setConfirming] = React.useState(false);
    const confirmTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
      return () => {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      };
    }, []);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) {
        e.preventDefault();
        return;
      }

      if ((effectiveVariant === 'destructive' || effectiveVariant === 'danger') && confirmDanger && !confirming) {
        e.preventDefault();
        setConfirming(true);
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = setTimeout(() => {
          setConfirming(false);
        }, 3000);
        return;
      }

      if ((effectiveVariant === 'destructive' || effectiveVariant === 'danger') && confirmDanger && confirming) {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        setConfirming(false);
        onConfirmDanger?.();
      }

      onClick?.(e);
    };

    const isTogglePressed = (roleVariant === 'toggle' || isPressed !== undefined) && Boolean(isPressed);

    const classes = buttonVariants({
      variant: effectiveVariant,
      size: effectiveIconOnly
        ? effectiveSize === 'lg'
          ? 'icon-lg'
          : effectiveSize === 'xs'
            ? 'icon-xs'
            : effectiveSize === 'sm'
              ? 'icon-sm'
              : 'icon'
        : effectiveSize,
      className: cn(
        isTogglePressed ? 'bg-muted' : '',
        disabled ? 'opacity-50 pointer-events-none' : '',
        className,
      ),
    });

    const content = (
      <>
        {loading && (
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
            data-testid="button-spinner"
          >
            <svg
              className="animate-spin h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </span>
        )}
        <span className={cn('inline-flex items-center justify-center gap-1.5', loading ? 'invisible select-none' : '')}>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {confirming ? confirmDangerLabel : children}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
          {effectiveDropdown && <span className="ml-1 text-[9px] shrink-0">▼</span>}
        </span>
      </>
    );

    const isAriaDisabled = disabled || loading ? 'true' : undefined;
    const isAriaBusy = loading ? 'true' : undefined;
    const ariaPressedVal = roleVariant === 'toggle' || isPressed !== undefined ? (isPressed ? 'true' : 'false') : undefined;

    if (href) {
      return (
        <Link
          href={href}
          ref={ref as unknown as React.Ref<HTMLAnchorElement>}
          className={cn(classes, 'no-underline')}
          data-slot="button"
          data-variant={effectiveVariant}
          data-size={effectiveSize}
          data-role={roleVariant}
          aria-pressed={ariaPressedVal}
          aria-disabled={isAriaDisabled}
          aria-busy={isAriaBusy}
          {...(props as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        data-slot="button"
        data-variant={effectiveVariant}
        data-size={effectiveSize}
        data-role={roleVariant}
        aria-pressed={ariaPressedVal}
        aria-disabled={isAriaDisabled}
        aria-busy={isAriaBusy}
        onClick={handleClick}
        {...props}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;

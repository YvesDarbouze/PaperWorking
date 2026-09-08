'use client';
import React, { forwardRef, useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonRoleVariant = 'default' | 'cta' | 'icon' | 'dropdown' | 'toggle' | 'fab';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Optional URL to navigate to. When present, renders as Next.js Link.
   */
  href?: string;
  /**
   * Visual hierarchy level:
   * - primary: Solid --accent (#00DD94), dark text, high contrast. Max ONE per section.
   * - secondary: 1px --border-subtle outline, transparent fill, --text-primary.
   * - tertiary: Ghost/text-only, --text-secondary -> --text-primary on hover.
   * - danger: Destructive action using --danger (#EF4444).
   */
  variant?: ButtonVariant;
  /**
   * Sizing scale:
   * - sm: 32px height (dense / table / card controls)
   * - md: 40px height (standard dashboard actions)
   * - lg: 48px height (high-visibility conversion / CTA)
   */
  size?: ButtonSize;
  /**
   * Functional role composition:
   * - cta: Shortcut for variant="primary" + size="lg"
   * - icon: Square aspect ratio (32px, 40px, or 48px)
   * - dropdown: Displays chevron disclosure indicator
   * - toggle: Binary pressed/unpressed state (aria-pressed)
   * - fab: Reserved for mobile/floating actions (not used on desktop)
   */
  roleVariant?: ButtonRoleVariant;
  /**
   * Icon element to display inside button
   */
  icon?: React.ReactNode;
  /**
   * Icon positioning relative to label
   * @default 'left'
   */
  iconPosition?: 'left' | 'right';
  /**
   * Shortcut for icon-only square button
   */
  isIconOnly?: boolean;
  /**
   * Shortcut for dropdown disclosure button
   */
  isDropdown?: boolean;
  /**
   * Whether the toggle button is in pressed state (binds aria-pressed)
   */
  isPressed?: boolean;
  /**
   * Loading state: displays spinner, locks width to prevent layout shift, sets aria-busy="true"
   */
  loading?: boolean;
  /**
   * Danger confirmation requirement: requires two clicks to confirm destructive action
   */
  confirmDanger?: boolean;
  /**
   * Label to display during danger confirmation state
   * @default 'Confirm?'
   */
  confirmDangerLabel?: string;
  /**
   * Custom callback triggered when danger action is confirmed
   */
  onConfirmDanger?: () => void;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      roleVariant = 'default',
      icon,
      iconPosition = 'left',
      isIconOnly = false,
      isDropdown = false,
      isPressed,
      loading = false,
      disabled = false,
      confirmDanger = false,
      confirmDangerLabel = 'Confirm?',
      onConfirmDanger,
      children,
      className = '',
      onClick,
      'aria-label': ariaLabel,
      type = 'button',
      href,
      ...rest
    },
    ref,
  ) => {
    // Resolve functional role overrides
    const effectiveVariant: ButtonVariant =
      roleVariant === 'cta' ? 'primary' : variant;
    const effectiveSize: ButtonSize =
      roleVariant === 'cta' ? 'lg' : size;
    const effectiveIconOnly =
      roleVariant === 'icon' || isIconOnly;
    const effectiveDropdown =
      roleVariant === 'dropdown' || isDropdown;
    const isToggle =
      roleVariant === 'toggle' || isPressed !== undefined;

    // Danger confirmation state
    const [confirming, setConfirming] = useState(false);
    const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      return () => {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      };
    }, []);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) {
        e.preventDefault();
        return;
      }

      if (effectiveVariant === 'danger' && confirmDanger && !confirming) {
        e.preventDefault();
        setConfirming(true);
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = setTimeout(() => {
          setConfirming(false);
        }, 3000);
        return;
      }

      if (effectiveVariant === 'danger' && confirmDanger && confirming) {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        setConfirming(false);
        onConfirmDanger?.();
      }

      onClick?.(e);
    };

    // Size styling
    const sizeClasses = {
      sm: effectiveIconOnly
        ? 'h-8 w-8 min-w-[32px] p-0 justify-center text-[12px]'
        : 'h-8 px-3 text-[12px] gap-1.5',
      md: effectiveIconOnly
        ? 'h-10 w-10 min-w-[40px] p-0 justify-center text-[13px]'
        : 'h-10 px-4 text-[13px] gap-2',
      lg: effectiveIconOnly
        ? 'h-12 w-12 min-w-[48px] p-0 justify-center text-[14px]'
        : 'h-12 px-5 text-[14px] gap-2.5',
    }[effectiveSize];

    // Variant base styling & interactions
    let variantClasses = '';
    switch (effectiveVariant) {
      case 'primary':
        variantClasses = [
          'bg-[#00DD94] text-[#0a0a0f] font-bold border border-[#00DD94]/40',
          'shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
          'hover:bg-[#1ae5a3] hover:shadow-[0_0_16px_rgba(0,221,148,0.35)] hover:border-[#1ae5a3]',
          'active:bg-[#00b87b] active:scale-[0.98]',
        ].join(' ');
        break;

      case 'secondary':
        variantClasses = [
          'bg-transparent border border-white/10 text-[#fdfffc] font-semibold',
          'hover:bg-white/[0.06] hover:border-white/20 hover:text-white',
          'active:bg-white/[0.10] active:scale-[0.98]',
          isToggle && isPressed
            ? 'bg-white/[0.12] border-white/30 text-[#00DD94] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]'
            : '',
        ].join(' ');
        break;

      case 'tertiary':
        variantClasses = [
          'bg-transparent border border-transparent text-[#9E9DA0] font-medium',
          'hover:bg-white/[0.04] hover:text-[#fdfffc]',
          'active:bg-white/[0.08] active:scale-[0.98]',
          isToggle && isPressed ? 'text-[#00DD94] bg-white/[0.05]' : '',
        ].join(' ');
        break;

      case 'danger':
        variantClasses = [
          confirming
            ? 'bg-[#EF4444] text-white font-bold border border-red-400 shadow-[0_0_16px_rgba(239,68,68,0.4)] animate-pulse'
            : 'bg-[#EF4444] text-white font-bold border border-red-500/40 shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:bg-[#dc2626] hover:shadow-[0_0_16px_rgba(239,68,68,0.35)]',
          'active:bg-[#b91c1c] active:scale-[0.98]',
        ].join(' ');
        break;
    }

    // Common interactive state styles
    const commonClasses = [
      'group relative inline-flex items-center justify-center select-none overflow-hidden',
      'rounded-lg font-sans tracking-wide transition-all duration-150 ease-out',
      // Focus-visible: 2px ring using --accent at 60% opacity, offset 2px
      'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DD94]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]',
      // Disabled: 50% opacity, no pointer events, aria-disabled
      (disabled || loading)
        ? 'opacity-50 pointer-events-none cursor-not-allowed shadow-none'
        : 'cursor-pointer',
    ].join(' ');

    const content = (
      <>
        {/* Loading Spinner: centered absolute overlay to preserve layout width */}
        {loading && (
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
            data-testid="button-spinner"
          >
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-85"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}

        {/* Content wrapper: hidden visibility when loading so the button width is 100% locked */}
        <span
          className={`inline-flex items-center justify-center gap-2 ${
            loading ? 'invisible select-none' : ''
          }`}
        >
          {icon && iconPosition === 'left' && (
            <span className="shrink-0 flex items-center">{icon}</span>
          )}
          {confirming ? (
            <span className="font-bold tracking-wider uppercase text-[11px]">
              {confirmDangerLabel}
            </span>
          ) : (
            children
          )}
          {icon && iconPosition === 'right' && (
            <span className="shrink-0 flex items-center">{icon}</span>
          )}
          {effectiveDropdown && (
            <span
              className="material-symbols-outlined text-[16px] shrink-0 leading-none"
              aria-hidden="true"
            >
              expand_more
            </span>
          )}
        </span>
      </>
    );

    if (href) {
      return (
        <Link
          href={href}
          ref={ref as unknown as React.Ref<HTMLAnchorElement>}
          aria-label={ariaLabel}
          aria-busy={loading ? 'true' : undefined}
          data-variant={effectiveVariant}
          data-size={effectiveSize}
          data-role={roleVariant}
          className={`${commonClasses} ${sizeClasses} ${variantClasses} no-underline ${className}`}
          onClick={handleClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
          {...(rest as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading ? 'true' : undefined}
        aria-pressed={isToggle ? !!isPressed : undefined}
        aria-label={ariaLabel}
        data-variant={effectiveVariant}
        data-size={effectiveSize}
        data-role={roleVariant}
        data-loading={loading ? 'true' : undefined}
        onClick={handleClick}
        className={`${commonClasses} ${sizeClasses} ${variantClasses} ${className}`}
        {...rest}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;

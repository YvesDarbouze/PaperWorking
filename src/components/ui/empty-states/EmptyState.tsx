import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  variant?: 'default' | 'card' | 'inline';
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
        {Icon && <Icon className="w-8 h-8 text-pw-muted mb-2 opacity-60" />}
        <h3 className="text-sm font-medium text-pw-black">{title}</h3>
        {description && <p className="text-xs text-pw-muted mt-1 max-w-xs">{description}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-3 text-xs font-bold tracking-wider uppercase text-pw-primary hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`glass-card rounded-none p-6 flex flex-col items-center text-center max-w-md w-full border border-pw-border ${className}`}>
        <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-pw-primary/10 blur-xl rounded-full" />
          {Icon && <Icon className="w-8 h-8 text-pw-primary relative z-10" />}
        </div>
        <h3 className="text-base font-medium text-pw-black mb-1">{title}</h3>
        {description && <p className="text-sm text-pw-muted max-w-sm mb-4">{description}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className="pw-btn pw-btn--secondary py-2 px-4 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5"
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </button>
        )}
      </div>
    );
  }

  // default: full screen / prominent portfolio style empty state matching Stitch projects empty state
  return (
    <div className={`glass-card rounded-none p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full border border-pw-border/50 relative overflow-hidden ${className}`}>
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-pw-primary/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Wireframe Illustration Container */}
      <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-pw-primary/10 blur-2xl rounded-full" />
        {/* Large icon acting as illustration */}
        {Icon && (
          <Icon 
            className="w-20 h-20 text-pw-primary relative z-10" 
            strokeWidth={1}
          />
        )}
      </div>

      {/* Typography */}
      <h2 className="text-2xl md:text-3xl font-light text-pw-black tracking-tight mb-3">
        {title}
      </h2>
      {description && (
        <p className="text-base text-pw-muted mb-8 max-w-md font-normal leading-relaxed">
          {description}
        </p>
      )}

      {/* Action CTA */}
      {action && (
        <button
          onClick={action.onClick}
          className="pw-btn pw-btn--primary flex items-center gap-2 px-6 py-3 rounded-none font-bold text-sm tracking-wider uppercase shadow-[0_0_20px_-5px_rgba(45,212,191,0.4)]"
        >
          {action.icon && <action.icon className="w-5 h-5" />}
          {action.label}
        </button>
      )}
    </div>
  );
}

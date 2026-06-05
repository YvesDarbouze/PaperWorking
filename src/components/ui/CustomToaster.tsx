'use client';

import { Toaster, ToastBar, ToastPosition } from 'react-hot-toast';
import { Check, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface CustomToasterProps {
  position?: ToastPosition;
}

export function CustomToaster({ position = 'bottom-left' }: CustomToasterProps) {
  return (
    <Toaster position={position}>
      {(t) => (
        <ToastBar toast={t} style={{ padding: 0, background: 'transparent', boxShadow: 'none', display: 'block' }}>
          {({ message }) => {
            // Accent border color based on status
            let accentColor = 'var(--pw-ocean)';
            let icon = <Info className="w-4 h-4 text-pw-ocean dark:text-pw-info shrink-0" />;

            if (t.type === 'success') {
              accentColor = 'var(--color-secondary-container, #D3E7DF)';
              icon = <Check className="w-4 h-4 text-pw-forest dark:text-pw-minty shrink-0" />;
            } else if (t.type === 'error') {
              accentColor = 'var(--color-error, #F06543)';
              icon = <AlertCircle className="w-4 h-4 text-[var(--color-error)] shrink-0" />;
            } else if (t.type === 'loading') {
              accentColor = 'var(--pw-muted)';
              icon = (
                <div className="w-4 h-4 border-2 border-pw-ocean dark:border-pw-info border-t-transparent rounded-full animate-spin shrink-0" />
              );
            } else {
              // blank or custom (warning)
              accentColor = 'var(--color-tertiary-container, #533708)';
              icon = <AlertTriangle className="w-4 h-4 text-[var(--color-tertiary)] shrink-0" />;
            }

            // Handle custom icons passed to toast
            if (t.icon) {
              if (typeof t.icon === 'string') {
                icon = <span className="text-sm shrink-0">{t.icon}</span>;
              } else {
                icon = <div className="shrink-0">{t.icon}</div>;
              }
            }

            return (
              <div
                className={`
                  flex items-center gap-3 px-5 py-3.5 border
                  bg-[var(--pw-glass-bg)] backdrop-blur-xl
                  shadow-[0_10px_30px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.15)]
                  dark:shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)]
                  font-sans text-sm tracking-wide
                  transition-all duration-300
                  ${t.visible ? 'animate-toast-in' : 'animate-toast-out'}
                `}
                style={{
                  minWidth: '320px',
                  maxWidth: '420px',
                  borderColor: 'var(--pw-border)',
                  borderLeft: `3px solid ${accentColor}`,
                }}
              >
                {icon}
                <div className="flex-1 leading-relaxed text-pw-black dark:text-pw-white">{message}</div>
              </div>
            );
          }}
        </ToastBar>
      )}
    </Toaster>
  );
}

export default CustomToaster;

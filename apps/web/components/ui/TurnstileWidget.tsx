'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: string) => void;
  onConfigStatus?: (isConfigured: boolean) => void;
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          theme?: 'dark' | 'light' | 'auto';
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

/**
 * Cloudflare Turnstile Bot Defense Widget
 * 
 * Honest Rule 5 / No-Mock Contract:
 * If NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY is absent, renders an honest
 * unconfigured banner (REQUIRES CREDENTIALS) and notifies parent to disable form submissions.
 * It NEVER fake-verifies or simulates user passage.
 */
export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  onConfigStatus,
  className = '',
  theme = 'dark',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
  const isConfigured = Boolean(siteKey && siteKey.trim().length > 0);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (onConfigStatus) {
      onConfigStatus(isConfigured);
    }
  }, [isConfigured, onConfigStatus]);

  useEffect(() => {
    if (!isConfigured) return;

    // Load Cloudflare Turnstile script if not already present
    const SCRIPT_ID = 'cf-turnstile-script';
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      window.onloadTurnstileCallback = () => {
        setScriptLoaded(true);
      };
    } else if (window.turnstile) {
      setScriptLoaded(true);
    } else {
      window.onloadTurnstileCallback = () => {
        setScriptLoaded(true);
      };
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured || !scriptLoaded || !containerRef.current || !window.turnstile) return;

    try {
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        theme,
        callback: (token: string) => {
          onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': () => {
          if (onError) onError('Turnstile challenge error');
        },
      });
      widgetIdRef.current = id;
    } catch (err) {
      console.error('[Turnstile] Render error:', err);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {
          // Cleanup error ignored
        }
      }
    };
  }, [isConfigured, scriptLoaded, siteKey, theme, onVerify, onExpire, onError]);

  if (!isConfigured) {
    return (
      <div
        data-testid="turnstile-unconfigured-banner"
        className={`rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-200/90 ${className}`}
      >
        <div className="flex items-center gap-2 font-semibold text-amber-300">
          <span className="material-symbols-outlined text-[18px]">security_update_warning</span>
          <span>Bot Verification Unconfigured (REQUIRES CREDENTIALS)</span>
        </div>
        <p className="mt-1 text-[11px] text-amber-200/70">
          Cloudflare Turnstile site key is not configured in this environment. Form submissions are disabled to prevent abuse.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex justify-start my-2 ${className}`}>
      <div ref={containerRef} data-testid="turnstile-widget" />
    </div>
  );
}

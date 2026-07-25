'use client';

import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('pw_cookie_consent');
    if (!consent) {
      setIsOpen(true);
    } else {
      try {
        const parsed = JSON.parse(consent);
        applyConsent(parsed);
      } catch (e) {
        setIsOpen(true);
      }
    }
  }, []);

  const applyConsent = (preferences: { analytics: boolean; marketing: boolean }) => {
    (window as any).pwConsent = preferences;
    window.dispatchEvent(new CustomEvent('pw_consent_update', { detail: preferences }));

    if (!preferences.analytics) {
      (window as any).posthog?.opt_out_capturing?.();
    } else {
      (window as any).posthog?.opt_in_capturing?.();
    }
  };

  const handleAccept = () => {
    const consentObj = { essential: true, analytics: true, marketing: true };
    localStorage.setItem('pw_cookie_consent', JSON.stringify(consentObj));
    applyConsent(consentObj);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[calc(100%-2rem)] sm:w-auto">
      <div className="flex items-center justify-between gap-6 px-6 py-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-neutral-200/90 dark:bg-[#1c1d22]/90 backdrop-blur-md shadow-lg text-neutral-800 dark:text-neutral-200 transition-all">
        <span className="text-sm font-normal leading-snug">
          We use cookies to ensure we build the best features for our customers. Only.
        </span>
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 text-xs font-semibold tracking-wide rounded-md border border-neutral-400 dark:border-neutral-600 hover:border-neutral-600 dark:hover:border-neutral-400 bg-neutral-100/60 dark:bg-neutral-800/60 hover:bg-neutral-300/80 dark:hover:bg-neutral-700/80 transition-colors shrink-0 cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('pw_cookie_consent');
    if (!consent) {
      setIsOpen(true);
    } else {
      try {
        const parsed = JSON.parse(consent);
        setAnalytics(!!parsed.analytics);
        setMarketing(!!parsed.marketing);
        applyConsent(parsed);
      } catch (e) {
        setIsOpen(true);
      }
    }
  }, []);

  const saveConsent = (preferences: { essential: boolean; analytics: boolean; marketing: boolean }) => {
    localStorage.setItem('pw_cookie_consent', JSON.stringify(preferences));
    applyConsent(preferences);
    setIsOpen(false);
  };

  const applyConsent = (preferences: { analytics: boolean; marketing: boolean }) => {
    // Globally expose preferences for other tracking script integrations
    (window as any).pwConsent = preferences;
    
    // Custom event to signal consent change
    window.dispatchEvent(new CustomEvent('pw_consent_update', { detail: preferences }));

    // Disable/Enable features based on consent
    if (!preferences.analytics) {
      // Clear GA or PostHog optional tracking
      (window as any).posthog?.opt_out_capturing?.();
    } else {
      (window as any).posthog?.opt_in_capturing?.();
    }
  };

  const handleAcceptAll = () => {
    saveConsent({ essential: true, analytics: true, marketing: true });
  };

  const handleRejectAll = () => {
    saveConsent({ essential: true, analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    saveConsent({ essential: true, analytics, marketing });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[320px] rounded-[28px] p-6 border shadow-2xl transition-all duration-300 flex flex-col"
      style={{
        background: 'rgba(18, 16, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {!showCustomize ? (
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-[13px] leading-relaxed text-white/90">
            We use cookies to enhance your development experience and keep your data secure.{' '}
            <a href="/privacy" className="underline hover:text-white/80 transition-colors">
              Privacy Policy
            </a>
          </p>
          
          <button
            onClick={handleAcceptAll}
            className="w-full py-2.5 px-4 font-label-sm text-label-sm font-medium rounded-xl transition-all duration-200 border cursor-pointer text-center text-white"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }}
          >
            OK
          </button>
          
          <div className="text-center">
            <button
              onClick={() => setShowCustomize(true)}
              className="text-xs text-white/60 hover:text-white/90 hover:underline transition-colors cursor-pointer"
            >
              Manage preferences
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-white">
          <h3 className="font-label-md text-label-md text-white/90 border-b border-white/10 pb-2">
            Customize Preferences
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-label-sm text-[12px] text-white/90 font-medium">Essential Cookies</h4>
                <p className="text-[10px] text-white/60 leading-relaxed mt-0.5">
                  Required for user login, MFA, and CSRF protection.
                </p>
              </div>
              <span className="text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                Req
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-3">
              <div>
                <h4 className="font-label-sm text-[12px] text-white/90 font-medium">Analytics & Diagnostics</h4>
                <p className="text-[10px] text-white/60 leading-relaxed mt-0.5">
                  Allows us to monitor route latencies and UI load times.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-3">
              <div>
                <h4 className="font-label-sm text-[12px] text-white/90 font-medium">Marketing</h4>
                <p className="text-[10px] text-white/60 leading-relaxed mt-0.5">
                  Enables us to track onboarding attribution.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 border-t border-white/10 pt-3 mt-1">
            <button
              onClick={() => setShowCustomize(false)}
              className="text-xs text-white/60 hover:text-white/90 transition-colors cursor-pointer"
            >
              ← Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleRejectAll}
                className="px-3 py-1.5 text-xs border border-white/10 hover:border-white/20 text-white rounded-lg transition-all cursor-pointer"
              >
                Reject All
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-3 py-1.5 text-xs bg-primary text-black hover:bg-primary/90 font-medium rounded-lg shadow-md transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
      className="fixed bottom-6 right-6 z-50 max-w-md w-full rounded-2xl p-6 border border-white/12 shadow-2xl transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, rgba(30,41,50,0.9), rgba(15,23,30,0.95))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {!showCustomize ? (
        <div>
          <h3 className="font-label-md text-label-md text-on-surface mb-2">Cookie Preferences</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 leading-relaxed">
            We use cookies to secure your sessions and analyze workspace traffic. By clicking &ldquo;Accept All&rdquo;, you consent to analytics and marketing tracking. Read our{' '}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>{' '}
            for details.
          </p>
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={() => setShowCustomize(true)}
              className="px-4 py-2 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-lg transition-all"
            >
              Customize
            </button>
            <button
              onClick={handleRejectAll}
              className="px-4 py-2 font-label-sm text-label-sm border border-white/10 hover:border-white/20 text-on-surface rounded-lg transition-all"
            >
              Essential Only
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 font-label-sm text-label-sm bg-primary text-black hover:bg-primary-hover font-semibold rounded-lg shadow-lg shadow-primary/20 transition-all"
            >
              Accept All
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-label-md text-label-md text-on-surface mb-4 border-b border-white/10 pb-2">Customize Preferences</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-label-sm text-label-sm text-on-surface">Essential Cookies</h4>
                <p className="font-body-xs text-body-xs text-on-surface-variant leading-relaxed">
                  Required for user login, MFA, and CSRF protection. Cannot be disabled.
                </p>
              </div>
              <span className="font-label-xs text-label-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>
            </div>

            <div className="flex items-start justify-between gap-4 border-t border-white/5 pt-3">
              <div>
                <h4 className="font-label-sm text-label-sm text-on-surface">Analytics & Diagnostics</h4>
                <p className="font-body-xs text-body-xs text-on-surface-variant leading-relaxed">
                  Allows us to monitor route latencies and UI load times. Used to diagnose bugs.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-start justify-between gap-4 border-t border-white/5 pt-3">
              <div>
                <h4 className="font-label-sm text-label-sm text-on-surface">Marketing & Lead Referral</h4>
                <p className="font-body-xs text-body-xs text-on-surface-variant leading-relaxed">
                  Enables us to track onboarding attribution and campaign effectiveness.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={() => setShowCustomize(false)}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              ← Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 font-label-sm text-label-sm border border-white/10 hover:border-white/20 text-on-surface rounded-lg transition-all"
              >
                Reject All
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-4 py-2 font-label-sm text-label-sm bg-primary text-black hover:bg-primary-hover font-semibold rounded-lg shadow-lg shadow-primary/20 transition-all"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

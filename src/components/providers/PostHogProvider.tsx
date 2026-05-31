'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false, // Handled dynamically below
        loaded: (posthogInstance) => {
          if (process.env.NODE_ENV === 'development') {
            posthogInstance.opt_out_capturing(); // Opt out in local dev
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ── Parse & Persist UTM parameters ──
    const searchParams = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const hasUtm = utmKeys.some(key => searchParams.has(key));

    let utms: Record<string, string> = {};
    if (hasUtm) {
      utmKeys.forEach(key => {
        const val = searchParams.get(key);
        if (val) utms[key] = val;
      });

      // Persist first-touch if not set
      if (!localStorage.getItem('pw_first_utm')) {
        localStorage.setItem('pw_first_utm', JSON.stringify(utms));
      }
      // Always persist last-touch
      localStorage.setItem('pw_last_utm', JSON.stringify(utms));
    }

    // Retrieve saved UTMs for event context
    const firstUtmStr = localStorage.getItem('pw_first_utm');
    const firstUtm = firstUtmStr ? JSON.parse(firstUtmStr) : {};

    // ── Track Page Visits ──
    if (pathname === '/') {
      posthog.capture('landing_page_visited', {
        ...firstUtm,
        url: window.location.href,
        referrer: document.referrer,
      });
    } else if (pathname === '/pricing') {
      posthog.capture('pricing_viewed', {
        ...firstUtm,
      });
    } else {
      posthog.capture('$pageview', {
        ...firstUtm,
      });
    }
  }, [pathname]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export default PostHogProvider;

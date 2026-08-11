export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-7JX7B7KF0D';

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({
  action,
  category,
  label,
  value,
  send_to,
}: {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  send_to?: string;
}) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      send_to: send_to,
    });
  }
};

// Google Ads conversion tracking helper
export const reportAdsConversion = (conversionId?: string, label?: string, value?: number, currency = 'USD') => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    const sendTo = conversionId && label ? `${conversionId}/${label}` : conversionId;
    window.gtag('event', 'conversion', {
      send_to: sendTo,
      value: value,
      currency: currency,
    });
  }
};

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/** Insights page visual tokens — underwriting analytics desk. */

import type { CSSProperties } from 'react';

export function insightsTokens(isDark: boolean) {
  return {
    pageBg: isDark ? '#0A0B0E' : '#F0F1F3',
    surface: isDark ? '#171920' : '#FFFFFF',
    surfaceMuted: isDark ? '#12141A' : '#F7F8F9',
    heading: isDark ? '#F3F1EC' : '#14161C',
    body: isDark ? 'rgba(243,241,236,0.78)' : 'rgba(20,22,28,0.78)',
    muted: isDark ? '#9C9890' : '#6B7079',
    border: isDark ? 'rgba(243,241,236,0.09)' : 'rgba(20,22,28,0.09)',
    divider: isDark ? 'rgba(243,241,236,0.07)' : 'rgba(20,22,28,0.07)',
    hover: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(20,22,28,0.03)',
    accent: isDark ? '#C4A574' : '#4F6F78',
    accentMuted: isDark ? 'rgba(196,165,116,0.14)' : 'rgba(79,111,120,0.12)',
    ctaBg: isDark ? '#C4A574' : '#14161C',
    ctaFg: isDark ? '#0A0B0E' : '#F5F6F8',
    success: isDark ? '#6BBFA0' : '#2F7A5A',
    successMuted: isDark ? 'rgba(107,191,160,0.14)' : 'rgba(47,122,90,0.10)',
    warn: isDark ? '#E0A56A' : '#C4843A',
    warnMuted: isDark ? 'rgba(224,165,106,0.14)' : 'rgba(196,132,58,0.12)',
    alert: isDark ? '#D97757' : '#C45C3E',
    alertMuted: isDark ? 'rgba(217,119,87,0.14)' : 'rgba(196,92,62,0.10)',
    inputBg: isDark ? '#0A0B0E' : '#FFFFFF',
    shadow: isDark ? 'none' : '0 1px 2px rgba(20,22,28,0.04)',
  };
}

export type InsightsTokens = ReturnType<typeof insightsTokens>;

export function panelStyle(t: InsightsTokens): CSSProperties {
  return {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 2,
    boxShadow: t.shadow,
  };
}

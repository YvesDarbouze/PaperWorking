/** Visual tokens for Projects pipeline — theme-aware, clarity-first. */

export function projectsTokens(isDark: boolean) {
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
    inputBg: isDark ? '#0A0B0E' : '#FFFFFF',
    shadow: isDark ? 'none' : '0 1px 2px rgba(20,22,28,0.04)',
    elevShadow: isDark
      ? '0 8px 28px rgba(0,0,0,0.4)'
      : '0 8px 24px rgba(20,22,28,0.08)',
    // Phase status — intentional, not decorative
    phase1: isDark ? '#8B90A0' : '#454955',
    phase2: '#7A9EAA',
    phase3: isDark ? '#E0A56A' : '#C4843A',
    phase4: isDark ? '#6BBFA0' : '#2F7A5A',
    sale: isDark ? '#7A9EAA' : '#4F6F78',
    rent: isDark ? '#C4A574' : '#8A734F',
    mixed: isDark ? '#9C9890' : '#6B7079',
  };
}

export type ProjectsTokens = ReturnType<typeof projectsTokens>;

export function phaseColor(phase: number, t: ProjectsTokens): string {
  if (phase === 2) return t.phase2;
  if (phase === 3) return t.phase3;
  if (phase >= 4) return t.phase4;
  return t.phase1;
}

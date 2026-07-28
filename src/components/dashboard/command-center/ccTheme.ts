/** Shared Command Center visual tokens — clarity-first ops desk. */

export function ccTokens(isDark: boolean) {
  const heading = isDark ? '#F3F1EC' : '#14161C';
  const muted = isDark ? '#9C9890' : '#6B7079';
  const accent = isDark ? '#C4A574' : '#4F6F78';
  const brass = isDark ? '#C4A574' : '#8A734F';
  const border = isDark ? 'rgba(243,241,236,0.09)' : 'rgba(20,22,28,0.09)';

  return {
    heading,
    body: isDark ? 'rgba(243,241,236,0.78)' : 'rgba(20,22,28,0.78)',
    subtext: isDark ? 'rgba(243,241,236,0.72)' : 'rgba(20,22,28,0.72)',
    muted,
    divider: isDark ? 'rgba(243,241,236,0.08)' : 'rgba(20,22,28,0.07)',
    border,
    panelBorder: border,
    panelBg: isDark ? '#171920' : '#FFFFFF',
    panelShadow: isDark ? 'none' : '0 1px 2px rgba(20,22,28,0.04)',
    hover: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(20,22,28,0.03)',
    hoverBorder: isDark ? 'rgba(196,165,116,0.35)' : 'rgba(79,111,120,0.35)',
    accent,
    accentMuted: isDark ? 'rgba(196,165,116,0.14)' : 'rgba(79,111,120,0.12)',
    link: accent,
    brass,
    steel: accent,
    signal: accent,
    alert: isDark ? '#D97757' : '#C45C3E',
    alertMuted: isDark ? 'rgba(217,119,87,0.14)' : 'rgba(196,92,62,0.10)',
    warn: isDark ? '#E0A56A' : '#C4843A',
    warnMuted: isDark ? 'rgba(224,165,106,0.14)' : 'rgba(196,132,58,0.12)',
    success: isDark ? '#6BBFA0' : '#2F7A5A',
    successMuted: isDark ? 'rgba(107,191,160,0.14)' : 'rgba(47,122,90,0.10)',
    phase1: isDark ? '#8B90A0' : '#454955',
    phase2: '#7A9EAA',
    phase3: isDark ? '#E0A56A' : '#C4843A',
    phase4: isDark ? '#6BBFA0' : '#2F7A5A',
    ctaBg: isDark ? '#C4A574' : '#14161C',
    ctaFg: isDark ? '#0A0B0E' : '#F5F6F8',
  };
}

export type CcTokens = ReturnType<typeof ccTokens>;

export function phaseAccent(phase: number, t: CcTokens): string {
  if (phase === 2) return t.phase2;
  if (phase === 3) return t.phase3;
  if (phase >= 4) return t.phase4;
  return t.phase1;
}

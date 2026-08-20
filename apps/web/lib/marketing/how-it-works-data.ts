import { REIL_PHASE_ORDER } from '@paperworking/shared';
import { REIL_PHASE_LABELS } from '@/lib/marketing/content';

export const HOW_IT_WORKS_STEPS = REIL_PHASE_ORDER.map((phase, index) => ({
  step: index + 1,
  phase,
  title: REIL_PHASE_LABELS[phase]?.title ?? phase,
  summary: REIL_PHASE_LABELS[phase]?.summary ?? '',
}));

export const HOW_IT_WORKS_HIGHLIGHTS = [
  {
    title: 'One workspace per deal',
    description: 'Projects carry documents, KPIs, reports, and vendor requests through every REIL phase.',
  },
  {
    title: 'Canonical financial engine',
    description: 'Scorecard metrics derive from a single authority — no spreadsheet drift between insights and exports.',
  },
  {
    title: 'Role-aware surfaces',
    description: 'Investors, teams, vendors, and platform admins each get purpose-built portals on the same domain.',
  },
] as const;

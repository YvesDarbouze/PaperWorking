import type { TeamMember } from '../../apps/web/lib/team/roles';

/** Seed roster — mirrors PaperWorking Team Directory. */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-1',
    name: 'Alex Morgan',
    email: 'alex@paperworking.test',
    role: 'CEO',
    type: 'Internal',
    status: 'Active',
    projects: 3,
    lastActive: 'Active 2h ago',
    isYou: true,
  },
  {
    id: 'member-2',
    name: 'Jordan Lee',
    email: 'jordan@paperworking.test',
    role: 'Deal Lead',
    type: 'Internal',
    status: 'Active',
    projects: 3,
    lastActive: 'Active yesterday',
  },
  {
    id: 'member-3',
    name: 'Sam Rivera',
    email: 'sam@paperworking.test',
    role: 'Vendor liaison',
    type: 'External',
    status: 'Invited',
    projects: 1,
    lastActive: '—',
    invitedAt: '2026-08-20T14:00:00Z',
  },
  {
    id: 'member-4',
    name: 'Casey Nguyen',
    email: 'casey@paperworking.test',
    role: 'CFO',
    type: 'Internal',
    status: 'Active',
    projects: 2,
    lastActive: 'Active 3d ago',
  },
  {
    id: 'member-5',
    name: 'Riley Park',
    email: 'riley@paperworking.test',
    role: 'COO',
    type: 'Internal',
    status: 'Invited',
    projects: 0,
    lastActive: '—',
    invitedAt: '2026-08-21T09:30:00Z',
  },
];

export const TEAM_SEATS = {
  used: 3,
  limit: 10,
  tier: 'Team' as 'Individual' | 'Team',
  tierLabel: 'Investment Team',
};

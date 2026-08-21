import type { Metadata } from 'next';
import TeamDirectoryPanel from '@/components/team/TeamDirectoryPanel';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Team Directory & Scopes — manage seats, roles, and invitations.',
};

/** Route: `/dashboard/team` — mirrors PaperWorking Team Directory. */
export default function TeamPage() {
  return <TeamDirectoryPanel />;
}

import { redirect, RedirectType } from 'next/navigation';

/**
 * Data Room Deprecation (Nav Contract §9.3 v6)
 * Data Room has been removed; documents are phase-scoped within Projects.
 * Permanent redirect to /dashboard/projects.
 */
export default function DataRoomPage() {
  redirect('/dashboard/projects', RedirectType.replace);
}

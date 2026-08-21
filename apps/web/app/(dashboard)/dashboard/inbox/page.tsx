import type { Metadata } from 'next';
import InboxNotificationCenter from '@/components/inbox/InboxNotificationCenter';

export const metadata: Metadata = {
  title: 'Inbox',
  description: 'Unified notification center — messages, invitations, tasks, and system alerts.',
};

/** Route: `/dashboard/inbox` — mirrors PaperWorking unified Inbox. */
export default function InboxPage() {
  return <InboxNotificationCenter />;
}

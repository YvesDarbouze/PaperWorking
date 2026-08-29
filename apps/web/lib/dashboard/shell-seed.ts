/**
 * Shell seed barrel — UI taxonomy stays in apps/web; fixture data lives in /mockdata.
 * Re-exports preserve historical `@/lib/dashboard/shell-seed` imports.
 */

export {
  INBOX_TABS,
  type InboxTabId,
  type InboxItemType,
  type InboxThread,
} from '../inbox/types';

export { SETTINGS_SECTIONS } from '../settings/sections';

export {
  ROLE_PERMISSIONS,
  INTERNAL_ROLES,
  type TeamMemberStatus,
  type TeamMemberType,
  type InternalRole,
  type TeamMember,
} from '../team/roles';

export { INBOX_THREADS } from '../../../../mockdata/inbox/threads';
export { TEAM_MEMBERS, TEAM_SEATS } from '../../../../mockdata/team/members';
export { PROFILE_PREVIEW } from '../../../../mockdata/auth/profile';
export { BILLING_PREVIEW } from '../../../../mockdata/billing/preview';
export { REPORT_NARRATIVE } from '../../../../mockdata/dashboard/overview';

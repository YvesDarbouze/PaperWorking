import * as projects from './projects/projects';
import * as dashboard from './dashboard/overview';
import * as deals from './deals/deals';
import * as marketplace from './marketplace/marketplace';
import * as vendors from './vendors/portal';
import * as team from './team/members';
import * as inboxThreads from './inbox/threads';
import * as inboxChatbot from './inbox/chatbot';
import * as insights from './insights/dashboard';
import * as reportTransactions from './reports/transactions';
import * as reportPhaseBreakdown from './reports/phase-breakdown';
import * as billing from './billing/preview';
import * as auth from './auth/profile';
import * as admin from './admin/ops';

export const mockdata = {
  projects,
  dashboard,
  deals,
  marketplace,
  vendors,
  team,
  inbox: {
    ...inboxThreads,
    ...inboxChatbot,
  },
  insights,
  reports: {
    ...reportTransactions,
    ...reportPhaseBreakdown,
  },
  billing,
  auth,
  admin,
};

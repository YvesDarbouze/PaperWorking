import { AdminModule } from './admin/admin.module.js';
import { DealsModule } from './deals/deals.module.js';
import { InboxModule } from './inbox/inbox.module.js';
import { InsightsModule } from './insights/insights.module.js';
import { MarketplaceModule } from './marketplace/marketplace.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PortfolioModule } from './portfolio/portfolio.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { TeamModule } from './team/team.module.js';
import { VendorsModule } from './vendors/vendors.module.js';

/**
 * Wave-1 Nest domain modules for AppModule import.
 * AuthModule / PrismaModule / HealthModule are registered separately.
 */
export const Wave1Modules = [
  ProjectsModule,
  PaymentsModule,
  DealsModule,
  MarketplaceModule,
  VendorsModule,
  PortfolioModule,
  InsightsModule,
  ReportsModule,
  SettingsModule,
  TeamModule,
  InboxModule,
  MessagesModule,
  TasksModule,
  AdminModule,
] as const;

export {
  AdminModule,
  DealsModule,
  InboxModule,
  InsightsModule,
  MarketplaceModule,
  MessagesModule,
  PaymentsModule,
  PortfolioModule,
  ProjectsModule,
  ReportsModule,
  SettingsModule,
  TasksModule,
  TeamModule,
  VendorsModule,
};

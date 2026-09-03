import {
  INBOX_THREADS,
  TEAM_MEMBERS,
  TEAM_SEATS,
  PROFILE_PREVIEW,
  BILLING_PREVIEW,
  PORTFOLIO_SUMMARY,
  PIPELINE_SNAPSHOT,
  ATTENTION_ITEMS,
  ASSIGNED_TASKS,
  OPERATIONAL_ALERTS,
  RECENT_ACTIVITY,
  RECENT_MESSAGES,
  TOP_PERFORMERS,
  ACTIVE_PROJECT_PROGRESS,
  PHASE_LEGEND,
  PROFILE_CARD,
  SEED_PROJECTS,
  listSeedProjectSummaries,
  getSeedProjectById,
  addSeedProject,
  SEED_RAW_DEALS,
  addSeedDeal,
  INVESTOR_KPI_SECTIONS,
  TREND_SERIES,
  COMPARISON_POINTS,
  PHASE_BREAKDOWN_SEED,
  seedReportTransactions,
  seedReportProjectOptions,
  resolveSeedProjectName,
  CHATBOT_WELCOME_TEXT,
  demoChatbotReply,
} from '../../../../mockdata';
import type { ProjectWorkspace } from '../projects/types';

/**
 * Mock provider — only used when `useMockData()` is true (non-production).
 * Returns the same shapes the UI already expects.
 */
export const mockProvider = {
  dashboardOverview() {
    return {
      portfolioSummary: PORTFOLIO_SUMMARY,
      pipelineSnapshot: PIPELINE_SNAPSHOT,
      attentionItems: ATTENTION_ITEMS,
      assignedTasks: ASSIGNED_TASKS,
      operationalAlerts: OPERATIONAL_ALERTS,
      recentActivity: RECENT_ACTIVITY,
      recentMessages: RECENT_MESSAGES,
      topPerformers: TOP_PERFORMERS,
      activeProjectProgress: ACTIVE_PROJECT_PROGRESS,
      phaseLegend: PHASE_LEGEND,
      profileCard: PROFILE_CARD,
      projectSummaries: listSeedProjectSummaries(),
    };
  },

  inboxThreads() {
    return [...INBOX_THREADS];
  },

  teamMembers() {
    return {
      members: [...TEAM_MEMBERS],
      seats: { ...TEAM_SEATS },
    };
  },

  /** Assignee chips for new-project wizard (mock mode). */
  projectAssigneeOptions() {
    return TEAM_MEMBERS.slice(0, 5).map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
    }));
  },

  profilePreview() {
    return { ...PROFILE_PREVIEW };
  },

  billingPreview() {
    return {
      plan: BILLING_PREVIEW.plan,
      status: BILLING_PREVIEW.status,
      monthlyPrice: BILLING_PREVIEW.monthlyPrice,
      paymentMethod: BILLING_PREVIEW.paymentMethod,
      billingEmail: BILLING_PREVIEW.billingEmail,
      invoices: [...BILLING_PREVIEW.invoices],
      trialEnds: BILLING_PREVIEW.trialEnds,
    };
  },

  projects(): ProjectWorkspace[] {
    return [...SEED_PROJECTS];
  },

  projectById(id: string) {
    return getSeedProjectById(id);
  },

  addProject(project: ProjectWorkspace) {
    return addSeedProject(project);
  },

  deals() {
    return [...SEED_RAW_DEALS];
  },

  addDeal(deal: Parameters<typeof addSeedDeal>[0]) {
    return addSeedDeal(deal);
  },

  insightsDashboard() {
    return {
      kpiSections: INVESTOR_KPI_SECTIONS,
      trendSeries: TREND_SERIES,
      comparisonPoints: COMPARISON_POINTS,
      projects: SEED_PROJECTS,
    };
  },

  reportsPhaseBreakdown() {
    return PHASE_BREAKDOWN_SEED;
  },

  reportTransactions(projectId?: string) {
    return seedReportTransactions(projectId ? { projectId } : undefined);
  },

  reportProjectOptions() {
    return seedReportProjectOptions();
  },

  reportProjectName(id: string) {
    return resolveSeedProjectName(id);
  },

  chatbotWelcome() {
    return CHATBOT_WELCOME_TEXT;
  },

  chatbotReply(userText: string) {
    return demoChatbotReply(userText);
  },
};

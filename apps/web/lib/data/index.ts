import { useMockData, useMockAuth, isProductionRuntime } from './env';
import { mockProvider } from './mock-provider';
import { apiProvider } from './api-provider';

export { useMockData, useMockAuth, isProductionRuntime } from './env';
export { mockProvider } from './mock-provider';
export { apiProvider } from './api-provider';

export type DataMode = 'mock' | 'api';

export function getDataMode(): DataMode {
  return useMockData() ? 'mock' : 'api';
}

/** Dashboard overview — mock fixtures OR Nest (never mock-on-empty). */
export async function loadDashboardOverview() {
  if (useMockData()) return mockProvider.dashboardOverview();
  return apiProvider.dashboardOverview();
}

export async function loadInboxThreads() {
  if (useMockData()) return mockProvider.inboxThreads();
  return apiProvider.inboxThreads();
}

export async function loadTeamDirectory() {
  if (useMockData()) return mockProvider.teamMembers();
  return apiProvider.teamMembers();
}

export async function loadBillingPreview() {
  if (useMockData()) return mockProvider.billingPreview();
  return apiProvider.billingPreview();
}

export async function loadProfilePreview() {
  if (useMockData()) return mockProvider.profilePreview();
  return apiProvider.profilePreview();
}

export async function loadProjects() {
  if (useMockData()) return mockProvider.projects();
  return apiProvider.projects();
}

export async function loadProjectById(id: string) {
  if (useMockData()) return mockProvider.projectById(id);
  return apiProvider.projectById(id);
}

export function loadInsightsDashboardMockOnly() {
  return mockProvider.insightsDashboard();
}

export function loadReportsPhaseBreakdownMockOnly() {
  return mockProvider.reportsPhaseBreakdown();
}

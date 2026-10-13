import { NextResponse } from 'next/server';
import { getProjectFromStore } from '@/lib/projects/project-store';
import {
  filterCardColumnsForGuest,
  filterScheduleForGuest,
  filterTasksForGuest,
  filterTaskListsForGuest,
  filterTopicsForGuest,
  projectApiError,
} from '@/lib/projects/project-access';
import { buildProjectSchedule } from '@/lib/projects/schedule';

/**
 * Public Share Viewer API:
 * GET /api/projects/[id]/public-view?token=...&page=...
 * Authenticates unauthenticated callers via cryptographically generated public share link tokens.
 * Honors token expiration and vendor-only scoping.
 */

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const requestedPage = url.searchParams.get('page') || 'overview';

  if (!token) {
    return projectApiError(401, 'Share token required to view this project', 'UNAUTHORIZED');
  }

  const project = await getProjectFromStore(projectId);
  if (!project) {
    return projectApiError(404, 'Project not found', 'NOT_FOUND');
  }

  const activeLink = (project.publicShareLinks ?? []).find((l) => l.token === token);
  if (!activeLink) {
    return projectApiError(403, 'Invalid or revoked share link', 'FORBIDDEN');
  }

  if (activeLink.expiresAt) {
    const expires = new Date(activeLink.expiresAt).getTime();
    if (Date.now() > expires) {
      return projectApiError(410, 'This share link has expired', 'LINK_EXPIRED');
    }
  }

  // Check page permission
  if (activeLink.page !== 'overview' && activeLink.page !== requestedPage) {
    return projectApiError(403, `This share link is restricted to the ${activeLink.page} view`, 'FORBIDDEN');
  }

  const isVendorOnly = activeLink.vendorOnly ?? true;

  // Filter project data
  const rawTasks = (project.tasks ?? []) as any[];
  const tasks = isVendorOnly ? filterTasksForGuest(rawTasks) : rawTasks;
  const rawLists = project.taskLists ?? [];
  const taskLists = isVendorOnly ? filterTaskListsForGuest(rawLists, tasks) : rawLists;

  const rawTopics = project.messageTopics ?? [];
  const messageTopics = isVendorOnly ? filterTopicsForGuest(rawTopics) : rawTopics;

  const rawColumns = project.cardColumns ?? [];
  const cardColumns = isVendorOnly ? filterCardColumnsForGuest(rawColumns) : rawColumns;

  const fullSchedule = buildProjectSchedule(project);
  const scheduleEvents = isVendorOnly ? filterScheduleForGuest(fullSchedule) : fullSchedule;

  const rawDocs = project.documents ?? [];
  const documents = isVendorOnly ? rawDocs.filter((d: any) => d.vendorVisible === true) : rawDocs;

  return NextResponse.json({
    project: {
      id: project.id,
      title: project.title,
      address: project.address,
      city: project.city,
      state: project.state,
      zip: project.zip,
      currentPhase: project.currentPhase,
      coverImageUrl: project.coverImageUrl,
      tasks,
      taskLists,
      messageTopics,
      cardColumns,
      scheduleEvents,
      documents,
    },
    shareInfo: {
      page: activeLink.page,
      label: activeLink.label,
      expiresAt: activeLink.expiresAt,
      vendorOnly: isVendorOnly,
    },
  });
}

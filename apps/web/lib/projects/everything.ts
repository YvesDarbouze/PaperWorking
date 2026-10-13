import { listProjectsFromStore } from './project-store';
import { buildProjectSchedule } from './schedule';
import type { AcquisitionTask, ProjectActivityEntry, ProjectScheduleEvent, ProjectWorkspace } from './types';

export interface GlobalProjectAssignment {
  projectId: string;
  projectName: string;
  projectAddress: string;
  projectPhase: string;
  task: AcquisitionTask;
}

export interface GlobalProjectActivity {
  projectId: string;
  projectName: string;
  entry: ProjectActivityEntry;
}

export interface GlobalUpcomingDeadline {
  projectId: string;
  projectName: string;
  event: ProjectScheduleEvent;
}

export interface EverythingSummary {
  activity: GlobalProjectActivity[];
  assignments: GlobalProjectAssignment[];
  upcomingDeadlines: GlobalUpcomingDeadline[];
  totalProjects: number;
}

/**
 * Aggregates cross-project activity, user assignments, and upcoming deadlines
 * across all projects in the caller's organization.
 */
export async function getGlobalEverythingForOrg(
  organizationId: string,
  userUid?: string,
): Promise<EverythingSummary> {
  const projects = await listProjectsFromStore(organizationId);

  const allActivity: GlobalProjectActivity[] = [];
  const allAssignments: GlobalProjectAssignment[] = [];
  const allDeadlines: GlobalUpcomingDeadline[] = [];

  for (const project of projects) {
    const pName = project.propertyName || project.address || 'Untitled Project';
    const pAddr = project.address || project.property_address || '';
    const pPhase = project.currentPhase || 'acquisition';

    // 1. Project Activity
    if (project.activity && project.activity.length > 0) {
      for (const entry of project.activity) {
        allActivity.push({
          projectId: project.id,
          projectName: pName,
          entry,
        });
      }
    }

    // 2. Tasks / Assignments
    if (project.tasks && project.tasks.length > 0) {
      for (const task of project.tasks) {
        const isAssignedToUser =
          !userUid ||
          task.assigneeUid === userUid ||
          task.assignedToUid === userUid ||
          task.assignedTo === userUid;

        if (isAssignedToUser && task.status !== 'complete') {
          allAssignments.push({
            projectId: project.id,
            projectName: pName,
            projectAddress: pAddr,
            projectPhase: pPhase,
            task,
          });
        }
      }
    }

    // 3. Upcoming schedule & deadlines (contingencies + schedule events)
    const schedule = buildProjectSchedule(project);
    for (const event of schedule) {
      allDeadlines.push({
        projectId: project.id,
        projectName: pName,
        event,
      });
    }
  }

  // Sort activity descending (newest first)
  allActivity.sort((a, b) => (b.entry.at || '').localeCompare(a.entry.at || ''));

  // Sort deadlines ascending (soonest first)
  allDeadlines.sort((a, b) => (a.event.date || '').localeCompare(b.event.date || ''));

  // Sort assignments by due date ascending (soonest due first, tasks without due date at end)
  allAssignments.sort((a, b) => {
    if (!a.task.dueDate) return 1;
    if (!b.task.dueDate) return -1;
    return a.task.dueDate.localeCompare(b.task.dueDate);
  });

  return {
    activity: allActivity.slice(0, 100),
    assignments: allAssignments.slice(0, 100),
    upcomingDeadlines: allDeadlines.slice(0, 100),
    totalProjects: projects.length,
  };
}

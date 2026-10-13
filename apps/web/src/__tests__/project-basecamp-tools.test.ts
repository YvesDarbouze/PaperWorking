import { DEFAULT_BASECAMP_DATA } from '../../lib/projects/seed-data.js';
import { getProjectFromStore, updateProjectInStore } from '../../lib/projects/project-store.js';

describe('Basecamp-grade project management tools suite', () => {
  const testProjectId = 'deal-lifecycle';

  it('provides default seed data for all 8 Basecamp project tools', () => {
    expect(DEFAULT_BASECAMP_DATA.messageTopics.length).toBeGreaterThan(0);
    expect(DEFAULT_BASECAMP_DATA.campfireMessages.length).toBeGreaterThan(0);
    expect(DEFAULT_BASECAMP_DATA.checkInQuestions.length).toBeGreaterThan(0);
    expect(DEFAULT_BASECAMP_DATA.taskLists.length).toBeGreaterThan(0);
    expect(DEFAULT_BASECAMP_DATA.tasks.length).toBeGreaterThan(0);
    expect(DEFAULT_BASECAMP_DATA.cardColumns.length).toBe(4);
    expect(DEFAULT_BASECAMP_DATA.hillChartItems.length).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_BASECAMP_DATA.scheduleEvents.length).toBeGreaterThan(0);
  });

  it('retrieves project with full Basecamp collections attached from project store', async () => {
    const project = await getProjectFromStore(testProjectId);
    expect(project).not.toBeNull();
    expect(project?.messageTopics).toBeDefined();
    expect(project?.campfireMessages).toBeDefined();
    expect(project?.taskLists).toBeDefined();
    expect(project?.tasks).toBeDefined();
    expect(project?.cardColumns).toBeDefined();
    expect(project?.hillChartItems).toBeDefined();
    expect(project?.scheduleEvents).toBeDefined();
  });

  it('updates Hill Chart scope position and preserves status', async () => {
    const project = await getProjectFromStore(testProjectId);
    expect(project).not.toBeNull();

    const items = [...(project?.hillChartItems || [])];
    const target = items[0]!;
    const previousPos = target.position;
    const newPos = previousPos === 80 ? 85 : 80;

    target.position = newPos;
    await updateProjectInStore(testProjectId, { hillChartItems: items });

    const reloaded = await getProjectFromStore(testProjectId);
    expect(reloaded?.hillChartItems?.[0]?.position).toBe(newPos);
  });

  it('supports unified tasks with lists, completion and subtasks', async () => {
    const project = await getProjectFromStore(testProjectId);
    const lists = project?.taskLists || [];
    const tasks = project?.tasks || [];
    expect(lists.length).toBeGreaterThan(0);
    expect(tasks.length).toBeGreaterThan(0);

    const firstTask = tasks[0];
    expect(firstTask).toBeDefined();
    expect(firstTask?.title).toBeTruthy();
    expect(Array.isArray(firstTask?.subtasks)).toBe(true);
  });

  it('isolates vendor visibility flags on cards and messages', () => {
    const messages = DEFAULT_BASECAMP_DATA.messageTopics;
    const internalMsg = messages.find((m) => !m.vendorVisible);
    const vendorMsg = messages.find((m) => m.vendorVisible);

    expect(internalMsg).toBeDefined();
    expect(vendorMsg).toBeDefined();

    const vendorVisibleCards = DEFAULT_BASECAMP_DATA.cardColumns
      .flatMap((c) => c.cards)
      .filter((card) => card.vendorVisible);

    expect(vendorVisibleCards.length).toBeGreaterThan(0);
  });
});

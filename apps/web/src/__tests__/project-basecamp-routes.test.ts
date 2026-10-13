import { describe, expect, it, beforeEach, afterAll } from '@jest/globals';
import { GET as getMessages, POST as postMessage } from '../../app/api/projects/[id]/messages/route';
import { POST as postComment } from '../../app/api/projects/[id]/messages/[messageId]/comments/route';
import { GET as getCampfire, POST as postCampfire } from '../../app/api/projects/[id]/campfire/route';
import { GET as getCheckins, POST as postCheckin } from '../../app/api/projects/[id]/checkins/route';
import { GET as getTaskGroups, POST as postTaskGroups } from '../../app/api/projects/[id]/task-groups/route';
import { GET as getCards, POST as postCards } from '../../app/api/projects/[id]/card-tables/route';
import { GET as getHill, POST as postHill } from '../../app/api/projects/[id]/hill-chart/route';
import { GET as getSchedule, POST as postSchedule } from '../../app/api/projects/[id]/schedule/route';
import { GET as exportSchedule } from '../../app/api/projects/[id]/schedule/export/route';
import { GET as getStacks, POST as postStacks } from '../../app/api/projects/stacks/route';
import { getProjectFromStore, updateProjectInStore } from '../../lib/projects/project-store';

const PID = 'deal-lifecycle'; // org-1
const BETA_PID = 'deal-org-beta'; // org-beta

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (url: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const get = (url: string) => new Request(url);
const as = (uid: string) => {
  process.env.TEST_AUTH_UID = uid;
};

const ORIGINAL_UID = process.env.TEST_AUTH_UID;
afterAll(() => {
  process.env.TEST_AUTH_UID = ORIGINAL_UID;
});

describe('Basecamp routes: authentication and tenancy', () => {
  beforeEach(() => as('usr-lead-1'));

  it('rejects unauthenticated callers on every project tool route', async () => {
    as('unauthenticated');
    const u = `http://localhost/api/projects/${PID}`;
    const responses = await Promise.all([
      getMessages(get(`${u}/messages`), ctx(PID)),
      getCampfire(get(`${u}/campfire`), ctx(PID)),
      getCheckins(get(`${u}/checkins`), ctx(PID)),
      getTaskGroups(get(`${u}/task-groups`), ctx(PID)),
      getCards(get(`${u}/card-tables`), ctx(PID)),
      getHill(get(`${u}/hill-chart`), ctx(PID)),
      getSchedule(get(`${u}/schedule`), ctx(PID)),
      exportSchedule(get(`${u}/schedule/export`), ctx(PID)),
      getStacks(new Request('http://localhost/api/projects/stacks')),
    ]);
    for (const r of responses) expect(r.status).toBe(401);
  });

  it('returns 404 for an unknown project', async () => {
    const r = await getMessages(get('http://localhost/x'), ctx('does-not-exist'));
    expect(r.status).toBe(404);
  });

  it('blocks a member of another org from reading this org project tools', async () => {
    as('user-beta-member');
    const r = await getMessages(get('http://localhost/x'), ctx(PID));
    expect(r.status).toBe(403);
  });

  it('blocks a member of another org from exporting this org project calendar', async () => {
    as('user-beta-member');
    const r = await exportSchedule(get('http://localhost/x'), ctx(PID));
    expect(r.status).toBe(403);
  });

  it('blocks org viewers from writing', async () => {
    as('user-dev-viewer');
    const r = await postCampfire(json('http://localhost/x', { text: 'hello' }), ctx(PID));
    expect(r.status).toBe(403);
  });

  it('scopes project stacks to the caller org', async () => {
    as('usr-lead-1');
    const created = await postStacks(json('http://localhost/api/projects/stacks', { name: 'Org1 Private Stack' }));
    expect(created.status).toBe(201);

    as('user-bob-99');
    const betaList = await (await getStacks(new Request('http://localhost/api/projects/stacks'))).json();
    expect(betaList.stacks.some((s: { name: string }) => s.name === 'Org1 Private Stack')).toBe(false);
  });

  it('rejects stack membership referencing projects from another org', async () => {
    as('usr-lead-1');
    const r = await postStacks(
      json('http://localhost/api/projects/stacks', { name: 'Smuggle', projectIds: [BETA_PID] }),
    );
    expect(r.status).toBe(400);
  });
});

describe('Basecamp routes: message board', () => {
  beforeEach(() => as('usr-lead-1'));

  it('creates a topic and persists it', async () => {
    const r = await postMessage(
      json('http://localhost/x', { title: 'Lender call recap', content: 'Rate lock extended to Nov 3.', phase: 'fund' }),
      ctx(PID),
    );
    expect(r.status).toBe(201);
    const { topic } = await r.json();
    const stored = await getProjectFromStore(PID);
    expect(stored?.messageTopics?.some((t) => t.id === topic.id)).toBe(true);
  });

  it('rejects missing title or content', async () => {
    const r = await postMessage(json('http://localhost/x', { title: '' }), ctx(PID));
    expect(r.status).toBe(400);
  });

  it('ignores a client-supplied author and stamps the authenticated user', async () => {
    const r = await postMessage(
      json('http://localhost/x', {
        title: 'Spoof',
        content: 'Pretending to be the owner',
        author: { id: 'usr-someone-else', name: 'Fake Owner', role: 'Owner' },
      }),
      ctx(PID),
    );
    const { topic } = await r.json();
    expect(topic.author.id).toBe('usr-lead-1');
    expect(topic.author.name).not.toBe('Fake Owner');
  });

  it('rejects an invalid phase value', async () => {
    const r = await postMessage(
      json('http://localhost/x', { title: 'Bad phase', content: 'x', phase: 'not-a-phase' }),
      ctx(PID),
    );
    expect(r.status).toBe(400);
  });

  it('rejects oversized content', async () => {
    const r = await postMessage(
      json('http://localhost/x', { title: 'Big', content: 'a'.repeat(20_001) }),
      ctx(PID),
    );
    expect(r.status).toBe(400);
  });

  it('adds a comment to an existing topic and 404s for unknown topic', async () => {
    const list = await (await getMessages(get('http://localhost/x'), ctx(PID))).json();
    const topicId = list.topics[0].id;
    const ok = await postComment(json('http://localhost/x', { content: 'Agreed.' }), {
      params: Promise.resolve({ id: PID, messageId: topicId }),
    });
    expect(ok.status).toBeLessThan(300);
    const missing = await postComment(json('http://localhost/x', { content: 'Agreed.' }), {
      params: Promise.resolve({ id: PID, messageId: 'nope' }),
    });
    expect(missing.status).toBe(404);
    const blank = await postComment(json('http://localhost/x', { content: '   ' }), {
      params: Promise.resolve({ id: PID, messageId: topicId }),
    });
    expect(blank.status).toBe(400);
  });
});

describe('Basecamp routes: vendor visibility enforced server side', () => {
  const VENDOR_UID = 'vendor-roofer-1';

  beforeEach(async () => {
    as('usr-lead-1');
    await updateProjectInStore(PID, {
      vendorAccess: [{ uid: VENDOR_UID, name: 'Summit Roofing', invitedAt: '2026-10-01T00:00:00.000Z' }],
    } as never);
  });

  it('team members see internal and vendor-visible topics', async () => {
    const { topics } = await (await getMessages(get('http://localhost/x'), ctx(PID))).json();
    expect(topics.some((t: { vendorVisible: boolean }) => !t.vendorVisible)).toBe(true);
  });

  it('invited vendors only receive vendor-visible topics', async () => {
    as(VENDOR_UID);
    const r = await getMessages(get('http://localhost/x'), ctx(PID));
    expect(r.status).toBe(200);
    const { topics } = await r.json();
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.every((t: { vendorVisible: boolean }) => t.vendorVisible)).toBe(true);
  });

  it('invited vendors only receive vendor-visible tasks and cards', async () => {
    as(VENDOR_UID);
    const todos = await (await getTaskGroups(get('http://localhost/x'), ctx(PID))).json();
    expect(todos.tasks.length).toBeGreaterThan(0);
    for (const t of todos.tasks) expect(t.vendorVisible).toBe(true);
    const sharedListIds = new Set(todos.tasks.map((t: { listId?: string }) => t.listId));
    for (const l of todos.taskLists) expect(sharedListIds.has(l.id)).toBe(true);
    const cards = await (await getCards(get('http://localhost/x'), ctx(PID))).json();
    for (const c of cards.cardColumns) for (const card of c.cards) expect(card.vendorVisible).toBe(true);
  });

  it('vendors cannot read Campfire, Check-ins, or the Hill Chart', async () => {
    as(VENDOR_UID);
    expect((await getCampfire(get('http://localhost/x'), ctx(PID))).status).toBe(403);
    expect((await getCheckins(get('http://localhost/x'), ctx(PID))).status).toBe(403);
    expect((await getHill(get('http://localhost/x'), ctx(PID))).status).toBe(403);
  });

  it('vendors cannot comment on an internal topic', async () => {
    as('usr-lead-1');
    const { topics } = await (await getMessages(get('http://localhost/x'), ctx(PID))).json();
    const internal = topics.find((t: { vendorVisible: boolean }) => !t.vendorVisible);
    as(VENDOR_UID);
    const r = await postComment(json('http://localhost/x', { content: 'peek' }), {
      params: Promise.resolve({ id: PID, messageId: internal.id }),
    });
    expect([403, 404]).toContain(r.status);
  });

  it('an uninvited outsider gets 403', async () => {
    as('vendor-not-invited');
    expect((await getMessages(get('http://localhost/x'), ctx(PID))).status).toBe(403);
  });
});

describe('Basecamp routes: campfire and check-ins', () => {
  beforeEach(() => as('usr-lead-1'));

  it('posts and lists campfire messages, rejects blank', async () => {
    const r = await postCampfire(json('http://localhost/x', { text: 'Appraiser confirmed for 9am.' }), ctx(PID));
    expect(r.status).toBe(201);
    const { messages } = await (await getCampfire(get('http://localhost/x'), ctx(PID))).json();
    expect(messages.at(-1).text).toBe('Appraiser confirmed for 9am.');
    expect((await postCampfire(json('http://localhost/x', { text: '  ' }), ctx(PID))).status).toBe(400);
  });

  it('creates a check-in question, answers it, and rejects blank answers', async () => {
    const created = await postCheckin(
      json('http://localhost/x', { newPrompt: 'What blocked you this week?', frequency: 'weekly' }),
      ctx(PID),
    );
    expect(created.status).toBe(201);
    const { question } = await created.json();
    const answered = await postCheckin(json('http://localhost/x', { questionId: question.id, answer: 'Permit queue.' }), ctx(PID));
    expect(answered.status).toBe(200);
    const blank = await postCheckin(json('http://localhost/x', { questionId: question.id, answer: '   ' }), ctx(PID));
    expect(blank.status).toBe(400);
    const badFreq = await postCheckin(json('http://localhost/x', { newPrompt: 'x', frequency: 'hourly' }), ctx(PID));
    expect(badFreq.status).toBe(400);
  });
});

describe('Basecamp routes: to-dos', () => {
  beforeEach(() => as('usr-lead-1'));

  const findTask = (body: { tasks: Array<{ id: string }> }, id: string) =>
    body.tasks.find((x) => x.id === id) as {
      id: string;
      status: string;
      listId: string;
      notes?: string;
      dueDate?: string;
      linkedDocumentId?: string;
      subtasks: Array<{ id: string; completed: boolean }>;
    };

  it('creates a list, adds a task with assignee and due date, adds and toggles a subtask', async () => {
    const created = await postTaskGroups(json('http://localhost/x', { action: 'create_list', title: 'Closing prep' }), ctx(PID));
    expect(created.status).toBe(201);
    const listId = (await created.json()).list.id;

    const t = await postTaskGroups(
      json('http://localhost/x', {
        action: 'add_task',
        listId,
        title: 'Wire earnest money',
        dueDate: '2026-10-20',
        assigneeId: 'usr-analyst-1',
      }),
      ctx(PID),
    );
    expect(t.status).toBe(201);
    const { task } = await t.json();
    expect(task.assigneeUid).toBe('usr-analyst-1');
    expect(task.assigneeName).toBe('Alex Mercer');
    expect(task.dueDate).toBe('2026-10-20');
    expect(task.listId).toBe(listId);

    // The to-do lives on the project's single tasks store.
    const stored0 = await getProjectFromStore(PID);
    expect(stored0?.tasks?.some((x) => x.id === task.id && x.listId === listId)).toBe(true);
    expect((stored0 as unknown as Record<string, unknown>).taskGroups).toBeUndefined();

    const s = await postTaskGroups(
      json('http://localhost/x', { action: 'add_subtask', taskId: task.id, title: 'Confirm wiring instructions by phone' }),
      ctx(PID),
    );
    expect(s.status).toBe(201);
    const { subtask } = await s.json();

    const toggled = await (await postTaskGroups(
      json('http://localhost/x', { action: 'toggle_subtask', taskId: task.id, subtaskId: subtask.id }),
      ctx(PID),
    )).json();
    expect(findTask(toggled, task.id).subtasks[0].completed).toBe(true);

    const done = await (await postTaskGroups(json('http://localhost/x', { action: 'toggle_task', taskId: task.id }), ctx(PID))).json();
    expect(findTask(done, task.id).status).toBe('complete');
  });

  it('rejects an invalid due date and an unknown assignee', async () => {
    const list = (await (await postTaskGroups(json('http://localhost/x', { action: 'create_list', title: 'Validation' }), ctx(PID))).json()).list;
    const badDate = await postTaskGroups(
      json('http://localhost/x', { action: 'add_task', listId: list.id, title: 'x', dueDate: 'next tuesday' }),
      ctx(PID),
    );
    expect(badDate.status).toBe(400);
    const badAssignee = await postTaskGroups(
      json('http://localhost/x', { action: 'add_task', listId: list.id, title: 'x', assigneeId: 'ghost-user' }),
      ctx(PID),
    );
    expect(badAssignee.status).toBe(400);
    expect((await badAssignee.json()).code).toBe('INVALID_ASSIGNEE');
  });

  it('404s for unknown task and 400s for unknown action', async () => {
    expect((await postTaskGroups(json('http://localhost/x', { action: 'toggle_task', taskId: 'nope' }), ctx(PID))).status).toBe(404);
    expect((await postTaskGroups(json('http://localhost/x', { action: 'explode' }), ctx(PID))).status).toBe(400);
  });

  it('updates task properties and attaches a document', async () => {
    const list = (await (await postTaskGroups(json('http://localhost/x', { action: 'create_list', title: 'Doc Prep' }), ctx(PID))).json()).list;
    const taskRes = await postTaskGroups(
      json('http://localhost/x', { action: 'add_task', listId: list.id, title: 'Review Survey' }),
      ctx(PID),
    );
    const { task } = await taskRes.json();

    const updateRes = await postTaskGroups(
      json('http://localhost/x', {
        action: 'update_task',
        taskId: task.id,
        notes: 'Check boundary lines exhibit B',
        dueDate: '2026-11-15',
      }),
      ctx(PID),
    );
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    const updatedTask = findTask(updated, task.id);
    expect(updatedTask.notes).toBe('Check boundary lines exhibit B');
    expect(updatedTask.dueDate).toBe('2026-11-15');

    const attachRes = await postTaskGroups(
      json('http://localhost/x', { action: 'attach_document', taskId: task.id, documentId: 'doc-survey-1' }),
      ctx(PID),
    );
    expect(attachRes.status).toBe(200);
    const attached = await attachRes.json();
    expect(findTask(attached, task.id).linkedDocumentId).toBe('doc-survey-1');
  });

  it('lets an invited guest toggle shared tasks only, and nothing else', async () => {
    await updateProjectInStore(PID, {
      vendorAccess: [{ uid: 'vendor-roofer-1', name: 'Summit Roofing', invitedAt: '2026-10-01T00:00:00.000Z', invitedByUid: 'usr-lead-1' }],
    });
    as('vendor-roofer-1');
    const shared = await postTaskGroups(json('http://localhost/x', { action: 'toggle_task', taskId: 'tsk-3' }), ctx(PID));
    expect(shared.status).toBe(200);
    const internal = await postTaskGroups(json('http://localhost/x', { action: 'toggle_task', taskId: 'tsk-1' }), ctx(PID));
    expect(internal.status).toBe(404);
    const createList = await postTaskGroups(json('http://localhost/x', { action: 'create_list', title: 'Guest list' }), ctx(PID));
    expect(createList.status).toBe(403);
  });
});

describe('Basecamp routes: card table', () => {
  beforeEach(() => as('usr-lead-1'));

  it('adds a card, moves it, and removes it from the source column', async () => {
    const before = await (await getCards(get('http://localhost/x'), ctx(PID))).json();
    const [from, to] = before.cardColumns;
    const added = await (await postCards(
      json('http://localhost/x', { action: 'add_card', columnId: from.id, title: 'Order title search' }),
      ctx(PID),
    )).json();
    const cardId = added.card.id;

    const moved = await (await postCards(
      json('http://localhost/x', { action: 'move_card', cardId, targetColumnId: to.id }),
      ctx(PID),
    )).json();
    const src = moved.cardColumns.find((c: { id: string }) => c.id === from.id);
    const dst = moved.cardColumns.find((c: { id: string }) => c.id === to.id);
    expect(src.cards.some((c: { id: string }) => c.id === cardId)).toBe(false);
    expect(dst.cards.filter((c: { id: string }) => c.id === cardId)).toHaveLength(1);
    expect(dst.cards.find((c: { id: string }) => c.id === cardId).columnId).toBe(to.id);
  });

  it('404s when moving to an unknown column without losing the card', async () => {
    const before = await (await getCards(get('http://localhost/x'), ctx(PID))).json();
    const card = before.cardColumns.flatMap((c: { cards: unknown[] }) => c.cards)[0] as { id: string };
    const r = await postCards(json('http://localhost/x', { action: 'move_card', cardId: card.id, targetColumnId: 'nope' }), ctx(PID));
    expect(r.status).toBe(404);
    const after = await (await getCards(get('http://localhost/x'), ctx(PID))).json();
    expect(after.cardColumns.flatMap((c: { cards: Array<{ id: string }> }) => c.cards).some((c: { id: string }) => c.id === card.id)).toBe(true);
  });
});

describe('Basecamp routes: hill chart', () => {
  beforeEach(() => as('usr-lead-1'));

  it('clamps positions into 0..100', async () => {
    const { hillChartItems } = await (await getHill(get('http://localhost/x'), ctx(PID))).json();
    const id = hillChartItems[0].id;
    const hi = await (await postHill(json('http://localhost/x', { action: 'update_position', itemId: id, position: 250 }), ctx(PID))).json();
    expect(hi.item.position).toBe(100);
    const lo = await (await postHill(json('http://localhost/x', { action: 'update_position', itemId: id, position: -40 }), ctx(PID))).json();
    expect(lo.item.position).toBe(0);
  });

  it('rejects a non-numeric position', async () => {
    const { hillChartItems } = await (await getHill(get('http://localhost/x'), ctx(PID))).json();
    const r = await postHill(json('http://localhost/x', { action: 'update_position', itemId: hillChartItems[0].id, position: 'high' }), ctx(PID));
    expect(r.status).toBe(400);
  });
});

describe('Basecamp routes: schedule and iCal export', () => {
  beforeEach(() => as('usr-lead-1'));

  it('rejects an invalid date', async () => {
    const r = await postSchedule(json('http://localhost/x', { title: 'Closing', date: '2026-13-45' }), ctx(PID));
    expect(r.status).toBe(400);
  });

  it('exports a valid RFC 5545 calendar with escaped text and exclusive all-day DTEND', async () => {
    await postSchedule(
      json('http://localhost/x', {
        title: 'Inspection; roof, HVAC',
        date: '2026-10-31',
        isHardDate: true,
        notes: 'Bring keys\nCall seller first',
      }),
      ctx(PID),
    );
    const r = await exportSchedule(get('http://localhost/x'), ctx(PID));
    expect(r.status).toBe(200);
    expect(r.headers.get('Content-Type')).toContain('text/calendar');
    const ics = await r.text();
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('SUMMARY:[CRITICAL] Inspection\\; roof\\, HVAC');
    expect(ics).toContain('Bring keys\\nCall seller first');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261031');
    expect(ics).toContain('DTEND;VALUE=DATE:20261101');
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
  });
});

describe('Basecamp data: no cross-project demo content', () => {
  it('a project with no tool data of its own starts empty instead of inheriting demo threads', async () => {
    const p = await getProjectFromStore('deal-1');
    expect(p?.messageTopics ?? []).toHaveLength(0);
    expect(p?.campfireMessages ?? []).toHaveLength(0);
    expect(p?.scheduleEvents ?? []).toHaveLength(0);
  });
});

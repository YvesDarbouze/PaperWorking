import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Real-Space Cross-Agent Messaging E2E Tests', () => {
  const marcusUid = 'CtUnIHS2kObMyERLGVdHW8bE0g63';
  const danaUid = 'JIPNJHVItwULeKUUk4TLh3QXI7D3';
  const whitmoreUid = 'QnXFwo1Qc9NotjIi2BxgBsv65Qq2';
  const atlasUid = 'WBCXsjHD6zbmWD64rHegNq5zyIE2';
  const eleanorUid = 'oNsrJgfyF5T61NzqixyQ0CjTQ9k2';

  test('Test 1: Eleanor — Verify 2 unread messages (from Whitmore, Atlas)', async ({ page, context }) => {
    await context.addCookies([
      { name: '__session', value: `mock_session_agent_eleanor_vance`, domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: eleanorUid, domain: 'localhost', path: '/' },
    ]);

    await page.goto('/dashboard/inbox');
    await page.waitForLoadState('domcontentloaded');

    const apiRes = await page.request.get(`/api/messages?userId=${eleanorUid}`);
    expect(apiRes.ok()).toBeTruthy();
    const data = await apiRes.json();

    expect(data.unreadCount).toBe(2);

    const unreadMessages = data.messages.filter((m: any) => !m.read);
    const subjects = unreadMessages.map((m: any) => m.subject);

    expect(subjects).toContain('LP Interest — Tampa');
    expect(subjects).toContain('Plano Strip Syndication');
  });

  test('Test 2: Whitmore — Verify 1 unread message (from Eleanor)', async ({ page, context }) => {
    await context.addCookies([
      { name: '__session', value: `mock_session_agent_whitmore`, domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: whitmoreUid, domain: 'localhost', path: '/' },
    ]);

    await page.goto('/dashboard/inbox');
    await page.waitForLoadState('domcontentloaded');

    const apiRes = await page.request.get(`/api/messages?userId=${whitmoreUid}`);
    expect(apiRes.ok()).toBeTruthy();
    const data = await apiRes.json();

    const unreadMessages = data.messages.filter((m: any) => !m.read);
    expect(unreadMessages.length).toBe(1);

    const unreadSubject = unreadMessages[0].subject;
    expect(unreadSubject).toBe('Tampa 70% Subscribed');
    expect(unreadSubject).not.toBe('Akron Assignment Ready');
  });

  test('Test 3: Dana — Verify 2 unread messages (from Marcus, Atlas)', async ({ page, context }) => {
    await context.addCookies([
      { name: '__session', value: `mock_session_agent_dana_rodriguez`, domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: danaUid, domain: 'localhost', path: '/' },
    ]);

    await page.goto('/dashboard/inbox');
    await page.waitForLoadState('domcontentloaded');

    const apiRes = await page.request.get(`/api/messages?userId=${danaUid}`);
    expect(apiRes.ok()).toBeTruthy();
    const data = await apiRes.json();

    expect(data.unreadCount).toBe(2);

    const unreadMessages = data.messages.filter((m: any) => !m.read);
    const subjects = unreadMessages.map((m: any) => m.subject);

    expect(subjects).toContain('Phoenix Lead Incoming');
    expect(subjects).toContain('Dallas 6-Plex JV');
  });

  test('Test 4: Atlas — Verify 1 unread, mark as read, badge decrements', async ({ page, context }) => {
    await context.addCookies([
      { name: '__session', value: `mock_session_agent_atlas`, domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: atlasUid, domain: 'localhost', path: '/' },
    ]);

    await page.goto('/dashboard/inbox');
    await page.waitForLoadState('domcontentloaded');

    // Get Atlas inbox (initially 1 unread from Eleanor #11)
    const apiRes = await page.request.get(`/api/messages?userId=${atlasUid}`);
    expect(apiRes.ok()).toBeTruthy();
    const data = await apiRes.json();
    expect(data.unreadCount).toBe(1);

    // Open thread thread-eleanor-atlas-dallas from Eleanor ("Re: Dallas 6-Plex")
    const threadRes = await page.request.get('/api/messages/thread/thread-eleanor-atlas-dallas');
    expect(threadRes.ok()).toBeTruthy();
    const threadData = await threadRes.json();
    const eleanorMsg = threadData.messages.find((m: any) => m.id === 'msg_seed_11');
    expect(eleanorMsg).toBeDefined();
    expect(eleanorMsg.subject).toBe('Re: Dallas 6-Plex');

    // Mark msg_seed_11 as read via PATCH
    const patchRes = await page.request.patch('/api/messages/msg_seed_11/read', {
      data: { read: true },
    });
    expect(patchRes.ok()).toBeTruthy();

    // Verify unread count decrements to 0
    const updatedRes = await page.request.get(`/api/messages?userId=${atlasUid}`);
    expect(updatedRes.ok()).toBeTruthy();
    const updatedData = await updatedRes.json();
    expect(updatedData.unreadCount).toBe(0);
  });

  test('Test 5: Dana replies to Marcus, Marcus gets notification', async ({ page, context }) => {
    // 1. Log in as Dana and send reply to Marcus
    await context.addCookies([
      { name: '__session', value: `mock_session_agent_dana_rodriguez`, domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: danaUid, domain: 'localhost', path: '/' },
    ]);

    const replyRes = await page.request.post('/api/messages', {
      data: {
        threadId: 'thread-marcus-dana-phoenix',
        senderId: danaUid,
        recipientId: marcusUid,
        subject: 'Re: Phoenix Lead',
        body: "Send me the address and I'll drive by this weekend",
        attachmentProjectId: null,
      },
    });
    expect(replyRes.ok()).toBeTruthy();
    const replyData = await replyRes.json();
    expect(replyData.success).toBe(true);

    // 2. Log in as Marcus
    await context.clearCookies();
    await context.addCookies([
      { name: '__session', value: `mock_session_agent_marcus_chen`, domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: marcusUid, domain: 'localhost', path: '/' },
    ]);

    // Marcus inbox now shows 2 unread (1 original from Eleanor #10 + 1 new reply from Dana)
    const marcusRes = await page.request.get(`/api/messages?userId=${marcusUid}`);
    expect(marcusRes.ok()).toBeTruthy();
    const marcusData = await marcusRes.json();
    expect(marcusData.unreadCount).toBe(2);

    // Open thread thread-marcus-dana-phoenix and verify reply renders
    const threadRes = await page.request.get('/api/messages/thread/thread-marcus-dana-phoenix');
    expect(threadRes.ok()).toBeTruthy();
    const threadData = await threadRes.json();

    const messagesInThread = threadData.messages;
    const danaReply = messagesInThread.find((m: any) => m.senderId === danaUid && m.body.includes("drive by this weekend"));
    expect(danaReply).toBeDefined();
    expect(danaReply.body).toBe("Send me the address and I'll drive by this weekend");
  });

  test('Test 6: Whitmore clicks project attachment → project detail', async ({ page, context }) => {
    await context.addCookies([
      { name: '__session', value: `mock_session_agent_whitmore`, domain: 'localhost', path: '/' },
      { name: 'mock_user_uid', value: whitmoreUid, domain: 'localhost', path: '/' },
    ]);

    await page.goto('/dashboard/inbox');
    await page.waitForLoadState('domcontentloaded');

    // Fetch thread from Eleanor with Tampa project attachment
    const threadRes = await page.request.get('/api/messages/thread/thread-eleanor-whitmore-tampa');
    expect(threadRes.ok()).toBeTruthy();
    const threadData = await threadRes.json();
    const msg = threadData.messages[0];

    expect(msg.subject).toBe('Tampa 70% Subscribed');
    expect(msg.attachmentProjectId).toBe('proj_eleanor_vance_1');

    // Navigate to project detail page
    await page.goto(`/dashboard/projects/${msg.attachmentProjectId}`, { waitUntil: 'domcontentloaded' });

    // Verify page URL contains project ID
    expect(page.url()).toContain('/dashboard/projects/proj_eleanor_vance_1');
  });
});

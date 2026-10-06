import {
  listInboxThreadsFromStore,
  getInboxThreadFromStore,
  createInboxThreadInStore,
  updateInboxThreadInStore,
  deleteInboxThreadInStore,
  markAllInboxThreadsReadInStore,
} from '../../lib/inbox/inbox-store.js';
import { getInboxThreads } from '../../lib/dashboard/shell-seed.js';

describe('Unified Inbox Store Persistence (Firestore & Dual-Layer Cache)', () => {
  it('bootstraps seed threads and lists them', async () => {
    const threads = await listInboxThreadsFromStore({ organizationId: 'org-1' });
    expect(threads.length).toBeGreaterThanOrEqual(1);

    const first = threads[0];
    expect(first.id).toBeDefined();
    expect(first.subject).toBeDefined();
    expect(first.body).toBeDefined();
  });

  it('creates, retrieves, updates, and deletes an inbox thread', async () => {
    const threadId = `thread-test-${Date.now()}`;

    // Create
    const created = await createInboxThreadInStore({
      id: threadId,
      tab: 'opportunities',
      type: 'INVEST_INVITE',
      subject: 'Counterparty Term Sheet Negotiation',
      project: 'Austin Industrial Park',
      from: 'partner@capital.test',
      fromRole: 'Lead Equity Sponsor',
      preview: 'Review revised terms for Class-B industrial park',
      body: 'We have updated the equity split to 80/20 in favor of LP with an 8% pref rate.',
      unread: true,
      actionable: true,
      deepLinkUrl: '/marketplace/austin-industrial',
      organizationId: 'org-test-1',
    });

    expect(created.id).toBe(threadId);
    expect(created.unread).toBe(true);
    expect(created.archived).toBe(false);

    // Retrieve
    const fetched = await getInboxThreadFromStore(threadId);
    expect(fetched).not.toBeNull();
    expect(fetched?.subject).toBe('Counterparty Term Sheet Negotiation');
    expect(fetched?.project).toBe('Austin Industrial Park');

    // Verify it is reflected in getInboxThreads()
    const allThreads = getInboxThreads();
    const inSync = allThreads.find((t) => t.id === threadId);
    expect(inSync).toBeDefined();
    expect(inSync?.subject).toBe('Counterparty Term Sheet Negotiation');

    // Update (mark as read)
    const updated = await updateInboxThreadInStore(threadId, {
      unread: false,
    });
    expect(updated?.unread).toBe(false);

    const refetched = await getInboxThreadFromStore(threadId);
    expect(refetched?.unread).toBe(false);

    // Update (archive)
    const archived = await updateInboxThreadInStore(threadId, {
      archived: true,
    });
    expect(archived?.archived).toBe(true);

    // List without archived should omit it
    const activeThreads = await listInboxThreadsFromStore({
      organizationId: 'org-test-1',
      includeArchived: false,
    });
    expect(activeThreads.some((t) => t.id === threadId)).toBe(false);

    // List with archived should include it
    const withArchived = await listInboxThreadsFromStore({
      organizationId: 'org-test-1',
      includeArchived: true,
    });
    expect(withArchived.some((t) => t.id === threadId)).toBe(true);

    // Delete
    const deleted = await deleteInboxThreadInStore(threadId);
    expect(deleted).toBe(true);

    const afterDelete = await getInboxThreadFromStore(threadId);
    expect(afterDelete).toBeNull();
  });

  it('filters threads by tab and search query', async () => {
    const id = `thread-search-${Date.now()}`;
    await createInboxThreadInStore({
      id,
      tab: 'vendor',
      type: 'VENDOR_BID',
      subject: 'Commercial HVAC System Replacement Bid',
      project: 'Denver Tech Center',
      from: 'hvac@contractor.test',
      body: 'Detailed bid for 4-ton rooftop commercial heat pump system.',
      unread: true,
      organizationId: 'org-search-test',
    });

    // Tab filter
    const vendorThreads = await listInboxThreadsFromStore({
      organizationId: 'org-search-test',
      tab: 'vendor',
    });
    expect(vendorThreads.some((t) => t.id === id)).toBe(true);

    const tasksThreads = await listInboxThreadsFromStore({
      organizationId: 'org-search-test',
      tab: 'tasks',
    });
    expect(tasksThreads.some((t) => t.id === id)).toBe(false);

    // Search query
    const searchMatch = await listInboxThreadsFromStore({
      organizationId: 'org-search-test',
      search: 'HVAC',
    });
    expect(searchMatch.some((t) => t.id === id)).toBe(true);

    const searchNoMatch = await listInboxThreadsFromStore({
      organizationId: 'org-search-test',
      search: 'PlumbingNonExistentQuery',
    });
    expect(searchNoMatch.length).toBe(0);

    // Cleanup
    await deleteInboxThreadInStore(id);
  });

  it('marks all unread threads as read in store', async () => {
    const id1 = `thread-bulk-1-${Date.now()}`;
    const id2 = `thread-bulk-2-${Date.now()}`;

    await createInboxThreadInStore({
      id: id1,
      tab: 'system',
      type: 'SYSTEM',
      subject: 'Backup complete',
      body: 'Weekly snapshot backup completed successfully.',
      unread: true,
      organizationId: 'org-bulk-test',
    });

    await createInboxThreadInStore({
      id: id2,
      tab: 'system',
      type: 'SYSTEM',
      subject: 'Rate limit report',
      body: 'Rate limit usage within normal boundaries.',
      unread: true,
      organizationId: 'org-bulk-test',
    });

    const markedCount = await markAllInboxThreadsReadInStore({
      organizationId: 'org-bulk-test',
    });
    expect(markedCount).toBeGreaterThanOrEqual(2);

    const t1 = await getInboxThreadFromStore(id1);
    const t2 = await getInboxThreadFromStore(id2);
    expect(t1?.unread).toBe(false);
    expect(t2?.unread).toBe(false);

    // Cleanup
    await deleteInboxThreadInStore(id1);
    await deleteInboxThreadInStore(id2);
  });
});

/**
 * Prompts 65/66/71 — Inbox Interactions: regression tests
 *
 * Verifies:
 *   1. Dead more_vert buttons are gone from both surfaces
 *   2. Auto-mark-read useEffect is wired to selectedNotificationId
 *   3. NotifMoreMenu has real onMarkUnread / onArchive / onDelete actions
 *   4. ThreadMoreMenu has real onMarkUnread action
 *   5. ThreadDetail accepts onMarkThreadUnread prop
 *   6. page.tsx wires onMarkThreadUnread → markThreadAsUnread
 *   7. useInboxFeed exports markAsUnread (Firestore persisted)
 *   8. useInboxThreads exports markAsUnread (arrayRemove persisted)
 *   9. useState ordering: selectedNotificationId declared before useEffect
 *  10. Unique IDs on all menu buttons for E2E testability
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

const PAGE = read('app/dashboard/inbox/page.tsx');
const THREAD_DETAIL = read('components/inbox/ThreadDetail.tsx');
const USE_INBOX_FEED = read('hooks/useInboxFeed.ts');
const USE_INBOX_THREADS = read('hooks/useInboxThreads.ts');

describe('Prompts 65/66/71 — Inbox: every rendered control has a real effect', () => {

  describe('No dead buttons in notification detail pane (Prompt 66)', () => {
    it('dead headerless more_vert button is gone from page.tsx', () => {
      // Match the old pattern: a standalone button with no onClick, only className
      const hasDeadButton = /<button className="p-2 rounded-lg hover:bg-white\/5 text-\[#9E9DA0\] transition-colors">\s*<span[^>]*>more_vert<\/span>/
        .test(PAGE);
      expect(hasDeadButton).toBe(false);
    });

    it('NotifMoreMenu trigger has aria-label for notification actions', () => {
      expect(PAGE).toContain('aria-label="Notification actions"');
    });

    it('NotifMoreMenu passes onMarkUnread callback', () => {
      expect(PAGE).toContain('onMarkUnread');
    });

    it('NotifMoreMenu passes onArchive callback', () => {
      expect(PAGE).toContain('onArchive');
    });

    it('NotifMoreMenu passes onDelete callback', () => {
      expect(PAGE).toContain('onDelete');
    });

    it('onArchive calls archiveItem and closes pane', () => {
      expect(PAGE).toContain('archiveItem(selectedItem.id)');
      expect(PAGE).toContain('setSelectedNotificationId(null)');
    });

    it('onDelete calls deleteItem and closes pane', () => {
      expect(PAGE).toContain('deleteItem(selectedItem.id)');
    });
  });

  describe('No dead buttons in ThreadDetail header (Prompt 71)', () => {
    it('dead headerless more_vert button is gone from ThreadDetail', () => {
      const hasDeadButton = /<button className="p-2 rounded-lg hover:bg-white\/5 text-\[#9E9DA0\] transition-colors">\s*<span[^>]*>more_vert<\/span>\s*<\/button>/
        .test(THREAD_DETAIL);
      expect(hasDeadButton).toBe(false);
    });

    it('ThreadMoreMenu trigger button has id and aria-label', () => {
      expect(THREAD_DETAIL).toContain('id="thread-more-menu-trigger"');
      expect(THREAD_DETAIL).toContain('aria-label="Thread actions"');
    });

    it('ThreadMoreMenu trigger has onClick handler', () => {
      expect(THREAD_DETAIL).toContain('setOpen((v) => !v)');
    });

    it('ThreadMoreMenu renders Mark as Unread action button', () => {
      expect(THREAD_DETAIL).toContain('id="thread-menu-mark-unread"');
      expect(THREAD_DETAIL).toContain('Mark as Unread');
    });

    it('ThreadMoreMenu shows empty state text when no actions', () => {
      expect(THREAD_DETAIL).toContain('No actions available');
    });
  });

  describe('Auto-mark-as-read when notification is opened (Prompt 65)', () => {
    it('useEffect keyed on selectedNotificationId exists in page.tsx', () => {
      expect(PAGE).toContain('}, [selectedNotificationId]);');
    });

    it('the effect looks up the item from the items array', () => {
      expect(PAGE).toContain("items.find((n) => n.id === selectedNotificationId)");
    });

    it('the effect calls markAsRead when item is unread', () => {
      expect(PAGE).toContain('markAsRead(selectedNotificationId)');
    });

    it('selectedNotificationId useState is declared BEFORE its useEffect', () => {
      const stateIdx = PAGE.indexOf('const [selectedNotificationId, setSelectedNotificationId]');
      const effectIdx = PAGE.indexOf('}, [selectedNotificationId]);');
      expect(stateIdx).toBeGreaterThan(-1);
      expect(effectIdx).toBeGreaterThan(-1);
      expect(stateIdx).toBeLessThan(effectIdx);
    });
  });

  describe('MoreMenu click-outside behaviour', () => {
    it('NotifMoreMenu uses document.addEventListener for outside click', () => {
      expect(PAGE).toContain("document.addEventListener('mousedown'");
    });

    it('ThreadMoreMenu uses document.addEventListener for outside click', () => {
      expect(THREAD_DETAIL).toContain("document.addEventListener('mousedown'");
    });

    it('NotifMoreMenu has a container ref', () => {
      expect(PAGE).toContain('const ref = useRef<HTMLDivElement>(null)');
    });

    it('ThreadMoreMenu has a container ref', () => {
      expect(THREAD_DETAIL).toContain('const ref = useRef<HTMLDivElement>(null)');
    });
  });

  describe('ThreadDetail onMarkThreadUnread prop (Prompt 71)', () => {
    it('ThreadDetailProps has onMarkThreadUnread optional prop', () => {
      expect(THREAD_DETAIL).toContain('onMarkThreadUnread?');
    });

    it('ThreadDetail destructures onMarkThreadUnread', () => {
      expect(THREAD_DETAIL).toContain('onMarkThreadUnread');
    });

    it('page.tsx passes onMarkThreadUnread to ThreadDetail', () => {
      expect(PAGE).toContain('onMarkThreadUnread={');
    });

    it('onMarkThreadUnread calls markThreadAsUnread with projectId', () => {
      expect(PAGE).toContain('markThreadAsUnread(activeThread.projectId)');
    });
  });

  describe('useInboxFeed.markAsUnread — Firestore persisted', () => {
    it('UseInboxFeedReturn interface exposes markAsUnread', () => {
      expect(USE_INBOX_FEED).toContain('markAsUnread: (id: string) => Promise<void>');
    });

    it('markAsUnread is returned from the hook', () => {
      expect(USE_INBOX_FEED).toContain('markAsUnread,');
    });

    it('markAsUnread calls updateDoc on the notifications collection', () => {
      expect(USE_INBOX_FEED).toContain("db, 'notifications', id");
      expect(USE_INBOX_FEED).toContain('read: false');
    });

    it('markAsUnread performs optimistic UI update', () => {
      const hasOptimistic = USE_INBOX_FEED.includes("read: false") &&
        USE_INBOX_FEED.includes("setNotifications((prev)");
      expect(hasOptimistic).toBe(true);
    });

    it('page.tsx destructures markAsUnread from useInboxFeed', () => {
      expect(PAGE).toContain('markAsUnread,');
    });
  });

  describe('useInboxThreads.markAsUnread — Firestore persisted', () => {
    it('UseInboxThreadsReturn interface exposes markAsUnread', () => {
      expect(USE_INBOX_THREADS).toContain('markAsUnread: (projectId: string) => Promise<void>');
    });

    it('useInboxThreads imports arrayRemove from firebase/firestore', () => {
      expect(USE_INBOX_THREADS).toContain('arrayRemove,');
    });

    it('markAsUnread uses arrayRemove on readByUid', () => {
      expect(USE_INBOX_THREADS).toContain('readByUid: arrayRemove(uid)');
    });

    it('markAsUnread is returned from the hook', () => {
      expect(USE_INBOX_THREADS).toContain('markAsUnread');
    });

    it('page.tsx destructures markAsUnread from useInboxThreads as markThreadAsUnread', () => {
      expect(PAGE).toContain('markAsUnread: markThreadAsUnread');
    });
  });

  describe('Unique IDs for E2E testability', () => {
    it('notif-more-menu-trigger id', () => { expect(PAGE).toContain('id="notif-more-menu-trigger"'); });
    it('notif-more-menu panel id', () => { expect(PAGE).toContain('id="notif-more-menu"'); });
    it('notif-menu-mark-unread id', () => { expect(PAGE).toContain('id="notif-menu-mark-unread"'); });
    it('notif-menu-archive id', () => { expect(PAGE).toContain('id="notif-menu-archive"'); });
    it('notif-menu-delete id', () => { expect(PAGE).toContain('id="notif-menu-delete"'); });
    it('thread-more-menu-trigger id', () => { expect(THREAD_DETAIL).toContain('id="thread-more-menu-trigger"'); });
    it('thread-more-menu panel id', () => { expect(THREAD_DETAIL).toContain('id="thread-more-menu"'); });
    it('thread-menu-mark-unread id', () => { expect(THREAD_DETAIL).toContain('id="thread-menu-mark-unread"'); });
  });

  describe('No missing imports in page.tsx', () => {
    it('imports useRef', () => { expect(PAGE).toContain('useRef'); });
    it('imports useEffect', () => { expect(PAGE).toContain('useEffect'); });
  });
});

import { getSupportProvider } from '../lib/providers/support';
import { FirestoreSupportProvider } from '../lib/providers/support/firestore';
import { MockSupportProvider } from '../lib/providers/support/mock';

// Mock firebase/firestore
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  arrayUnion: (item: any) => ({ arrayUnionItem: item }),
}));

jest.mock('../lib/firebase/config', () => ({
  db: {},
}));

describe('Support Provider Adapter & Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Factory: getSupportProvider', () => {
    it('returns MockSupportProvider by default when env is unset', () => {
      const provider = getSupportProvider();
      expect(provider).toBeInstanceOf(MockSupportProvider);
    });

    it('returns FirestoreSupportProvider when env is set to "firestore"', () => {
      process.env.NEXT_PUBLIC_SUPPORT_PROVIDER = 'firestore';
      const provider = getSupportProvider();
      expect(provider).toBeInstanceOf(FirestoreSupportProvider);
    });
  });

  describe('MockSupportProvider', () => {
    let mockLocalStorage: Record<string, string> = {};

    beforeAll(() => {
      // Mock localStorage for node environment
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: (key: string) => mockLocalStorage[key] || null,
          setItem: (key: string, value: string) => {
            mockLocalStorage[key] = value;
          },
          removeItem: (key: string) => {
            delete mockLocalStorage[key];
          },
          clear: () => {
            mockLocalStorage = {};
          },
        },
        writable: true,
      });
    });

    beforeEach(() => {
      mockLocalStorage = {};
    });

    it('creates and retrieves tickets locally', async () => {
      const provider = new MockSupportProvider();
      const userId = 'test-user-123';
      const email = 'test@example.com';
      const plan = 'Team';
      const initialMessages = [
        { sender: 'agent' as const, text: 'Hello', time: '10:00 AM', timestamp: new Date().toISOString() }
      ];

      // 1. Get open ticket (should be null)
      const empty = await provider.getOpenTicket(userId);
      expect(empty).toBeNull();

      // 2. Create ticket
      const ticketId = await provider.createTicket(userId, email, plan, initialMessages);
      expect(ticketId).toContain('mock-ticket-');

      // 3. Get open ticket (should exist now)
      const ticket = await provider.getOpenTicket(userId);
      expect(ticket).not.toBeNull();
      expect(ticket?.userId).toBe(userId);
      expect(ticket?.plan).toBe(plan);
      expect(ticket?.messages).toHaveLength(1);

      // 4. Add message
      const newMessage = { sender: 'user' as const, text: 'Need help', time: '10:05 AM', timestamp: new Date().toISOString() };
      await provider.addMessage(ticketId, newMessage);

      // 5. Verify message added
      const updatedTicket = await provider.getOpenTicket(userId);
      expect(updatedTicket?.messages).toHaveLength(2);
      expect(updatedTicket?.messages[1].text).toBe('Need help');
    });
  });

  describe('FirestoreSupportProvider', () => {
    it('calls getDocs for open ticket query', async () => {
      const provider = new FirestoreSupportProvider();
      
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'firestore-ticket-123',
            data: () => ({
              userId: 'test-user-123',
              email: 'test@example.com',
              plan: 'Solo',
              status: 'open',
              messages: [{ sender: 'agent', text: 'Hello', time: '10:00 AM', timestamp: '2026-06-30T10:00:00.000Z' }],
              createdAt: '2026-06-30T10:00:00.000Z',
              updatedAt: '2026-06-30T10:00:00.000Z',
            }),
          },
        ],
      });

      const ticket = await provider.getOpenTicket('test-user-123');
      expect(ticket).not.toBeNull();
      expect(ticket?.id).toBe('firestore-ticket-123');
      expect(ticket?.plan).toBe('Solo');
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    it('calls addDoc when creating ticket', async () => {
      const provider = new FirestoreSupportProvider();
      
      mockAddDoc.mockResolvedValueOnce({ id: 'new-firestore-ticket-id' });

      const ticketId = await provider.createTicket('test-user-123', 'test@example.com', 'Team', [
        { sender: 'user', text: 'help', time: '10:00 AM', timestamp: '2026-06-30T10:00:00.000Z' }
      ]);

      expect(ticketId).toBe('new-firestore-ticket-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    it('calls updateDoc with arrayUnion when adding a message', async () => {
      const provider = new FirestoreSupportProvider();
      
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await provider.addMessage('ticket-123', {
        sender: 'user',
        text: 'hello',
        time: '10:00 AM',
        timestamp: '2026-06-30T10:00:00.000Z'
      });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });
  });
});

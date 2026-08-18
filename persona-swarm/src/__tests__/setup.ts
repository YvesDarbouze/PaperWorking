/**
 * Integration test setup for persona-swarm.
 * Mocks Firebase Admin to avoid real network calls.
 */

import { TextDecoder, TextEncoder } from 'util';

global.TextDecoder = TextDecoder as any;
global.TextEncoder = TextEncoder as any;

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            id: 'test-persona-1',
            name: 'Test Persona',
            email: 'test@example.com',
          }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      })),
      add: jest.fn().mockResolvedValue({ id: 'test-doc-1' }),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [],
        empty: true,
      }),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
    runTransaction: jest.fn((fn: any) => fn({
      get: jest.fn().mockResolvedValue({ exists: false }),
      set: jest.fn(),
      update: jest.fn(),
    })),
  }),
  auth: () => ({
    getUser: jest.fn().mockResolvedValue({
      uid: 'test-user-1',
      email: 'test@example.com',
      displayName: 'Test User',
    }),
    createUser: jest.fn().mockResolvedValue({
      uid: 'test-user-1',
      email: 'test@example.com',
    }),
  }),
}));

// Mock Google Maps API
jest.mock('@/lib/maps/google-maps-loader', () => ({
  loadGoogleMapsApi: jest.fn().mockResolvedValue(undefined),
  isGoogleMapsLoaded: jest.fn().mockReturnValue(true),
}));

// Set test timeout for integration tests
jest.setTimeout(300000); // 5 minutes

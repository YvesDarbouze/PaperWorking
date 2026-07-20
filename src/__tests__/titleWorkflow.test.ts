import { ManualTitleAdapter } from '@/lib/providers/title/manualTitleAdapter';
import { QualiaTitleAdapter } from '@/lib/providers/title/qualiaTitleAdapter';
import { getTitleProvider } from '@/lib/providers/title';
import type { TitleCommitmentData } from '@/types/schema';

// Mock adminDb
const mockUpdate = jest.fn();
const mockGet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        update: mockUpdate,
        get: mockGet,
      })),
    })),
  },
}));

describe('Card F4.5 — Title Search & Clearance Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Factory', () => {
    it('returns ManualTitleAdapter by default', () => {
      delete process.env.TITLE_PROVIDER;
      const provider = getTitleProvider();
      expect(provider).toBeInstanceOf(ManualTitleAdapter);
    });

    it('returns QualiaTitleAdapter when TITLE_PROVIDER=qualia', () => {
      process.env.TITLE_PROVIDER = 'qualia';
      const provider = getTitleProvider();
      expect(provider).toBeInstanceOf(QualiaTitleAdapter);
      delete process.env.TITLE_PROVIDER;
    });
  });

  describe('ManualTitleAdapter state transitions', () => {
    const adapter = new ManualTitleAdapter();

    it('opens title order successfully', async () => {
      mockUpdate.mockResolvedValueOnce(undefined);
      const state = await adapter.openOrder('project_123', 'user_abc', 'John Doe');

      expect(state.status).toBe('order_opened');
      expect(state.orderOpenedByUid).toBe('user_abc');
      expect(state.orderOpenedByName).toBe('John Doe');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'closingRoom.titleWorkflow': expect.objectContaining({ status: 'order_opened' }),
          'closingRoom.chainOfTitleStatus': 'pending',
        })
      );
    });

    it('receives commitment and captures metadata', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          closingRoom: {
            titleWorkflow: {
              status: 'order_opened',
              orderOpenedAt: '2026-07-19T00:00:00Z',
            },
          },
        }),
      });
      mockUpdate.mockResolvedValueOnce(undefined);

      const commitmentData: TitleCommitmentData = {
        policyAmount: 350000,
        effectiveDate: '2026-07-18',
        exceptionsCount: 1,
        commitmentDocumentUrl: 'https://example.com/commitment.pdf',
        commitmentDocumentName: 'commitment.pdf',
      };

      const state = await adapter.receiveCommitment('project_123', commitmentData, 'user_abc', 'John Doe');

      expect(state.status).toBe('commitment_received');
      expect(state.commitment).toEqual(commitmentData);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'closingRoom.titleWorkflow': expect.objectContaining({
            status: 'commitment_received',
            commitment: commitmentData,
          }),
        })
      );
    });

    it('adds and resolves title defects', async () => {
      // 1. Add defect
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          closingRoom: {
            titleWorkflow: {
              status: 'commitment_received',
              commitment: { policyAmount: 100000, effectiveDate: '2026-07-19', exceptionsCount: 1 },
              defects: [],
            },
          },
        }),
      });
      mockUpdate.mockResolvedValueOnce(undefined);

      let state = await adapter.addDefect('project_123', 'Mechanics lien outstanding', 'user_abc', 'John Doe');
      expect(state.status).toBe('defects_identified');
      expect(state.defects?.length).toBe(1);
      expect(state.defects?.[0].description).toBe('Mechanics lien outstanding');
      expect(state.defects?.[0].status).toBe('pending');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'closingRoom.chainOfTitleStatus': 'failed',
        })
      );

      // 2. Resolve defect
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          closingRoom: {
            titleWorkflow: state,
          },
        }),
      });
      mockUpdate.mockResolvedValueOnce(undefined);

      const defectId = state.defects?.[0].id || '';
      state = await adapter.resolveDefect(
        'project_123',
        defectId,
        'Paid payoff to contractor',
        'https://example.com/lien_release.pdf',
        'lien_release.pdf',
        'user_abc',
        'John Doe'
      );

      expect(state.status).toBe('cleared'); // automatically clears when all defects resolved
      expect(state.defects?.[0].status).toBe('resolved');
      expect(state.defects?.[0].notes).toBe('Paid payoff to contractor');
      expect(state.defects?.[0].documentUrl).toBe('https://example.com/lien_release.pdf');
      expect(state.clearedByName).toBe('John Doe');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'closingRoom.chainOfTitleStatus': 'verified',
        })
      );
    });
  });

  describe('QualiaTitleAdapter integration simulation', () => {
    const adapter = new QualiaTitleAdapter();

    it('automates commitment receipt and registers pre-seeded defects on openOrder', async () => {
      mockUpdate.mockResolvedValueOnce(undefined);
      const state = await adapter.openOrder('project_123', 'user_abc', 'John Doe');

      expect(state.status).toBe('commitment_received');
      expect(state.commitment?.exceptionsCount).toBe(2);
      expect(state.commitment?.commitmentDocumentName).toBe('qualia_commitment_29013.pdf');
      expect(state.defects?.length).toBe(2);
      expect(state.defects?.[0].description).toContain('Prior unresolved mortgage of record');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'closingRoom.chainOfTitleStatus': 'failed', // Active defects mean failed status
        })
      );
    });
  });
});

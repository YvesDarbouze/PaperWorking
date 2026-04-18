import { normalizeMLSData, processStatusChange } from '../mlsService';
import { projectsService } from '../../firebase/projects';
import { transitionDealPhase } from '../dealStateMachine';
import { bridgeWorkerService } from '../bridgeWorkerService';

// Mock dependencies
jest.mock('../../firebase/config', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
  auth: {},
  storage: {},
}));

jest.mock('../../firebase/projects');
jest.mock('../dealStateMachine');
jest.mock('../bridgeWorkerService');
jest.mock('../../redis', () => ({
  __esModule: true,
  default: {
    status: 'ready',
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

describe('MLS Integration (Normalization & State Changes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeMLSData', () => {
    it('correctly maps RESO fields to Internal Property Schema', () => {
      const mockRawData = {
        ListingKey: 'MLS_12345',
        UnparsedAddress: '123 Test Street, Austin, TX',
        BedroomsTotal: 4,
        BathroomsFull: 2,
        BathroomsHalf: 1,
        LivingArea: 2500,
        LotSizeAcres: 0.25,
        YearBuilt: 1995,
        ListPrice: 500000,
        StandardStatus: 'Active',
        PublicRemarks: 'Beautiful test home.',
        Media: [
          { MediaURL: 'http://example.com/photo1.jpg', ShortDescription: 'Front' }
        ]
      };

      const normalized = normalizeMLSData(mockRawData as any);

      expect(normalized.mls_id).toBe('MLS_12345');
      expect(normalized.address).toBe('123 Test Street, Austin, TX');
      expect(normalized.beds).toBe(4);
      expect(normalized.baths).toBe(2.5);
      expect(normalized.price).toBe(500000);
      expect(normalized.status).toBe('Listed');
    });

    it('handles "Pending" to "Under Contract" transition mapping', () => {
      const mockRawData = { StandardStatus: 'Pending' };
      const normalized = normalizeMLSData(mockRawData as any);
      expect(normalized.status).toBe('Under Contract');
    });

    it('handles "Closed" to "Sold" transition mapping', () => {
      const mockRawData = { StandardStatus: 'Closed' };
      const normalized = normalizeMLSData(mockRawData as any);
      expect(normalized.status).toBe('Sold');
    });
  });

  describe('processStatusChange (Webhook Simulation)', () => {
    it('triggers transitionDealPhase when statuses differ', async () => {
      // 1. Mock system state
      (bridgeWorkerService.isPaused as jest.Mock).mockResolvedValue(false);
      
      // 2. Mock finding an existing deal in 'Listed' state
      (projectsService.getDealsByMlsId as jest.Mock).mockResolvedValue([
        { id: 'deal_abc', status: 'Listed', mls_id: 'MLS_999' }
      ]);

      // 3. Mock incoming webhook payload for 'Closed' (Sold)
      const payload = {
        ResourceRecord: {
          ListingKey: 'MLS_999',
          StandardStatus: 'Closed'
        }
      };

      const result = await processStatusChange(payload);

      // 4. Verification
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(transitionDealPhase).toHaveBeenCalledWith(
        'deal_abc',
        'Listed',
        'Sold',
        'bridge_api_system',
        expect.stringContaining('Zillow Bridge Webhook')
      );
    });

    it('skips transition if statuses are already in sync', async () => {
      (bridgeWorkerService.isPaused as jest.Mock).mockResolvedValue(false);
      (projectsService.getDealsByMlsId as jest.Mock).mockResolvedValue([
        { id: 'deal_xyz', status: 'Sold', mls_id: 'MLS_999' }
      ]);

      const payload = {
        ResourceRecord: { ListingKey: 'MLS_999', StandardStatus: 'Closed' }
      };

      await processStatusChange(payload);

      expect(transitionDealPhase).not.toHaveBeenCalled();
    });

    it('aborts processing if system is paused due to rate limiting', async () => {
      (bridgeWorkerService.isPaused as jest.Mock).mockResolvedValue(true);
      
      const payload = { ResourceRecord: { ListingKey: 'MLS_999' } };
      const result = await processStatusChange(payload);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('system_paused');
      expect(projectsService.getDealsByMlsId).not.toHaveBeenCalled();
    });
  });
});

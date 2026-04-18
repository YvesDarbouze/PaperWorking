import { bridgeGuardrail } from '../bridgeGuardrail';
import apiClient from '../../apiClient';
import { BridgeQueryBuilder } from '../../utils/BridgeQueryBuilder';

// Mock dependencies
jest.mock('../../apiClient');

describe('BridgeGuardrailService (OData Pagination)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('traverses multiple pages via @odata.nextLink', async () => {
    // 1. Mock first page response with a nextLink
    (apiClient.get as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          value: [
            { ListingKey: 'P1', ListingId: 'ID1', StandardStatus: 'Active' }
          ],
          '@odata.nextLink': 'Property?$skip=1'
        }
      })
      // 2. Mock second page response (final)
      .mockResolvedValueOnce({
        data: {
          value: [
            { ListingKey: 'P2', ListingId: 'ID2', StandardStatus: 'Closed' }
          ]
        }
      });

    const query = new BridgeQueryBuilder().top(2);
    const results = await bridgeGuardrail.fetchAll(query);

    expect(results).toHaveLength(2);
    expect(results[0].ListingKey).toBe('P1');
    expect(results[1].ListingKey).toBe('P2');
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it('respects the maxPages safety limit', async () => {
    // Mock infinite recursion
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        value: [{ ListingKey: 'Loop' }],
        '@odata.nextLink': 'more'
      }
    });

    const query = new BridgeQueryBuilder();
    const results = await bridgeGuardrail.fetchAll(query, 3); // Max 3 pages

    expect(results).toHaveLength(3);
    expect(apiClient.get).toHaveBeenCalledTimes(3);
  });

  it('handles malformed OData wrappers gracefully', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        // Missing 'value' array
        invalid_key: []
      }
    });

    const query = new BridgeQueryBuilder();
    const results = await bridgeGuardrail.fetchAll(query);

    expect(results).toHaveLength(0);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});

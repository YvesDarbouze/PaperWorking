import {
  dispatchOrchestratorEvent,
  resetOrchestratorHistory,
} from '../orchestrator';

describe('Agent 8: Orchestration Hub & Event Bus Unit Tests', () => {
  beforeEach(() => {
    resetOrchestratorHistory();
  });

  test('1. dispatches project:created event and executes actions', async () => {
    const res = await dispatchOrchestratorEvent({
      eventId: 'evt_p_create_1',
      type: 'project:created',
      payload: { projectId: 'p_100' },
      timestamp: new Date().toISOString(),
    });

    expect(res.processed).toBe(true);
    expect(res.isDuplicate).toBe(false);
    expect(res.actionsExecuted).toContain('generate_phase_todos');
    expect(res.actionsExecuted).toContain('allocate_storage_quota');
  });

  test('2. enforces idempotency and skips duplicate event IDs', async () => {
    const event = {
      eventId: 'evt_bid_accept_1',
      type: 'bid:accepted' as const,
      payload: { bidId: 'bid_1' },
      timestamp: new Date().toISOString(),
    };

    const firstRun = await dispatchOrchestratorEvent(event);
    expect(firstRun.processed).toBe(true);
    expect(firstRun.actionsExecuted).toContain('assign_vendor_to_todo');

    const secondRun = await dispatchOrchestratorEvent(event);
    expect(secondRun.processed).toBe(false);
    expect(secondRun.isDuplicate).toBe(true);
    expect(secondRun.actionsExecuted).toHaveLength(0);
  });

  test('3. dispatches tax:quarter_end and plaid:transaction_synced events', async () => {
    const taxRes = await dispatchOrchestratorEvent({
      eventId: 'evt_tax_q1',
      type: 'tax:quarter_end',
      payload: { quarter: 1 },
      timestamp: new Date().toISOString(),
    });
    expect(taxRes.actionsExecuted).toContain('generate_1040_es_pdf');

    const plaidRes = await dispatchOrchestratorEvent({
      eventId: 'evt_plaid_1',
      type: 'plaid:transaction_synced',
      payload: { txId: 'tx_1' },
      timestamp: new Date().toISOString(),
    });
    expect(plaidRes.actionsExecuted).toContain('classify_transaction');
  });
});

/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useProjectStore } from '@/store/projectStore';
import { Project, LedgerItem } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Project Store Unit Tests

   Verifies:
   • State synchronization for deals and ledgerItems
   • Selection logic
   • Calculated aggregation for the Engine Room
   ═══════════════════════════════════════════════════════ */

// Mock data
const mockDeals: Project[] = [
  {
    id: 'deal1',
    address: '123 Alpha St',
    propertyName: '123 Alpha St',
    organizationId: 'org1',
    status: 'Lead',
    ownerUid: 'user1',
    members: { user1: { uid: 'user1', role: 'Lead Investor', joinedAt: new Date() } },
    financials: { purchasePrice: 0, estimatedARV: 0, costs: [] },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockLedgerItems: LedgerItem[] = [
  {
    id: 'item1',
    projectId: 'deal1',
    organizationId: 'org1',
    type: 'expense',
    category: 'General',
    description: 'Roof repair',
    amount: 1000,
    status: 'Approved',
    submittedByUid: 'user1',
    createdAt: new Date()
  },
  {
    id: 'item2',
    projectId: 'deal1',
    organizationId: 'org1',
    type: 'expense',
    category: 'Other',
    description: 'Utility hookup',
    amount: 500,
    status: 'Pending',
    submittedByUid: 'user1',
    createdAt: new Date()
  }
];

describe('useProjectStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useProjectStore());
    act(() => {
      result.current.setDeals([]);
    });
  });

  it('correctly synchronizes deals and selection', () => {
    const { result } = renderHook(() => useProjectStore());

    act(() => {
      result.current.setDeals(mockDeals);
    });

    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0].id).toBe('deal1');

    act(() => {
      result.current.setDeal(mockDeals[0]);
    });

    expect(result.current.currentProject?.id).toBe('deal1');
    expect(result.current.getSelectedDeal()?.address).toBe('123 Alpha St');
  });

  it('aggregates ledger items for a deal', () => {
    const { result } = renderHook(() => useProjectStore());

    act(() => {
      result.current.setLedgerItems('deal1', mockLedgerItems);
    });

    const items = result.current.getLedgerItemsForDeal('deal1');
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('item1');
  });

  it('calculates total approved costs accurately', () => {
    const { result } = renderHook(() => useProjectStore());

    act(() => {
      result.current.setLedgerItems('deal1', mockLedgerItems);
    });

    const items = result.current.getLedgerItemsForDeal('deal1');
    const totalApproved = items
      .filter((i: LedgerItem) => i.status === 'Approved')
      .reduce((sum: number, i: LedgerItem) => sum + (Number(i.amount) || 0), 0);

    expect(totalApproved).toBe(1000);
  });
});

import {
  MIN_TRANSACTIONS_FOR_REPORT,
  PHASE_BUCKETS,
  PHASE_ORDER,
  allTransactionsScoped,
  assessReportReadiness,
  scopeToProject,
  summarizeByPhase,
  tagTransactionPhase,
  tagTransactions,
  untaggedTransactions,
  type TaggableTransaction,
} from '@/lib/reports/plaidPhaseTagging';

const tx = (over: Partial<TaggableTransaction> = {}): TaggableTransaction => ({
  id: over.id ?? 't1',
  projectId: 'p1',
  category: null,
  description: null,
  amountCents: -1000,
  date: '2026-08-01',
  ...over,
});

describe('Plaid REIL phase tagging', () => {
  describe('tagTransactionPhase', () => {
    it('routes acquisition costs to Find & Fund', () => {
      for (const c of ['Earnest Money', 'Home Inspection', 'Appraisal Fee', 'Loan Origination', 'Title Search']) {
        expect(tagTransactionPhase(tx({ category: c })).phase).toBe('acquisition');
      }
    });

    it('routes operating costs and rent to Hold', () => {
      for (const c of ['Rent Payment', 'Utilities', 'Repairs', 'Management Fee', 'HOA Dues', 'Property Tax']) {
        expect(tagTransactionPhase(tx({ category: c })).phase).toBe('hold');
      }
    });

    it('routes disposition costs to Exit', () => {
      for (const c of ['Capital Gains', 'Sale Proceeds', 'Realtor Commission', 'Seller Credit']) {
        expect(tagTransactionPhase(tx({ category: c })).phase).toBe('exit');
      }
    });

    it('matches on description when category is missing', () => {
      const r = tagTransactionPhase(tx({ category: null, description: 'Wire for earnest money deposit' }));
      expect(r.phase).toBe('acquisition');
      expect(r.confident).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(tagTransactionPhase(tx({ category: 'REPAIRS' })).phase).toBe('hold');
      expect(tagTransactionPhase(tx({ category: 'capital gains' })).phase).toBe('exit');
    });

    it('prefers the more specific rule when signals overlap', () => {
      // "closing cost" is acquisition; it must not be captured by a generic
      // exit/hold match first.
      expect(tagTransactionPhase(tx({ category: 'Closing Costs' })).phase).toBe('acquisition');
    });

    it('defaults to hold but flags the guess as unconfident', () => {
      const r = tagTransactionPhase(tx({ category: 'Miscellaneous', description: 'ACH debit' }));
      expect(r.phase).toBe('hold');
      expect(r.confident).toBe(false);
    });

    it('marks an empty transaction unconfident rather than guessing confidently', () => {
      const r = tagTransactionPhase(tx({ category: null, description: null }));
      expect(r.confident).toBe(false);
    });

    it('preserves the original fields', () => {
      const r = tagTransactionPhase(tx({ id: 'abc', amountCents: -4200 }));
      expect(r.id).toBe('abc');
      expect(r.amountCents).toBe(-4200);
    });
  });

  describe('project scoping', () => {
    const rows = [
      tx({ id: 'a', projectId: 'p1' }),
      tx({ id: 'b', projectId: 'p2' }),
      tx({ id: 'c', projectId: null }),
    ];

    it('filters to a single project', () => {
      expect(scopeToProject(rows, 'p1').map((r) => r.id)).toEqual(['a']);
    });

    it('selects untagged rows with a null projectId', () => {
      expect(scopeToProject(rows, null).map((r) => r.id)).toEqual(['c']);
    });

    it('reports untagged rows', () => {
      expect(untaggedTransactions(rows).map((r) => r.id)).toEqual(['c']);
      expect(allTransactionsScoped(rows)).toBe(false);
      expect(allTransactionsScoped([rows[0], rows[1]])).toBe(true);
    });

    it('treats an empty list as fully scoped', () => {
      expect(allTransactionsScoped([])).toBe(true);
    });
  });

  describe('summarizeByPhase', () => {
    it('always returns all three phases in order', () => {
      const out = summarizeByPhase([]);
      expect(out.map((o) => o.phase)).toEqual([...PHASE_ORDER]);
      expect(out.every((o) => o.count === 0)).toBe(true);
    });

    it('splits inflow and outflow, treating outflow as positive', () => {
      const out = summarizeByPhase([
        tx({ id: '1', category: 'Rent Payment', amountCents: 250000 }),
        tx({ id: '2', category: 'Repairs', amountCents: -80000 }),
      ]);
      const hold = out.find((o) => o.phase === 'hold')!;
      expect(hold.inflowCents).toBe(250000);
      expect(hold.outflowCents).toBe(80000);
      expect(hold.count).toBe(2);
    });

    it('counts unconfident rows so the UI can prompt for review', () => {
      const out = summarizeByPhase([tx({ category: 'Unknown Thing' })]);
      expect(out.find((o) => o.phase === 'hold')!.unconfidentCount).toBe(1);
    });

    it('uses the human label from PHASE_BUCKETS', () => {
      const out = summarizeByPhase([]);
      expect(out.map((o) => o.label)).toEqual([
        PHASE_BUCKETS.acquisition.label,
        PHASE_BUCKETS.hold.label,
        PHASE_BUCKETS.exit.label,
      ]);
    });
  });

  describe('assessReportReadiness', () => {
    it('blocks with the property message when there are no projects', () => {
      const r = assessReportReadiness(0, 100);
      expect(r.ready).toBe(false);
      expect(r.reason).toBe('Add your first property to unlock Tax Intelligence.');
    });

    it('blocks with the transaction message below the threshold', () => {
      const r = assessReportReadiness(1, MIN_TRANSACTIONS_FOR_REPORT - 1);
      expect(r.ready).toBe(false);
      expect(r.reason).toBe('Add more transactions to generate this report.');
    });

    it('is ready at the threshold', () => {
      const r = assessReportReadiness(1, MIN_TRANSACTIONS_FOR_REPORT);
      expect(r.ready).toBe(true);
      expect(r.reason).toBe('');
    });

    it('prioritises the no-property message over the transaction one', () => {
      expect(assessReportReadiness(0, 0).reason).toContain('first property');
    });
  });

  it('tagTransactions maps every row', () => {
    expect(tagTransactions([tx({ id: '1' }), tx({ id: '2' })])).toHaveLength(2);
  });
});

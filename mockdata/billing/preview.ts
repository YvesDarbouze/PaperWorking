export const BILLING_PREVIEW = {
  plan: 'Individual',
  status: 'trialing',
  trialEnds: '2026-09-03',
  monthlyPrice: 59,
  paymentMethod: 'Mock sandbox — no card on file',
  billingEmail: 'investor@paperworking.test',
  invoices: [
    { id: 'inv_001', date: '2026-07-03', amount: 59, status: 'Paid' },
    { id: 'inv_002', date: '2026-06-03', amount: 59, status: 'Paid' },
    { id: 'inv_003', date: '2026-05-03', amount: 0, status: 'Trial' },
  ],
} as const;

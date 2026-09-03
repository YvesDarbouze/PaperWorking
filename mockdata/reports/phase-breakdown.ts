export const PHASE_BREAKDOWN_SEED: Array<{
  phase: string;
  label: string;
  amount: number;
  count: number;
  unconfidentCount: number;
}> = [
  {
    phase: 'acquisition',
    label: 'Acquisition spend',
    amount: 18400,
    count: 4,
    unconfidentCount: 1,
  },
  {
    phase: 'hold',
    label: 'Hold / operations',
    amount: 28620,
    count: 18,
    unconfidentCount: 2,
  },
  {
    phase: 'exit',
    label: 'Exit / disposition',
    amount: 9200,
    count: 3,
    unconfidentCount: 0,
  },
];

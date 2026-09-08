export type InvestmentStrategy =
  | 'buy_and_hold'
  | 'flip'
  | 'brrrr'
  | 'short_term_rental'
  | 'multifamily'
  | 'commercial';

export const STRATEGY_LABELS: Record<InvestmentStrategy, string> = {
  buy_and_hold: 'Buy & Hold',
  flip: 'Flip',
  brrrr: 'BRRRR',
  short_term_rental: 'Short-Term Rental',
  multifamily: 'Multifamily',
  commercial: 'Commercial',
};

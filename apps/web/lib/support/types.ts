export type FaqCategory = 'Platform' | 'REIL' | 'Underwriting' | 'Collaboration' | 'Billing' | 'Security';

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type GlossaryCategory = 'REIL Phase' | 'Financial Metric' | 'Contract & Legal' | 'Platform Entity' | 'Security';

export interface GlossaryTerm {
  id?: string;
  term: string;
  definition: string;
  category: GlossaryCategory;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GlossaryGroup {
  letter: string;
  terms: GlossaryTerm[];
}

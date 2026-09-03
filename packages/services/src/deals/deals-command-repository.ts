import type { DealRecord } from './deals-read-repository.js';

export type DealCreateData = {
  id?: string;
  slug: string;
  address: string;
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  holdingCosts: number;
  projectedRoi: number;
  status: 'draft' | 'published' | 'funding' | 'closed' | 'archived';
  visibility: 'marketplace' | 'invitation_only' | 'private';
  creatorId: string;
  projectId?: string;
};

export type DealsCommandRepository = {
  findBySlug(slug: string): Promise<{ id: string } | null>;
  findById(id: string): Promise<{ id: string } | null>;
  create(data: DealCreateData): Promise<DealRecord>;
};

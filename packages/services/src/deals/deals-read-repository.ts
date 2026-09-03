export type DealRecord = {
  id: string;
  slug: string;
  address: string;
  purchasePrice: unknown;
  rehabCost: unknown;
  arv: unknown;
  holdingCosts: unknown;
  projectedRoi: unknown;
  status: string;
  visibility: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DealExistsPreview = {
  id: string;
  slug: string;
  status: string;
  visibility: string;
  address: string;
};

export type DealsReadRepository = {
  listDeals(input: {
    accessOr: Array<Record<string, unknown>>;
    q?: string;
  }): Promise<DealRecord[]>;
  findBySlugOrId(slugOrId: string): Promise<DealExistsPreview | null>;
  findBySlug(slug: string): Promise<DealRecord | null>;
};

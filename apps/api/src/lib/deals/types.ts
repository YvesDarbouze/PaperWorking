export interface ApiDealPayload {
  id: string;
  slug: string;
  address: string;
  propertyName: string;
  city: string;
  state: string;
  zipCode: string;
  assetClass: string;
  subStrategy: string;
  status: string;
  visibility?: 'marketplace' | 'invitation_only' | 'private';
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  holdingCosts: number;
  projectedRoi: number;
  fundingTarget: number;
  committedAmount: number;
  investorCount: number;
  creatorId: string;
  invitedUsers?: string[];
  createdAt: string;
}

export interface DealPreview {
  id: string;
  slug: string;
  name: string;
  address: string;
  price: number;
  roi: number;
  status: 'draft' | 'published' | 'funding' | 'closed';
  visibility?: 'marketplace' | 'invitation_only' | 'private';
  creatorName: string;
  creatorId?: string;
  invitedUsers?: string[];
  committed: number;
  target: number;
  assetClass?: string;
  subStrategy?: string;
}

export interface RawDealProject {
  name?: string | null;
  title?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  propertyType?: string;
  subStrategy?: string;
}

export interface RawDealCommitment {
  amount?: number | string | null;
  investorId?: string | null;
}

export interface RawDealInvitation {
  inviteeUserId?: string | null;
  inviteeEmail?: string | null;
}

export interface RawDealRecord {
  id: string;
  slug: string;
  address: string;
  status: string;
  visibility?: string | null;
  purchasePrice?: number | string | null;
  rehabCost?: number | string | null;
  arv?: number | string | null;
  holdingCosts?: number | string | null;
  projectedRoi?: number | string | null;
  creatorId: string;
  createdAt: Date | string;
  projects?: RawDealProject[];
  commitments?: RawDealCommitment[];
  invitations?: RawDealInvitation[];
  creator?: { name?: string | null } | null;
}

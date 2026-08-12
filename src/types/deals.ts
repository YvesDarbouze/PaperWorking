/**
 * Deal & Crowdfunding Marketplace Type Definitions
 * Strict TypeScript types, enums, and interfaces for PaperWorking (paperworking.co)
 */

export enum DealStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  FUNDING = 'funding',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export type DealStatusType = 'draft' | 'published' | 'funding' | 'closed' | 'archived';

export enum DealInvitationStatus {
  PENDING = 'pending',
  DECLINED = 'declined',
  INTERESTED = 'interested',
}

export type DealInvitationStatusType = 'pending' | 'declined' | 'interested';

export enum InvestmentCommitmentCurrency {
  USD = 'USD',
  CAD = 'CAD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export type InvestmentCommitmentCurrencyType = 'USD' | 'CAD' | 'EUR' | 'GBP';

export enum InvestmentCommitmentType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export type InvestmentCommitmentTypeType = 'percentage' | 'fixed';

export enum InvestmentCommitmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  WITHDRAWN = 'withdrawn',
}

export type InvestmentCommitmentStatusType = 'pending' | 'confirmed' | 'withdrawn';

export enum DealMessageSource {
  PLATFORM = 'platform',
  EMAIL_INBOUND = 'email_inbound',
}

export type DealMessageSourceType = 'platform' | 'email_inbound';

export enum DealVisibility {
  MARKETPLACE = 'marketplace',
  INVITATION_ONLY = 'invitation_only',
  PRIVATE = 'private',
}

export type DealVisibilityType = 'marketplace' | 'invitation_only' | 'private';

/**
 * BusinessCard interface representing a subscriber's investor profile.
 */
export interface BusinessCard {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  accreditedInvestorStatus?: boolean;
  preferredMarkets?: string[];
  minInvestment?: number;
  maxInvestment?: number;
  investmentCriteria?: Record<string, any> | null;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * BusinessCardShare interface capturing an immutable snapshot of a BusinessCard shared with a creator.
 */
export interface BusinessCardShare {
  id: string;
  dealId: string;
  senderUserId: string;
  recipientUserId: string;
  businessCardData: BusinessCard;
  createdAt: string;
}

export interface DealBroadcast {
  id: string;
  dealId: string;
  senderId: string;
  recipientEmails: string[];
  subject: string;
  message: string;
  includeBusinessCard: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name?: string;
  title?: string;
  address?: string;
  status?: string;
  investorId?: string | null;
  dealId?: string | null;
  createdAt: string;
}

/**
 * Deal entity interface representing an investment opportunity.
 */
export interface Deal {
  id: string;
  slug: string;
  address: string;
  purchasePrice: any;
  rehabCost: any;
  arv: any;
  holdingCosts: any;
  projectedRoi: any;
  status: DealStatusType;
  visibility?: DealVisibilityType;
  creatorId: string;
  creatorName?: string;
  creatorEmail?: string;
  propertyName?: string;
  assetClass?: string;
  subStrategy?: string;
  city?: string;
  state?: string;
  fundingTarget?: number;
  committedAmount?: number;
  projectIds?: string[];
  description?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DealInvitation {
  id: string;
  dealId: string;
  inviteeEmail: string;
  inviteeName?: string;
  inviteeUserId?: string | null;
  token?: string;
  status: DealInvitationStatusType;
  businessCardShared?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface InvestmentCommitment {
  id: string;
  dealId: string;
  investorId: string;
  investorName?: string;
  amount: number | string;
  percentage?: number;
  currency: InvestmentCommitmentCurrencyType;
  type: InvestmentCommitmentTypeType;
  status: InvestmentCommitmentStatusType;
  createdAt: string;
}

export interface DealMessage {
  id: string;
  dealId: string;
  senderId?: string | null;
  senderName?: string;
  senderEmail?: string;
  text?: string;
  content?: string;
  source: DealMessageSourceType;
  createdAt: string;
}

export function generateDealSlug(address: string): string {
  if (!address) return '';
  return address.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function formatDecimalPrecision(value: any, precision: number = 2): string {
  return Number(value).toFixed(precision);
}

export function isValidDecimal(value: any): boolean {
  if (value === null || value === undefined) return false;
  return !isNaN(Number(value));
}

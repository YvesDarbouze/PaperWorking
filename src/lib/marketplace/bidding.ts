import { z } from 'zod';

export type ServiceType =
  | 'Real Estate Attorney'
  | 'Loan Processor'
  | 'General Contractor'
  | 'Property Manager'
  | 'Accountant/CPA'
  | 'Inspector'
  | 'Photographer'
  | 'Stager'
  | 'Insurance Agent'
  | 'Title Company'
  | 'Handyman'
  | 'Other';

export type BidStatus = 'pending' | 'submitted' | 'accepted' | 'declined' | 'countered';

export interface VendorProfileData {
  vendorId: string;
  userId?: string;
  companyName: string;
  roleBadge: string;
  services: ServiceType[];
  rating: number;
  reviewsCount: number;
  completedProjects: number;
  averageBidAmount: number;
  availableForHire: boolean;
  hourlyRate?: number;
  location?: string;
}

export interface BidRequest {
  bidId: string;
  projectId: string;
  projectName: string;
  senderId: string;
  senderName: string;
  vendorId: string;
  vendorName: string;
  serviceType: ServiceType;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  deadline?: string;
  bidAmount?: number;
  estimatedTimeline?: string;
  vendorMessage?: string;
  status: BidStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentExpenseRecord {
  expenseId: string;
  projectId: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  serviceType: ServiceType;
  datePaid: string;
  paymentMethod: string;
  requires1099NEC: boolean;
}

/**
 * Creates a new Bid Request from Project Owner to Vendor
 */
export function createBidRequest(params: {
  projectId: string;
  projectName: string;
  senderId: string;
  senderName: string;
  vendorId: string;
  vendorName: string;
  serviceType: ServiceType;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  deadline?: string;
}): BidRequest {
  const now = new Date().toISOString();
  return {
    bidId: `bid_${Date.now()}`,
    projectId: params.projectId,
    projectName: params.projectName,
    senderId: params.senderId,
    senderName: params.senderName,
    vendorId: params.vendorId,
    vendorName: params.vendorName,
    serviceType: params.serviceType,
    description: params.description,
    budgetMin: params.budgetMin,
    budgetMax: params.budgetMax,
    deadline: params.deadline,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Vendor submits bid response with amount & timeline
 */
export function submitBidResponse(
  bid: BidRequest,
  bidAmount: number,
  estimatedTimeline: string,
  vendorMessage?: string
): BidRequest {
  return {
    ...bid,
    bidAmount,
    estimatedTimeline,
    vendorMessage,
    status: 'submitted',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Project Owner accepts bid, returning updated bid + payment expense record
 */
export function acceptBid(
  bid: BidRequest,
  priorVendorPaymentsYear: number = 0
): {
  acceptedBid: BidRequest;
  expenseRecord: PaymentExpenseRecord;
  requires1099Flag: boolean;
} {
  const acceptedBid: BidRequest = {
    ...bid,
    status: 'accepted',
    updatedAt: new Date().toISOString(),
  };

  const amount = bid.bidAmount || bid.budgetMax || 0;
  const newCumulativeTotal = priorVendorPaymentsYear + amount;
  const requires1099Flag = newCumulativeTotal >= 600;

  const expenseRecord: PaymentExpenseRecord = {
    expenseId: `exp_bid_${bid.bidId}`,
    projectId: bid.projectId,
    vendorId: bid.vendorId,
    vendorName: bid.vendorName,
    amount,
    serviceType: bid.serviceType,
    datePaid: new Date().toISOString().split('T')[0],
    paymentMethod: 'In-App Escrow / ACH',
    requires1099NEC: requires1099Flag,
  };

  return {
    acceptedBid,
    expenseRecord,
    requires1099Flag,
  };
}

/**
 * Toggles "Available for Hire" status for Standard Users acting as Vendors
 */
export function toggleStandardUserVendorStatus(
  profile: Partial<VendorProfileData>,
  availableForHire: boolean,
  services: ServiceType[],
  hourlyRate?: number
): VendorProfileData {
  return {
    vendorId: profile.vendorId || `v_std_${Date.now()}`,
    companyName: profile.companyName || 'Independent Specialist',
    roleBadge: 'Standard Collaborator',
    services: services.length > 0 ? services : ['Handyman'],
    rating: profile.rating || 5.0,
    reviewsCount: profile.reviewsCount || 0,
    completedProjects: profile.completedProjects || 0,
    averageBidAmount: profile.averageBidAmount || hourlyRate || 75,
    availableForHire,
    hourlyRate,
  };
}

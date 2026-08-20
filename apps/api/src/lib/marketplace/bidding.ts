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
  bidId?: string;
  now?: () => Date;
}): BidRequest {
  const now = (params.now?.() ?? new Date()).toISOString();
  return {
    bidId: params.bidId ?? `bid_${Date.now()}`,
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

export function submitBidResponse(
  bid: BidRequest,
  bidAmount: number,
  estimatedTimeline: string,
  vendorMessage?: string,
  now?: () => Date,
): BidRequest {
  return {
    ...bid,
    bidAmount,
    estimatedTimeline,
    vendorMessage,
    status: 'submitted',
    updatedAt: (now?.() ?? new Date()).toISOString(),
  };
}

export function acceptBid(
  bid: BidRequest,
  priorVendorPaymentsYear: number = 0,
  now?: () => Date,
): {
  acceptedBid: BidRequest;
  expenseRecord: PaymentExpenseRecord;
  requires1099Flag: boolean;
} {
  const acceptedBid: BidRequest = {
    ...bid,
    status: 'accepted',
    updatedAt: (now?.() ?? new Date()).toISOString(),
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
    datePaid: (now?.() ?? new Date()).toISOString().split('T')[0],
    paymentMethod: 'In-App Escrow / ACH',
    requires1099NEC: requires1099Flag,
  };

  return { acceptedBid, expenseRecord, requires1099Flag };
}

export const serviceTypeSchema = z.enum([
  'Real Estate Attorney',
  'Loan Processor',
  'General Contractor',
  'Property Manager',
  'Accountant/CPA',
  'Inspector',
  'Photographer',
  'Stager',
  'Insurance Agent',
  'Title Company',
  'Handyman',
  'Other',
]);

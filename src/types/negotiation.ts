/* ═══════════════════════════════════════════════════════
   PaperWorking — Negotiation & Confirmation Types (AQ-28 & AQ-29)
   
   Types for the Agree/Counter negotiation pipeline,
   double-confirmations, and transaction locking.
   ═══════════════════════════════════════════════════════ */

export type NegotiationStatus =
  | 'active'
  | 'accepted'
  | 'declined'
  | 'terms_confirmed'
  | 'transaction_pending'
  | 'transaction_confirmed';

export type RoundType =
  | 'agree'
  | 'counter'
  | 'accept'
  | 'decline'
  | 'final_terms'
  | 'message';

export interface NegotiationRound {
  version: number;
  type: RoundType;
  senderUid: string;
  senderName: string;
  createdAt: string;
  
  // Terms details (cents / percentages)
  priceBasis?: number;
  contribution?: number;
  equityPercentage?: number;
  note?: string;
  attachments?: { name: string; url: string }[];
}

export interface Negotiation {
  id: string; // `${projectId}_${investorUid}`
  projectId: string;
  projectName: string;
  listingId: string;
  leadInvestorUid: string;
  leadInvestorName: string;
  investorUid: string;
  investorName: string;
  investorEmail: string;
  
  status: NegotiationStatus;
  
  // Current active terms proposed
  currentTerms: {
    priceBasis: number; // cents
    contribution: number; // cents
    equityPercentage: number; // percentage (e.g. 25 for 25%)
    isCounter: boolean;
    version: number;
    proposedBy: 'investor' | 'lead';
    note?: string;
    createdAt: string;
  };
  
  rounds: NegotiationRound[];
  
  confirmations: {
    finalTermsLead?: { confirmedAt: string; priceBasis: number; contribution: number; equityPercentage: number };
    finalTermsInvestor?: { confirmedAt: string; priceBasis: number; contribution: number; equityPercentage: number };
    transactionLead?: { confirmedAt: string; priceBasis: number; contribution: number; equityPercentage: number };
    transactionInvestor?: { confirmedAt: string; priceBasis: number; contribution: number; equityPercentage: number };
  };
  
  termsConfirmationRecord?: {
    confirmedAt: string;
    priceBasis: number;
    contribution: number;
    equityPercentage: number;
    investorName: string;
    leadName: string;
    nonBindingAcknowledgeText: string;
  };
  
  transactionConfirmationRecord?: {
    id: string;
    confirmedAt: string;
    priceBasis: number;
    contribution: number;
    equityPercentage: number;
    locked: boolean;
    supersededById?: string;
    version: number;
    createdAt: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

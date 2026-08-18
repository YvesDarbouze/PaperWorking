export interface ThreadMessage {
  id: string;
  sender: 'investor' | 'leadInvestor';
  text: string;
  createdAt: string; // ISO String
}

export interface InvestorInquiry {
  id: string;
  projectId: string;
  invitationId: string;
  investorName: string;
  investorEmail: string;
  message?: string;
  status: 'open' | 'answered';
  isShared: boolean;
  messages: ThreadMessage[];
  createdAt: Date | string | unknown; // Date | Timestamp | string
  updatedAt: Date | string | unknown; // Date | Timestamp | string
}

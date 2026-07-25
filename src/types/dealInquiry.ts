import { Timestamp } from 'firebase/firestore';

export interface ThreadMessage {
  id: string;
  sender: 'investor' | 'sponsor';
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
  createdAt: any; // Date | Timestamp | string
  updatedAt: any; // Date | Timestamp | string
}

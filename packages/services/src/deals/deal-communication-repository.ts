export type DealBroadcastRow = {
  id: string;
  dealId: string;
  senderId: string;
  recipientEmails: unknown;
  subject: string;
  message: string;
  includeBusinessCard: boolean;
  createdAt: Date;
};

export type DealInvitationRow = {
  id: string;
  dealId: string;
  inviteeEmail: string;
  inviteeUserId: string | null;
  status: string;
  businessCardShared: boolean;
  createdAt: Date;
};

export type DealMessageRow = {
  id: string;
  dealId: string;
  senderId: string | null;
  senderEmail: string;
  content: string;
  source: 'platform' | 'email_inbound';
  createdAt: Date;
};

export type DealCommunicationRepository = {
  findDealById(dealId: string): Promise<{ id: string; slug: string; address?: string } | null>;
  createBroadcastWithInvitations(data: {
    dealId: string;
    senderId: string;
    recipientEmails: string[];
    subject: string;
    message: string;
    includeBusinessCard: boolean;
  }): Promise<{ broadcast: DealBroadcastRow; invitations: DealInvitationRow[] }>;
  createMessage(data: {
    dealId: string;
    senderEmail: string;
    content: string;
    senderId?: string;
    source: 'platform' | 'email_inbound';
  }): Promise<DealMessageRow>;
};

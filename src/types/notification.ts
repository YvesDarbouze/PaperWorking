// ═══════════════════════════════════════════════════════
//  PaperWorking Notifications — Type Definitions
// ═══════════════════════════════════════════════════════

import type { NotificationCategory } from './user';

export type NotificationType =
  | 'VENDOR_BID'
  | 'INVEST_INVITE'
  | 'TASK_COMPLETE'
  | 'TASK_ASSIGNED'
  | 'PHASE_TRANSITION'
  | 'DEADLINE_ALERT'
  | 'BILLING_CHARGED'
  | 'DOCUMENT_SIGNED'
  | 'RECEIPT_APPROVAL'
  | 'TEAM_INVITE'
  | 'TEAM_INVITE_REMINDER'
  | 'OVER_IMPROVEMENT_ALERT'
  | 'BURN_RATE_WARNING'
  | 'VENDOR_LEAD'
  | 'LOAN_STATUS_UPDATE'
  | 'NEGOTIATION_UPDATE';

export type NotificationUrgency = 'informational' | 'actionable' | 'critical';

export type NotificationChannel = 'in-app' | 'email' | 'push';

export interface NotificationActor {
  uid: string;
  name: string;
  role?: string;
  avatarUrl?: string;
}

export interface NotificationObjectReference {
  projectId?: string;
  dealAddress?: string;
  amount?: string;
  time?: string;
  task?: string;
  phase?: string;
  plan?: string;
  card?: string;
  vendor?: string;
  teammate?: string;
  documentName?: string;
  organizationId?: string;
  organizationName?: string;
  dailyBurnRate?: string;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  actor: NotificationActor;
  objectReference: NotificationObjectReference;
  urgencyLevel: NotificationUrgency;
  channels: NotificationChannel[];
  read: boolean;
  archived: boolean;
  createdAt: Date;
  expiresAt?: Date;
  deepLinkUrl: string;
}

export interface NotificationFirestore extends Omit<Notification, 'createdAt' | 'expiresAt'> {
  createdAt: import('firebase/firestore').Timestamp | Date;
  expiresAt?: import('firebase/firestore').Timestamp | Date;
}

export const NOTIFICATION_METADATA: Record<
  NotificationType,
  {
    urgency: NotificationUrgency;
    channels: NotificationChannel[];
    templateTitle: (params: NotificationObjectReference & { actorName: string }) => string;
  }
> = {
  VENDOR_LEAD: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    templateTitle: (params) => {
      const investor = params.actorName;
      if (!investor) throw new Error('VENDOR_LEAD requires an investor identity in the title.');
      const service = params.metadata?.serviceType || 'service';
      return `New lead: ${investor} requested a ${service} quote`;
    }
  },
  VENDOR_BID: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    templateTitle: (params) => {
      const vendor = params.vendor || params.actorName;
      if (!vendor) throw new Error('VENDOR_BID requires a vendor identity in the title.');
      if (!params.amount) throw new Error('VENDOR_BID involves money and requires an amount in the title.');
      if (!params.dealAddress) throw new Error('VENDOR_BID requires a dealAddress in the title.');
      return `${vendor} bid ${params.amount} on ${params.dealAddress}`;
    }
  },
  INVEST_INVITE: {
    urgency: 'critical',
    channels: ['in-app', 'email', 'push'],
    templateTitle: (params) => {
      if (!params.dealAddress) throw new Error('INVEST_INVITE requires an address in the title.');
      return `You've been invited to invest in ${params.dealAddress}`;
    }
  },
  TASK_COMPLETE: {
    urgency: 'informational',
    channels: ['in-app'],
    templateTitle: (params) => {
      const teammate = params.teammate || params.actorName;
      if (!teammate) throw new Error('TASK_COMPLETE requires a teammate identity in the title.');
      if (!params.task) throw new Error('TASK_COMPLETE requires a task in the title.');
      if (!params.dealAddress) throw new Error('TASK_COMPLETE requires a dealAddress in the title.');
      return `${teammate} completed ${params.task} on ${params.dealAddress}`;
    }
  },
  TASK_ASSIGNED: {
    urgency: 'informational',
    channels: ['in-app'],
    templateTitle: (params) => {
      const teammate = params.teammate || params.actorName;
      if (!teammate) throw new Error('TASK_ASSIGNED requires an actorName or teammate identity in the title.');
      if (!params.task) throw new Error('TASK_ASSIGNED requires a task in the title.');
      return `${teammate} assigned task "${params.task}" to you`;
    }
  },
  PHASE_TRANSITION: {
    urgency: 'informational',
    channels: ['in-app'],
    templateTitle: (params) => {
      if (!params.dealAddress) throw new Error('PHASE_TRANSITION requires an address in the title.');
      if (!params.phase) throw new Error('PHASE_TRANSITION requires a phase in the title.');
      return `${params.dealAddress} moved to ${params.phase} phase`;
    }
  },
  DEADLINE_ALERT: {
    urgency: 'critical',
    channels: ['in-app', 'email', 'push'],
    templateTitle: (params) => {
      if (!params.dealAddress) throw new Error('DEADLINE_ALERT requires an address in the title.');
      if (!params.time) throw new Error('DEADLINE_ALERT involves a deadline and requires time in the title.');
      return `Contingency deadline for ${params.dealAddress} expires in ${params.time}`;
    }
  },
  BILLING_CHARGED: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    templateTitle: (params) => {
      if (!params.card) throw new Error('BILLING_CHARGED involves money/card and requires card brand in the title.');
      if (!params.amount) throw new Error('BILLING_CHARGED involves money and requires amount in the title.');
      if (!params.plan) throw new Error('BILLING_CHARGED requires plan in the title.');
      return `${params.card} charged ${params.amount} — ${params.plan}`;
    }
  },
  DOCUMENT_SIGNED: {
    urgency: 'informational',
    channels: ['in-app'],
    templateTitle: (params) => {
      const signee = params.actorName;
      if (!signee) throw new Error('DOCUMENT_SIGNED requires a signee identity in the title.');
      if (!params.documentName) throw new Error('DOCUMENT_SIGNED requires a documentName in the title.');
      if (!params.dealAddress) throw new Error('DOCUMENT_SIGNED requires a dealAddress in the title.');
      return `${signee} signed ${params.documentName} for ${params.dealAddress}`;
    }
  },
  RECEIPT_APPROVAL: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    templateTitle: (params) => {
      const uploader = params.teammate || params.actorName;
      if (!uploader) throw new Error('RECEIPT_APPROVAL requires an uploader identity in the title.');
      if (!params.amount) throw new Error('RECEIPT_APPROVAL involves money and requires amount in the title.');
      if (!params.dealAddress) throw new Error('RECEIPT_APPROVAL requires a dealAddress in the title.');
      return `${uploader} uploaded receipt of ${params.amount} for ${params.dealAddress} — approval required`;
    }
  },
  TEAM_INVITE: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    templateTitle: (params) => {
      const inviter = params.actorName;
      if (!inviter) throw new Error('TEAM_INVITE requires an inviter identity in the title.');
      if (!params.organizationName) throw new Error('TEAM_INVITE requires organizationName in the title.');
      return `${inviter} invited you to join team ${params.organizationName}`;
    }
  },
  TEAM_INVITE_REMINDER: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    templateTitle: (params) => {
      const inviter = params.actorName;
      if (!inviter) throw new Error('TEAM_INVITE_REMINDER requires an inviter identity in the title.');
      if (!params.organizationName) throw new Error('TEAM_INVITE_REMINDER requires organizationName in the title.');
      return `Reminder: ${inviter} invited you to join team ${params.organizationName}`;
    }
  },
  OVER_IMPROVEMENT_ALERT: {
    urgency: 'critical',
    channels: ['in-app', 'email', 'push'],
    templateTitle: (params) => {
      if (!params.dealAddress) throw new Error('OVER_IMPROVEMENT_ALERT requires an address in the title.');
      return `Over-improvement risk flagged on ${params.dealAddress}: rehab exceeds 30% of ARV`;
    }
  },
  BURN_RATE_WARNING: {
    urgency: 'critical',
    channels: ['in-app', 'email', 'push'],
    templateTitle: (params) => {
      if (!params.dealAddress) throw new Error('BURN_RATE_WARNING requires an address in the title.');
      if (!params.dailyBurnRate) throw new Error('BURN_RATE_WARNING involves money and requires daily burn rate in the title.');
      return `${params.dealAddress} holding cost warning: burn rate is ${params.dailyBurnRate}/day`;
    }
  },
  NEGOTIATION_UPDATE: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    templateTitle: (params) => {
      const subject = params.metadata?.subject || 'Terms update';
      return `${params.dealAddress || 'Deal'}: ${subject}`;
    }
  },
  LOAN_STATUS_UPDATE: {
    urgency: 'actionable',
    channels: ['in-app', 'email'],
    templateTitle: (params) => {
      return `Loan status updated for ${params.dealAddress || 'the project'}`;
    }
  }
};

export function getNotificationCategory(type: NotificationType): NotificationCategory {
  switch (type) {
    case 'INVEST_INVITE':
    case 'NEGOTIATION_UPDATE':
      return 'syndication';
    case 'VENDOR_LEAD':
    case 'VENDOR_BID':
      return 'bids';
    case 'TASK_COMPLETE':
    case 'DOCUMENT_SIGNED':
    case 'RECEIPT_APPROVAL':
    case 'TEAM_INVITE':
    case 'TEAM_INVITE_REMINDER':
      return 'tasks';
    case 'DEADLINE_ALERT':
      return 'deadlines';
    case 'BILLING_CHARGED':
      return 'billing';
    case 'OVER_IMPROVEMENT_ALERT':
    case 'BURN_RATE_WARNING':
    case 'PHASE_TRANSITION':
    case 'LOAN_STATUS_UPDATE':
      return 'alerts';
    default:
      return 'tasks';
  }
}

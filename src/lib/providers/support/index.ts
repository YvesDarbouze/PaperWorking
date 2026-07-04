/* ═══════════════════════════════════════════════════════════════
   SupportProvider — Vendor-agnostic support ticket abstraction
   ───────────────────────────────────────────────────────────────
   Active adapter is selected via NEXT_PUBLIC_SUPPORT_PROVIDER env var:
     firestore  — real persistence using Cloud Firestore
     mock       — local-only simulation fallback (default)
   ═══════════════════════════════════════════════════════════════ */

export interface SupportMessage {
  sender: 'user' | 'agent';
  text: string;
  time: string;
  timestamp: string; // ISO date string
}

export interface SupportTicket {
  id?: string;
  userId: string;
  email: string;
  plan: string;
  status: 'open' | 'closed';
  messages: SupportMessage[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface SupportProvider {
  /** Get the latest open support ticket for a user */
  getOpenTicket(userId: string): Promise<SupportTicket | null>;
  /** Create a new support ticket */
  createTicket(userId: string, email: string, plan: string, messages: SupportMessage[]): Promise<string>;
  /** Add a message to an existing support ticket */
  addMessage(ticketId: string, message: SupportMessage): Promise<void>;
  /** Get all tickets for a user (optional utility) */
  getUserTickets(userId: string): Promise<SupportTicket[]>;
}

import { FirestoreSupportProvider } from './firestore';
import { MockSupportProvider } from './mock';

export function getSupportProvider(): SupportProvider {
  // Check NEXT_PUBLIC_SUPPORT_PROVIDER for client bundle availability
  const providerType = (
    process.env.NEXT_PUBLIC_SUPPORT_PROVIDER ||
    process.env.SUPPORT_PROVIDER ||
    'mock'
  ).toLowerCase();

  if (providerType === 'firestore') {
    return new FirestoreSupportProvider();
  }
  return new MockSupportProvider();
}

export const defaultSupportProvider = getSupportProvider();

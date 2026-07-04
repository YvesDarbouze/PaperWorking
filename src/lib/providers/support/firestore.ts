import { SupportProvider, SupportMessage, SupportTicket } from './index';
import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
} from 'firebase/firestore';

export class FirestoreSupportProvider implements SupportProvider {
  async getOpenTicket(userId: string): Promise<SupportTicket | null> {
    try {
      const q = query(
        collection(db, 'supportTickets'),
        where('userId', '==', userId),
        where('status', '==', 'open'),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        email: data.email,
        plan: data.plan,
        status: data.status,
        messages: data.messages || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (error) {
      console.error('[FirestoreSupportProvider] Error getting open ticket:', error);
      return null;
    }
  }

  async createTicket(
    userId: string,
    email: string,
    plan: string,
    messages: SupportMessage[]
  ): Promise<string> {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'supportTickets'), {
      userId,
      email,
      plan,
      status: 'open',
      messages,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  async addMessage(ticketId: string, message: SupportMessage): Promise<void> {
    const now = new Date().toISOString();
    const docRef = doc(db, 'supportTickets', ticketId);
    await updateDoc(docRef, {
      messages: arrayUnion(message),
      updatedAt: now,
    });
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    try {
      const q = query(
        collection(db, 'supportTickets'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          email: data.email,
          plan: data.plan,
          status: data.status,
          messages: data.messages || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
    } catch (error) {
      console.error('[FirestoreSupportProvider] Error getting user tickets:', error);
      return [];
    }
  }
}

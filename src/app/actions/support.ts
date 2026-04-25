"use server";

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function submitSupportMessage(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !subject || !message) {
      return { success: false, error: 'All fields are required.' };
    }

    await adminDb.collection('support_messages').add({
      name,
      email,
      subject,
      message,
      createdAt: FieldValue.serverTimestamp(),
      status: 'new',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting support message:', error);
    return { success: false, error: error.message || 'Failed to submit message.' };
  }
}

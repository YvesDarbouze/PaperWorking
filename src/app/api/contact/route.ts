import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * /api/contact — Public Contact Form Intake Endpoint
 * Creates real tickets in Firestore support_tickets collection (Part A requirement 3).
 * Failure-safe additive write: ticket creation errors do not fail contact form response.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { name, email, subject, body, category } = json || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email is required.' }, { status: 400 });
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required.' }, { status: 400 });
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ success: false, error: 'Message body is required.' }, { status: 400 });
    }

    const cleanName = (name && typeof name === 'string') ? name.trim() : email.split('@')[0];
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    // Default starter tags mapping
    const tag = (category && typeof category === 'string') ? category.toLowerCase().replace(/\s+/g, '-') : 'general-inquiry';

    // Additive & failure-safe Firestore ticket creation
    try {
      const ticketRef = adminDb.collection('support_tickets').doc(ticketId);
      await ticketRef.set({
        id: ticketId,
        subject: subject.trim(),
        body: body.trim(),
        requesterUid: null,
        requesterEmail: email.trim().toLowerCase(),
        requesterName: cleanName,
        status: 'active',
        priority: 'normal',
        assigneeUid: null,
        assigneeName: null,
        tags: [tag],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastCustomerReplyAt: FieldValue.serverTimestamp(),
        lastInternalReplyAt: null,
        firstResponseAt: null,
        resolvedAt: null,
        snoozedUntil: null,
        fcrEligible: true,
      });

      // Add initial customer message to subcollection
      const msgRef = ticketRef.collection('messages').doc();
      await msgRef.set({
        id: msgRef.id,
        authorType: 'customer',
        authorUid: null,
        authorEmail: email.trim().toLowerCase(),
        authorName: cleanName,
        body: body.trim(),
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      console.error('[POST /api/contact] Additive ticket creation error:', dbErr);
      // Proceed safely without throwing to client
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for reaching out. Your message has been received.',
      ticketId,
    });
  } catch (error: any) {
    console.error('[POST /api/contact] Fatal handler error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}

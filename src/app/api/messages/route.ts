import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('user') || searchParams.get('handle');
    const threadId = searchParams.get('threadId');

    // 1. Thread filter
    if (threadId) {
      const dbMessages = await prisma.message.findMany({
        where: { threadId },
        include: {
          sender: { select: { id: true, name: true, email: true, agentPersona: true } },
          recipient: { select: { id: true, name: true, email: true, agentPersona: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      return NextResponse.json({
        success: true,
        threadId,
        messages: dbMessages,
      });
    }

    // 2. Inbox for userId (where recipientId = userId)
    let whereCondition: any = {};
    if (userId) {
      whereCondition = { recipientId: userId };
    }

    const messages = await prisma.message.findMany({
      where: whereCondition,
      include: {
        sender: { select: { id: true, name: true, email: true, agentPersona: true } },
        recipient: { select: { id: true, name: true, email: true, agentPersona: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = messages.filter((m) => !m.read).length;

    // Group into threads
    const threadsMap = new Map<string, any[]>();
    for (const msg of messages) {
      const tid = msg.threadId;
      if (!threadsMap.has(tid)) {
        threadsMap.set(tid, []);
      }
      threadsMap.get(tid)!.push(msg);
    }

    const threads = Array.from(threadsMap.entries()).map(([tid, msgs]) => {
      const latestMsg = msgs[0];
      const threadUnreadCount = msgs.filter((m) => !m.read).length;

      return {
        threadId: tid,
        subject: latestMsg.subject,
        latestMessage: latestMsg,
        unreadCount: threadUnreadCount,
        messages: msgs,
      };
    });

    return NextResponse.json({
      success: true,
      count: messages.length,
      unreadCount,
      threads,
      messages,
    });
  } catch (err: any) {
    console.error('[Messages GET Error]', err);
    return NextResponse.json(
      { error: 'Failed to fetch messages', message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { threadId, senderId, recipientId, subject, body: contentBody, content, attachmentProjectId, projectId } = body;

    const effectiveBody = contentBody || content;
    if (!senderId || !recipientId || !effectiveBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const effectiveThreadId = threadId || `thread_${Date.now()}`;
    const effectiveAttachmentId = attachmentProjectId || projectId || null;
    const now = new Date();

    // 1. Write to Prisma
    const createdMessage = await prisma.message.create({
      data: {
        id: msgId,
        threadId: effectiveThreadId,
        senderId,
        recipientId,
        subject: subject || 'Re: Message',
        body: effectiveBody,
        attachmentProjectId: effectiveAttachmentId,
        read: false,
        syntheticAgent: true,
        createdAt: now,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, agentPersona: true } },
        recipient: { select: { id: true, name: true, email: true, agentPersona: true } },
      },
    });

    // 2. Write to Firestore
    await adminDb.collection('messages').doc(msgId).set({
      id: msgId,
      threadId: effectiveThreadId,
      senderId,
      recipientId,
      subject: subject || 'Re: Message',
      body: effectiveBody,
      content: effectiveBody,
      attachmentProjectId: effectiveAttachmentId,
      projectId: effectiveAttachmentId,
      read: false,
      syntheticAgent: true,
      createdAt: now.toISOString(),
    });

    const inboxId = `inb_${msgId}`;
    await adminDb.collection('inboxItems').doc(inboxId).set({
      id: inboxId,
      recipientUid: recipientId,
      senderUid: senderId,
      organizationId: 'org_paperworking_seed',
      type: 'message',
      category: 'message',
      title: subject || 'Re: Message',
      body: effectiveBody,
      attachmentProjectId: effectiveAttachmentId,
      projectId: effectiveAttachmentId,
      threadId: effectiveThreadId,
      read: false,
      syntheticAgent: true,
      createdAt: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: createdMessage,
    });
  } catch (err: any) {
    console.error('[Messages POST Error]', err);
    return NextResponse.json(
      { error: 'Failed to create message', message: err.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;

    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
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
      messages,
    });
  } catch (err: any) {
    console.error('[Messages Thread GET Error]', err);
    return NextResponse.json(
      { error: 'Failed to fetch message thread', message: err.message },
      { status: 500 }
    );
  }
}

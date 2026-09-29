import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getDealSocial,
  toggleDealEndorsement,
  addDealComment,
} from '@/lib/marketplace/seed-data';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
  tryDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

const SocialActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('endorse'),
  }),
  z.object({
    action: z.literal('comment'),
    content: z.string().min(1, 'Comment cannot be empty'),
    authorName: z.string().optional(),
    authorRole: z.string().optional(),
    authorCompany: z.string().optional(),
  }),
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await tryDevSessionAuth();
  const social = getDealSocial(id, session?.uid);

  return NextResponse.json({
    success: true,
    ...social,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const raw = await request.json();
    const parsed = SocialActionSchema.parse(raw);

    if (parsed.action === 'endorse') {
      const result = toggleDealEndorsement(id, auth.uid);
      const social = getDealSocial(id, auth.uid);
      return NextResponse.json({
        success: true,
        action: 'endorse',
        ...result,
        ...social,
      });
    }

    if (parsed.action === 'comment') {
      const created = addDealComment(id, {
        authorId: auth.uid,
        authorName: parsed.authorName || 'Verified Investor',
        authorCompany: parsed.authorCompany || 'PaperWorking Member',
        authorRole: parsed.authorRole || 'Accredited Investor',
        content: parsed.content,
      });

      const social = getDealSocial(id, auth.uid);
      return NextResponse.json(
        {
          success: true,
          action: 'comment',
          comment: created,
          ...social,
        },
        { status: 201 },
      );
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid social payload' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Social operation failed' },
      { status: 500 },
    );
  }
}

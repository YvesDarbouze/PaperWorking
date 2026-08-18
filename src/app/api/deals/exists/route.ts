import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface DealPreview {
  id: string;
  slug: string;
  name: string;
  address: string;
  price: number;
  roi: number;
  status: 'draft' | 'published' | 'funding' | 'closed';
  visibility?: 'marketplace' | 'invitation_only' | 'private';
  creatorName: string;
  creatorId?: string;
  invitedUsers?: string[];
  committed: number;
  target: number;
  assetClass?: string;
  subStrategy?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';
  const userId = request.headers.get('x-user-id') || searchParams.get('userId') || 'user_guest';

  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalizedSlug) {
    return NextResponse.json({ exists: false, deal: null });
  }

  try {
    const dbDeal = await prisma.deal.findFirst({
      where: {
        slug: normalizedSlug,
      },
      include: {
        creator: true,
        invitations: true,
        commitments: true,
        projects: true,
      },
    });

    if (!dbDeal) {
      return NextResponse.json({ exists: false, deal: null });
    }

    const project = dbDeal.projects?.[0];
    const committedAmount = (dbDeal.commitments || []).reduce(
      (sum: number, c: any) => sum + Number(c.amount || 0),
      0
    );
    const invitedUsers = (dbDeal.invitations || [])
      .map((inv: any) => inv.inviteeUserId || inv.inviteeEmail)
      .filter(Boolean);

    const purchasePrice = Number(dbDeal.purchasePrice || 0);
    const rehabCost = Number(dbDeal.rehabCost || 0);

    const existingDeal: DealPreview = {
      id: dbDeal.id,
      slug: dbDeal.slug,
      name: project?.name || project?.title || dbDeal.address,
      address: dbDeal.address,
      price: purchasePrice,
      roi: Number(dbDeal.projectedRoi || 0),
      status: dbDeal.status as 'draft' | 'published' | 'funding' | 'closed',
      visibility: dbDeal.visibility as 'marketplace' | 'invitation_only' | 'private',
      creatorName: dbDeal.creator?.name || 'Deal Creator',
      creatorId: dbDeal.creatorId,
      invitedUsers,
      committed: committedAmount,
      target: purchasePrice + rehabCost,
      assetClass: (project as any)?.propertyType || 'Multi-family',
      subStrategy: (project as any)?.subStrategy || 'FLIP',
    };

    const visibility = existingDeal.visibility || 'marketplace';
    const isCreator = existingDeal.creatorId === userId;
    const isInvited = existingDeal.invitedUsers?.includes(userId);

    // Visibility collision rules:
    // 1. marketplace -> show collision modal
    // 2. invitation_only AND user is NOT invited -> treat as "no deal exists" (exists: false)
    // 3. private AND user is NOT creator -> treat as "no deal exists" (exists: false)
    if (visibility === 'invitation_only' && !isInvited && !isCreator) {
      return NextResponse.json({ exists: false, deal: null });
    }

    if (visibility === 'private' && !isCreator) {
      return NextResponse.json({ exists: false, deal: null });
    }

    return NextResponse.json({
      exists: true,
      deal: existingDeal,
    });
  } catch (error) {
    console.error('[GET /api/deals/exists] Database query error:', error);
    return NextResponse.json({ exists: false, deal: null });
  }
}

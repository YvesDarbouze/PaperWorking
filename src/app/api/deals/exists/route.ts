import { NextRequest, NextResponse } from 'next/server';

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

const MOCK_EXISTING_DEALS: Record<string, DealPreview> = {
  '123mainstaustintx78701': {
    id: 'deal_123main',
    slug: '123mainstaustintx78701',
    name: 'Austin Core Multifamily Project',
    address: '123 Main St, Austin, TX 78701',
    price: 350000,
    roi: 18.5,
    status: 'published',
    visibility: 'marketplace',
    creatorName: 'Yves Darbouze',
    creatorId: 'user_owner_1',
    committed: 130000,
    target: 200000,
    assetClass: 'Multi-family',
    subStrategy: 'FLIP',
  },
  '456oakavedallas75201': {
    id: 'deal_456oak',
    slug: '456oakavedallas75201',
    name: 'Dallas Infill Renovation',
    address: '456 Oak Ave, Dallas, TX 75201',
    price: 280000,
    roi: 14.2,
    status: 'draft',
    visibility: 'private',
    creatorName: 'Sarah Jenkins',
    creatorId: 'user_owner_2',
    committed: 0,
    target: 150000,
    assetClass: 'Residential',
    subStrategy: 'BRRRR',
  },
  '555unlistedstsanantoniotx78205': {
    id: 'deal_unlisted',
    slug: '555unlistedstsanantoniotx78205',
    name: 'San Antonio Private Syndicate',
    address: '555 Unlisted St, San Antonio, TX 78205',
    price: 600000,
    roi: 19.2,
    status: 'published',
    visibility: 'invitation_only',
    creatorName: 'Marcus Wright',
    creatorId: 'user_owner_4',
    invitedUsers: ['user_invited_vip'],
    committed: 100000,
    target: 300000,
    assetClass: 'Multi-family',
    subStrategy: 'Buy and hold',
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';
  const userId = request.headers.get('x-user-id') || searchParams.get('userId') || 'user_guest';

  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  const existingDeal = MOCK_EXISTING_DEALS[normalizedSlug] || null;

  if (existingDeal) {
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
  }

  return NextResponse.json({
    exists: false,
    deal: null,
  });
}

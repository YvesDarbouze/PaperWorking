import { NextResponse } from 'next/server';
import { getAdminOpsSection } from '@/lib/admin/seed-data';
import {
  isDevAdminAuthFailure,
  requireDevAdminAuth,
} from '@/lib/admin/dev-admin-auth';

/**
 * GET /api/admin/ops?section=overview|users|subscriptions|tickets|audit|analytics|marketplace
 * Seed-backed ops payload for admin panels ported from v0.
 */
export async function GET(request: Request) {
  const auth = await requireDevAdminAuth();
  if (isDevAdminAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const section = new URL(request.url).searchParams.get('section') ?? 'overview';
  const payload = getAdminOpsSection(section);
  if (!payload) {
    return NextResponse.json(
      { error: `Unknown section: ${section}` },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, section, data: payload });
}

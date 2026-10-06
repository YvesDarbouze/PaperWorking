import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  updateTeamTierInStore,
  getTeamSeatsFromStore,
} from '@/lib/team/team-store';

const UpdateTierSchema = z.object({
  tier: z.enum(['Individual', 'Team']),
});

export async function PATCH(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const raw = await request.json();
    const { tier } = UpdateTierSchema.parse(raw);

    const orgId = auth.organizationId || 'org-1';

    // If downgrading to Individual, verify active seats don't exceed 1
    if (tier === 'Individual') {
      const current = await getTeamSeatsFromStore(orgId);
      if (current.used > 1) {
        return NextResponse.json(
          {
            error: `Cannot downgrade to Individual: ${current.used} operators are currently active or invited. Please revoke or remove other members first.`,
          },
          { status: 400 },
        );
      }
    }

    const seats = await updateTeamTierInStore(tier, orgId);

    return NextResponse.json({
      success: true,
      seats,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid tier data', details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update subscription tier' },
      { status: 500 },
    );
  }
}

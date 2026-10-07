import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  updateTeamTierInStore,
  getTeamSeatsFromStore,
  listTeamMembersFromStore,
  updateTeamMemberInStore,
} from '@/lib/team/team-store';

const UpdateTierSchema = z.object({
  tier: z.preprocess((val) => {
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (lower === 'individual' || lower === 'investor' || lower === 'free') return 'Individual';
      if (lower === 'team' || lower === 'investment_team' || lower === 'pro' || lower === 'investment team') return 'Team';
    }
    return val;
  }, z.enum(['Individual', 'Team'])),
  force: z.boolean().optional(),
  autoSuspend: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const raw = await request.json();
    const { tier, force, autoSuspend } = UpdateTierSchema.parse(raw);

    const orgId = auth.organizationId || 'org-1';

    // If downgrading to Individual, verify active seats don't exceed 1
    if (tier === 'Individual') {
      const current = await getTeamSeatsFromStore(orgId);
      if (current.used > 1) {
        if (force || autoSuspend) {
          const allMembers = await listTeamMembersFromStore({ organizationId: orgId });
          let kept = 0;
          for (const member of allMembers) {
            if (member.status === 'Active' || member.status === 'Invited') {
              if (kept === 0) {
                kept++;
              } else {
                await updateTeamMemberInStore(member.id, { status: 'Suspended' });
              }
            }
          }
        } else {
          return NextResponse.json(
            {
              error: `Cannot downgrade to Individual: ${current.used} operators are currently active or invited. Please revoke or remove other members first.`,
              code: 'SEATS_EXCEEDED',
              activeSeats: current.used,
            },
            { status: 400 },
          );
        }
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

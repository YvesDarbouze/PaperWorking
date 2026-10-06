import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  getTeamMemberFromStore,
  updateTeamMemberInStore,
  deleteTeamMemberInStore,
  getTeamSeatsFromStore,
  type InternalRole,
  type WorkspaceAccessLevel,
} from '@/lib/team/team-store';

const PatchMemberSchema = z.object({
  role: z.enum([
    'Manager',
    'Associate',
    'Vendor',
    'Intern',
    'Deal Lead',
    'Admin',
    'COO',
    'CFO',
    'President',
    'CEO',
  ]).optional(),
  accessLevel: z.enum(['Full Edit', 'Scoped Edit', 'View Only']).optional(),
  type: z.enum(['Internal', 'External']).optional(),
  status: z.enum(['Active', 'Invited', 'Suspended', 'Removed']).optional(),
  name: z.string().optional(),
  resend: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const member = await getTeamMemberFromStore(id);
  if (!member) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, member });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const existing = await getTeamMemberFromStore(id);
  if (!existing) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  if (existing.isYou) {
    // Cannot self-suspend or self-demote owner
    const rawCheck: any = await request.clone().json().catch(() => ({}));
    if (rawCheck.status === 'Suspended' || rawCheck.status === 'Removed') {
      return NextResponse.json(
        { error: 'Workspace owner cannot be suspended or removed.' },
        { status: 400 },
      );
    }
  }

  try {
    const raw = await request.json();
    const parsed = PatchMemberSchema.parse(raw);

    const updates: Record<string, any> = { ...parsed };
    if (parsed.resend) {
      updates.invitedAt = new Date().toISOString();
      delete updates.resend;
    }

    const updated = await updateTeamMemberInStore(id, {
      ...updates,
      role: updates.role as InternalRole | undefined,
      accessLevel: updates.accessLevel as WorkspaceAccessLevel | undefined,
    });

    const orgId = auth.organizationId || 'org-1';
    const seats = await getTeamSeatsFromStore(orgId);

    return NextResponse.json({
      success: true,
      member: updated,
      seats,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update payload', details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update team member' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const existing = await getTeamMemberFromStore(id);
  if (!existing) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  if (existing.isYou) {
    return NextResponse.json(
      { error: 'Workspace owner account cannot be deleted or revoked.' },
      { status: 400 },
    );
  }

  await deleteTeamMemberInStore(id);

  const orgId = auth.organizationId || 'org-1';
  const seats = await getTeamSeatsFromStore(orgId);

  return NextResponse.json({
    success: true,
    deletedId: id,
    seats,
  });
}

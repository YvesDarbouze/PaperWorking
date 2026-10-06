import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  listTeamMembersFromStore,
  getTeamSeatsFromStore,
  createTeamMemberInStore,
  type InternalRole,
  type WorkspaceAccessLevel,
} from '@/lib/team/team-store';

const CreateMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
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
  ]).optional().default('Associate'),
  accessLevel: z.enum(['Full Edit', 'Scoped Edit', 'View Only']).optional(),
  type: z.enum(['Internal', 'External']).optional(),
  status: z.enum(['Active', 'Invited', 'Suspended', 'Removed']).optional().default('Invited'),
  scopedProjectId: z.string().optional(),
  scopedProjectName: z.string().optional(),
  scopedTabOrTask: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;
  const role = url.searchParams.get('role') || undefined;
  const status = url.searchParams.get('status') || undefined;

  const orgId = auth.organizationId || 'org-1';
  const members = await listTeamMembersFromStore({
    organizationId: orgId,
    search,
    role,
    status,
  });

  const seats = await getTeamSeatsFromStore(orgId);

  return NextResponse.json({
    success: true,
    members,
    seats,
  });
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const raw = await request.json();
    const parsed = CreateMemberSchema.parse(raw);

    const orgId = auth.organizationId || 'org-1';
    const seats = await getTeamSeatsFromStore(orgId);

    if (seats.used + 1 > seats.limit) {
      return NextResponse.json(
        {
          error: `Cannot add member: workspace capacity limit of ${seats.limit} reached for ${seats.tierLabel}.`,
        },
        { status: 400 },
      );
    }

    const member = await createTeamMemberInStore({
      ...parsed,
      role: parsed.role as InternalRole,
      accessLevel: parsed.accessLevel as WorkspaceAccessLevel,
      organizationId: orgId,
    });

    const updatedSeats = await getTeamSeatsFromStore(orgId);

    return NextResponse.json(
      {
        success: true,
        member,
        seats: updatedSeats,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid team member data', details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create team member' },
      { status: 500 },
    );
  }
}

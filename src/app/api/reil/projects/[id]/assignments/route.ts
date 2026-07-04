import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, upsertFieldAssignment, listFieldAssignments } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const assignSchema = z.object({
  fieldKey:    z.string().min(1),
  assignedToId: z.string().min(1),
});

// GET /api/reil/projects/:id/assignments
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner  = project.createdById === auth.uid;
  const isCollab = project.collaborators.some(c => c.userId === auth.uid);
  if (!isOwner && !isCollab) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assignments = await listFieldAssignments(id);
  return NextResponse.json(assignments);
}

// POST /api/reil/projects/:id/assignments — create/update a field assignment
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.createdById !== auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body   = await req.json().catch(() => ({}));
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const assignment = await upsertFieldAssignment(
    id,
    parsed.data.fieldKey,
    parsed.data.assignedToId,
    auth.uid,
  );

  return NextResponse.json(assignment, { status: 201 });
}

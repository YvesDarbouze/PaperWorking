import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject } from "@/lib/db/projects";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; aid: string }> };

// PATCH /api/reil/projects/:id/assignments/:aid — resolve (FILLED) or reassign
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id, aid } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner  = project.createdById === auth.uid;
  const isCollab = project.collaborators.some(c => c.userId === auth.uid);
  if (!isOwner && !isCollab) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: "OPEN" | "FILLED" };

  if (!status || !["OPEN", "FILLED"].includes(status)) {
    return NextResponse.json({ error: "status must be OPEN or FILLED" }, { status: 422 });
  }

  const updated = await prisma.fieldAssignment.update({
    where: { id: aid },
    data:  { status },
  });

  return NextResponse.json(updated);
}

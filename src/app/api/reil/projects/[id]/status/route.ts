import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, createStatusEvent, listStatusEvents } from "@/lib/db/projects";
import type { AcquisitionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/reil/projects/:id/status — list event history
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = project.createdById === auth.uid;
  const isCollab = project.collaborators.some(c => c.userId === auth.uid);
  if (!isOwner && !isCollab) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const events = await listStatusEvents(id);
  return NextResponse.json(events);
}

// POST /api/reil/projects/:id/status — record a status transition
// Body: { status: AcquisitionStatus, note?: string }
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.createdById !== auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { status, note } = body as { status?: AcquisitionStatus; note?: string };

  if (!status) return NextResponse.json({ error: "status is required" }, { status: 422 });

  const [event] = await createStatusEvent(id, status, auth.uid, note ?? null);
  return NextResponse.json(event, { status: 201 });
}

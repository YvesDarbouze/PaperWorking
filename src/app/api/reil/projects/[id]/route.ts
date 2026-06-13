import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, updateProject } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/reil/projects/:id
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const { hasProjectAccess } = await import("@/lib/auth/scopeGuard");
  if (!(await hasProjectAccess(auth.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

// PATCH /api/reil/projects/:id — partial update (wizard auto-save)
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const { hasProjectAccess } = await import("@/lib/auth/scopeGuard");
  if (!(await hasProjectAccess(auth.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updated = await updateProject(id, body);

  return NextResponse.json(updated);
}

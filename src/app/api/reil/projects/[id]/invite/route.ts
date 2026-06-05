import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, inviteCollaborator } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const inviteSchema = z.object({
  email: z.string().email("Valid email required."),
  role:  z.enum(["OWNER", "PARTNER", "ANALYST", "VIEWER"]).default("VIEWER"),
});

// POST /api/reil/projects/:id/invite
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.createdById !== auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const collaborator = await inviteCollaborator(
    id,
    parsed.data.email,
    auth.uid,
    parsed.data.role,
  );

  // ── Mock email send ────────────────────────────────────────────────────────
  // TODO: replace with real provider (Resend, SendGrid, etc.)
  // The existing Resend integration lives at src/app/api/webhooks/resend/route.ts
  // and the CommunicationEngine at src/lib/engine/CommunicationEngine.ts.
  console.log(
    `[MOCK EMAIL] To: ${parsed.data.email} | Subject: You've been invited to join "${project.displayName ?? project.addressLine}" on PaperWorking`,
  );

  return NextResponse.json({ collaborator, invited: parsed.data.email }, { status: 201 });
}

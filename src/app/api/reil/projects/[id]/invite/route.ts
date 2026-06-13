import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, inviteCollaborator } from "@/lib/db/projects";
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';

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
  const { hasProjectAccess } = await import("@/lib/auth/scopeGuard");
  if (!(await hasProjectAccess(auth.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  // ── Dispatch Outbound Invitation Email ─────────────────────────────────────
  const subject = `You've been invited to join "${project.displayName ?? project.addressLine ?? 'a project'}" on PaperWorking`;
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/dashboard/projects/${id}`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:600px; margin:0 auto; padding:40px 20px; background:#FDFFFC; color:#121014; border:1px solid rgba(69,73,85,0.1); border-radius:12px;">
      <h2 style="font-size:20px; font-weight:700; letter-spacing:-0.01em; margin-bottom:16px;">Collaborator Invitation</h2>
      <p style="font-size:14px; line-height:1.6; color:#454955; margin-bottom:24px;">
        You have been invited to join the project <strong>"${project.displayName ?? project.addressLine ?? 'a project'}"</strong> on PaperWorking as a <strong>${parsed.data.role}</strong>.
      </p>
      <div style="margin-bottom:32px;">
        <a href="${inviteLink}" style="display:inline-block; padding:12px 24px; background:#121014; color:#FDFFFC; text-decoration:none; font-size:13px; font-weight:600; border-radius:6px; letter-spacing:0.05em; text-transform:uppercase;">
          Accept Invitation
        </a>
      </div>
      <p style="font-size:11px; line-height:1.4; color:#9E9DA0; border-top:1px solid rgba(69,73,85,0.1); margin-top:24px; padding-top:16px;">
        This email was sent to you regarding project collaboration on PaperWorking. If you believe you received this in error, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await CommunicationEngine.sendRawEmail([parsed.data.email], subject, html);
  } catch (err) {
    console.error('Failed to send collaborator invitation email:', err);
  }

  return NextResponse.json({ collaborator, invited: parsed.data.email }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { draftingAgent } from '@/lib/ai/draftingAgent';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   POST /api/ai/draft

   Authenticated (idToken in body). Fetches the target
   project from Firestore and generates a context-aware
   email draft via the DraftingAgent (Gemini).

   Body: {
     idToken:    string                        // Firebase ID token
     projectId:  string                        // Project to draft for
     audience:   'investors' | 'contractors'   // Tone selector
   }

   Response 200: { draft: string }
   Errors: 400, 401, 403, 404, 503
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

type Audience = 'investors' | 'contractors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { idToken, projectId, audience } = body ?? {};

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
    }

    const resolvedAudience: Audience =
      audience === 'contractors' ? 'contractors' : 'investors';

    // Authenticate the caller
    const authResult = await requireAuth(idToken);
    if (isAuthError(authResult)) return authResult;
    const { uid } = authResult;

    // Verify the caller has access to this project
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const projectData = projectSnap.data();
    const ownerUid: string | undefined = projectData?.ownerUid;
    const teamUids: string[] = projectData?.teamUids ?? [];

    if (ownerUid !== uid && !teamUids.includes(uid)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // Build a minimal Project shape for the drafting agent
    const project: Project = { id: projectSnap.id, ...projectData } as Project;

    const draft = await draftingAgent.draftDealUpdate(project, resolvedAudience);

    return NextResponse.json({ draft }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AI/Draft] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

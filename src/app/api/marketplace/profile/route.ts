import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import {
  sanitizeProfileInput,
  type InvestmentStrategy,
  type TeamMember,
} from '@/lib/marketplace/investorProfile';

/* ═══════════════════════════════════════════════════════════════════════════
   GET  /api/marketplace/profile   — the caller's own editable profile
   PUT  /api/marketplace/profile   — save it

   Requirement 4's write path.

   Security:
   - The uid comes from the VERIFIED token. There is no id in the body, so a
     caller cannot address someone else's profile at all.
   - The body is passed through `sanitizeProfileInput`, which returns a fixed
     shape. Unknown keys are dropped rather than merged, so `isVerified`,
     `followerCount`, and `followingCount` cannot be written from the client
     even though the merge below is a partial write.
   - Strategies are validated against the known set rather than stored as free
     text, so the discovery filter cannot be polluted.
   - Inviting a member records intent to appear on the public roster. It grants
     no access on its own.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const doc = await adminDb.collection('users').doc(auth.uid).get();
    const d = (doc.exists ? doc.data() : {}) as Record<string, unknown>;

    return NextResponse.json({
      profile: {
        uid: auth.uid,
        displayName: (d.displayName as string) ?? '',
        profileType: d.profileType === 'team' ? 'team' : 'individual',
        businessName: (d.businessName as string) ?? '',
        teamLogoUrl: (d.teamLogoUrl as string) ?? '',
        publicBio: (d.publicBio as string) ?? '',
        location: (d.location as string) ?? '',
        websiteUrl: (d.websiteUrl as string) ?? '',
        strategies: (d.strategies as InvestmentStrategy[]) ?? [],
        publicProfile: d.publicProfile === true,
        showRoiPublicly: d.showRoiPublicly === true,
        teamMembers: (d.teamMembers as TeamMember[]) ?? [],
        // Read-only: shown so the owner knows their status, never writable.
        isVerified: d.isVerified === true,
      },
    });
  } catch (err) {
    console.error('[api/marketplace/profile GET] failed', err);
    return NextResponse.json({ error: 'Could not load profile.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const result = sanitizeProfileInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    await adminDb
      .collection('users')
      .doc(auth.uid)
      .set({ ...result.value, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({ profile: { uid: auth.uid, ...result.value } });
  } catch (err) {
    console.error('[api/marketplace/profile PUT] failed', err);
    return NextResponse.json({ error: 'Could not save profile.' }, { status: 500 });
  }
}

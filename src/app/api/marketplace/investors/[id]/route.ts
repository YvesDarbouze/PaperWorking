import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { publicDealsFor, type InvestorProfile } from '@/lib/marketplace/investorProfile';

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/marketplace/investors/[id]
   ───────────────────────────────────────────────────────────────────────────
   A single public investor profile, their published deals, and public activity.

   Two privacy gates, both server-side:
   1. A user with `publicProfile !== true` returns 404 — not an empty profile,
      so their existence is not confirmed either.
   2. Deals pass through `publicDealsFor`, the shared allowlist redactor. The
      raw project documents never leave this route: they carry purchase price,
      loan amount, rent, seller name and the full ledger.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const userDoc = await adminDb.collection('users').doc(id).get();
    const d = userDoc.exists ? (userDoc.data() as Record<string, unknown>) : null;

    // Gate 1 — not public means not found.
    if (!d || d.publicProfile !== true) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const profile: InvestorProfile = {
      uid: userDoc.id,
      displayName: (d.displayName as string) ?? 'Investor',
      profileType: d.profileType === 'team' ? 'team' : 'individual',
      businessName: (d.businessName as string) ?? undefined,
      avatarUrl: (d.avatar as string) ?? (d.photoURL as string) ?? undefined,
      teamLogoUrl: (d.teamLogoUrl as string) ?? undefined,
      publicBio: (d.publicBio as string) ?? undefined,
      location: (d.location as string) ?? undefined,
      websiteUrl: (d.websiteUrl as string) ?? undefined,
      strategies: (d.strategies as InvestorProfile['strategies']) ?? [],
      isVerified: d.isVerified === true,
      publicProfile: true,
      followerCount: (d.followerCount as number) ?? 0,
      followingCount: (d.followingCount as number) ?? 0,
      aumCents: (d.aumCents as number) ?? undefined,
      avgRoiPct: (d.avgRoiPct as number) ?? undefined,
      showRoiPublicly: d.showRoiPublicly === true,
      teamMembers: (d.teamMembers as InvestorProfile['teamMembers']) ?? [],
    };

    // Gate 2 — query only published deals, then redact what remains.
    const projectSnap = await adminDb
      .collection('projects')
      .where('ownerUid', '==', id)
      .where('isPublicOnMarketplace', '==', true)
      .limit(60)
      .get();

    const deals = publicDealsFor(
      projectSnap.docs.map((p) => ({ id: p.id, ...(p.data() as object) })),
    );
    profile.dealCount = deals.length;

    // Public activity, if the app records it. Absent collection → empty list.
    let activity: Array<{ id: string; text: string; at?: string }> = [];
    try {
      const actSnap = await adminDb
        .collection('publicActivity')
        .where('actorUid', '==', id)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      activity = actSnap.docs.map((a) => {
        const ad = a.data() as Record<string, unknown>;
        return {
          id: a.id,
          text: (ad.text as string) ?? '',
          at: (ad.at as string) ?? undefined,
        };
      });
    } catch {
      activity = [];
    }

    // Is the caller already following? Optional auth.
    let isFollowing = false;
    const auth = await requireAuth(req).catch(() => null);
    if (auth && !isAuthError(auth)) {
      const edge = await adminDb
        .collection('investorFollowers')
        .doc(`${auth.uid}_${id}`)
        .get();
      isFollowing = edge.exists;
    }

    return NextResponse.json({ profile, deals, activity, isFollowing });
  } catch (err) {
    console.error('[api/marketplace/investors/[id]] failed', err);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

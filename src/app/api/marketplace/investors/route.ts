import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import type { InvestorProfile } from '@/lib/marketplace/investorProfile';

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/marketplace/investors
   ───────────────────────────────────────────────────────────────────────────
   Public investor directory.

   Only users who set `publicProfile: true` are returned, and only the fields
   a profile card renders — the raw user document holds email, Stripe ids,
   billing contact and subscription state, none of which may leave the server.

   Auth is optional: the directory is public. When a caller IS authenticated we
   additionally return which of these they already follow, so the grid can
   render Follow/Following without a second round trip.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  try {
    const snap = await adminDb
      .collection('users')
      .where('publicProfile', '==', true)
      .limit(200)
      .get();

    const profiles: InvestorProfile[] = snap.docs.map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      // Allowlist — never spread the raw user document.
      return {
        uid: doc.id,
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
        dealCount: (d.publicDealCount as number) ?? 0,
        aumCents: (d.aumCents as number) ?? undefined,
        avgRoiPct: (d.avgRoiPct as number) ?? undefined,
        showRoiPublicly: d.showRoiPublicly === true,
      };
    });

    // Optional auth: enrich with the viewer's follow edges when signed in.
    let followingIds: string[] = [];
    const auth = await requireAuth(req).catch(() => null);
    if (auth && !isAuthError(auth)) {
      const edges = await adminDb
        .collection('investorFollowers')
        .where('followerUid', '==', auth.uid)
        .get();
      followingIds = edges.docs.map((e) => (e.data() as { targetUid: string }).targetUid);
    }

    return NextResponse.json({ profiles, following: followingIds });
  } catch (err) {
    console.error('[api/marketplace/investors] failed', err);
    return NextResponse.json({ profiles: [], following: [] }, { status: 200 });
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import { handleMarketplaceProfileGet, sanitizeProfileInput } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  getUserProfile,
  updateUserProfile,
} from '@/lib/settings/settings-store';
import { CANONICAL_REIL_33_KPI_METRICS } from '@/lib/profile/reil-track-record';
import { upsertInvestorProfileInStore } from '@/lib/marketplace/investor-store';
import { validateVendorSkills } from '@/lib/marketplace/vendor-professions';
import { updateVendorProfileInStore } from '@/lib/vendor-portal/vendor-store';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function GET() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status, headers: NO_STORE_HEADERS });
  }

  const rawProfile = await getUserProfile(auth.uid);
  const result = await handleMarketplaceProfileGet({
    requireAuth: async () => ({ uid: auth.uid }),
    getUserDoc: async () => rawProfile as unknown as Record<string, unknown>,
  });

  if (result.status === 200 && result.body && typeof result.body === 'object') {
    const bodyObj = result.body as { profile?: Record<string, unknown> };
    return NextResponse.json(
      {
        ...bodyObj,
        profile: {
          ...(bodyObj.profile ?? {}),
          uid: auth.uid,
          displayName: rawProfile.displayName ?? bodyObj.profile?.displayName ?? '',
          businessName:
            rawProfile.businessName ?? rawProfile.companyName ?? bodyObj.profile?.businessName ?? '',
          companyName:
            rawProfile.companyName ?? rawProfile.businessName ?? bodyObj.profile?.companyName ?? '',
          headline: rawProfile.headline ?? bodyObj.profile?.headline ?? '',
          publicBio: rawProfile.publicBio ?? bodyObj.profile?.publicBio ?? '',
          location: rawProfile.location ?? bodyObj.profile?.location ?? '',
          websiteUrl: rawProfile.websiteUrl ?? bodyObj.profile?.websiteUrl ?? '',
          avatarUrl: rawProfile.avatarUrl ?? rawProfile.avatar ?? bodyObj.profile?.avatarUrl ?? '',
          avatar: rawProfile.avatar ?? rawProfile.avatarUrl ?? bodyObj.profile?.avatar ?? '',
          strategies: Array.isArray(rawProfile.strategies)
            ? rawProfile.strategies
            : (bodyObj.profile?.strategies ?? []),
          isVerified: rawProfile.isVerified ?? bodyObj.profile?.isVerified ?? true,
          vendorSkills: Array.isArray(rawProfile.vendorSkills)
            ? rawProfile.vendorSkills
            : (bodyObj.profile?.vendorSkills ?? []),
          ...(rawProfile.updatedAt !== undefined ? { updatedAt: rawProfile.updatedAt } : {}),
        },
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  return toNextResponse(result);
}

export async function POST(request: NextRequest) {
  return PUT(request);
}

export async function PUT(request: NextRequest) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status, headers: NO_STORE_HEADERS });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const existing = await getUserProfile(auth.uid);
  const resolvedBusinessName =
    typeof body.businessName === 'string' && body.businessName.trim()
      ? body.businessName.trim()
      : typeof body.companyName === 'string' && body.companyName.trim()
        ? body.companyName.trim()
        : typeof existing.companyName === 'string' && existing.companyName.trim()
          ? existing.companyName.trim()
          : typeof existing.displayName === 'string' && existing.displayName.trim()
            ? existing.displayName.trim()
            : 'Apex Capital Partners';

  const mergedInput: Record<string, unknown> = {
    ...body,
    businessName: resolvedBusinessName,
    headline: body.headline !== undefined ? body.headline : (existing.headline ?? ''),
    publicBio: body.publicBio !== undefined ? body.publicBio : (existing.publicBio ?? ''),
    location: body.location !== undefined ? body.location : (existing.location ?? ''),
    websiteUrl: body.websiteUrl !== undefined ? body.websiteUrl : (existing.websiteUrl ?? ''),
    strategies: body.strategies !== undefined ? body.strategies : (existing.strategies ?? []),
    publicProfile:
      body.publicProfile !== undefined ? body.publicProfile : (existing.publicProfile ?? true),
    showRoiPublicly:
      body.showRoiPublicly !== undefined
        ? body.showRoiPublicly
        : (existing.showRoiPublicly ?? true),
    teamMembers: body.teamMembers !== undefined ? body.teamMembers : existing.teamMembers,
    teamLogoUrl: body.teamLogoUrl !== undefined ? body.teamLogoUrl : existing.teamLogoUrl,
  };

  const sanitized = sanitizeProfileInput(mergedInput);
  if (!sanitized.ok) {
    return NextResponse.json(
      { error: sanitized.error },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let resolvedVendorSkills: string[] | undefined = undefined;
  if (Array.isArray(body.vendorSkills)) {
    if (body.vendorSkills.length === 0) {
      resolvedVendorSkills = [];
    } else {
      const validated = validateVendorSkills(body.vendorSkills);
      if (!validated.ok) {
        return NextResponse.json(
          { error: validated.error },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }
      resolvedVendorSkills = validated.skills;
    }
  }

  const patch: Record<string, unknown> = {
    ...sanitized.value,
    displayName:
      typeof body.displayName === 'string' && body.displayName.trim()
        ? body.displayName.trim()
        : existing.displayName || sanitized.value.businessName,
    companyName:
      typeof body.companyName === 'string' && body.companyName.trim()
        ? body.companyName.trim()
        : sanitized.value.businessName,
    ...(typeof body.email === 'string' && body.email.trim() ? { email: body.email.trim() } : {}),
    ...(typeof body.timezone === 'string' && body.timezone.trim()
      ? { timezone: body.timezone.trim() }
      : {}),
    ...(typeof body.locale === 'string' && body.locale.trim() ? { locale: body.locale.trim() } : {}),
    avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : existing.avatarUrl,
    avatar: typeof body.avatarUrl === 'string' ? body.avatarUrl : existing.avatar,
    teamLogoUrl:
      typeof body.teamLogoUrl === 'string' ? body.teamLogoUrl : sanitized.value.teamLogoUrl,
    onboardingCompleted:
      typeof body.onboardingCompleted === 'boolean'
        ? body.onboardingCompleted
        : existing.onboardingCompleted,
    headline: typeof body.headline === 'string' ? body.headline.trim() : existing.headline,
    ...(resolvedVendorSkills !== undefined ? { vendorSkills: resolvedVendorSkills } : {}),
    // Historical Track Record & Metrics are strictly generated by the REIL 33 Underwriting KPIs Engine (non-editable)
    aumCents: CANONICAL_REIL_33_KPI_METRICS.aumMillions * 1_000_000 * 100,
    avgRoiPct: CANONICAL_REIL_33_KPI_METRICS.avgRoiPct,
    equityMultiple: CANONICAL_REIL_33_KPI_METRICS.equityMultiple,
    dealCount: CANONICAL_REIL_33_KPI_METRICS.dealCount,
  };

  try {
    const updated = await updateUserProfile(auth.uid, patch);
    upsertInvestorProfileInStore(auth.uid, updated as unknown as Record<string, unknown>);

    // Sync vendor skills to vendor profile and directory store
    if (resolvedVendorSkills !== undefined) {
      try {
        await updateVendorProfileInStore(auth.uid, {
          companyName: String(patch.companyName || patch.displayName || 'PaperWorking Member'),
          vendorSkills: resolvedVendorSkills,
          type: resolvedVendorSkills[0] || 'General Contractor',
        });
      } catch (syncErr) {
        console.warn('[MarketplaceProfileAPI] Non-blocking vendor sync error:', syncErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        profile: updated,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (err: any) {
    console.error('[MarketplaceProfileAPI] Failed to update profile:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Database persistence failure: unable to save profile. Please retry.' },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}


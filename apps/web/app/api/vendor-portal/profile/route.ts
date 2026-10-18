import { NextResponse } from 'next/server';
import {
  type VendorProfileData,
  updateSeedVendorProfile,
} from '@/lib/vendor-portal/seed-data';
import {
  getVendorProfileFromStore,
  updateVendorProfileInStore,
} from '@/lib/vendor-portal/vendor-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

import { validateVendorSkills } from '@/lib/marketplace/vendor-professions';
import { getUserProfile, updateUserProfile } from '@/lib/settings/settings-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const profile = await getVendorProfileFromStore(auth.uid);
  const userProfile = await getUserProfile(auth.uid);
  const mergedProfile: VendorProfileData = {
    ...profile,
    ...(Array.isArray(userProfile.vendorSkills) && userProfile.vendorSkills.length > 0
      ? {
          vendorSkills: userProfile.vendorSkills,
          type: userProfile.vendorSkills[0] || profile.type,
        }
      : {}),
    ...(typeof userProfile.companyName === 'string' && userProfile.companyName.trim()
      ? { companyName: userProfile.companyName.trim() }
      : {}),
  };
  return NextResponse.json({ success: true, profile: mergedProfile });
}

export async function PUT(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: Partial<VendorProfileData> = {};
  try {
    body = (await request.json()) as Partial<VendorProfileData>;
  } catch {
    body = {};
  }

  if (body.vendorSkills !== undefined && Array.isArray(body.vendorSkills)) {
    if (body.vendorSkills.length > 0) {
      const validated = validateVendorSkills(body.vendorSkills);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      body.vendorSkills = validated.skills;
    }
  }

  updateSeedVendorProfile(body);
  const profile = await updateVendorProfileInStore(auth.uid, body);

  if (body.vendorSkills !== undefined) {
    try {
      await updateUserProfile(auth.uid, { vendorSkills: body.vendorSkills });
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({ success: true, profile });
}

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
import { updateUserProfile } from '@/lib/settings/settings-store';

export async function GET() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const profile = await getVendorProfileFromStore(auth.uid);
  return NextResponse.json({ success: true, profile });
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

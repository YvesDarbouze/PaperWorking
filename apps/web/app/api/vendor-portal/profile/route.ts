import { NextResponse } from 'next/server';
import {
  getSeedVendorProfile,
  updateSeedVendorProfile,
  type VendorProfileData,
} from '@/lib/vendor-portal/seed-data';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  return NextResponse.json({ success: true, profile: getSeedVendorProfile() });
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

  const profile = updateSeedVendorProfile(body);
  return NextResponse.json({ success: true, profile });
}

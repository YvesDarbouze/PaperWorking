import { NextResponse } from 'next/server';
import {
  createVendorService,
  listVendorServices,
  requireAuthOrJson,
} from '@/lib/membership/p1-seed-store';

export async function GET(request: Request) {
  const auth = await requireAuthOrJson();
  if (!auth.ok) return auth.response;

  const vendorUid = new URL(request.url).searchParams.get('vendorUid');
  const services = listVendorServices(vendorUid);
  return NextResponse.json({
    success: true,
    collection: 'vendorServices',
    count: services.length,
    services,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthOrJson();
  if (!auth.ok) return auth.response;

  let body: {
    title?: string;
    serviceType?: string;
    description?: string;
    status?: 'draft' | 'published' | 'paused' | 'archived';
    regions?: string[];
    basePrice?: number;
    currency?: string;
    vendorUid?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.title || !body.serviceType || !body.description) {
    return NextResponse.json(
      { error: 'title, serviceType, and description are required' },
      { status: 400 },
    );
  }

  const service = createVendorService({
    vendorUid: body.vendorUid ?? auth.uid,
    title: body.title,
    serviceType: body.serviceType,
    description: body.description,
    status: body.status ?? 'draft',
    regions: body.regions,
    basePrice: body.basePrice,
    currency: body.currency ?? 'USD',
  });

  return NextResponse.json({ success: true, service });
}

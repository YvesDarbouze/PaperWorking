import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { telemetry } from '@/lib/telemetry';

const VALIDATION_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  if (!VALIDATION_API_KEY) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    );
  }

  const { address } = await req.json().catch(() => ({ address: '' }));

  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  // TODO: Consider implementing rate limiting to prevent abuse of the Address Validation API

  telemetry.capture({
    distinctId: auth.uid,
    event: 'address_validation_called',
    properties: { sku: 'address-validation' }
  });

  try {
    const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${VALIDATION_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: { addressLines: [address] },
        enableUspsCass: true
      })
    });

    if (!response.ok) {
      throw new Error(`Address Validation API returned ${response.status}`);
    }

    const data = await response.json();
    const result = data.result;

    if (!result || !result.address) {
      throw new Error('Invalid response from Address Validation API');
    }

    const postalAddress = result.address.postalAddress;
    const components = result.address.addressComponents || [];
    const verdict = result.verdict;
    const placeId = result.geocode?.placeId;

    const getComponent = (type: string) => {
      const comp = components.find((c: any) => c.componentType === type);
      return comp ? comp.componentName.text : '';
    };

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const unitNumber = getComponent('subpremise');
    const city = getComponent('locality');
    const state = getComponent('administrative_area_level_1');
    const zip = getComponent('postal_code');

    const canonicalAddress = postalAddress.addressLines?.join(', ') || address;

    return NextResponse.json({
      canonicalAddress,
      components: {
        streetNumber,
        route,
        unitNumber,
        city,
        state,
        zip
      },
      placeId,
      verdict
    });

  } catch (error) {
    console.warn('[Places Validate] Address Validation API failed, using fallback parsing:', error);
    
    // Fallback logic
    const parts = address.split(',').map(s => s.trim());
    let street = parts[0] || '';
    let city = parts[1] || '';
    let stateZip = parts[2] || '';
    
    let state = '';
    let zip = '';
    const stateZipParts = stateZip.split(' ').map(s => s.trim()).filter(Boolean);
    if (stateZipParts.length >= 2) {
      state = stateZipParts[0];
      zip = stateZipParts[1];
    }

    const streetParts = street.split(' ');
    const streetNumber = streetParts.shift() || '';
    const route = streetParts.join(' ');

    return NextResponse.json({
      canonicalAddress: address,
      components: {
        streetNumber,
        route,
        unitNumber: '',
        city,
        state,
        zip
      },
      placeId: null,
      verdict: { fallback: true }
    });
  }
}

export interface AddressComponents {
  streetNumber: string;
  route: string;
  unitNumber: string;
  city: string;
  state: string;
  zip: string;
}

export interface AddressValidationResult {
  canonicalAddress: string;
  components: AddressComponents;
  placeId: string | null;
  verdict: Record<string, unknown>;
}

export function parseAddressFallback(address: string): AddressValidationResult {
  const parts = address.split(',').map((s) => s.trim());
  const street = parts[0] || '';
  const city = parts[1] || '';
  const stateZip = parts[2] || '';

  let state = '';
  let zip = '';
  const stateZipParts = stateZip.split(' ').map((s) => s.trim()).filter(Boolean);
  if (stateZipParts.length >= 2) {
    state = stateZipParts[0];
    zip = stateZipParts[1];
  }

  const streetParts = street.split(' ');
  const streetNumber = streetParts.shift() || '';
  const route = streetParts.join(' ');

  return {
    canonicalAddress: address,
    components: {
      streetNumber,
      route,
      unitNumber: '',
      city,
      state,
      zip,
    },
    placeId: null,
    verdict: { fallback: true },
  };
}

export function mapGoogleValidationResponse(
  address: string,
  data: Record<string, unknown>,
): AddressValidationResult {
  const result = data.result as Record<string, unknown> | undefined;
  if (!result || !result.address) {
    throw new Error('Invalid response from Address Validation API');
  }

  const addressObj = result.address as Record<string, unknown>;
  const postalAddress = addressObj.postalAddress as Record<string, unknown> | undefined;
  const components = (addressObj.addressComponents as Array<Record<string, unknown>>) || [];
  const verdict = (result.verdict as Record<string, unknown>) || {};
  const geocode = result.geocode as Record<string, unknown> | undefined;
  const placeId = (geocode?.placeId as string | undefined) ?? null;

  const getComponent = (type: string) => {
    const comp = components.find((c) => c.componentType === type) as
      | Record<string, unknown>
      | undefined;
    if (!comp) return '';
    const name = comp.componentName as Record<string, unknown> | undefined;
    return (name?.text as string) || '';
  };

  const addressLines = postalAddress?.addressLines as string[] | undefined;
  const canonicalAddress = addressLines?.join(', ') || address;

  return {
    canonicalAddress,
    components: {
      streetNumber: getComponent('street_number'),
      route: getComponent('route'),
      unitNumber: getComponent('subpremise'),
      city: getComponent('locality'),
      state: getComponent('administrative_area_level_1'),
      zip: getComponent('postal_code'),
    },
    placeId,
    verdict,
  };
}

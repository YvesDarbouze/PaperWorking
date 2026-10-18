export interface ParsedPlaceDetails {
  formattedAddress?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface RawAddressComponent {
  types?: string[];
  shortText?: string | null;
  longText?: string | null;
  short_name?: string;
  long_name?: string;
}

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  'DISTRICT OF COLUMBIA': 'DC',
  'WASHINGTON DC': 'DC',
  'WASHINGTON D.C.': 'DC',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  'PUERTO RICO': 'PR',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  'VIRGIN ISLANDS': 'VI',
  WASHINGTON: 'WA',
  'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
  GUAM: 'GU',
  'AMERICAN SAMOA': 'AS',
  'NORTHERN MARIANA ISLANDS': 'MP',
};

const VALID_US_STATE_CODES = new Set<string>(Object.values(US_STATE_NAME_TO_CODE));

const CITY_STATE_DEFAULT_ZIPS: Record<string, string> = {
  'WASHINGTON|DC': '20001',
  'ASPEN HILL|MD': '20906',
  'CAPITOL HEIGHTS|MD': '20743',
  'SILVER SPRING|MD': '20910',
  'BETHESDA|MD': '20814',
  'ROCKVILLE|MD': '20850',
  'BALTIMORE|MD': '21201',
  'ARLINGTON|VA': '22201',
  'ALEXANDRIA|VA': '22314',
  'RICHMOND|VA': '23219',
  'AUSTIN|TX': '78702',
  'DALLAS|TX': '75204',
  'HOUSTON|TX': '77002',
  'SAN ANTONIO|TX': '78205',
  'PHOENIX|AZ': '85016',
  'SCOTTSDALE|AZ': '85251',
  'DENVER|CO': '80202',
  'MIAMI|FL': '33131',
  'ORLANDO|FL': '32801',
  'TAMPA|FL': '33602',
  'SEATTLE|WA': '98101',
  'NASHVILLE|TN': '37201',
  'CHARLOTTE|NC': '28202',
  'RALEIGH|NC': '27601',
  'ATLANTA|GA': '30303',
  'CHICAGO|IL': '60601',
  'NEW YORK|NY': '10001',
  'BROOKLYN|NY': '11201',
  'LOS ANGELES|CA': '90012',
  'SAN FRANCISCO|CA': '94102',
  'SAN DIEGO|CA': '92101',
  'BOSTON|MA': '02108',
  'PHILADELPHIA|PA': '19102',
};

const STATE_DEFAULT_ZIPS: Record<string, string> = {
  AL: '35203',
  AK: '99501',
  AZ: '85016',
  AR: '72201',
  CA: '90012',
  CO: '80202',
  CT: '06103',
  DE: '19801',
  DC: '20001',
  FL: '33131',
  GA: '30303',
  HI: '96813',
  ID: '83702',
  IL: '60601',
  IN: '46204',
  IA: '50309',
  KS: '66101',
  KY: '40202',
  LA: '70112',
  ME: '04101',
  MD: '20906',
  MA: '02108',
  MI: '48226',
  MN: '55401',
  MS: '39201',
  MO: '63101',
  MT: '59101',
  NE: '68102',
  NV: '89101',
  NH: '03101',
  NJ: '07102',
  NM: '87102',
  NY: '10001',
  NC: '28202',
  ND: '58102',
  OH: '43215',
  OK: '73102',
  OR: '97201',
  PA: '19102',
  PR: '00901',
  RI: '02903',
  SC: '29201',
  SD: '57104',
  TN: '37201',
  TX: '78702',
  UT: '84101',
  VT: '05401',
  VA: '22201',
  VI: '00802',
  WA: '98101',
  WV: '25301',
  WI: '53202',
  WY: '82001',
  GU: '96910',
  AS: '96799',
  MP: '96950',
};

function resolveFallbackZipCode(
  rawAddress: string,
  city?: string,
  state?: string,
): string | undefined {
  const normalizedState = state?.trim().toUpperCase();
  if (!normalizedState || !VALID_US_STATE_CODES.has(normalizedState)) {
    return undefined;
  }

  const streetPart = rawAddress.split(',')[0]?.trim() || rawAddress;

  if (normalizedState === 'DC') {
    if (/\b(?:Northeast|NE)\b/i.test(streetPart)) {
      return '20002';
    }
    if (/\b(?:Southeast|SE)\b/i.test(streetPart)) {
      return '20003';
    }
    if (/\b(?:Southwest|SW)\b/i.test(streetPart)) {
      return '20024';
    }
    if (/\b(?:Northwest|NW)\b/i.test(streetPart)) {
      return '20001';
    }
    return '20001';
  }

  const normalizedCity = city?.trim().toUpperCase();
  if (normalizedCity) {
    const cityKey = `${normalizedCity}|${normalizedState}`;
    if (CITY_STATE_DEFAULT_ZIPS[cityKey]) {
      return CITY_STATE_DEFAULT_ZIPS[cityKey];
    }
  }

  return STATE_DEFAULT_ZIPS[normalizedState];
}

export function extractPlaceDetailsFromAddressComponents(
  components: unknown,
  formattedAddress?: string,
): ParsedPlaceDetails {
  const result: ParsedPlaceDetails = {};
  if (formattedAddress && typeof formattedAddress === 'string') {
    result.formattedAddress = formattedAddress;
  }

  if (Array.isArray(components)) {
    let streetNumber = '';
    let route = '';
    let locality = '';
    let sublocality = '';
    let adminLevel1 = '';
    let postalCode = '';

    for (const raw of components) {
      if (!raw || typeof raw !== 'object') continue;
      const comp = raw as RawAddressComponent;
      const types = Array.isArray(comp.types) ? comp.types : [];
      const shortVal = (comp.shortText ?? comp.short_name ?? '').trim();
      const longVal = (comp.longText ?? comp.long_name ?? shortVal).trim();

      if (types.includes('street_number') && shortVal) {
        streetNumber = shortVal;
      } else if (types.includes('route') && longVal) {
        route = longVal;
      } else if (types.includes('locality') && longVal) {
        locality = longVal;
      } else if (
        (types.includes('sublocality') ||
          types.includes('sublocality_level_1') ||
          types.includes('postal_town') ||
          types.includes('neighborhood')) &&
        longVal &&
        !sublocality
      ) {
        sublocality = longVal;
      } else if (types.includes('administrative_area_level_1')) {
        const candidate = shortVal.toUpperCase();
        if (VALID_US_STATE_CODES.has(candidate)) {
          adminLevel1 = candidate;
        } else if (longVal && US_STATE_NAME_TO_CODE[longVal.toUpperCase()]) {
          adminLevel1 = US_STATE_NAME_TO_CODE[longVal.toUpperCase()]!;
        }
      } else if (types.includes('postal_code') && shortVal) {
        postalCode = shortVal;
      }
    }

    if (streetNumber || route) {
      result.streetAddress = [streetNumber, route].filter(Boolean).join(' ');
    }
    if (locality || sublocality) {
      result.city = locality || sublocality;
    }
    if (adminLevel1) {
      result.state = adminLevel1;
    }
    if (postalCode) {
      result.zipCode = postalCode;
    }
  }

  return result;
}

export function parseAddressComponents(
  rawAddress: string,
  placeDetails?: ParsedPlaceDetails,
): ParsedPlaceDetails {
  const result: ParsedPlaceDetails = {
    formattedAddress: placeDetails?.formattedAddress || rawAddress.trim(),
    streetAddress: placeDetails?.streetAddress,
    city: placeDetails?.city,
    state: placeDetails?.state,
    zipCode: placeDetails?.zipCode,
  };

  const sourceText = rawAddress.trim();
  if (!sourceText) return result;

  const rawParts = sourceText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawParts[0] && !result.streetAddress) {
    result.streetAddress = rawParts[0];
  }

  if (rawParts.length >= 2) {
    const lastPartUpper = rawParts[rawParts.length - 1]?.toUpperCase() ?? '';
    const parts =
      lastPartUpper === 'USA' ||
      lastPartUpper === 'US' ||
      lastPartUpper === 'UNITED STATES'
        ? rawParts.slice(0, -1)
        : rawParts;

    const unitDesignatorRegex =
      /^(?:apt|apartment|unit|ste|suite|bldg|building|fl|floor|rm|room|lot|#)\b/i;
    const isLikelyCitySegment = (segment: string): boolean => {
      const trimmed = segment.trim();
      if (trimmed.length < 2) return false;
      if (unitDesignatorRegex.test(trimmed)) return false;
      return /^[A-Za-z][A-Za-z\s.'-]*[A-Za-z.]$/.test(trimmed);
    };

    const parseStateAndZipSegment = (
      segment: string,
    ): { state?: string; zipCode?: string } => {
      const cleaned = segment.trim();
      const codeZipMatch = cleaned.match(
        /^([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/,
      );
      if (codeZipMatch && codeZipMatch[1]) {
        const code = codeZipMatch[1].toUpperCase();
        if (VALID_US_STATE_CODES.has(code)) {
          return {
            state: code,
            zipCode: codeZipMatch[2],
          };
        }
      }

      const fullStateZipMatch = cleaned.match(
        /^([A-Za-z\s.]+?)(?:\s+(\d{5}(?:-\d{4})?))?$/,
      );
      if (fullStateZipMatch && fullStateZipMatch[1]) {
        const mapped =
          US_STATE_NAME_TO_CODE[fullStateZipMatch[1].trim().toUpperCase()];
        if (mapped) {
          return {
            state: mapped,
            zipCode: fullStateZipMatch[2],
          };
        }
      }

      return {};
    };

    if (parts.length >= 3) {
      const stateZipPart = parts[parts.length - 1] ?? '';
      const cityPart = parts[parts.length - 2] ?? '';
      if (!result.city && isLikelyCitySegment(cityPart)) {
        result.city = cityPart;
      }
      const parsedStateZip = parseStateAndZipSegment(stateZipPart);
      if (!result.state && parsedStateZip.state) {
        result.state = parsedStateZip.state;
      }
      if (!result.zipCode && parsedStateZip.zipCode) {
        result.zipCode = parsedStateZip.zipCode;
      }
    } else if (parts.length === 2 && parts[1]) {
      const secondPart = parts[1].trim();
      const parsedStateZip = parseStateAndZipSegment(secondPart);
      if (parsedStateZip.state) {
        if (!result.state) result.state = parsedStateZip.state;
        if (!result.zipCode && parsedStateZip.zipCode) {
          result.zipCode = parsedStateZip.zipCode;
        }
      } else if (!result.city && isLikelyCitySegment(secondPart)) {
        result.city = secondPart;
      }
    }
  }

  // Also check formattedAddress for an inline 5-digit ZIP code if still missing
  if (!result.zipCode && placeDetails?.formattedAddress) {
    const formattedZipMatch = placeDetails.formattedAddress.match(
      /\b([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\b/,
    );
    if (formattedZipMatch && formattedZipMatch[2]) {
      const candidateState = formattedZipMatch[1]!.toUpperCase();
      if (VALID_US_STATE_CODES.has(candidateState)) {
        if (!result.state) result.state = candidateState;
        result.zipCode = formattedZipMatch[2];
      }
    }
  }

  if (
    result.state === 'DC' &&
    result.city &&
    /^washington\s*,?\s*d\.?c\.?$/i.test(result.city.trim())
  ) {
    result.city = 'Washington';
  }

  // When a valid US state is identified (e.g., DC, MD, FL) and no explicit 5-digit ZIP was in the prediction string,
  // resolve the canonical postal code for the street/quadrant/city/state so it never stays stuck at Austin's 78702.
  if (!result.zipCode && result.state) {
    const resolvedZip = resolveFallbackZipCode(
      sourceText,
      result.city,
      result.state,
    );
    if (resolvedZip) {
      result.zipCode = resolvedZip;
    }
  }

  return result;
}

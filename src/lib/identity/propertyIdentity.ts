import type { AddressComponents } from '@/types/propertyTypes';

// Standard USPS abbreviations for street type normalization
const STREET_TYPE_ABBREVIATIONS: Record<string, string> = {
  'street': 'St',
  'st': 'St',
  'st.': 'St',
  'avenue': 'Ave',
  'ave': 'Ave',
  'ave.': 'Ave',
  'boulevard': 'Blvd',
  'blvd': 'Blvd',
  'blvd.': 'Blvd',
  'drive': 'Dr',
  'dr': 'Dr',
  'dr.': 'Dr',
  'lane': 'Ln',
  'ln': 'Ln',
  'ln.': 'Ln',
  'road': 'Rd',
  'rd': 'Rd',
  'rd.': 'Rd',
  'court': 'Ct',
  'ct': 'Ct',
  'ct.': 'Ct',
  'circle': 'Cir',
  'cir': 'Cir',
  'place': 'Pl',
  'pl': 'Pl',
  'terrace': 'Ter',
  'ter': 'Ter',
  'trail': 'Trl',
  'trl': 'Trl',
  'way': 'Way',
  'parkway': 'Pkwy',
  'pkwy': 'Pkwy',
  'highway': 'Hwy',
  'hwy': 'Hwy',
  'expressway': 'Expy',
  'expy': 'Expy',
  'freeway': 'Fwy',
  'fwy': 'Fwy',
  'pike': 'Pike',
  'turnpike': 'Tpke',
  'tpke': 'Tpke',
  'square': 'Sq',
  'sq': 'Sq',
  'loop': 'Loop',
  'crossing': 'Xing',
  'xing': 'Xing',
  'alley': 'Aly',
  'aly': 'Aly',
  'pass': 'Pass',
};

// Unit type abbreviations
const UNIT_TYPE_ABBREVIATIONS: Record<string, string> = {
  'apartment': 'Apt',
  'apt': 'Apt',
  'apt.': 'Apt',
  'suite': 'Ste',
  'ste': 'Ste',
  'ste.': 'Ste',
  'unit': 'Unit',
  '#': 'Unit',
  'no': 'Unit',
  'no.': 'Unit',
  'number': 'Unit',
  'room': 'Rm',
  'rm': 'Rm',
  'floor': 'Fl',
  'fl': 'Fl',
  'building': 'Bldg',
  'bldg': 'Bldg',
};

const titleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

/**
 * Derives a canonical address string from address components.
 * Pure function — no side effects, no API calls.
 * This is the SOLE producer of canonicalAddress values in the system.
 */
export function canonicalizeAddress(components: AddressComponents): string {
  const streetNum = components.streetNumber.trim();
  const routeParts = components.route.trim().split(' ').filter(Boolean);
  
  // Normalize street type
  if (routeParts.length > 0) {
    const lastWord = routeParts[routeParts.length - 1].toLowerCase();
    if (STREET_TYPE_ABBREVIATIONS[lastWord]) {
      routeParts[routeParts.length - 1] = STREET_TYPE_ABBREVIATIONS[lastWord];
    }
  }
  
  const routeStr = routeParts.map((p, i) => i === routeParts.length - 1 ? (STREET_TYPE_ABBREVIATIONS[p.toLowerCase()] || titleCase(p)) : titleCase(p)).join(' ');

  const streetStr = `${streetNum} ${routeStr}`;
  
  let unitStr = '';
  if (components.unitNumber) {
    const unit = components.unitNumber.trim();
    // basic splitting to separate prefix and number if they are in one string
    let unitParts = unit.split(' ').filter(Boolean);
    if (unitParts.length === 1) {
      if (unit.toLowerCase().startsWith('apt') && unit.length > 3) {
         unitParts = ['Apt', unit.slice(3).replace(/^[\.\s]+/, '')];
      } else if (unit.toLowerCase().startsWith('ste') && unit.length > 3) {
         unitParts = ['Ste', unit.slice(3).replace(/^[\.\s]+/, '')];
      } else if (unit.startsWith('#')) {
         unitParts = ['#', unit.slice(1)];
      } else if (/^\d+/.test(unit)) {
         unitParts = ['Unit', unit]; // just a number
      }
    }
    
    if (unitParts.length > 0) {
      const firstWord = unitParts[0].toLowerCase();
      if (UNIT_TYPE_ABBREVIATIONS[firstWord]) {
         unitParts[0] = UNIT_TYPE_ABBREVIATIONS[firstWord];
      } else if (unitParts.length === 1 && !UNIT_TYPE_ABBREVIATIONS[firstWord] && !/^\d+/.test(firstWord)) {
         // keep it as is, likely just single word like "Basement"
      } else if (unitParts.length === 1 && /^\d+/.test(firstWord)) {
         unitParts = ['Unit', firstWord];
      }
      unitStr = ' ' + unitParts.map((p, i) => i === 0 ? titleCase(p) : p.toUpperCase()).join(' ');
    }
  }
  
  const city = titleCase(components.city.trim());
  const state = components.state.trim().toUpperCase();
  
  // Trim zip
  let zip = components.zip.trim();
  if (zip.length > 5) {
    const zipMatch = zip.match(/^(\d{5})[- ]?(\d{4})?/);
    if (zipMatch) {
      zip = zipMatch[2] ? `${zipMatch[1]}-${zipMatch[2]}` : zipMatch[1];
    }
  }

  return `${streetStr}${unitStr}, ${city}, ${state} ${zip}`;
}

/**
 * Generates a URL-safe deal slug from a canonical address.
 * Collision-suffixed deterministically.
 */
export function generateDealSlug(
  canonicalAddress: string,
  existingSlugs: string[]
): string {
  // 1. Remove ZIP (everything after last comma+space+state)
  // "123 Main St Apt 2, Miami, FL 33101" -> "123 Main St Apt 2, Miami, FL"
  let slugBase = canonicalAddress;
  const parts = canonicalAddress.split(',');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim();
    const stateZipParts = lastPart.split(' ').filter(Boolean);
    if (stateZipParts.length >= 2) {
       // Assuming format is State Zip, remove the zip part
       const state = stateZipParts[0];
       parts[parts.length - 1] = ' ' + state;
       slugBase = parts.join(',');
    }
  }

  // 2. Lowercase
  let slug = slugBase.toLowerCase();

  // 3. Replace commas with nothing
  slug = slug.replace(/,/g, '');

  // 4. Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-');

  // 5. Strip non-alphanumeric except hyphens
  slug = slug.replace(/[^a-z0-9\-]/g, '');

  // 6. Dedupe consecutive hyphens
  slug = slug.replace(/-+/g, '-');
  
  // Remove trailing or leading hyphens
  slug = slug.replace(/^-|-$/g, '');

  // 7. & 8. Check collision and append "-2", "-3" etc.
  let finalSlug = slug;
  let counter = 2;
  while (existingSlugs.includes(finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return finalSlug;
}

/**
 * Canonical PaperWorking Vendor Professions & Skills Directory.
 *
 * All user tiers (Investor, Investment Team, Vendor) can select 1 to 3 professions
 * from this authoritative list to identify their trade or professional skills
 * in directory search engines and be published on the Vendor Directory.
 */

export const CANONICAL_VENDOR_PROFESSIONS = [
  'Real Estate Broker / Agent',
  'Real Estate Attorney',
  'Real Estate Appraiser',
  'Real Estate Consultant / Advisor',
  'Mortgage Broker / Loan Originator',
  'Real Estate Investment Banker',
  'Investment Analyst / Underwriter',
  'Property Manager',
  'Asset Manager',
  'Leasing Agent / Coordinator',
  'Real Estate Developer',
  'General Contractor',
  'Handyman',
  'Electrician',
  'Plumber',
  'HVAC Technician',
  'Roofer',
  'Flooring Specialist',
  'Architect / Engineer',
  'Home Inspector',
  'Mold / Environmental Assessor',
  'Locksmith',
  'Appliance Repair Technician',
  'Surveyor',
  'Landscaper / Lawn Care Service',
  'Snow Removal Specialist',
  'Janitorial / Cleaning Service',
  'Pest Control Operator',
  'Inspector',
  'Pool Service Technician',
  'Waste Management Service',
  'Security System Installer',
  'Network / Telecom Installer',
  'Real Estate Accountant / CPA',
  'Title Officer / Examiner',
  'Insurance Broker / Agent',
  'Transaction Coordinator',
  'Cost Segregation Specialist',
] as const;

export type VendorProfession = (typeof CANONICAL_VENDOR_PROFESSIONS)[number];

const CANONICAL_SET = new Set<string>(CANONICAL_VENDOR_PROFESSIONS);

export function isValidVendorProfession(val: string): val is VendorProfession {
  return CANONICAL_SET.has(val);
}

export interface VendorSkillsValidationResult {
  ok: boolean;
  skills: string[];
  error?: string;
}

/**
 * Validates that an input array contains between 1 and 3 valid canonical vendor professions.
 */
export function validateVendorSkills(input: unknown): VendorSkillsValidationResult {
  if (!Array.isArray(input)) {
    return {
      ok: false,
      skills: [],
      error: 'Skills must be provided as an array.',
    };
  }

  // Deduplicate and filter strings
  const cleaned = Array.from(
    new Set(
      input
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  if (cleaned.length === 0) {
    return {
      ok: false,
      skills: [],
      error: 'Please select between 1 and 3 professional skills.',
    };
  }

  if (cleaned.length > 3) {
    return {
      ok: false,
      skills: cleaned.slice(0, 3),
      error: 'You can select a maximum of 3 professional skills.',
    };
  }

  // Verify all belong to canonical list
  const invalid = cleaned.filter((skill) => !isValidVendorProfession(skill));
  if (invalid.length > 0) {
    return {
      ok: false,
      skills: cleaned.filter((s) => isValidVendorProfession(s)),
      error: `Invalid skill(s): ${invalid.join(', ')}. Must be selected from the canonical list.`,
    };
  }

  return {
    ok: true,
    skills: cleaned,
  };
}

/**
 * Checks whether a user's skills qualify them to post / be listed on the Vendor Directory.
 */
export function canListOnVendorDirectory(skills: unknown): boolean {
  if (!Array.isArray(skills)) return false;
  const valid = skills.filter((s) => typeof s === 'string' && isValidVendorProfession(s.trim()));
  return valid.length >= 1 && valid.length <= 3;
}

/**
 * Matches a query against a vendor's selected skills and trade information.
 */
export function matchVendorSkills(
  query: string,
  vendorSkills: string[] = [],
  companyName = '',
  type = '',
): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();

  if (companyName.toLowerCase().includes(q)) return true;
  if (type.toLowerCase().includes(q)) return true;

  return vendorSkills.some((skill) => {
    const s = skill.toLowerCase();
    return s.includes(q) || q.includes(s);
  });
}

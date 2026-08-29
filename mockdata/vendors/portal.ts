import { getSeedProjectById } from '../projects/projects';

export type VendorRequestStatus =
  | 'PENDING'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export interface SeedVendorRequest {
  id: string;
  projectId: string;
  status: VendorRequestStatus;
  type: string;
  message?: string;
  requestedAt: string;
  quotedFee?: number;
}

export interface VendorProfileData {
  companyName: string;
  type: string;
  specialties: string[];
  licensingStates: string[];
  serviceAreas: string[];
  bio: string;
  feeRangeLabel: string;
  avgTurnaroundDays: number;
  availability: 'Available' | 'Busy' | 'Available in 1 week';
  logoUrl: string;
  bannerUrl: string;
}

const seedVendorRequests: SeedVendorRequest[] = [
  {
    id: 'vreq-1',
    projectId: 'deal-1',
    status: 'PENDING',
    type: 'General Contractor',
    message: 'Need rehab quote for kitchen and bathrooms.',
    requestedAt: '2026-08-06T10:00:00.000Z',
  },
  {
    id: 'vreq-2',
    projectId: 'deal-2',
    status: 'QUOTED',
    type: 'Property Manager',
    message: 'Monthly management proposal requested.',
    requestedAt: '2026-08-02T14:00:00.000Z',
    quotedFee: 2400,
  },
  {
    id: 'vreq-3',
    projectId: 'deal-3',
    status: 'ACCEPTED',
    type: 'Title Company',
    message: 'Closing services for acquisition.',
    requestedAt: '2026-07-20T09:00:00.000Z',
    quotedFee: 1850,
  },
  {
    id: 'vreq-4',
    projectId: 'deal-1',
    status: 'DECLINED',
    type: 'Inspector',
    message: 'Full property inspection.',
    requestedAt: '2026-07-15T08:00:00.000Z',
  },
];

let seedVendorProfile: VendorProfileData = {
  companyName: 'PaperWorking Trades Co.',
  type: 'General Contractor',
  specialties: ['Rehab', 'Kitchen remodel', 'Roofing'],
  licensingStates: ['TX', 'CA'],
  serviceAreas: ['Austin, TX', 'Los Angeles, CA'],
  bio: 'Licensed contractor team focused on value-add rehabs and turn-key punch lists.',
  feeRangeLabel: '$50k–$120k per project',
  avgTurnaroundDays: 5,
  availability: 'Available',
  logoUrl: '',
  bannerUrl: '',
};

export function listSeedVendorRequests(_vendorUid: string): Array<Record<string, unknown>> {
  return seedVendorRequests.map((request) => ({ ...request }));
}

export function loadSeedProjectsMap(
  projectIds: string[],
): Record<string, Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {};
  for (const projectId of projectIds) {
    const project = getSeedProjectById(projectId);
    if (!project) continue;
    map[projectId] = {
      propertyName: project.propertyName,
      address: project.address,
      status: project.status,
      leadEmail: 'investor@paperworking.test',
      actionItems: project.todos.slice(0, 2).map((todo) => todo.content),
    };
  }
  return map;
}

export function updateSeedVendorRequest(input: {
  requestId: string;
  projectId: string;
  targetStatus: 'QUOTED' | 'DECLINED';
  quotedFee?: number;
  message?: string;
}): void {
  const request = seedVendorRequests.find(
    (item) => item.id === input.requestId && item.projectId === input.projectId,
  );
  if (!request) {
    throw new Error('Request not found');
  }
  request.status = input.targetStatus;
  if (input.targetStatus === 'QUOTED') {
    request.quotedFee = input.quotedFee;
    if (input.message) request.message = input.message;
  }
}

export function getSeedVendorProfile(): VendorProfileData {
  return { ...seedVendorProfile };
}

export function updateSeedVendorProfile(profile: Partial<VendorProfileData>): VendorProfileData {
  seedVendorProfile = {
    ...seedVendorProfile,
    ...profile,
    specialties: profile.specialties ?? seedVendorProfile.specialties,
    licensingStates: profile.licensingStates ?? seedVendorProfile.licensingStates,
    serviceAreas: profile.serviceAreas ?? seedVendorProfile.serviceAreas,
  };
  return getSeedVendorProfile();
}

export function formatVendorFee(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export const VENDOR_REQUEST_FILTERS = [
  'All',
  'PENDING',
  'QUOTED',
  'ACCEPTED',
  'COMPLETED',
  'DECLINED',
] as const;

export type VendorRequestFilter = (typeof VENDOR_REQUEST_FILTERS)[number];

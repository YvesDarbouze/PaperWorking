// REIL Acquisition Enums
// Must stay in sync with prisma/schema.prisma enum definitions.

// ─── Acquisition Status ───────────────────────────────────────────────────────

export enum AcquisitionStatus {
  PROSPECT        = "PROSPECT",
  OFFER_MADE      = "OFFER_MADE",
  UNDER_CONTRACT  = "UNDER_CONTRACT",
  DUE_DILIGENCE   = "DUE_DILIGENCE",
  CLEAR_TO_CLOSE  = "CLEAR_TO_CLOSE",
  PRE_POSSESSION  = "PRE_POSSESSION",
  OWNED           = "OWNED",
  // Legacy
  UNDERWRITING    = "UNDERWRITING",
  CLOSED          = "CLOSED",
  DEAD            = "DEAD",
}

// Ordered pipeline for the state machine stepper (PRE_POSSESSION is optional)
export const ACQUISITION_PIPELINE: AcquisitionStatus[] = [
  AcquisitionStatus.PROSPECT,
  AcquisitionStatus.OFFER_MADE,
  AcquisitionStatus.UNDER_CONTRACT,
  AcquisitionStatus.DUE_DILIGENCE,
  AcquisitionStatus.CLEAR_TO_CLOSE,
  AcquisitionStatus.PRE_POSSESSION, // optional — can be skipped
  AcquisitionStatus.OWNED,
];

export const OPTIONAL_STATUSES = new Set<AcquisitionStatus>([
  AcquisitionStatus.PRE_POSSESSION,
]);

export const ACQUISITION_STATUS_LABELS: Record<AcquisitionStatus, string> = {
  [AcquisitionStatus.PROSPECT]:       "Prospect",
  [AcquisitionStatus.OFFER_MADE]:     "Offer Made",
  [AcquisitionStatus.UNDER_CONTRACT]: "Under Contract",
  [AcquisitionStatus.DUE_DILIGENCE]:  "Due Diligence",
  [AcquisitionStatus.CLEAR_TO_CLOSE]: "Clear to Close",
  [AcquisitionStatus.PRE_POSSESSION]: "Pre-Possession",
  [AcquisitionStatus.OWNED]:          "Owned",
  [AcquisitionStatus.UNDERWRITING]:   "Underwriting",
  [AcquisitionStatus.CLOSED]:         "Closed",
  [AcquisitionStatus.DEAD]:           "Dead",
};

export const ACQUISITION_STATUS_HELP: Partial<Record<AcquisitionStatus, string>> = {
  [AcquisitionStatus.PROSPECT]:
    "You're researching this property. No offer has been made.",
  [AcquisitionStatus.OFFER_MADE]:
    "An offer has been submitted to the seller. Awaiting response.",
  [AcquisitionStatus.UNDER_CONTRACT]:
    "Agreement signed, earnest money deposited. You hold equitable interest — not yet the owner.",
  [AcquisitionStatus.DUE_DILIGENCE]:
    "Inspections, disclosure review, title check, appraisal, and financing underway. Contingencies allow you to exit.",
  [AcquisitionStatus.CLEAR_TO_CLOSE]:
    "All contingencies removed. Final walkthrough done. Closing disclosures reviewed. Ready to fund.",
  [AcquisitionStatus.PRE_POSSESSION]:
    "Optional. Early occupancy via a use-and-occupancy agreement before the deed records.",
  [AcquisitionStatus.OWNED]:
    "Ownership transfers only when the deed is signed, funds clear, and the deed is recorded with the county.",
};

// Entry chooser shortcuts for first-time status selection
export const STATUS_ENTRY_OPTIONS = [
  { label: "Just researching",  value: AcquisitionStatus.PROSPECT,       icon: "search"          },
  { label: "I've made an offer", value: AcquisitionStatus.OFFER_MADE,    icon: "gavel"           },
  { label: "Under contract",    value: AcquisitionStatus.UNDER_CONTRACT,  icon: "receipt_long"    },
  { label: "I already own it",  value: AcquisitionStatus.OWNED,           icon: "home"            },
] as const;

// ─── Ownership Structure ──────────────────────────────────────────────────────

export enum OwnershipStructure {
  SOLE_SEVERALTY      = "SOLE_SEVERALTY",
  JOINT_TENANCY       = "JOINT_TENANCY",
  TENANCY_IN_COMMON   = "TENANCY_IN_COMMON",
  TENANCY_BY_ENTIRETY = "TENANCY_BY_ENTIRETY",
  COMMUNITY_PROPERTY  = "COMMUNITY_PROPERTY",
  ENTITY              = "ENTITY",
  // Legacy
  SOLE_OWNER          = "SOLE_OWNER",
  JOINT_VENTURE       = "JOINT_VENTURE",
  LLC                 = "LLC",
  LP                  = "LP",
  TRUST               = "TRUST",
  SYNDICATION         = "SYNDICATION",
}

export interface OwnershipCard {
  value:       OwnershipStructure;
  title:       string;
  description: string;
  icon:        string;
  isMultiOwner: boolean;
  isEntity:     boolean;
}

export const OWNERSHIP_CARDS: OwnershipCard[] = [
  {
    value:        OwnershipStructure.SOLE_SEVERALTY,
    title:        "Sole / Severalty",
    description:  "One person or entity holds the entire title.",
    icon:         "person",
    isMultiOwner: false,
    isEntity:     false,
  },
  {
    value:        OwnershipStructure.JOINT_TENANCY,
    title:        "Joint Tenancy",
    description:  "Co-owners with right of survivorship — a deceased owner's share passes to survivors.",
    icon:         "group",
    isMultiOwner: true,
    isEntity:     false,
  },
  {
    value:        OwnershipStructure.TENANCY_IN_COMMON,
    title:        "Tenancy in Common",
    description:  "Co-owners may hold unequal shares. No survivorship — a share passes to heirs.",
    icon:         "supervisor_account",
    isMultiOwner: true,
    isEntity:     false,
  },
  {
    value:        OwnershipStructure.TENANCY_BY_ENTIRETY,
    title:        "Tenancy by the Entirety",
    description:  "For married couples. Survivorship applies and both spouses must consent to sell.",
    icon:         "favorite",
    isMultiOwner: true,
    isEntity:     false,
  },
  {
    value:        OwnershipStructure.COMMUNITY_PROPERTY,
    title:        "Community Property",
    description:  "Available in select states (CA, TX, AZ…). Assets acquired during marriage are owned jointly.",
    icon:         "location_city",
    isMultiOwner: true,
    isEntity:     false,
  },
  {
    value:        OwnershipStructure.ENTITY,
    title:        "Entity",
    description:  "Held by an LLC, corporation, trust, or partnership.",
    icon:         "corporate_fare",
    isMultiOwner: false,
    isEntity:     true,
  },
];

export const OWNERSHIP_STRUCTURE_LABELS: Record<string, string> = {
  SOLE_SEVERALTY:      "Sole / Severalty",
  JOINT_TENANCY:       "Joint Tenancy",
  TENANCY_IN_COMMON:   "Tenancy in Common",
  TENANCY_BY_ENTIRETY: "Tenancy by the Entirety",
  COMMUNITY_PROPERTY:  "Community Property",
  ENTITY:              "Entity",
  SOLE_OWNER:          "Sole Owner",
  JOINT_VENTURE:       "Joint Venture",
  LLC:                 "LLC",
  LP:                  "Limited Partnership",
  TRUST:               "Trust",
  SYNDICATION:         "Syndication",
};

// ─── Member Role ──────────────────────────────────────────────────────────────

export enum MemberRole {
  OWNER   = "OWNER",
  PARTNER = "PARTNER",
  ANALYST = "ANALYST",
  VIEWER  = "VIEWER",
}

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  [MemberRole.OWNER]:   "Owner",
  [MemberRole.PARTNER]: "Partner",
  [MemberRole.ANALYST]: "Analyst",
  [MemberRole.VIEWER]:  "Viewer",
};

export enum SellerResponse {
  PENDING   = "PENDING",
  ACCEPTED  = "ACCEPTED",
  COUNTERED = "COUNTERED",
  REJECTED  = "REJECTED",
}

export enum FieldStatus {
  OPEN   = "OPEN",
  FILLED = "FILLED",
}

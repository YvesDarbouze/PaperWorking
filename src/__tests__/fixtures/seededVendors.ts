export interface SeededVendor {
  id: string;
  name: string;
  companyName: string;
  category: string;
  type: string;
  location: string;
  rating: number;
  bio: string;
  specialties: string[];
  licensingStates: string[];
  serviceAreas: string[];
}

export const SEEDED_VENDORS: SeededVendor[] = [
  {
    id: "vendor_apex_legal",
    name: "Apex Legal Group",
    companyName: "Apex Legal Group",
    category: "Attorney",
    type: "Lawyer",
    location: "Miami, FL",
    rating: 4.9,
    bio: "Commercial real estate closing, title examination, and contract litigation specialist.",
    specialties: ["Title Examination", "Closing Services", "RE Litigation"],
    licensingStates: ["FL", "GA"],
    serviceAreas: ["33101", "33139", "33131"],
  },
  {
    id: "vendor_first_choice_lending",
    name: "First Choice Capital Lending",
    companyName: "First Choice Capital Lending",
    category: "Lender",
    type: "Lender",
    location: "Atlanta, GA",
    rating: 4.8,
    bio: "Hard money and private equity lending for residential rehab and commercial acquisition.",
    specialties: ["Fix & Flip Loans", "DSCR Mortgages", "Bridge Financing"],
    licensingStates: ["GA", "FL", "NC"],
    serviceAreas: ["30301", "30308", "30309"],
  },
  {
    id: "vendor_cornerstone_inspections",
    name: "Cornerstone Property Inspections",
    companyName: "Cornerstone Property Inspections",
    category: "Inspector",
    type: "Inspector",
    location: "Dallas, TX",
    rating: 4.9,
    bio: "Comprehensive structural, mechanical, and environmental due diligence inspections.",
    specialties: ["Phase I Environmental", "Structural Inspection", "HVAC & Roof Audit"],
    licensingStates: ["TX", "OK"],
    serviceAreas: ["75201", "75204", "75219"],
  },
  {
    id: "vendor_buildright_contracting",
    name: "BuildRight Contracting",
    companyName: "BuildRight Contracting",
    category: "Contractor",
    type: "Contractor",
    location: "Tampa, FL",
    rating: 4.7,
    bio: "Full-scale commercial and residential rehabilitation, structural repairs, and multi-family turns.",
    specialties: ["Multi-Family Turnkey", "Structural Rehab", "Roofing & Framing"],
    licensingStates: ["FL"],
    serviceAreas: ["33601", "33602", "33606"],
  },
  {
    id: "vendor_prestige_pm",
    name: "Prestige Property Management",
    companyName: "Prestige Property Management",
    category: "Property Manager",
    type: "Property Manager",
    location: "Orlando, FL",
    rating: 4.8,
    bio: "Turnkey property management, tenant placement, rent collection, and maintenance handling.",
    specialties: ["Tenant Placement", "Rent Collection", "24/7 Maintenance"],
    licensingStates: ["FL"],
    serviceAreas: ["32801", "32803", "32804"],
  },
  {
    id: "vendor_biscayne_realty",
    name: "Biscayne Realty Advisors",
    companyName: "Biscayne Realty Advisors",
    category: "Listing Agent",
    type: "Listing Agent",
    location: "Fort Lauderdale, FL",
    rating: 4.9,
    bio: "Commercial real estate brokerage, deal sourcing, and disposition advisory services.",
    specialties: ["Off-Market Sourcing", "Commercial Disposition", "1031 Exchange"],
    licensingStates: ["FL", "NY"],
    serviceAreas: ["33301", "33304", "33316"],
  },
];

/**
 * PaperWorking Synthetic Investor Crew — Personas Catalog
 *
 * Defines the 9 synthetic investor personas, their strategic goals, risk profiles,
 * and deterministic investment fixtures matching mid-2026 US real estate market conditions.
 */

export type PersonaKey =
  | 'wholesaler'
  | 'fix_flipper'
  | 'buy_hold'
  | 'multifamily_landlord'
  | 'land_developer'
  | 'commercial_investor'
  | 'brrrr_investor'
  | 'reit_investor'
  | 'syndicator';

export type PersonaTierKey = 'entry' | 'mid' | 'top';

export interface DealFixture {
  id: string;
  slug: string;
  title: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  purchasePrice?: number;
  arv?: number;
  rehabBudget?: number;
  assignmentFee?: number;
  contractPrice?: number;
  monthlyRent?: number;
  capRate?: number;
  cashOnCash?: number;
  dscr?: number;
  ltv?: number;
  grossScheduledRent?: number;
  egi?: number;
  expenseRatio?: number;
  noi?: number;
  units?: number;
  phaseGateStage?: string;
  notes?: string;
  assetClass?: string;
  details?: Record<string, any>;
}

export interface Persona {
  key: PersonaKey;
  name: string;
  email: string;
  location: string;
  tierKey: PersonaTierKey;
  riskLevel: string;
  primaryGoal: string;
  profile: string;
  behaviorSignature: string;
  fixtures: DealFixture[];
}

export const PERSONA_ROSTER: Record<PersonaKey, Persona> = {
  wholesaler: {
    key: 'wholesaler',
    name: 'Deshawn Carter',
    email: 'deshawn.carter+crew@paperworking.co',
    location: 'Atlanta, GA',
    tierKey: 'entry',
    riskLevel: 'Low capital / High hustle',
    primaryGoal: 'Quick assignment fees, deal flow volume',
    profile:
      'Atlanta, GA. 3 years experience, high deal volume, minimal capital. Finds below-market properties, puts them under contract, assigns the contract for a fee.',
    behaviorSignature:
      'Lists deals on the Deals Marketplace priced for investor-buyers; messages buy-and-hold and flipper personas with assignment offers; tracks assignment fee income as revenue.',
    fixtures: [
      {
        id: 'deal-westend-distressed',
        slug: 'westend-distressed-sfr',
        title: 'Westend Distressed SFR',
        propertyType: 'Single Family',
        address: '1420 Ralph David Abernathy Blvd',
        city: 'Atlanta',
        state: 'GA',
        zip: '30310',
        status: 'under_contract',
        arv: 185000,
        contractPrice: 112000,
        assignmentFee: 12000,
        notes: '3BR/1.5BA. Buyer closes in 21 days.',
      },
      {
        id: 'deal-east-point-probate',
        slug: 'east-point-probate-sfr',
        title: 'East Point Probate SFR',
        propertyType: 'Single Family',
        address: '2814 Main Street',
        city: 'East Point',
        state: 'GA',
        zip: '30344',
        status: 'marketed',
        arv: 158000,
        contractPrice: 96500,
        assignmentFee: 9500,
        notes: '2BR/1BA. Currently marketed to buyer list.',
      },
      {
        id: 'deal-decatur-estate',
        slug: 'decatur-estate-sfr',
        title: 'Decatur Estate Sale SFR',
        propertyType: 'Single Family',
        address: '412 Candler Road',
        city: 'Decatur',
        state: 'GA',
        zip: '30030',
        status: 'assigned',
        arv: 265000,
        contractPrice: 171000,
        assignmentFee: 18000,
        notes: '4BR/2BA. Assigned, closing scheduled.',
      },
    ],
  },

  fix_flipper: {
    key: 'fix_flipper',
    name: 'Marisol Vega',
    email: 'marisol.vega+crew@paperworking.co',
    location: 'Phoenix, AZ',
    tierKey: 'entry',
    riskLevel: 'High',
    primaryGoal: 'Fast forced-appreciation profits',
    profile:
      'Phoenix, AZ. 6 years, 14 completed flips. Buys rundown homes, renovates, sells fast.',
    behaviorSignature:
      'Heavy phase-gate usage (acquisition -> rehab -> disposition), overrides one gate with documented rationale, runs holding-cost and ROI reports in Insights.',
    fixtures: [
      {
        id: 'deal-maryvale-ranch',
        slug: 'maryvale-ranch-flip',
        title: 'Maryvale Ranch Flip',
        propertyType: 'Single Family',
        address: '4218 N 51st Ave',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85031',
        status: 'active_rehab',
        purchasePrice: 240000,
        rehabBudget: 65000,
        arv: 420000,
        phaseGateStage: 'mid_rehab',
        notes: '6-month hold; hard-money loan at 11.5% + 2 pts.',
        details: {
          rehabLineItems: {
            roof: 14000,
            kitchen: 18000,
            baths: 12000,
            flooringPaint: 11000,
            contingency: 10000,
          },
        },
      },
      {
        id: 'deal-glendale-ranch',
        slug: 'glendale-ranch-flip',
        title: 'Glendale Ranch Flip',
        propertyType: 'Single Family',
        address: '6102 W Bethany Home Rd',
        city: 'Glendale',
        state: 'AZ',
        zip: '85301',
        status: 'just_listed',
        purchasePrice: 198000,
        rehabBudget: 52000,
        arv: 348000,
        phaseGateStage: 'disposition',
        notes: 'Rehab complete, just listed on MLS.',
      },
      {
        id: 'deal-tempe-sold',
        slug: 'tempe-flip-sold',
        title: 'Tempe Flip (Historical)',
        propertyType: 'Single Family',
        address: '1842 E University Dr',
        city: 'Tempe',
        state: 'AZ',
        zip: '85281',
        status: 'sold',
        purchasePrice: 225000,
        rehabBudget: 58000,
        arv: 389000,
        notes: 'Sold for $389,000; net profit $71,400 after costs.',
        details: {
          soldPrice: 389000,
          netProfit: 71400,
        },
      },
    ],
  },

  buy_hold: {
    key: 'buy_hold',
    name: 'Tom & Elaine Whitaker',
    email: 'tom.elaine.whitaker+crew@paperworking.co',
    location: 'Indianapolis, IN',
    tierKey: 'mid',
    riskLevel: 'Moderate',
    primaryGoal: 'Cash flow + long-term appreciation',
    profile:
      'Indianapolis, IN. Buy-and-hold couple building retirement income, conservative leverage.',
    behaviorSignature:
      'Monitors Portfolio dashboard and Insights KPIs (NOI, cap rate, cash-on-cash, DSCR, occupancy); connects mock Plaid account; classifies recurring rent deposits and expenses; runs monthly reports.',
    fixtures: [
      {
        id: 'deal-broad-ripple-duplex',
        slug: 'broad-ripple-duplex',
        title: 'Broad Ripple Duplex',
        propertyType: 'Duplex',
        address: '6214 Carrollton Ave',
        city: 'Indianapolis',
        state: 'IN',
        zip: '46220',
        status: 'rented',
        purchasePrice: 310000,
        monthlyRent: 2850,
        capRate: 7.2,
        cashOnCash: 5.0,
        units: 2,
        notes: 'Units rent $1,450 + $1,400/mo; 25% down ($77,500), 30-yr fixed 6.9%.',
        details: {
          unit1Rent: 1450,
          unit2Rent: 1400,
          downPaymentPct: 25,
          interestRate: 6.9,
        },
      },
      {
        id: 'deal-fountain-square-sfr',
        slug: 'fountain-square-sfr',
        title: 'Fountain Square SFR',
        propertyType: 'Single Family',
        address: '1108 Shelby St',
        city: 'Indianapolis',
        state: 'IN',
        zip: '46203',
        status: 'rented',
        purchasePrice: 225000,
        monthlyRent: 1695,
        capRate: 6.8,
        units: 1,
      },
      {
        id: 'deal-greenwood-sfr',
        slug: 'greenwood-sfr',
        title: 'Greenwood SFR',
        propertyType: 'Single Family',
        address: '842 Madison Ave',
        city: 'Greenwood',
        state: 'IN',
        zip: '46142',
        status: 'rented',
        purchasePrice: 248000,
        monthlyRent: 1795,
        capRate: 6.5,
        units: 1,
      },
    ],
  },

  multifamily_landlord: {
    key: 'multifamily_landlord',
    name: 'Priya Raman',
    email: 'priya.raman+crew@paperworking.co',
    location: 'Columbus, OH',
    tierKey: 'mid',
    riskLevel: 'Moderate',
    primaryGoal: 'Scale rental income across units',
    profile:
      'Columbus, OH. Owns and self-manages apartment assets; collects monthly rent at scale.',
    behaviorSignature:
      'Rent-roll driven; heavy Insights usage across 33 KPIs; lists value-add 8-unit on Deals Marketplace as acquisition watch; messages syndicator persona about co-investing.',
    fixtures: [
      {
        id: 'deal-northgate-apartments',
        slug: 'northgate-apartments',
        title: 'Northgate Apartments',
        propertyType: 'Multi-Family',
        address: '5200 North High St',
        city: 'Columbus',
        state: 'OH',
        zip: '43214',
        status: 'operating',
        purchasePrice: 2250000,
        units: 24,
        grossScheduledRent: 298800,
        egi: 286250,
        expenseRatio: 45,
        noi: 157500,
        capRate: 7.0,
        dscr: 1.28,
        ltv: 66.7,
        notes:
          '24 units (12x2BR @ $1,150, 12x1BR @ $925); 95.8% occupancy (1 unit turning); debt $1.5M @ 7.25%/30-yr.',
        details: {
          twoBedUnits: 12,
          twoBedRent: 1150,
          oneBedUnits: 12,
          oneBedRent: 925,
          occupancyPct: 95.8,
          debtAmount: 1500000,
          interestRate: 7.25,
          amortizationYears: 30,
          latePayFlags: 2,
        },
      },
    ],
  },

  land_developer: {
    key: 'land_developer',
    name: 'Gideon Brooks',
    email: 'gideon.brooks+crew@paperworking.co',
    location: 'Austin, TX',
    tierKey: 'top',
    riskLevel: 'Very High',
    primaryGoal: 'Ground-up entitlement & development profit',
    profile:
      'Austin, TX metro. Buys raw land, entitles, develops from the ground up.',
    behaviorSignature:
      'Longest phase-gate chain in the crew; runs feasibility and timeline reports; lists one finished-lot tranche on Deals Marketplace.',
    fixtures: [
      {
        id: 'deal-hays-county-subdivision',
        slug: 'hays-county-subdivision',
        title: 'Hays County 14-Acre Subdivision',
        propertyType: 'Land / Development',
        address: 'FM 150 West',
        city: 'Dripping Springs',
        state: 'TX',
        zip: '78620',
        status: 'entitlement',
        purchasePrice: 1900000,
        rehabBudget: 2350000,
        units: 42,
        notes:
          'Raw land $1.9M; entitlement for 42 SFR lots; horizontal dev budget $2.35M; projected lot sales avg $118,000/lot ($4,956,000 gross); 30-month timeline with 6 phase gates.',
        details: {
          lotCount: 42,
          avgLotPrice: 118000,
          projectedGrossSales: 4956000,
          timelineMonths: 30,
          totalPhaseGates: 6,
          pendingGates: 2,
          overrideLog: [
            {
              gate: 'entitlement_utility_easement',
              rationale: 'utility easement resolved early',
            },
          ],
        },
      },
    ],
  },

  commercial_investor: {
    key: 'commercial_investor',
    name: 'Helena Marsh',
    email: 'helena.marsh+crew@paperworking.co',
    location: 'Charlotte, NC',
    tierKey: 'top',
    riskLevel: 'Moderate-High',
    primaryGoal: 'Stable NNN-leased commercial income',
    profile:
      'Charlotte, NC. Acquires office/strip/warehouse assets leased to businesses.',
    behaviorSignature:
      'Lease/escalation data entry; messages broker-style inquiries on Marketplace listings; runs DSCR and WALT-adjacent KPI views in Insights.',
    fixtures: [
      {
        id: 'deal-south-blvd-strip',
        slug: 'south-blvd-strip-center',
        title: 'South Blvd Strip Center',
        propertyType: 'Commercial Retail',
        address: '4800 South Blvd',
        city: 'Charlotte',
        state: 'NC',
        zip: '28217',
        status: 'operating',
        purchasePrice: 2100000,
        capRate: 8.1,
        notes: '9,400 SF, 6 tenants, all NNN; WALT 4.2 yrs; 2 tenant estoppels logged.',
        details: {
          sqft: 9400,
          tenantCount: 6,
          leaseType: 'NNN',
          waltYears: 4.2,
          estoppelsLogged: 2,
        },
      },
      {
        id: 'deal-airport-west-warehouse',
        slug: 'airport-west-warehouse',
        title: 'Airport West Warehouse',
        propertyType: 'Industrial / Warehouse',
        address: '3200 West Tyvola Rd',
        city: 'Charlotte',
        state: 'NC',
        zip: '28217',
        status: 'operating',
        purchasePrice: 3050000,
        capRate: 7.6,
        notes: '22,000 SF single-tenant NNN; lease expires 2031 with 3% annual escalations.',
        details: {
          sqft: 22000,
          tenantCount: 1,
          leaseType: 'NNN',
          leaseExpirationYear: 2031,
          annualEscalationPct: 3.0,
        },
      },
    ],
  },

  brrrr_investor: {
    key: 'brrrr_investor',
    name: 'Andre Kowalski',
    email: 'andre.kowalski+crew@paperworking.co',
    location: 'Cleveland, OH',
    tierKey: 'mid',
    riskLevel: 'High',
    primaryGoal: 'Portfolio velocity via refinance recycling',
    profile:
      'Cleveland, OH. Buy, Rehab, Rent, Refinance, Repeat — building portfolio velocity.',
    behaviorSignature:
      'Uses Projects as pipeline board across BRRRR stages; runs cash-out math and DSCR-at-refi reports; posts wanted-deal notes in Marketplace messages.',
    fixtures: [
      {
        id: 'deal-brrrr-stage-b',
        slug: 'brrrr-stage-buy',
        title: 'Detroit Ave SFR (Stage B - Buy)',
        propertyType: 'Single Family',
        address: '7402 Detroit Ave',
        city: 'Cleveland',
        state: 'OH',
        zip: '44102',
        status: 'under_contract',
        purchasePrice: 165000,
        rehabBudget: 48000,
        notes: 'Stage B: Under contract. Purchase $165k, rehab budget $48k.',
      },
      {
        id: 'deal-brrrr-stage-rehab',
        slug: 'brrrr-stage-rehab',
        title: 'Lorain Ave SFR (Stage R - Rehab)',
        propertyType: 'Single Family',
        address: '4210 Lorain Ave',
        city: 'Cleveland',
        state: 'OH',
        zip: '44113',
        status: 'in_rehab',
        purchasePrice: 150000,
        rehabBudget: 52000,
        notes: 'Stage R(ehab): Mid-rehab, $41,200 of $52,000 drawn.',
        details: {
          drawnRehab: 41200,
          totalRehab: 52000,
        },
      },
      {
        id: 'deal-brrrr-stage-rent',
        slug: 'brrrr-stage-rent',
        title: 'Fleet Ave SFR (Stage R - Rent)',
        propertyType: 'Single Family',
        address: '5814 Fleet Ave',
        city: 'Cleveland',
        state: 'OH',
        zip: '44105',
        status: 'rented',
        monthlyRent: 1650,
        notes: 'Stage R(ent): Rented $1,650/mo, 12-month lease active.',
      },
      {
        id: 'deal-brrrr-stage-refinance',
        slug: 'brrrr-stage-refinance',
        title: 'Memphis Ave SFR (Stage R - Refinance)',
        propertyType: 'Single Family',
        address: '6204 Memphis Ave',
        city: 'Cleveland',
        state: 'OH',
        zip: '44144',
        status: 'refinance',
        arv: 285000,
        monthlyRent: 2550,
        expenseRatio: 35,
        noi: 19900,
        dscr: 1.1,
        ltv: 75,
        notes:
          'Stage R(efinance): ARV $285k, 75% LTV refi = $213,750 new loan @ 7.5%/30-yr (debt service ~$17.9k/yr -> DSCR ~1.1). Capital recycled for next deal.',
        details: {
          refiLoanAmount: 213750,
          refiRate: 7.5,
          annualDebtService: 17900,
        },
      },
    ],
  },

  reit_investor: {
    key: 'reit_investor',
    name: 'Grace Nakamura',
    email: 'grace.nakamura+crew@paperworking.co',
    location: 'Honolulu, HI',
    tierKey: 'entry',
    riskLevel: 'Low',
    primaryGoal: 'Passive diversified income',
    profile:
      'Honolulu, HI. Fully passive; allocates across publicly traded REITs and real-estate funds.',
    behaviorSignature:
      'Light usage; checks Portfolio dashboard weekly cadence; no Marketplace listings; reads Marketplace messages; runs income/yield reports.',
    fixtures: [
      {
        id: 'deal-reit-passive-portfolio',
        slug: 'passive-reit-portfolio',
        title: 'Diversified REIT & Fund Holdings',
        propertyType: 'REIT / Fund',
        address: '1000 Bishop St',
        city: 'Honolulu',
        state: 'HI',
        zip: '96813',
        status: 'active',
        assetClass: 'REIT/Fund (Passive)',
        purchasePrice: 129000,
        notes:
          '4 REIT/fund positions: Residential REIT $38k, Industrial REIT $27.5k, Healthcare REIT $19k, Real Estate Index Fund $44.5k. Blended dividend yield 4.3%.',
        details: {
          residentialReitVal: 38000,
          industrialReitVal: 27500,
          healthcareReitVal: 19000,
          indexFundVal: 44500,
          blendedDividendYieldPct: 4.3,
        },
      },
    ],
  },

  syndicator: {
    key: 'syndicator',
    name: 'Marcus Delacroix',
    email: 'marcus.delacroix+crew@paperworking.co',
    location: 'Dallas, TX',
    tierKey: 'top',
    riskLevel: 'High',
    primaryGoal: 'Pool capital for large assets, promote + fees',
    profile:
      'Dallas, TX. Pools money from silent partners to buy assets too large for one buyer. Terminology: Syndicator / Lead Investor.',
    behaviorSignature:
      'Lists syndication opportunity on Deals Marketplace; messages prospective passive investors; runs investor-reporting views; documents one phase-gate override for renovation kickoff.',
    fixtures: [
      {
        id: 'deal-denton-value-add',
        slug: 'denton-68-unit-value-add',
        title: 'Denton 68-Unit Value-Add',
        propertyType: 'Multi-Family (Syndicated)',
        address: '2200 N Elm St',
        city: 'Denton',
        state: 'TX',
        zip: '76201',
        status: 'syndicating',
        purchasePrice: 4800000,
        rehabBudget: 646000,
        units: 68,
        noi: 408000,
        notes:
          'Equity raise $1,600,000 from 14 passive LPs (min $50k); 8% pref return, 70/30 split; $9.5k/unit renovation over 18 mos; projected stabilized NOI $408k; 5-yr hold, target LP IRR 15-17%.',
        details: {
          equityRaiseAmount: 1600000,
          passiveInvestorsCount: 14,
          minInvestmentAmount: 50000,
          preferredReturnPct: 8.0,
          lpSplitPct: 70,
          gpSplitPct: 30,
          perUnitRehab: 9500,
          renovationTimelineMonths: 18,
          projectedLpIrrLow: 15,
          projectedLpIrrHigh: 17,
          targetHoldYears: 5,
          roleTitle: 'Syndicator',
          overrideLog: [
            {
              gate: 'renovation_kickoff',
              rationale: 'permits approved ahead of schedule',
            },
          ],
        },
      },
    ],
  },
};

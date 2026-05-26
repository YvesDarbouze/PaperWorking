'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShieldCheck, 
  Star, 
  Clock, 
  ChevronRight, 
  Loader2, 
  ArrowUpRight, 
  DollarSign, 
  X, 
  Check, 
  Building2, 
  Plus,
  Bookmark,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useAuth } from '@/context/AuthContext';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import { projectsService } from '@/lib/firebase/deals';
import toast from 'react-hot-toast';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';
import { VendorRequestModal } from '@/components/marketplace/VendorRequestModal';
import { Project, VendorProfile, FractionalInvestor } from '@/types/schema';

// Premium mock crowdfunding listings as fallbacks
const MOCK_DEALS = [
  {
    id: 'mock-deal-skyline',
    propertyName: 'Skyline Heights Phase II',
    address: '401 Congress Ave, Austin TX',
    assetClass: 'Residential',
    status: 'Lead',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18),
    financials: {
      purchasePrice: 1950000,
      capitalRaiseTarget: 2450000,
      committedCapital: 2009000, // 82%
      estimatedARV: 3100000,
      projectedRehabCost: 450000,
      marketplaceListing: true
    },
    fractionalInvestors: [
      { id: '1', name: 'Ares Capital', email: 'ares@capital.com', contributionAmount: 1000000, equityPercentage: 40, status: 'confirmed' },
      { id: '2', name: 'Apex Syndicate', email: 'apex@syndicate.com', contributionAmount: 1009000, equityPercentage: 42, status: 'confirmed' }
    ]
  },
  {
    id: 'mock-deal-ecotech',
    propertyName: 'EcoTech Corporate Park',
    address: '8800 Technology Blvd, Austin TX',
    assetClass: 'Commercial',
    status: 'Lead',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    financials: {
      purchasePrice: 4200000,
      capitalRaiseTarget: 5100000,
      committedCapital: 2295000, // 45%
      estimatedARV: 6400000,
      projectedRehabCost: 900000,
      marketplaceListing: true
    },
    fractionalInvestors: [
      { id: '1', name: 'Greenfield Equity', email: 'greenfield@equity.com', contributionAmount: 2295000, equityPercentage: 45, status: 'confirmed' }
    ]
  },
  {
    id: 'mock-deal-nexus',
    propertyName: 'Nexus Logistics Hub',
    address: '1500 industrial Pkwy, Dallas TX',
    assetClass: 'Industrial',
    status: 'Lead',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 27),
    financials: {
      purchasePrice: 1500000,
      capitalRaiseTarget: 1850000,
      committedCapital: 1683500, // 91%
      estimatedARV: 2200000,
      projectedRehabCost: 350000,
      marketplaceListing: true
    },
    fractionalInvestors: [
      { id: '1', name: 'Dallas Logistics Partners', email: 'dlp@partners.com', contributionAmount: 1000000, equityPercentage: 54, status: 'confirmed' },
      { id: '2', name: 'Vanguard Industrial', email: 'vanguard@industrial.com', contributionAmount: 683500, equityPercentage: 37, status: 'confirmed' }
    ]
  }
];

export default function MarketplacePage() {
  // Sync deals in real-time from Firestore
  useAllDealsSync();

  const { profile, user } = useAuth();
  const projects = useProjectStore((state) => state.projects);
  const hasActiveSub = isSubscriptionActive(profile);

  const [activeTab, setActiveTab] = useState<'deals' | 'vendors'>('deals');
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [assetClassFilter, setAssetClassFilter] = useState<string>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [zipFilter, setZipFilter] = useState('');

  // Deal Marketplace filters matching Stitch wireframes
  const [strategyFilter, setStrategyFilter] = useState<string>('All');
  const [minInvestFilter, setMinInvestFilter] = useState<string>('All');
  const [targetReturnFilter, setTargetReturnFilter] = useState<string>('All');
  
  // Selected Deal Detail Drawer state
  const [selectedDeal, setSelectedDeal] = useState<Project | null>(null);
  
  // Pledge Modal state
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [pledgeName, setPledgeName] = useState('');
  const [pledgeEmail, setPledgeEmail] = useState('');
  const [isSubmittingPledge, setIsSubmittingPledge] = useState(false);

  // Vendor loading state
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  
  // Selected Vendor quote state
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Sync profile details to pledge form
  useEffect(() => {
    if (user) {
      setPledgeName(user.displayName || '');
      setPledgeEmail(user.email || '');
    }
  }, [user]);

  // Fetch vendors from /api/vendors based on filters
  useEffect(() => {
    if (activeTab !== 'vendors') return;

    const fetchVendors = async () => {
      setLoadingVendors(true);
      try {
        const params = new URLSearchParams();
        if (stateFilter !== 'All') {
          params.append('state', stateFilter);
        }
        if (roleFilter !== 'All') {
          params.append('type', roleFilter);
        }
        if (zipFilter.trim() !== '') {
          params.append('zip', zipFilter.trim());
        }
        const res = await fetch(`/api/vendors?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setVendors(data.vendors || []);
        } else {
          console.error('Failed to fetch vendors');
        }
      } catch (err) {
        console.error('Vendor fetch error', err);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchVendors();
  }, [activeTab, stateFilter, roleFilter, zipFilter]);

  // Derive deals from both real project list and MOCK_DEALS fallbacks
  const allDeals = useMemo(() => {
    // 1. Get real deals marked for marketplace listing
    const realDeals = projects.filter(p => p.financials?.marketplaceListing === true);
    
    // 2. If we have real deals, return them + fallback mock deals. Otherwise just mock deals.
    if (realDeals.length > 0) {
      return [...realDeals, ...MOCK_DEALS.map(d => ({
        ...d,
        createdAt: d.createdAt as any // TypeScript coercion
      }))] as unknown as Project[];
    }
    
    return MOCK_DEALS.map(d => ({
      ...d,
      createdAt: d.createdAt as any
    })) as unknown as Project[];
  }, [projects]);

  // Helper: Format large currencies
  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  // Helper: Calculate raise progress metrics for a project
  const getRaiseMetrics = (deal: Project) => {
    const target = deal.financials?.capitalRaiseTarget || deal.financials?.projectedRehabCost || 2500000;
    
    // Sum confirmed fractional investments
    const confirmedCommitments = deal.fractionalInvestors?.filter(i => i.status === 'confirmed') || [];
    const raised = confirmedCommitments.reduce((sum, i) => sum + (i.contributionAmount || 0), 0) || deal.financials?.committedCapital || 0;
    
    const pct = target > 0 ? Math.min(Math.round((raised / target) * 100), 100) : 0;
    
    // Estimate days left (mock calculations based on created date)
    const created = deal.createdAt ? new Date(deal.createdAt) : new Date();
    const elapsedDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(1, 30 - elapsedDays);

    // Calculate projected IRR if not directly set
    let irr = '12.0%';
    if (deal.financials) {
      try {
        const fin = deal.financials;
        const totalCashInvested = fin.totalCashInvested || Math.max(0, (fin.purchasePrice || 0) - (fin.loanAmount || 0));
        const annualGrossRent = (fin.monthlyGrossRent || 0) * 12;
        const annualExpenses = ((fin.operatingExpenseTaxes || 0) + (fin.operatingExpenseInsurance || 0)) * 12;
        const annualCashFlow = annualGrossRent - annualExpenses;
        const holdYears = Math.max(1, Math.round((fin.projectedHoldTimeMonths || 60) / 12));
        const purchasePrice = fin.purchasePrice || 0;
        const appreciation = fin.annualAppreciationPercent || 3;
        const loanAmount = fin.loanAmount || 0;
        const loanRate = fin.loanInterestRate || 0;
        const loanTerm = fin.loanTermYears || 30;

        const cashFlows = buildIRRCashFlows(
          totalCashInvested,
          annualCashFlow,
          holdYears,
          purchasePrice,
          appreciation,
          loanAmount,
          loanRate,
          loanTerm
        );
        const computedIrrVal = computeIRR(cashFlows);
        if (computedIrrVal !== null) {
          irr = `${(computedIrrVal * 100).toFixed(1)}%`;
        }
      } catch {
        // Fallback for mock deals or simple calculations
        if (deal.propertyName?.includes('Skyline')) irr = '14.8%';
        else if (deal.propertyName?.includes('EcoTech')) irr = '12.2%';
        else if (deal.propertyName?.includes('Nexus')) irr = '11.5%';
      }
    }

    return { target, raised, pct, daysLeft, irr };
  };

  // Helper: Map vendor type to icon and badge styling matching Stitch schema
  const getVendorTypeDetails = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'lender':
        return { icon: 'account_balance', badgeClass: 'bg-primary/10 border-primary/20 text-primary' };
      case 'inspector':
        return { icon: 'engineering', badgeClass: 'bg-secondary/10 border-secondary/20 text-secondary' };
      case 'lawyer':
      case 'attorney':
        return { icon: 'gavel', badgeClass: 'bg-tertiary/10 border-tertiary/20 text-tertiary' };
      case 'contractor':
        return { icon: 'construction', badgeClass: 'bg-primary/10 border-primary/20 text-primary' };
      case 'property manager':
        return { icon: 'domain', badgeClass: 'bg-secondary/10 border-secondary/20 text-secondary' };
      case 'listing agent':
      case 'agent':
        return { icon: 'real_estate_agent', badgeClass: 'bg-tertiary/10 border-tertiary/20 text-tertiary' };
      default:
        return { icon: 'account_circle', badgeClass: 'bg-white/5 border-white/10 text-[#bacac5]' };
    }
  };

  // Helper: Map dynamic connect button labels based on vendor type
  const getConnectButtonLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'lender': return 'Connect Now';
      case 'inspector': return 'Request Quote';
      case 'lawyer':
      case 'attorney': return 'Contact Legal';
      case 'contractor': return 'Hire Vendor';
      case 'property manager': return 'Inquire Services';
      case 'listing agent':
      case 'agent': return 'Connect Agent';
      default: return 'Connect Now';
    }
  };

  // Helper: Deterministic reviews count based on rating/metadata
  const getReviewsCount = (rating: number, companyName: string) => {
    let hash = 0;
    for (let i = 0; i < companyName.length; i++) {
      hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 450) + 50; // Between 50 and 500 reviews
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return allDeals.filter(d => {
      // 1. Search term (location/name) matching
      const matchSearch = d.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.address?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Strategy match (Opportunistic, Core+, Value-Add)
      let matchStrategy = true;
      if (strategyFilter !== 'All') {
        const propName = d.propertyName?.toLowerCase() || '';
        const stratType = d.strategyType?.toLowerCase() || '';
        if (strategyFilter === 'Opportunistic') {
          matchStrategy = stratType === 'fix & flip' || stratType === 'opportunistic' || 
                          propName.includes('skyline') || propName.includes('azure');
        } else if (strategyFilter === 'Core+') {
          matchStrategy = stratType === 'buy & hold' || stratType === 'rent' || stratType === 'core+' || 
                          propName.includes('ecotech') || propName.includes('tech');
        } else if (strategyFilter === 'Value-Add') {
          matchStrategy = stratType === 'sell' || stratType === 'value-add' || 
                          propName.includes('nexus') || propName.includes('obsidian');
        } else {
          matchStrategy = d.strategyType === strategyFilter;
        }
      }
      
      // 3. Min Invest match ($10k - $50k, $50k - $250k, $250k+)
      let matchMinInvest = true;
      if (minInvestFilter !== 'All') {
        const target = d.financials?.capitalRaiseTarget || d.financials?.projectedRehabCost || 2500000;
        const minInvest = Math.max(10000, Math.round((target * 0.01) / 5000) * 5000);
        
        if (minInvestFilter === '$10k - $50k') {
          matchMinInvest = minInvest >= 10000 && minInvest <= 50000;
        } else if (minInvestFilter === '$50k - $250k') {
          matchMinInvest = minInvest > 50000 && minInvest <= 250000;
        } else if (minInvestFilter === '$250k+') {
          matchMinInvest = minInvest > 250000;
        }
      }
      
      // 4. Target Return match (12% - 15%, 15% - 20%, 20%+)
      let matchTargetReturn = true;
      if (targetReturnFilter !== 'All') {
        const { irr } = getRaiseMetrics(d);
        const irrVal = parseFloat(irr) || 12.0;
        
        if (targetReturnFilter === '12% - 15%') {
          matchTargetReturn = irrVal >= 12 && irrVal < 15;
        } else if (targetReturnFilter === '15% - 20%') {
          matchTargetReturn = irrVal >= 15 && irrVal < 20;
        } else if (targetReturnFilter === '20%+') {
          matchTargetReturn = irrVal >= 20;
        }
      }
      
      return matchSearch && matchStrategy && matchMinInvest && matchTargetReturn;
    });
  }, [allDeals, searchTerm, strategyFilter, minInvestFilter, targetReturnFilter]);

  // Filtered Vendors (Client-side search on top of server-side state/role filters)
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchSearch = v.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          v.bio?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [vendors, searchTerm]);

  // Submit Pledge
  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeal) return;
    
    const amount = parseFloat(pledgeAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid investment amount.');
      return;
    }

    setIsSubmittingPledge(true);
    try {
      const isMock = selectedDeal.id.startsWith('mock-');
      const metrics = getRaiseMetrics(selectedDeal);
      const equityPct = Math.round((amount / metrics.target) * 1000) / 10; // e.g. 2.5%

      const newPledge: FractionalInvestor = {
        id: crypto.randomUUID(),
        name: pledgeName.trim(),
        email: pledgeEmail.trim(),
        contributionAmount: amount,
        equityPercentage: equityPct,
        status: 'confirmed',
        invitedAt: new Date(),
        confirmedAt: new Date()
      };

      if (isMock) {
        // Mock project updates: simulate local update to mock listings
        const updatedMock = {
          ...selectedDeal,
          fractionalInvestors: [...(selectedDeal.fractionalInvestors || []), newPledge],
          financials: {
            ...selectedDeal.financials,
            committedCapital: (selectedDeal.financials.committedCapital || 0) + amount
          }
        };
        // Update selected project view
        setSelectedDeal(updatedMock as unknown as Project);
        
        // Locally update the MOCK_DEALS array so it reflects in the grid
        const mockIdx = MOCK_DEALS.findIndex(d => d.id === selectedDeal.id);
        if (mockIdx !== -1) {
          MOCK_DEALS[mockIdx].fractionalInvestors.push(newPledge);
          MOCK_DEALS[mockIdx].financials.committedCapital += amount;
        }

        toast.success(`Successfully pledged ${formatCurrency(amount)} to ${selectedDeal.propertyName}!`);
      } else {
        // Real project updates: commit to Firestore
        const currentInvestors = selectedDeal.fractionalInvestors || [];
        const nextInvestors = [...currentInvestors, newPledge];
        
        const confirmedEquity = nextInvestors
          .filter(inv => inv.status === 'confirmed')
          .reduce((sum, inv) => sum + (inv.equityPercentage || 0), 0);
        const ownershipPercentage = Math.max(0, 100 - confirmedEquity);
        const committedCapital = nextInvestors
          .filter(inv => inv.status === 'confirmed')
          .reduce((sum, inv) => sum + (inv.contributionAmount || 0), 0);

        await projectsService.updateProject(selectedDeal.id, {
          fractionalInvestors: nextInvestors,
          financials: {
            ...selectedDeal.financials,
            ownershipPercentage,
            committedCapital
          }
        });

        // Fetch latest doc to update current selected deal drawer state
        const updated = await projectsService.getProject(selectedDeal.id);
        if (updated) setSelectedDeal(updated);

        toast.success(`Investment pledge recorded for ${selectedDeal.propertyName}!`);
      }

      setPledgeOpen(false);
      setPledgeAmount('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit investment pledge.');
    } finally {
      setIsSubmittingPledge(false);
    }
  };

  // Open quote request for a vendor
  const handleRequestQuote = (vendor: VendorProfile) => {
    setSelectedVendor(vendor);
    setIsQuoteModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-[#dae4ec] pt-24 px-6 md:px-10 pb-24">
      
      {/* ── Header Segment ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[#57f1db] text-2xl">hub</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bacac5] opacity-60">Paperworking Network</p>
          </div>
          <h2 className="text-4xl font-extralight tracking-tight mb-2">Marketplace</h2>
          <p className="text-[#bacac5] max-w-xl text-sm">
            Access secure crowdfunding syndicates or connect with verified vendors to execute due diligence and rehab operations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="pw-tabs--pill flex gap-1 self-start md:self-auto border border-pw-border rounded-none">
          <button 
            onClick={() => { setActiveTab('deals'); setSearchTerm(''); }}
            className={`pw-tab px-6 py-2.5 text-xs font-bold uppercase tracking-wider ${
              activeTab === 'deals' 
                ? 'pw-tab--active' 
                : ''
            }`}
          >
            Deal Marketplace
          </button>
          <button 
            onClick={() => { setActiveTab('vendors'); setSearchTerm(''); }}
            className={`pw-tab px-6 py-2.5 text-xs font-bold uppercase tracking-wider ${
              activeTab === 'vendors' 
                ? 'pw-tab--active' 
                : ''
            }`}
          >
            Vendor Marketplace
          </button>
        </div>
            {/* ── Search & Filter Controls ── */}
      <div className="glass-card p-5 rounded-none flex flex-col gap-5 mb-8 border border-pw-border">
        <div className="flex flex-wrap items-center gap-4 w-full">
          {activeTab === 'deals' ? (
            <>
              {/* Location Input (Search Global Regions...) */}
              <div className="flex-1 min-w-[200px] group">
                <label className="text-xs font-black uppercase tracking-widest text-pw-muted mb-1.5 block">Location</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search Global Regions..."
                    className="w-full pl-11 pr-4 py-3 bg-pw-glass-bg border border-pw-border focus:border-pw-primary focus:ring-1 focus:ring-pw-primary rounded-none text-xs focus:outline-none transition-colors placeholder:text-pw-muted text-pw-black"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-pw-muted text-base" style={{ fontVariationSettings: "'FILL' 0" }}>
                    location_on
                  </span>
                </div>
              </div>

              {/* Strategy Dropdown */}
              <div className="w-full md:w-auto">
                <label className="text-xs font-black uppercase tracking-widest text-pw-muted mb-1.5 block">Strategy</label>
                <select 
                  className="w-full md:w-auto px-4 py-3 bg-pw-glass-bg border border-pw-border focus:border-pw-primary rounded-none text-xs font-semibold focus:outline-none text-pw-black"
                  value={strategyFilter}
                  onChange={(e) => setStrategyFilter(e.target.value)}
                >
                  <option value="All">All Strategies</option>
                  <option value="Opportunistic">Opportunistic</option>
                  <option value="Core+">Core+</option>
                  <option value="Value-Add">Value-Add</option>
                </select>
              </div>

              {/* Min Invest Dropdown */}
              <div className="w-full md:w-auto">
                <label className="text-xs font-black uppercase tracking-widest text-pw-muted mb-1.5 block">Min Invest</label>
                <select 
                  className="w-full md:w-auto px-4 py-3 bg-pw-glass-bg border border-pw-border focus:border-pw-primary rounded-none text-xs font-semibold focus:outline-none text-pw-black"
                  value={minInvestFilter}
                  onChange={(e) => setMinInvestFilter(e.target.value)}
                >
                  <option value="All">All Investments</option>
                  <option value="$10k - $50k">$10k - $50k</option>
                  <option value="$50k - $250k">$50k - $250k</option>
                  <option value="$250k+">$250k+</option>
                </select>
              </div>

              {/* Target Return Dropdown */}
              <div className="w-full md:w-auto">
                <label className="text-xs font-black uppercase tracking-widest text-pw-muted mb-1.5 block">Target Return</label>
                <select 
                  className="w-full md:w-auto px-4 py-3 bg-pw-glass-bg border border-pw-border focus:border-pw-primary rounded-none text-xs font-semibold focus:outline-none text-pw-black"
                  value={targetReturnFilter}
                  onChange={(e) => setTargetReturnFilter(e.target.value)}
                >
                  <option value="All">All Returns</option>
                  <option value="12% - 15%">12% - 15%</option>
                  <option value="15% - 20%">15% - 20%</option>
                  <option value="20%+">20%+</option>
                </select>
              </div>

              {/* Reset/Tune Filters Button */}
              <button 
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStrategyFilter('All');
                  setMinInvestFilter('All');
                  setTargetReturnFilter('All');
                  toast.success('Filters reset to default.');
                }}
                className="pw-interactive border border-pw-border hover:bg-pw-primary/10 hover:text-pw-primary hover:border-pw-primary/30 p-2.5 rounded-none flex items-center justify-center mt-5 md:mt-5 text-pw-muted"
              >
                <span className="material-symbols-outlined text-sm">tune</span>
              </button>
            </>
          ) : (
            <>
              {/* Location Input (Zip code or City) */}
              <div className="relative flex-1 min-w-[240px] group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-pw-muted group-focus-within:text-pw-primary transition-colors">
                  location_on
                </span>
                <input 
                  type="text"
                  placeholder="Search by City or Zip Code..."
                  className="w-full pl-12 pr-4 py-3.5 bg-pw-glass-bg border border-pw-border focus:border-pw-primary focus:ring-1 focus:ring-pw-primary rounded-none text-sm focus:outline-none transition-all placeholder:text-pw-muted text-pw-black"
                  value={zipFilter}
                  onChange={(e) => setZipFilter(e.target.value)}
                />
              </div>

              {/* Text Search Input (for company/bio/specialty) */}
              <div className="relative flex-1 min-w-[240px] group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted" />
                <input 
                  type="text"
                  placeholder="Filter by specialty (e.g. Appraisal, Contractor)..."
                  className="w-full pl-11 pr-4 py-3.5 bg-pw-glass-bg border border-pw-border focus:border-pw-primary focus:ring-1 focus:ring-pw-primary rounded-none text-sm focus:outline-none transition-all placeholder:text-pw-muted text-pw-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* State Dropdown */}
              <select 
                className="px-4 py-3.5 bg-pw-glass-bg border border-pw-border focus:border-pw-primary rounded-none text-sm font-semibold focus:outline-none text-pw-black"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              >
                <option value="All">All States</option>
                <option value="TX">Texas (TX)</option>
                <option value="FL">Florida (FL)</option>
                <option value="GA">Georgia (GA)</option>
              </select>
            </>
          )}
        </div>

        {/* Scrolling Specialty Chips (only for Vendor Marketplace) */}
        {activeTab === 'vendors' && (
          <div className="flex overflow-x-auto gap-2 pb-1.5 no-scrollbar scroll-smooth">
            {[
              { label: 'All', value: 'All' },
              { label: 'Lenders', value: 'Lender' },
              { label: 'Inspectors', value: 'Inspector' },
              { label: 'Attorneys', value: 'Lawyer' },
              { label: 'Contractors', value: 'Contractor' },
              { label: 'Property Managers', value: 'Property Manager' },
              { label: 'Agents', value: 'Listing Agent' }
            ].map((chip) => {
              const isChipActive = roleFilter === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setRoleFilter(chip.value)}
                  className={`whitespace-nowrap px-4 py-2 border rounded-none font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                    isChipActive
                      ? 'border-pw-primary bg-pw-primary/10 text-pw-primary shadow-[0_0_10px_rgba(87,241,219,0.15)]'
                      : 'border-pw-border text-pw-muted hover:border-pw-primary/50 hover:text-pw-primary hover:bg-white/5'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* ── Main content tabs ── */}
      {activeTab === 'deals' ? (
        /* ==================== CROWDFUNDING DEALS TAB ==================== */
        <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
          {filteredDeals.length === 0 ? (
            <div className="py-20 glass-card rounded-none flex flex-col items-center justify-center gap-4 border border-dashed border-pw-border text-center px-6 text-pw-black">
              <Building2 className="w-8 h-8 text-pw-muted opacity-20" />
              <p className="text-xs uppercase font-bold tracking-widest text-pw-muted">No crowdfunding opportunities match your criteria.</p>
              <p className="text-xs text-pw-muted/60 max-w-sm">Try broadening your search term or adjusting filters.</p>
            </div>
          ) : (
            <>
              {/* Highlighted/Detail State Card (First Deal) */}
              {(() => {
                const deal = filteredDeals[0];
                const { target, raised, pct, daysLeft, irr } = getRaiseMetrics(deal);
                const roi = deal.financials?.purchasePrice 
                  ? ((deal.financials.estimatedARV || deal.financials.purchasePrice * 1.3) / deal.financials.purchasePrice).toFixed(1) + 'x'
                  : '2.4x';
                const strategyName = deal.strategyType || (deal.propertyName?.includes('Skyline') ? 'Value-Add' : deal.propertyName?.includes('EcoTech') ? 'Core+' : 'Opportunistic');
                const imageSrc = deal.propertyName?.includes('Skyline')
                  ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdm9FjoA8XNQzTeTq1pOJVSJ9N5thSTHS5PXjkKQ72BUVQu01Z9gkRA2dJVTHPO8KG4UQjeM00-_3C_Oo_BXfXuHE8DC4VJu2StkFkJe5HfSBaXYVnTXuAeMxstCtxh0n0CJf6Elf6hCksJYYuXXSfkCApIwUDQfWD7q-aSP4EzPDVKtq9Y-Q5Pj2tBhtcppQyRoKAEVEIoB6wxlah6uaarsGsWK_pcKoVBIb8T748yDBbqZx63CTmgvOr0m2r0zaN_jX-igfjATOf'
                  : deal.propertyName?.includes('EcoTech')
                    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_xkVHcDH3y7exPj28hdIuiPrqK3NDhxOwYR9ckeNy-A-fAi5r1Fr2GeU2ib2sVfaehFIMycwzc1ue42Plox7MS6FaWAnMwyqRaksE0hUdPOhmdbnFA6DHV43FKQL1m9N3L7oDhL2r41xag75EXFFkpAaayQ7GW0FZn-_H3kYkNxPeyV4fIcLqf-Z1ZXB8un-xGYHzidOBuE9eNhd1YvWDlM0CaAfuuZcfPwUR5JeREVu2CO5meaDEkv8UQBo2rgEUSpkeZSZTAYy3'
                    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuArLDvLm5caoxsDw3-mZ5trlgHdcPPFnpBkCKLBvzLX5NXgs-xkucjtoKIOIsY4iciQpGbHaYask0yGxQ0kPpEDkcsGS-QOh5mCdFhG92Br5b8YJbe2wknR-cCvys6K3hzeDoQYabXHPCeZs3qvD7X0aD2tw_EfVHDI8aqj7_Az3bLYJww2Ba19CE3cJmtMWDJ3K5-xeI4GMhNeQBrbcag8rMSTc6NC1CP74rRR2eRbJQJHEnRT3irvo0u-Ln9bGg-la45SDC6tRyQL';
                
                return (
                  <article 
                    className="glass-card rounded-none overflow-hidden border border-pw-primary/40 hover:border-pw-primary transition-all duration-300 cursor-pointer shadow-[0_0_40px_rgba(87,241,219,0.1)]"
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <div className="flex flex-col lg:flex-row">
                      {/* Left Side: Image & Tags */}
                      <div className="lg:w-2/5 relative h-64 lg:h-auto overflow-hidden">
                        <img 
                          alt={deal.propertyName} 
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" 
                          src={imageSrc}
                        />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="bg-[#57f1db] text-[#003731] font-bold text-[10px] px-3 py-1 rounded-none uppercase tracking-wider">
                            Active Deal
                          </span>
                          <span className="bg-pw-glass-bg backdrop-blur-md text-pw-black font-bold text-[10px] px-3 py-1 rounded-none flex items-center gap-1 border border-pw-border">
                            <span className="material-symbols-outlined text-xs text-[#57f1db]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              verified
                            </span> 
                            Verified
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Information & Actions */}
                      <div className="lg:w-3/5 p-6 md:p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h2 className="text-2xl font-bold text-pw-black tracking-tight">{deal.propertyName}</h2>
                            <span 
                              className="material-symbols-outlined text-pw-muted cursor-pointer hover:text-pw-primary transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success('Added to bookmarks.');
                              }}
                            >
                              bookmark
                            </span>
                          </div>
                          <p className="text-xs text-pw-muted mb-6 flex items-center gap-1.5 font-semibold">
                            <span className="material-symbols-outlined text-pw-primary text-sm">explore</span> 
                            {deal.address} • {strategyName} Strategy
                          </p>
                          
                          {/* Progress */}
                          <div className="mb-8">
                            <div className="flex justify-between text-xs font-bold mb-2">
                              <span className="text-pw-muted">Funding Progress</span>
                              <span className="text-pw-primary font-bold">
                                {formatCurrency(raised)} <span className="text-pw-muted/60">/ {formatCurrency(target)}</span>
                              </span>
                            </div>
                            <div className="h-3 w-full bg-pw-glass-bg rounded-none overflow-hidden border border-pw-border">
                              <div 
                                className="h-full bg-pw-primary progress-fill transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="p-4 rounded-none bg-pw-glass-bg border border-pw-border">
                              <span className="block text-[10px] uppercase font-bold tracking-widest text-pw-muted/60 mb-1">Target IRR</span>
                              <span className="text-lg font-bold text-pw-primary">{irr}</span>
                            </div>
                            <div className="p-4 rounded-none bg-pw-glass-bg border border-pw-border">
                              <span className="block text-[10px] uppercase font-bold tracking-widest text-pw-muted/60 mb-1">Net ROI</span>
                              <span className="text-lg font-bold text-[#adc6ff]">{roi}</span>
                            </div>
                            <div className="p-4 rounded-none bg-pw-glass-bg border border-pw-border">
                              <span className="block text-[10px] uppercase font-bold tracking-widest text-pw-muted/60 mb-1">Equity Left</span>
                              <span className="text-lg font-bold text-pw-black">{formatCurrency(target - raised)}</span>
                            </div>
                          </div>
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDeal(deal);
                              setPledgeOpen(true);
                            }}
                            className="flex-1 pw-btn pw-btn--primary font-bold text-xs uppercase tracking-wider py-4 rounded-none flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                              bolt
                            </span>
                            Invest Now
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.success('Interest registered successfully.');
                            }}
                            className="flex-1 pw-btn pw-btn--outline hover:bg-pw-glass-bg text-pw-black font-bold text-xs uppercase tracking-wider py-4 rounded-none"
                          >
                            Express Interest
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()}

              {/* Standard Listing Cards (Remaining Deals) */}
              {filteredDeals.slice(1).map((deal) => {
                const { target, raised, pct, irr } = getRaiseMetrics(deal);
                const strategyName = deal.strategyType || (deal.propertyName?.includes('EcoTech') ? 'Core+' : deal.propertyName?.includes('Nexus') ? 'Value-Add' : 'Opportunistic');
                const imageSrc = deal.propertyName?.includes('Skyline')
                  ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdm9FjoA8XNQzTeTq1pOJVSJ9N5thSTHS5PXjkKQ72BUVQu01Z9gkRA2dJVTHPO8KG4UQjeM00-_3C_Oo_BXfXuHE8DC4VJu2StkFkJe5HfSBaXYVnTXuAeMxstCtxh0n0CJf6Elf6hCksJYYuXXSfkCApIwUDQfWD7q-aSP4EzPDVKtq9Y-Q5Pj2tBhtcppQyRoKAEVEIoB6wxlah6uaarsGsWK_pcKoVBIb8T748yDBbqZx63CTmgvOr0m2r0zaN_jX-igfjATOf'
                  : deal.propertyName?.includes('EcoTech')
                    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_xkVHcDH3y7exPj28hdIuiPrqK3NDhxOwYR9ckeNy-A-fAi5r1Fr2GeU2ib2sVfaehFIMycwzc1ue42Plox7MS6FaWAnMwyqRaksE0hUdPOhmdbnFA6DHV43FKQL1m9N3L7oDhL2r41xag75EXFFkpAaayQ7GW0FZn-_H3kYkNxPeyV4fIcLqf-Z1ZXB8un-xGYHzidOBuE9eNhd1YvWDlM0CaAfuuZcfPwUR5JeREVu2CO5meaDEkv8UQBo2rgEUSpkeZSZTAYy3'
                    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuArLDvLm5caoxsDw3-mZ5trlgHdcPPFnpBkCKLBvzLX5NXgs-xkucjtoKIOIsY4iciQpGbHaYask0yGxQ0kPpEDkcsGS-QOh5mCdFhG92Br5b8YJbe2wknR-cCvys6K3hzeDoQYabXHPCeZs3qvD7X0aD2tw_EfVHDI8aqj7_Az3bLYJww2Ba19CE3cJmtMWDJ3K5-xeI4GMhNeQBrbcag8rMSTc6NC1CP74rRR2eRbJQJHEnRT3irvo0u-Ln9bGg-la45SDC6tRyQL';
                
                return (
                  <article 
                    key={deal.id}
                    className="glass-card rounded-none overflow-hidden hover:border-pw-primary/30 border border-pw-border transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Left: Image */}
                      <div className="md:w-64 h-48 md:h-auto overflow-hidden relative">
                        <img 
                          alt={deal.propertyName} 
                          className="w-full h-full object-cover" 
                          src={imageSrc}
                        />
                        {deal.id.startsWith('mock-') && (
                          <div className="absolute top-3 left-3 bg-pw-glass-bg backdrop-blur-md px-2 py-0.5 rounded-none text-[8px] font-bold uppercase tracking-widest text-[#ffb875] border border-pw-border">
                            Sample
                          </div>
                        )}
                      </div>

                      {/* Right: Content */}
                      <div className="flex-grow p-6 flex flex-col justify-between">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                          <div>
                            <h3 className="text-base font-bold text-pw-black tracking-tight">{deal.propertyName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="bg-pw-glass-bg text-pw-muted font-bold text-[9px] px-2 py-0.5 rounded-none border border-pw-border uppercase">
                                {strategyName}
                              </span>
                              <span className="flex items-center gap-1 text-pw-muted/60 font-bold text-[9px] uppercase tracking-wider">
                                <span className="material-symbols-outlined text-xs text-pw-muted">verified_user</span> 
                                Verified Investor Only
                              </span>
                            </div>
                          </div>
                          <div className="text-left md:text-right">
                            <span className="block text-[9px] uppercase font-bold tracking-widest text-pw-muted/50">Available Equity</span>
                            <p className="text-sm font-bold text-pw-black mt-0.5">{formatCurrency(target - raised)}</p>
                          </div>
                        </div>

                        {/* Progress + Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                          <div className="md:col-span-2">
                            <div className="flex justify-between text-[10px] font-bold mb-1 text-pw-muted">
                              <span>Funding</span>
                              <span className="text-pw-primary">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-pw-glass-bg rounded-none overflow-hidden border border-pw-border">
                              <div className="h-full bg-pw-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <div className="text-left md:text-center">
                            <span className="block text-[9px] uppercase font-bold tracking-widest text-pw-muted/50">Target IRR</span>
                            <span className="text-sm font-bold text-pw-primary mt-0.5">{irr}</span>
                          </div>
                          <div className="flex justify-end">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDeal(deal);
                              }}
                              className="pw-interactive p-2 rounded-none border border-pw-border hover:bg-pw-primary/10 hover:text-pw-primary hover:border-pw-primary/30"
                            >
                              <span className="material-symbols-outlined text-base">chevron_right</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </>
          )}
        </div>
      ) : (
        /* ==================== VENDOR MARKETPLACE TAB ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Disclaimer Notice */}
          <div className="col-span-full mb-2">
            <div className="glass-card border-l-4 border-l-pw-primary p-4 flex items-start gap-4 rounded-none border border-pw-border">
              <span className="material-symbols-outlined text-pw-primary shrink-0">info</span>
              <p className="font-label-md text-xs text-pw-black leading-relaxed">
                <span className="text-pw-primary font-bold">DISCLAIMER:</span> PaperWorking does not vet vendors. Investors must perform their own due diligence prior to engagement.
              </p>
            </div>
          </div>

          {loadingVendors ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-pw-primary animate-spin" />
              <p className="text-xs uppercase font-bold tracking-widest text-pw-muted">Procuring professionals...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="col-span-full py-20 glass-card rounded-none flex flex-col items-center justify-center gap-4 border border-dashed border-pw-border text-center px-6 text-pw-black">
              <Building2 className="w-8 h-8 text-pw-muted opacity-20" />
              <p className="text-xs uppercase font-bold tracking-widest text-pw-muted">No verified professionals match your criteria.</p>
              <p className="text-xs text-pw-muted/60 max-w-sm">Try broadening your state search or adjusting specialties filters.</p>
            </div>
          ) : (
            filteredVendors.map((vendor) => {
              const { icon, badgeClass } = getVendorTypeDetails(vendor.type);
              const reviews = getReviewsCount(vendor.overallRating || 5.0, vendor.companyName);
              
              return (
                <div 
                  key={vendor.id}
                  className="glass-card p-6 rounded-none flex flex-col justify-between hover:border-pw-primary/40 transition-all duration-300 group border border-pw-border relative overflow-hidden"
                >
                  {/* Bookmark Icon */}
                  <div className="absolute top-0 right-0 p-4">
                    <span 
                      className="material-symbols-outlined text-pw-muted/40 group-hover:text-pw-primary transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(`Bookmarked ${vendor.companyName}.`);
                      }}
                    >
                      bookmark
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Top Row: Badge & Rating */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className={`h-12 w-12 rounded-none flex items-center justify-center border ${badgeClass}`}>
                          <span className="material-symbols-outlined text-2xl">{icon}</span>
                        </div>
                        
                        <div className="space-y-0.5">
                          <span className="inline-block text-[9px] uppercase tracking-widest font-bold text-pw-muted/60">
                            {vendor.type || 'Professional'}
                          </span>
                          {vendor.verified && (
                            <div className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-pw-muted/40 font-bold">
                              <span className="material-symbols-outlined text-[10px] text-pw-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                                verified_user
                              </span> 
                              Verified
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-pw-glass-bg px-2 py-0.5 rounded-none border border-pw-border">
                        <span className="material-symbols-outlined text-[#ffb875] text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                        <span className="text-[10px] font-bold text-pw-black">{vendor.overallRating || '5.0'}</span>
                        <span className="text-[8px] text-pw-muted/40 font-medium">({reviews})</span>
                      </div>
                    </div>

                    {/* Company Name + Bio */}
                    <div>
                      <h4 className="text-base font-bold text-pw-black uppercase tracking-tight group-hover:text-pw-primary transition-colors">
                        {vendor.companyName}
                      </h4>
                      <p className="text-xs text-pw-muted font-medium leading-relaxed mt-2 line-clamp-2">
                        {vendor.bio}
                      </p>
                    </div>

                    {/* Specialties Pills */}
                    <div className="flex flex-wrap gap-1">
                      {vendor.specialties?.slice(0, 3).map((spec, idx) => (
                        <span key={idx} className="bg-pw-glass-bg px-2 py-0.5 rounded-none text-[8px] uppercase tracking-wider font-bold text-pw-muted/70 border border-pw-border">
                          {spec}
                        </span>
                      ))}
                    </div>

                    {/* Metadata fields */}
                    <div className="pt-4 border-t border-pw-border space-y-2.5">
                      <div className="flex items-center gap-3 text-pw-muted/80">
                        <span className="material-symbols-outlined text-base text-pw-primary/70">location_on</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pw-black">
                          {vendor.licensingStates?.join(' / ') || 'TX / FL'} Jurisdiction
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-pw-muted/80">
                        <span className="material-symbols-outlined text-base text-pw-primary/70">schedule</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pw-black">
                          {vendor.avgTurnaroundDays || '3-5'} Days Turnaround
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-pw-muted/80">
                        <span className="material-symbols-outlined text-base text-pw-primary/70">payments</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pw-black">
                          {vendor.feeRangeLabel || 'Contact'} Fee
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom connect CTA & Profile Link */}
                  <div className="pt-6 border-t border-pw-border flex flex-col gap-3 mt-4">
                    <button 
                      onClick={() => handleRequestQuote(vendor)}
                      disabled={!hasActiveSub}
                      className={`w-full py-3 border text-xs font-bold uppercase tracking-wider rounded-none transition-all duration-200 active:scale-[0.98] ${
                        hasActiveSub 
                          ? 'border-pw-primary/30 text-pw-primary hover:bg-pw-primary hover:text-on-primary hover:border-transparent luminous-glow' 
                          : 'border-pw-border text-pw-muted/40 bg-pw-glass-bg opacity-40 cursor-not-allowed'
                      }`}
                    >
                      {!hasActiveSub ? 'Subscription Required' : getConnectButtonLabel(vendor.type)}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedVendor(vendor);
                        toast.success(`Opening profile for ${vendor.companyName} (Simulated)`);
                      }}
                      className="text-center font-bold text-[9px] uppercase tracking-widest text-pw-muted hover:text-pw-black transition-colors"
                    >
                      View Full Profile
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Selected Deal Detail Drawer ── */}
      {selectedDeal && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDeal(null)}
          />
          {/* Drawer content */}
          <div className="fixed top-0 right-0 h-full w-full max-w-xl z-50 bg-[#0c1317] border-l border-white/10 shadow-2xl p-8 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div>
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="bg-[#141d23] px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-[#57f1db] border border-[#57f1db]/20 w-fit mb-2">
                    {selectedDeal.assetClass || 'Asset'}
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{selectedDeal.propertyName}</h3>
                  <p className="text-xs text-[#bacac5]/60 mt-1">{selectedDeal.address}</p>
                </div>
                <button 
                  onClick={() => setSelectedDeal(null)}
                  className="p-2 hover:bg-white/5 transition-colors rounded-xl text-[#bacac5] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Summary */}
              {(() => {
                const { target, raised, pct, daysLeft, irr } = getRaiseMetrics(selectedDeal);
                return (
                  <div className="glass-card p-6 rounded-2xl border border-white/10 mb-8 space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-[#bacac5]/60 uppercase tracking-wider">Raise Goal</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(target)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#bacac5]/60 uppercase tracking-wider">Committed</p>
                        <p className="text-2xl font-bold text-[#57f1db]">{formatCurrency(raised)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#57f1db]">{pct}% Funded</span>
                        <span className="text-[#bacac5]/60">{daysLeft} Days Remaining</span>
                      </div>
                      <div className="health-band">
                        <div 
                          className="health-band-fill health-band-positive"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Financial Matrix */}
              <div className="space-y-4 mb-8">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#bacac5]/40 mb-2">Underwriting Parameters</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#141d23]/40 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-[#bacac5]/60 uppercase tracking-wider">Purchase Price</p>
                    <p className="text-sm font-bold text-white mt-1">
                      {selectedDeal.financials?.purchasePrice ? formatCurrency(selectedDeal.financials.purchasePrice) : '--'}
                    </p>
                  </div>
                  <div className="bg-[#141d23]/40 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-[#bacac5]/60 uppercase tracking-wider">Projected Rehab</p>
                    <p className="text-sm font-bold text-white mt-1">
                      {selectedDeal.financials?.projectedRehabCost ? formatCurrency(selectedDeal.financials.projectedRehabCost) : '--'}
                    </p>
                  </div>
                  <div className="bg-[#141d23]/40 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-[#bacac5]/60 uppercase tracking-wider">Estimated ARV</p>
                    <p className="text-sm font-bold text-white mt-1">
                      {selectedDeal.financials?.estimatedARV ? formatCurrency(selectedDeal.financials.estimatedARV) : '--'}
                    </p>
                  </div>
                  <div className="bg-[#141d23]/40 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-[#bacac5]/60 uppercase tracking-wider">Timeline</p>
                    <p className="text-sm font-bold text-white mt-1">
                      {selectedDeal.financials?.estimatedTimelineDays || 180} Days
                    </p>
                  </div>
                </div>
              </div>

              {/* Syndicate Stack */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#bacac5]/40 mb-2">Confirmed Syndicate Pledges</h4>
                
                <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 bg-[#141d23]/20">
                  {selectedDeal.fractionalInvestors && selectedDeal.fractionalInvestors.length > 0 ? (
                    selectedDeal.fractionalInvestors.map((inv) => (
                      <div key={inv.id} className="flex justify-between items-center p-4">
                        <div>
                          <p className="text-xs font-bold text-white">{inv.name}</p>
                          <p className="text-[10px] text-[#bacac5]/40 mt-0.5">{inv.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#57f1db]">{formatCurrency(inv.contributionAmount)}</p>
                          <p className="text-[9px] text-[#bacac5]/60 font-bold uppercase tracking-widest mt-0.5">{inv.equityPercentage}% Equity</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-[#bacac5]/40 uppercase tracking-widest">
                      No external pledges registered yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Invest CTA */}
            <div className="pt-6 border-t border-white/10 mt-8 flex gap-4">
              <button 
                onClick={() => setPledgeOpen(true)}
                className="flex-1 bg-[#57f1db] text-[#003731] py-4 rounded-xl text-xs font-bold uppercase tracking-wider luminous-button hover:opacity-95 transition-all"
              >
                Pledge Investment Capital
              </button>
              <button 
                onClick={() => setSelectedDeal(null)}
                className="px-6 py-4 border border-white/10 text-xs font-bold uppercase tracking-wider text-[#bacac5] rounded-xl hover:bg-white/5 transition-all"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Pledge Investment Modal ── */}
      {pledgeOpen && selectedDeal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div 
            className="w-full max-w-md bg-[#0c1317] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6 animate-in scale-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white">
                  Pledge Capital
                </h3>
                <p className="text-[10px] text-[#bacac5]/60 uppercase tracking-widest mt-1">
                  Investing in: {selectedDeal.propertyName}
                </p>
              </div>
              <button onClick={() => setPledgeOpen(false)} className="opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <form onSubmit={handlePledge} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#bacac5]">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={pledgeName}
                  onChange={e => setPledgeName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 bg-[#141d23] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#57f1db] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#bacac5]">Your Email Address</label>
                <input
                  type="email"
                  required
                  value={pledgeEmail}
                  onChange={e => setPledgeEmail(e.target.value)}
                  placeholder="e.g. john@doe.com"
                  className="w-full px-4 py-3 bg-[#141d23] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#57f1db] transition-colors"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#bacac5]">Pledge Amount ($ USD)</label>
                <input
                  type="text"
                  required
                  value={pledgeAmount}
                  onChange={e => setPledgeAmount(e.target.value)}
                  placeholder="e.g. 50,000"
                  className="w-full px-4 py-3 bg-[#141d23] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#57f1db] transition-colors font-bold text-[#57f1db]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setPledgeOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] border border-white/10 text-[#bacac5] hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPledge}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] bg-[#57f1db] text-[#003731] transition-opacity hover:opacity-90 shadow-sm flex items-center gap-1.5"
                >
                  {isSubmittingPledge ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Confirm Pledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Vendor Directory Quote Request Modal ── */}
      <VendorRequestModal 
        isOpen={isQuoteModalOpen}
        onClose={() => {
          setIsQuoteModalOpen(false);
          setSelectedVendor(null);
        }}
        vendor={selectedVendor}
      />
    </div>
  );
}

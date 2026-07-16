'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { projectsService } from '@/lib/firebase/projects';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import type { Project, RoleLinkedDocument, DocumentCategory, ProjectRole } from '@/types/schema';
import { 
  Building, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Upload, 
  Check, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface RetrospectiveWorkspaceProps {
  project: Project;
  refresh: () => Promise<void>;
}

export function RetrospectiveWorkspace({ project, refresh }: RetrospectiveWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'tier1' | 'tier2' | 'tier3'>('tier1');
  const [saving, setSaving] = useState(false);

  // Form State
  const [addressLine, setAddressLine] = useState(project.address || '');
  const [purchasePrice, setPurchasePrice] = useState<string>(
    String(project.financials?.purchasePrice ?? '')
  );
  const [acquisitionDate, setAcquisitionDate] = useState<string>(
    project.financials?.acquisitionDate ? String(project.financials.acquisitionDate).split('T')[0] : ''
  );
  const [financingType, setFinancingType] = useState<'Financed' | 'All Cash'>(
    (project.financials?.financingType as 'Financed' | 'All Cash') || 'All Cash'
  );
  const [loanAmount, setLoanAmount] = useState<string>(
    String(project.financials?.loanAmount ?? '')
  );
  const [loanInterestRate, setLoanInterestRate] = useState<string>(
    String(project.financials?.loanInterestRate ?? '')
  );
  const [loanTermYears, setLoanTermYears] = useState<string>(
    String(project.financials?.loanTermYears ?? '30')
  );
  const [rehabBudget, setRehabBudget] = useState<string>(
    String(project.financials?.projectedRehabCost ?? '')
  );
  const [totalCashInvested, setTotalCashInvested] = useState<string>(
    String(project.financials?.totalCashInvested ?? '')
  );

  // Exit Values
  const [actualSalePrice, setActualSalePrice] = useState<string>(
    String(project.financials?.actualSalePrice ?? '')
  );
  const [soldDate, setSoldDate] = useState<string>(
    project.financials?.soldDate ? String(project.financials.soldDate).split('T')[0] : ''
  );
  const [monthlyGrossRent, setMonthlyGrossRent] = useState<string>(
    String(project.financials?.gross_rent_per_unit ?? '')
  );
  const [leaseStartDate, setLeaseStartDate] = useState<string>(
    project.financials?.leaseStartDate ? String(project.financials.leaseStartDate).split('T')[0] : ''
  );

  // Tier 2: Expenses & Carry Costs
  const [tax, setTax] = useState<string>(String(project.financials?.tax ?? ''));
  const [insurance, setInsurance] = useState<string>(String(project.financials?.insurance ?? ''));
  const [utilities, setUtilities] = useState<string>(String(project.financials?.utilities ?? ''));
  const [managementPct, setManagementPct] = useState<string>(
    String(project.financials?.management_pct ?? '')
  );
  const [hoa, setHoa] = useState<string>(String(project.financials?.HOA ?? ''));
  const [otherIncome, setOtherIncome] = useState<string>(
    String(project.financials?.other_income ?? '')
  );

  // Tier 3: Documents
  const [documents, setDocuments] = useState<RoleLinkedDocument[]>(
    project.roleLinkedDocuments || []
  );
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('Final Settlement Statement');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('Closing Agent');

  // Sync state when project updates
  useEffect(() => {
    if (project) {
      setAddressLine(project.address || '');
      setPurchasePrice(String(project.financials?.purchasePrice ?? ''));
      setAcquisitionDate(
        project.financials?.acquisitionDate ? String(project.financials.acquisitionDate).split('T')[0] : ''
      );
      setFinancingType((project.financials?.financingType as 'Financed' | 'All Cash') || 'All Cash');
      setLoanAmount(String(project.financials?.loanAmount ?? ''));
      setLoanInterestRate(String(project.financials?.loanInterestRate ?? ''));
      setLoanTermYears(String(project.financials?.loanTermYears ?? '30'));
      setRehabBudget(String(project.financials?.projectedRehabCost ?? ''));
      setTotalCashInvested(String(project.financials?.totalCashInvested ?? ''));
      
      setActualSalePrice(String(project.financials?.actualSalePrice ?? ''));
      setSoldDate(project.financials?.soldDate ? String(project.financials.soldDate).split('T')[0] : '');
      setMonthlyGrossRent(String(project.financials?.gross_rent_per_unit ?? ''));
      setLeaseStartDate(
        project.financials?.leaseStartDate ? String(project.financials.leaseStartDate).split('T')[0] : ''
      );

      setTax(String(project.financials?.tax ?? ''));
      setInsurance(String(project.financials?.insurance ?? ''));
      setUtilities(String(project.financials?.utilities ?? ''));
      setManagementPct(String(project.financials?.management_pct ?? ''));
      setHoa(String(project.financials?.HOA ?? ''));
      setOtherIncome(String(project.financials?.other_income ?? ''));
      setDocuments(project.roleLinkedDocuments || []);
    }
  }, [project]);

  // Compute live metrics
  const computedFinancials = {
    ...project.financials,
    purchasePrice: Number(purchasePrice) || 0,
    loanAmount: Number(loanAmount) || 0,
    loanInterestRate: Number(loanInterestRate) || 0,
    loanTermYears: Number(loanTermYears) || 30,
    projectedRehabCost: Number(rehabBudget) || 0,
    totalCashInvested: Number(totalCashInvested) || 0,
    financingType,
    tax: Number(tax) || 0,
    insurance: Number(insurance) || 0,
    utilities: Number(utilities) || 0,
    management_pct: Number(managementPct) || 0,
    HOA: Number(hoa) || 0,
    other_income: Number(otherIncome) || 0,
    gross_rent_per_unit: Number(monthlyGrossRent) || 0,
    actualRentalIncome: Number(monthlyGrossRent) || 0,
    actualSalePrice: Number(actualSalePrice) || 0,
    soldDate: soldDate ? new Date(soldDate) : undefined,
    acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined,
  };

  const metrics = deriveAllMetrics(computedFinancials as any, undefined, project.dispositionType, 4);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedFinancials = {
        ...project.financials,
        purchasePrice: Number(purchasePrice) || 0,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined,
        financingType,
        loanAmount: Number(loanAmount) || 0,
        loanInterestRate: Number(loanInterestRate) || 0,
        loanTermYears: Number(loanTermYears) || 30,
        projectedRehabCost: Number(rehabBudget) || 0,
        totalCashInvested: Number(totalCashInvested) || 0,
        actualSalePrice: Number(actualSalePrice) || 0,
        soldDate: soldDate ? new Date(soldDate) : undefined,
        gross_rent_per_unit: Number(monthlyGrossRent) || 0,
        actualRentalIncome: Number(monthlyGrossRent) || 0,
        leaseStartDate: leaseStartDate ? new Date(leaseStartDate) : undefined,
        tax: Number(tax) || 0,
        insurance: Number(insurance) || 0,
        utilities: Number(utilities) || 0,
        management_pct: Number(managementPct) || 0,
        HOA: Number(hoa) || 0,
        other_income: Number(otherIncome) || 0,
      };

      await projectsService.updateProject(project.id, {
        address: addressLine,
        financials: updatedFinancials as any,
        roleLinkedDocuments: documents,
        status: project.dispositionType === 'SALE' ? 'Sold' : 'Rented',
        phaseStatus: 'Phase 4: Exit',
        currentPhase: 4,
      });

      // Sync to Postgres via Neon API Route
      const res = await fetch(`/api/reil/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressLine,
          dispositionType: project.dispositionType,
          entryStage: project.entryStage,
          retrospective: true,
          currentPhase: 4,
        }),
      });

      if (!res.ok) {
        throw new Error('Postgres sync failed');
      }

      toast.success('Retrospective deal updated successfully');
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save historic details');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentSimulate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setTimeout(() => {
      const newDoc: RoleLinkedDocument = {
        id: crypto.randomUUID(),
        category: selectedCategory,
        fileName: file.name,
        fileUrl: `/mock/uploads/${file.name}`,
        linkedRole: selectedRole,
        verified: true,
        verifiedAt: new Date(),
        uploadedAt: new Date(),
        fileSize: file.size,
        notes: '',
      };

      const updatedDocs = [...documents, newDoc];
      setDocuments(updatedDocs);
      setUploading(false);
      toast.success(`${file.name} archived to Data Room`);
    }, 1200);
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
    toast.success('Document removed from Data Room');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-full">
      {/* Left panel - Tier form steps */}
      <div className="flex-1 flex flex-col gap-6 max-w-4xl">
        <div className="flex flex-col gap-2 p-5 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-ui)' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500 text-[26px]">history</span>
            <h3 className="text-lg font-bold text-shadow-sm" style={{ color: 'rgba(253,255,252,0.95)' }}>
              Retrospective Deal Entry Mode
            </h3>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(253,255,252,0.45)' }}>
            This deal is already completed. Backfill historical records below to populate portfolio KPIs.
          </p>
        </div>

        {/* Form tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border-ui)' }}>
          {(['tier1', 'tier2', 'tier3'] as const).map((tab) => {
            const active = activeTab === tab;
            const labels = {
              tier1: 'Tier 1: Core Details',
              tier2: 'Tier 2: Carrying Costs',
              tier3: 'Tier 3: Document Vault',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all"
                style={{
                  borderColor: active ? '#F59E0B' : 'transparent',
                  color: active ? '#F59E0B' : 'rgba(253,255,252,0.4)',
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1">
          {activeTab === 'tier1' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Address</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Purchase Price ($)</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Acquisition Date</label>
                <input
                  type="date"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Disposition Type</label>
                <input
                  type="text"
                  value={project.dispositionType || 'RENT'}
                  disabled
                  className="p-3 rounded-xl border text-sm focus:outline-none opacity-60 cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              {project.dispositionType === 'SALE' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Actual Sale Price ($)</label>
                    <input
                      type="number"
                      value={actualSalePrice}
                      onChange={(e) => setActualSalePrice(e.target.value)}
                      className="p-3 rounded-xl border text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Sold Date</label>
                    <input
                      type="date"
                      value={soldDate}
                      onChange={(e) => setSoldDate(e.target.value)}
                      className="p-3 rounded-xl border text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Monthly Gross Rent ($)</label>
                    <input
                      type="number"
                      value={monthlyGrossRent}
                      onChange={(e) => setMonthlyGrossRent(e.target.value)}
                      className="p-3 rounded-xl border text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Lease Start Date</label>
                    <input
                      type="date"
                      value={leaseStartDate}
                      onChange={(e) => setLeaseStartDate(e.target.value)}
                      className="p-3 rounded-xl border text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Rehab Budget ($)</label>
                <input
                  type="number"
                  value={rehabBudget}
                  onChange={(e) => setRehabBudget(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Total Cash Invested ($)</label>
                <input
                  type="number"
                  value={totalCashInvested}
                  onChange={(e) => setTotalCashInvested(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Financing Type</label>
                <select
                  value={financingType}
                  onChange={(e) => setFinancingType(e.target.value as 'Financed' | 'All Cash')}
                  className="p-3 rounded-xl border text-sm focus:outline-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                >
                  <option value="All Cash">All Cash</option>
                  <option value="Financed">Financed</option>
                </select>
              </div>

              {financingType === 'Financed' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Loan Amount ($)</label>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="p-3 rounded-xl border text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Loan Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={loanInterestRate}
                      onChange={(e) => setLoanInterestRate(e.target.value)}
                      className="p-3 rounded-xl border text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Loan Term (Years)</label>
                    <input
                      type="number"
                      value={loanTermYears}
                      onChange={(e) => setLoanTermYears(e.target.value)}
                      className="p-3 rounded-xl border text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'tier2' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Monthly Tax ($)</label>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Monthly Insurance ($)</label>
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Monthly Utilities ($)</label>
                <input
                  type="number"
                  value={utilities}
                  onChange={(e) => setUtilities(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Property Management Fee (%)</label>
                <input
                  type="number"
                  value={managementPct}
                  onChange={(e) => setManagementPct(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Monthly HOA ($)</label>
                <input
                  type="number"
                  value={hoa}
                  onChange={(e) => setHoa(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>Other Monthly Income ($)</label>
                <input
                  type="number"
                  value={otherIncome}
                  onChange={(e) => setOtherIncome(e.target.value)}
                  className="p-3 rounded-xl border text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'tier3' && (
            <div className="flex flex-col gap-5">
              {/* Document upload triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-ui)' }}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Document Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                    className="p-3 rounded-xl border text-sm focus:outline-none cursor-pointer"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                  >
                    <option value="Final Settlement Statement">Final Settlement Statement (HUD-1)</option>
                    <option value="Deed">Deed</option>
                    <option value="Closing Disclosure">Closing Disclosure</option>
                    <option value="Insurance Binder">Insurance Binder</option>
                    <option value="Appraisal Report">Appraisal Report</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Linked Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                    className="p-3 rounded-xl border text-sm focus:outline-none cursor-pointer"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)', color: '#FDFFFC' }}
                  >
                    <option value="Closing Agent">Closing Agent</option>
                    <option value="Title Company/Escrow Officer">Title Company/Escrow Officer</option>
                    <option value="Real Estate Attorney">Real Estate Attorney</option>
                    <option value="Loan Officer/Broker">Loan Officer/Broker</option>
                  </select>
                </div>

                <div className="md:col-span-2 pt-2">
                  <label
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-all duration-150"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-text-secondary mb-2" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.8)' }}>
                      {uploading ? 'Archiving file...' : 'Select document file'}
                    </span>
                    <input type="file" onChange={handleDocumentSimulate} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              {/* Document list */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.6)' }}>
                  Data Room Documents ({documents.length})
                </h4>
                {documents.length === 0 ? (
                  <div className="p-6 text-center text-xs" style={{ color: 'rgba(253,255,252,0.3)' }}>
                    No files archived yet. Select files above to upload them.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border"
                        style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-ui)' }}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-amber-500" />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-shadow-sm" style={{ color: 'rgba(253,255,252,0.9)' }}>
                              {doc.fileName}
                            </span>
                            <span className="text-[10px]" style={{ color: 'rgba(253,255,252,0.4)' }}>
                              {doc.category} · Assigned to {doc.linkedRole}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[10px] uppercase font-black text-pw-success px-2 py-0.5 rounded bg-pw-success-container">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Archived
                          </span>
                          <button
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-xs font-bold text-red-500 hover:underline px-2 py-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: 'var(--border-ui)' }}>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/5 transition-all"
            style={{ color: 'rgba(253,255,252,0.6)' }}
          >
            Back to Projects
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: '#F59E0B',
                color: '#0d0a0b',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel - Real-time metrics card & Navigation */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-6">
        <div className="p-5 rounded-2xl border flex flex-col gap-5" style={{ background: 'rgba(69,73,85,0.1)', borderColor: 'var(--border-ui)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.95)' }}>
              Realized Performance
            </h4>
          </div>

          <div className="flex flex-col gap-3.5">
            {project.dispositionType === 'SALE' ? (
              <>
                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-ui)' }}>
                  <span className="text-xs" style={{ color: 'rgba(253,255,252,0.5)' }}>Net Profit</span>
                  <span className="font-mono text-sm font-bold" style={{ color: '#FDFFFC' }}>
                    ${(metrics.noiComponents?.noi ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-ui)' }}>
                  <span className="text-xs" style={{ color: 'rgba(253,255,252,0.5)' }}>ROI</span>
                  <span className="font-mono text-sm font-bold" style={{ color: metrics.cashOnCashReturn >= 0 ? '#10B981' : '#EF4444' }}>
                    {metrics.cashOnCashReturn.toFixed(2)}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-ui)' }}>
                  <span className="text-xs" style={{ color: 'rgba(253,255,252,0.5)' }}>Net Operating Income</span>
                  <span className="font-mono text-sm font-bold" style={{ color: '#FDFFFC' }}>
                    ${(metrics.noi ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-ui)' }}>
                  <span className="text-xs" style={{ color: 'rgba(253,255,252,0.5)' }}>Cap Rate</span>
                  <span className="font-mono text-sm font-bold" style={{ color: '#FDFFFC' }}>
                    {metrics.capRate.toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-ui)' }}>
                  <span className="text-xs" style={{ color: 'rgba(253,255,252,0.5)' }}>Annual Cash Flow</span>
                  <span className="font-mono text-sm font-bold" style={{ color: '#FDFFFC' }}>
                    ${(metrics.annualCashFlow ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-ui)' }}>
                  <span className="text-xs" style={{ color: 'rgba(253,255,252,0.5)' }}>Debt Service (DSCR)</span>
                  <span className="font-mono text-sm font-bold" style={{ color: metrics.dscr >= 1.25 ? '#10B981' : '#F59E0B' }}>
                    {metrics.dscr.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-ui)' }}>
                  <span className="text-xs" style={{ color: 'rgba(253,255,252,0.5)' }}>Cash-on-Cash Return</span>
                  <span className="font-mono text-sm font-bold" style={{ color: metrics.cashOnCashReturn >= 0 ? '#10B981' : '#EF4444' }}>
                    {metrics.cashOnCashReturn.toFixed(2)}%
                  </span>
                </div>
              </>
            )}
          </div>
          
          <div className="p-3.5 rounded-xl flex items-start gap-2.5" style={{ background: 'rgba(245,158,11,0.06)' }}>
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(253,255,252,0.6)' }}>
              Metrics are derived dynamically using the CCIM core calculations based on input values.
            </p>
          </div>
        </div>

        {/* Action card for insights */}
        <div className="p-5 rounded-2xl border flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-ui)' }}>
          <div className="flex flex-col gap-1">
            <h5 className="text-xs font-black uppercase tracking-wider" style={{ color: 'rgba(253,255,252,0.8)' }}>
              Deep Portfolio Analytics
            </h5>
            <p className="text-[11px]" style={{ color: 'rgba(253,255,252,0.45)' }}>
              See how this property stacks up against other active and historical deals in your portfolio.
            </p>
          </div>
          
          <button
            onClick={() => {
              startTransition(() => {
                router.push('/dashboard/insights');
              });
            }}
            disabled={isPending}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:bg-white/10 active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#FDFFFC',
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            ) : (
              <>
                Go to Portfolio Insights
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

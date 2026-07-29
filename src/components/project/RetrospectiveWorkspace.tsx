'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { projectsService } from '@/lib/firebase/projects';
import { uploadFile } from '@/lib/storage/uploadService';
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
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface RetrospectiveWorkspaceProps {
  project: Project;
  refresh: () => Promise<void>;
}

interface ConfettiPiece {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
}

const CONFETTI_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `confetti-${i}-${Math.random()}`,
    x: Math.random() * 100,
    y: Math.random() * -20 - 10,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: Math.random() * 8 + 6,
    delay: Math.random() * 1.5,
    duration: Math.random() * 2 + 2,
  }));
}

export function RetrospectiveWorkspace({ project, refresh }: RetrospectiveWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  // ── Form State ──────────────────────────────────────────────────────────
  const [addressLine, setAddressLine] = useState(project.address || '');
  
  // Step 1: Purchase Details
  const [purchasePrice, setPurchasePrice] = useState<string>(
    String(project.financials?.purchasePrice ?? '')
  );
  const [acquisitionDate, setAcquisitionDate] = useState<string>(
    project.financials?.acquisitionDate ? String(project.financials.acquisitionDate).split('T')[0] : ''
  );

  // Step 2: Renovation Costs
  const [rehabBudget, setRehabBudget] = useState<string>(
    String(project.financials?.projectedRehabCost ?? '')
  );

  // Step 3: Financing Details
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
  const [totalCashInvested, setTotalCashInvested] = useState<string>(
    String(project.financials?.totalCashInvested ?? '')
  );

  // Step 4: Carrying Costs & Exit Performance
  // Rental path
  const [monthlyGrossRent, setMonthlyGrossRent] = useState<string>(
    String(project.financials?.gross_rent_per_unit ?? '')
  );
  const [leaseStartDate, setLeaseStartDate] = useState<string>(
    project.financials?.leaseStartDate ? String(project.financials.leaseStartDate).split('T')[0] : ''
  );
  // Sale path
  const [actualSalePrice, setActualSalePrice] = useState<string>(
    String(project.financials?.actualSalePrice ?? '')
  );
  const [soldDate, setSoldDate] = useState<string>(
    project.financials?.soldDate ? String(project.financials.soldDate).split('T')[0] : ''
  );

  // Canonical carry categories
  const [tax, setTax] = useState<string>(String(project.financials?.tax ?? ''));
  const [insurance, setInsurance] = useState<string>(String(project.financials?.insurance ?? ''));
  const [security, setSecurity] = useState<string>(String(project.financials?.security ?? ''));
  const [maintenance, setMaintenance] = useState<string>(String(project.financials?.maintenance ?? ''));
  const [utilities, setUtilities] = useState<string>(String(project.financials?.utilities ?? ''));
  const [managementPct, setManagementPct] = useState<string>(
    String(project.financials?.management_pct ?? '')
  );
  const [hoa, setHoa] = useState<string>(String(project.financials?.HOA ?? ''));
  const [capex, setCapex] = useState<string>(String(project.financials?.capex ?? ''));
  const [otherIncome, setOtherIncome] = useState<string>(
    String(project.financials?.other_income ?? '')
  );

  // Step 5: Documents Archiving
  const [documents, setDocuments] = useState<RoleLinkedDocument[]>(
    project.roleLinkedDocuments || []
  );
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('Final Settlement Statement');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('Closing Agent');

  // Sync state when project changes
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
      setSecurity(String(project.financials?.security ?? ''));
      setMaintenance(String(project.financials?.maintenance ?? ''));
      setUtilities(String(project.financials?.utilities ?? ''));
      setManagementPct(String(project.financials?.management_pct ?? ''));
      setHoa(String(project.financials?.HOA ?? ''));
      setCapex(String(project.financials?.capex ?? ''));
      setOtherIncome(String(project.financials?.other_income ?? ''));
      setDocuments(project.roleLinkedDocuments || []);
    }
  }, [project]);

  // Derive display metrics live
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
    security: Number(security) || 0,
    maintenance: Number(maintenance) || 0,
    utilities: Number(utilities) || 0,
    management_pct: Number(managementPct) || 0,
    HOA: Number(hoa) || 0,
    capex: Number(capex) || 0,
    other_income: Number(otherIncome) || 0,
    gross_rent_per_unit: Number(monthlyGrossRent) || 0,
    actualRentalIncome: Number(monthlyGrossRent) || 0,
    actualSalePrice: Number(actualSalePrice) || 0,
    soldDate: soldDate ? new Date(soldDate) : undefined,
    acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined,
  };

  const metrics = deriveAllMetrics(computedFinancials as any, undefined, project.dispositionType, 4);

  // Auto-fill totalCashInvested if financing matches conventional formulas
  useEffect(() => {
    if (financingType === 'All Cash') {
      const allInCash = (Number(purchasePrice) || 0) + (Number(rehabBudget) || 0);
      setTotalCashInvested(String(allInCash));
    } else {
      const downPayment = Math.max(0, (Number(purchasePrice) || 0) - (Number(loanAmount) || 0));
      const allInCash = downPayment + (Number(rehabBudget) || 0);
      setTotalCashInvested(String(allInCash));
    }
  }, [purchasePrice, rehabBudget, financingType, loanAmount]);

  const handleNext = () => {
    // Basic step validation
    if (step === 1) {
      if (!addressLine) {
        toast.error('Address is required');
        return;
      }
      if (!purchasePrice || Number(purchasePrice) <= 0) {
        toast.error('Valid Purchase Price is required');
        return;
      }
      if (!acquisitionDate) {
        toast.error('Acquisition Date is required');
        return;
      }
    }
    if (step === 2) {
      if (rehabBudget === '') {
        toast.error('Rehab budget value is required (enter 0 if none)');
        return;
      }
    }
    if (step === 3 && financingType === 'Financed') {
      if (!loanAmount || Number(loanAmount) <= 0) {
        toast.error('Loan Amount is required');
        return;
      }
    }
    if (step === 4) {
      if (project.dispositionType === 'SALE') {
        if (!actualSalePrice || Number(actualSalePrice) <= 0) {
          toast.error('Actual Sale Price is required');
          return;
        }
        if (!soldDate) {
          toast.error('Sold Date is required');
          return;
        }
      } else {
        if (!monthlyGrossRent || Number(monthlyGrossRent) <= 0) {
          toast.error('Monthly Gross Rent is required');
          return;
        }
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

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
        security: Number(security) || 0,
        maintenance: Number(maintenance) || 0,
        utilities: Number(utilities) || 0,
        management_pct: Number(managementPct) || 0,
        HOA: Number(hoa) || 0,
        capex: Number(capex) || 0,
        other_income: Number(otherIncome) || 0,
        retrospectiveCompleted: true,
      };

      await projectsService.updateProject(project.id, {
        address: addressLine,
        financials: updatedFinancials as any,
        roleLinkedDocuments: documents,
        status: 'exit',
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

      // Celebrate success!
      setConfetti(generateConfetti(80));
      toast.success('Retrospective deal updated successfully!');
      
      setTimeout(() => {
        setConfetti([]);
        router.refresh();
      }, 4000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save historic details');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentSimulate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading(`Uploading and archiving ${file.name}...`);
    try {
      const res = await uploadFile({
        file,
        path: 'historical_exit_docs',
        projectId: project.id,
      });

      const newDoc: RoleLinkedDocument = {
        id: crypto.randomUUID(),
        category: selectedCategory,
        fileName: file.name,
        fileUrl: res.downloadUrl,
        linkedRole: selectedRole,
        verified: false,
        uploadedAt: new Date(),
        fileSize: file.size,
        notes: '',
      };

      const updatedDocs = [...documents, newDoc];
      setDocuments(updatedDocs);
      toast.success(`${file.name} uploaded to Project Files (pending review)`, { id: toastId });
    } catch (err: any) {
      console.error('[Document Upload] Failed:', err);
      toast.error(`Upload failed: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
    toast.success('Document removed from Project Files');
  };

  const currentPercent = (step / 5) * 100;
  const isSale = project.dispositionType === 'SALE';

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-full bg-[#0d0a0b] text-[#FDFFFC] relative overflow-hidden">
      
      {/* Confetti Animation Layer */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {confetti.map((c) => (
            <div
              key={c.id}
              className="absolute rounded-full"
              style={{
                left: `${c.x}%`,
                top: `${c.y}px`,
                backgroundColor: c.color,
                width: `${c.size}px`,
                height: `${c.size}px`,
                opacity: 0.8,
                animation: `confetti-fall ${c.duration}s ${c.delay}s linear forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* Styled inline animations */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Left panel - Tier form steps */}
      <div className="flex-1 flex flex-col gap-6 max-w-4xl">
        <div className="flex flex-col gap-2 p-6 rounded-2xl border bg-white/[0.01] border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-500 w-6 h-6 animate-pulse" />
            <h3 className="text-lg font-bold tracking-wide">
              Retrospective Deal Entry Mode
            </h3>
          </div>
          <p className="text-xs text-[#9E9DA0] leading-relaxed">
            Skip the project lifecycle pipeline. Enter core historical figures directly to register the asset baseline, carrying costs, and finalize realized metrics.
          </p>
        </div>

        {/* Progress Stepper Bar */}
        <div className="flex flex-col gap-2 p-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
            <span>Step {step} of 5: {
              step === 1 ? 'Purchase Details' :
              step === 2 ? 'Renovation' :
              step === 3 ? 'Financing' :
              step === 4 ? (isSale ? 'Sale Performance' : 'Rental Income & Carry') :
              'Archiving Vault'
            }</span>
            <span>{Math.round(currentPercent)}% Completed</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#F59E0B] rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              style={{ width: `${currentPercent}%` }}
            />
          </div>
        </div>

        {/* Dynamic Card Container */}
        <div className="flex-1 bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between gap-8 min-h-[420px]">
          
          {/* STEP 1: Purchase Price & Date */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-md font-bold uppercase tracking-wider text-amber-500">1. Purchase Price & Date</h4>
                <p className="text-xs text-[#9E9DA0]">Confirm the initial acquisition details of the property.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Property Address</label>
                  <input
                    type="text"
                    value={addressLine}
                    placeholder="e.g. 123 Main St, New York, NY"
                    onChange={(e) => setAddressLine(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Purchase Price ($)</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    placeholder="e.g. 250000"
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Acquisition Date</label>
                  <input
                    type="date"
                    value={acquisitionDate}
                    onChange={(e) => setAcquisitionDate(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Renovation Costs */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-md font-bold uppercase tracking-wider text-amber-500">2. Renovation Costs</h4>
                <p className="text-xs text-[#9E9DA0]">Enter the total capital improvements spent on rehab and refurbishing.</p>
              </div>

              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Total Rehab Spend ($)</label>
                <input
                  type="number"
                  value={rehabBudget}
                  placeholder="e.g. 35000 (Enter 0 if none)"
                  onChange={(e) => setRehabBudget(e.target.value)}
                  className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Financing Facts */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-md font-bold uppercase tracking-wider text-amber-500">3. Financing Facts</h4>
                <p className="text-xs text-[#9E9DA0]">Specify leverage settings. If cash purchase, down payment calculation defaults to 100% all-in basis.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Leverage Method</label>
                  <select
                    value={financingType}
                    onChange={(e) => setFinancingType(e.target.value as 'Financed' | 'All Cash')}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 cursor-pointer transition-colors"
                  >
                    <option value="All Cash">All Cash / Equity Purchase</option>
                    <option value="Financed">Mortgage / Debt Financed</option>
                  </select>
                </div>

                {financingType === 'Financed' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Loan Amount ($)</label>
                      <input
                        type="number"
                        value={loanAmount}
                        placeholder="e.g. 180000"
                        onChange={(e) => setLoanAmount(e.target.value)}
                        className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={loanInterestRate}
                        placeholder="e.g. 6.5"
                        onChange={(e) => setLoanInterestRate(e.target.value)}
                        className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Amortization Term (Years)</label>
                      <input
                        type="number"
                        value={loanTermYears}
                        onChange={(e) => setLoanTermYears(e.target.value)}
                        className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Ongoing Carrying Costs & Exit Performance */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-md font-bold uppercase tracking-wider text-amber-500">
                  4. Ongoing Costs & {isSale ? 'Sale Disposition' : 'Gross Rent'}
                </h4>
                <p className="text-xs text-[#9E9DA0]">Record operating expenses and operational income baseline metrics.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isSale ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Actual Sale Price ($)</label>
                      <input
                        type="number"
                        value={actualSalePrice}
                        onChange={(e) => setActualSalePrice(e.target.value)}
                        className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Sold Date</label>
                      <input
                        type="date"
                        value={soldDate}
                        onChange={(e) => setSoldDate(e.target.value)}
                        className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div className="h-0 md:col-span-1" />
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Monthly Gross Rent ($)</label>
                      <input
                        type="number"
                        value={monthlyGrossRent}
                        onChange={(e) => setMonthlyGrossRent(e.target.value)}
                        className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Lease Start Date</label>
                      <input
                        type="date"
                        value={leaseStartDate}
                        onChange={(e) => setLeaseStartDate(e.target.value)}
                        className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div className="h-0 md:col-span-1" />
                  </>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Monthly Property Tax ($)</label>
                  <input
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Monthly Insurance ($)</label>
                  <input
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Monthly Security ($)</label>
                  <input
                    type="number"
                    value={security}
                    onChange={(e) => setSecurity(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Monthly Maintenance ($)</label>
                  <input
                    type="number"
                    value={maintenance}
                    onChange={(e) => setMaintenance(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Monthly Utilities ($)</label>
                  <input
                    type="number"
                    value={utilities}
                    onChange={(e) => setUtilities(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Management Fee (%)</label>
                  <input
                    type="number"
                    value={managementPct}
                    placeholder="e.g. 8"
                    onChange={(e) => setManagementPct(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Monthly HOA ($)</label>
                  <input
                    type="number"
                    value={hoa}
                    onChange={(e) => setHoa(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Monthly CapEx Reserve ($)</label>
                  <input
                    type="number"
                    value={capex}
                    onChange={(e) => setCapex(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Other Monthly Income ($)</label>
                  <input
                    type="number"
                    value={otherIncome}
                    onChange={(e) => setOtherIncome(e.target.value)}
                    className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Title & Closing Documents */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-md font-bold uppercase tracking-wider text-amber-500">5. Title & Closing Documents</h4>
                <p className="text-xs text-[#9E9DA0]">Upload title documents, deeds, or HUD-1 closing statements for permanent vault archiving.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white/[0.01] border border-white/5 rounded-2xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Document Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                    className="p-3 bg-[#0d0a0b] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
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
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Linked Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                    className="p-3 bg-[#0d0a0b] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Closing Agent">Closing Agent</option>
                    <option value="Title Company/Escrow Officer">Title Company/Escrow Officer</option>
                    <option value="Real Estate Attorney">Real Estate Attorney</option>
                    <option value="Loan Officer/Broker">Loan Officer/Broker</option>
                  </select>
                </div>

                <div className="md:col-span-2 pt-2">
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-[#9E9DA0] mb-2" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {uploading ? 'Archiving file...' : 'Select document file'}
                    </span>
                    <input type="file" onChange={handleDocumentSimulate} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              {/* Document list */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                  Vault Documents ({documents.length})
                </h4>
                {documents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/20">
                    No files archived yet. Select files above to upload them.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/5 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-amber-500" />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white/90">
                              {doc.fileName}
                            </span>
                            <span className="text-[10px] text-[#9E9DA0]">
                              {doc.category} · Assigned to {doc.linkedRole}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {doc.verified ? (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Archived
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Pending Review
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-xs font-bold text-red-400 hover:underline px-2 py-1"
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

          {/* Stepper Buttons Footer */}
          <div className="flex justify-between items-center pt-6 border-t border-white/5">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                onClick={() => router.push('/dashboard/projects')}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
            )}

            {step < 5 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#0d0a0b] rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Confirm & Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0d0a0b] rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Retrospective Entry
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right panel - Real-time metrics card */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-6">
        <div className="p-5 rounded-2xl border bg-white/[0.01] border-white/5 backdrop-blur-xl flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h4 className="text-sm font-bold uppercase tracking-wider">
              Realized Performance
            </h4>
          </div>

          <div className="flex flex-col gap-3.5">
            {isSale ? (
              <>
                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-xs text-[#9E9DA0]">Net Profit</span>
                  <span className="font-mono text-sm font-bold">
                    ${(metrics.noiComponents?.noi ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-xs text-[#9E9DA0]">ROI</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {metrics.cashOnCashReturn.toFixed(2)}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-xs text-[#9E9DA0]">Net Operating Income</span>
                  <span className="font-mono text-sm font-bold">
                    ${(metrics.noi ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-xs text-[#9E9DA0]">Cap Rate</span>
                  <span className="font-mono text-sm font-bold">
                    {metrics.capRate.toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-xs text-[#9E9DA0]">Annual Cash Flow</span>
                  <span className="font-mono text-sm font-bold">
                    ${(metrics.annualCashFlow ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-xs text-[#9E9DA0]">Debt Service (DSCR)</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {metrics.dscr.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-xs text-[#9E9DA0]">Cash-on-Cash Return</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {metrics.cashOnCashReturn.toFixed(2)}%
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center py-2.5 border-b border-white/5">
              <span className="text-xs text-[#9E9DA0]">Leverage (LTV)</span>
              <span className="font-mono text-sm font-bold">
                {metrics.ltv.toFixed(1)}%
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-white/5">
              <span className="text-xs text-[#9E9DA0]">Total Cash Invested</span>
              <span className="font-mono text-sm font-bold">
                ${(Number(totalCashInvested) || 0).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-white/5">
              <span className="text-xs text-[#9E9DA0]">All-In Cost Basis</span>
              <span className="font-mono text-sm font-bold">
                ${((Number(purchasePrice) || 0) + (Number(rehabBudget) || 0)).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="p-3.5 rounded-xl flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/10">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed text-[#9E9DA0]">
              Metrics are derived dynamically using the CCIM core calculations based on input values.
            </p>
          </div>
        </div>

        {/* Action card for insights */}
        <div className="p-5 rounded-2xl border bg-white/[0.01] border-white/5 backdrop-blur-xl flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white/95">
              Deep Portfolio Analytics
            </h5>
            <p className="text-[11px] text-[#9E9DA0]">
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
            className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
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

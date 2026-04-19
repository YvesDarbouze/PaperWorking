'use client';

import React, { useState } from 'react';
import FocusedWorkflowLayout from '@/components/layout/FocusedWorkflowLayout';
import { projectsService } from '@/lib/firebase/projects';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { MapPin, DollarSign, Target, Users, LayoutDashboard, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface DealCreationWizardProps {
  organizationId: string;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

const STEPS = [
  { id: 'identity', label: 'Property Identity', icon: Building2 },
  { id: 'metrics', label: 'Acquisition Metrics', icon: DollarSign },
  { id: 'strategy', label: 'Strategy & Vision', icon: Target },
  { id: 'team', label: 'Stakeholder Setup', icon: Users },
  { id: 'review', label: 'Document Review', icon: FileText }
];

export default function DealCreationWizard({ organizationId, onClose, onSuccess }: DealCreationWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    propertyName: '',
    address: '',
    assetClass: 'Residential',
    purchasePrice: '',
    estimatedARV: '',
    closeDate: '',
    leverage: '75',
    strategy: 'Fix & Flip',
    vision: '',
    leadEmail: user?.email || '',
    partnerEmails: ''
  });

  const updateForm = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleFinalCommit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleFinalCommit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const projectId = await projectsService.createDeal({
        propertyName: formData.propertyName,
        address: formData.address,
        status: 'Lead',
        ownerUid: user.uid,
        financials: {
          purchasePrice: parseFloat(formData.purchasePrice) * 100,
          estimatedARV: parseFloat(formData.estimatedARV) * 100,
          costs: []
        },
        // In a real app we'd map more fields from the wizard to the schema
      }, organizationId);

      toast.success('DEAL_ACQUIRED and indexed correctly.');
      onSuccess?.(projectId);
    } catch (error) {
      toast.error('COMMIT_FAILURE: Ledger synchronization error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return formData.propertyName && formData.address;
      case 1: return formData.purchasePrice && formData.estimatedARV;
      case 3: return formData.leadEmail;
      default: return true;
    }
  };

  return (
    <FocusedWorkflowLayout
      title="DEAL_INGESTION_PROTOCOL"
      subtitle={`ORG_ID: ${organizationId}`}
      steps={STEPS.map((s, i) => ({
        id: s.id,
        label: s.label,
        status: i === currentStep ? 'active' : i < currentStep ? 'complete' : 'pending'
      }))}
      currentStepIndex={currentStep}
      onExit={onClose}
      onBack={currentStep > 0 ? handleBack : undefined}
      onNext={handleNext}
      isNextDisabled={!isStepValid() || isSubmitting}
      nextLabel={currentStep === STEPS.length - 1 ? (isSubmitting ? 'COMMITTING...' : 'FINAL_COMMIT') : 'CONTINUE_PHASE'}
    >
      
      {/* Step 1: Identity */}
      {currentStep === 0 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center gap-6 mb-4">
            <div className="w-14 h-14 bg-pw-black flex items-center justify-center border border-pw-black">
              <Building2 className="w-6 h-6 text-pw-accent" />
            </div>
            <div>
              <p className="text-xs font-black text-pw-muted uppercase tracking-[0.4em] mb-1">PHASE_01</p>
              <h2 className="text-2xl font-black text-pw-black uppercase tracking-tight">PROPERTY_IDENTITY</h2>
            </div>
          </div>

          <div className="grid gap-10">
            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Project Designation / Internal Name</label>
              <input 
                type="text"
                value={formData.propertyName}
                onChange={(e) => updateForm({ propertyName: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-pw-subtle/30"
                placeholder="E.G. MIAMI_RECON_ALPHA"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Full Address / Asset Vector</label>
              <input 
                type="text"
                value={formData.address}
                onChange={(e) => updateForm({ address: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-pw-subtle/30"
                placeholder="123 MAIN ST, MIAMI, FL 33101"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Asset Classification</label>
              <select 
                value={formData.assetClass}
                onChange={(e) => updateForm({ assetClass: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Residential">RESIDENTIAL_HOLDING</option>
                <option value="Multi-Family">MULTI_FAMILY_COMPLEX</option>
                <option value="Commercial">COMMERCIAL_OFFICE</option>
                <option value="Land">UNDEVELOPED_LAND_ASSET</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Metrics */}
      {currentStep === 1 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center gap-6 mb-4">
            <div className="w-14 h-14 bg-pw-black flex items-center justify-center border border-pw-black">
              <DollarSign className="w-6 h-6 text-pw-accent" />
            </div>
            <div>
              <p className="text-xs font-black text-pw-muted uppercase tracking-[0.4em] mb-1">PHASE_02</p>
              <h2 className="text-2xl font-black text-pw-black uppercase tracking-tight">ACQUISITION_METRICS</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Purchase Price ($)</label>
              <input 
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => updateForm({ purchasePrice: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black font-mono uppercase focus:border-pw-black focus:outline-none transition-all"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Estimated ARV ($)</label>
              <input 
                type="number"
                value={formData.estimatedARV}
                onChange={(e) => updateForm({ estimatedARV: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black font-mono uppercase focus:border-pw-black focus:outline-none transition-all"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Target Close Date</label>
              <input 
                type="date"
                value={formData.closeDate}
                onChange={(e) => updateForm({ closeDate: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black font-mono uppercase focus:border-pw-black focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Target Leverage (%)</label>
              <input 
                type="number"
                value={formData.leverage}
                onChange={(e) => updateForm({ leverage: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black font-mono uppercase focus:border-pw-black focus:outline-none transition-all"
                placeholder="75"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Strategy */}
      {currentStep === 2 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center gap-6 mb-4">
            <div className="w-14 h-14 bg-pw-black flex items-center justify-center border border-pw-black">
              <Target className="w-6 h-6 text-pw-accent" />
            </div>
            <div>
              <p className="text-xs font-black text-pw-muted uppercase tracking-[0.4em] mb-1">PHASE_03</p>
              <h2 className="text-2xl font-black text-pw-black uppercase tracking-tight">STRATEGY_&_VISION</h2>
            </div>
          </div>

          <div className="grid gap-10">
            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Investment Profile</label>
              <select 
                value={formData.strategy}
                onChange={(e) => updateForm({ strategy: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Fix & Flip">FIX_&_FLIP_SPECULATION</option>
                <option value="BRRRR">BRRRR_CASH_OUT_REFI</option>
                <option value="Buy & Hold">LONG_TERM_EQUITY_HOLD</option>
                <option value="Wholesale">LOW_EXPOSURE_WHOLESALE</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Operational Objectives / Vision Statement</label>
              <textarea 
                value={formData.vision}
                onChange={(e) => updateForm({ vision: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-pw-subtle/30 min-h-[150px] resize-none"
                placeholder="DEFINE_SUCCESS_PARAMETERS..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Team */}
      {currentStep === 3 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center gap-6 mb-4">
            <div className="w-14 h-14 bg-pw-black flex items-center justify-center border border-pw-black">
              <Users className="w-6 h-6 text-pw-accent" />
            </div>
            <div>
              <p className="text-xs font-black text-pw-muted uppercase tracking-[0.4em] mb-1">PHASE_04</p>
              <h2 className="text-2xl font-black text-pw-black uppercase tracking-tight">STAKEHOLDER_DELEGATION</h2>
            </div>
          </div>

          <div className="grid gap-10">
            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Lead Operator Identity (Email)</label>
              <input 
                type="email"
                value={formData.leadEmail}
                onChange={(e) => updateForm({ leadEmail: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-pw-subtle/30"
                placeholder="LEAD@OPERATIONS.IO"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Partner Collaboration Signals (Comma Separated Emails)</label>
              <input 
                type="text"
                value={formData.partnerEmails}
                onChange={(e) => updateForm({ partnerEmails: e.target.value })}
                className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-pw-subtle/30"
                placeholder="PARTNER@LLC.CO, ANALYST@BANK.LY"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {currentStep === 4 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center gap-6 mb-4">
            <div className="w-14 h-14 bg-pw-black flex items-center justify-center border border-pw-black">
              <FileText className="w-6 h-6 text-pw-accent" />
            </div>
            <div>
              <p className="text-xs font-black text-pw-muted uppercase tracking-[0.4em] mb-1">PHASE_05</p>
              <h2 className="text-2xl font-black text-pw-black uppercase tracking-tight">DOCUMENT_AUDIT_&_REVIEW</h2>
            </div>
          </div>

          <div className="border border-pw-border bg-pw-white">
            <div className="bg-pw-black px-10 py-6 border-b border-pw-border">
              <h3 className="text-xs font-black text-pw-white uppercase tracking-[0.3em]">PRE_COMMIT_LEDGER_SUMMARY</h3>
            </div>
            
            <div className="divide-y divide-pw-border">
              {[
                { label: 'Property', value: formData.propertyName },
                { label: 'Location', value: formData.address },
                { label: 'Asset Class', value: formData.assetClass },
                { label: 'Purchase Entry', value: `$${formData.purchasePrice}` },
                { label: 'Projected Exit', value: `$${formData.estimatedARV}` },
                { label: 'Leverage Vector', value: `${formData.leverage}%` },
                { label: 'Strategic Profile', value: formData.strategy },
              ].map((item) => (
                <div key={item.label} className="grid grid-cols-2 px-10 py-5 hover:bg-pw-bg transition-all">
                  <span className="text-xs font-black text-pw-muted uppercase tracking-widest">{item.label}</span>
                  <span className="text-sm font-black text-pw-black uppercase tracking-tighter text-right font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-pw-bg p-6 border border-pw-border">
             <CheckCircle2 className="w-5 h-5 text-pw-accent" />
             <p className="text-xs font-black text-pw-black uppercase tracking-widest">
               Data validated and ready for institutional ledger write.
             </p>
          </div>
        </div>
      )}

    </FocusedWorkflowLayout>
  );
}

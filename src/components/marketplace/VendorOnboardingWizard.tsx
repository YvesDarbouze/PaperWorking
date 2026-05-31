'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, FileText, Scale, Camera, CheckCircle,
  ChevronRight, ArrowLeft, Upload, BadgeCheck,
  Wrench, Building, Home, Search, ClipboardList,
  Landmark, UserCheck, MapPin, CreditCard, X,
} from 'lucide-react';

type Step = 'Select Specialty' | 'Licensing' | 'Insurance' | 'Service Areas' | 'Profile' | 'Plan' | 'Complete';

/** All vendor types from the schema */
const VENDOR_TYPE_OPTIONS = [
  { value: 'Lawyer', label: 'Real Estate Attorney', description: 'Legal review, title clearing, and assignment drafting.', icon: Scale },
  { value: 'Appraiser', label: 'Certified Appraiser', description: 'Standardized valuation reports and market analysis.', icon: FileText },
  { value: 'Inspector', label: 'Home Inspector', description: 'Pre-purchase, structural, and environmental inspections.', icon: Search },
  { value: 'Title', label: 'Title Company', description: 'Title search, escrow, and closing services.', icon: Landmark },
  { value: 'Insurance', label: 'Insurance Agent', description: 'Property, liability, and hazard insurance.', icon: ShieldCheck },
  { value: 'Contractor', label: 'General Contractor', description: 'Renovation, rehab, and repair work.', icon: Wrench },
  { value: 'Property Manager', label: 'Property Manager', description: 'Tenant placement, rent collection, and maintenance.', icon: Building },
  { value: 'Listing Agent', label: 'Listing Agent', description: 'Disposition, marketing, and MLS listing.', icon: Home },
  { value: 'Lender', label: 'Lender / Loan Officer', description: 'Hard money, DSCR, and conventional financing.', icon: CreditCard },
] as const;

/** Contextual specialties per vendor type */
const SPECIALTIES_BY_TYPE: Record<string, string[]> = {
  Lawyer: ['Wholesale', 'Probate', 'Commercial', 'Foreclosure', 'Short Sale', '1031 Exchange'],
  Appraiser: ['Residential', 'Commercial', 'Multi-Family', 'Desktop', 'FHA/VA'],
  Inspector: ['Pre-Purchase', 'Mold & Moisture', 'Structural', 'Radon', 'Termite/WDI', 'Sewer Scope'],
  Title: ['Residential', 'Commercial', 'Refinance', 'Wholesale', 'REO'],
  Insurance: ['Homeowner', 'Landlord', 'Flood', 'Builder\'s Risk', 'Liability'],
  Contractor: ['Full Rehab', 'Kitchen/Bath', 'Roofing', 'Foundation', 'Electrical', 'Plumbing'],
  'Property Manager': ['Single Family', 'Multi-Family', 'Section 8', 'Short-Term Rental', 'HOA'],
  'Listing Agent': ['Fix & Flip', 'Buy & Hold', 'Commercial', 'Luxury', 'REO/Bank-Owned'],
  Lender: ['Hard Money', 'DSCR', 'Conventional', 'Bridge', 'Construction'],
};

/** Stubbed subscription tiers */
const PLAN_OPTIONS = [
  { id: 'metro', name: 'Metro', price: 99, coverage: '1 metro area', leadCap: '10 leads/mo' },
  { id: 'regional', name: 'Regional', price: 249, coverage: '3 metro areas', leadCap: '30 leads/mo' },
  { id: 'national', name: 'National', price: 499, coverage: 'Nationwide', leadCap: 'Unlimited' },
] as const;

export default function VendorOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('Select Specialty');
  const [formData, setFormData] = useState({
    type: 'Lawyer',
    companyName: '',
    licenseNumber: '',
    states: [] as string[],
    specialties: [] as string[],
    serviceAreaZips: [] as string[],
    zipInput: '',
    eoInsurancePolicy: '',
    bio: '',
    selectedPlan: 'metro' as string,
  });

  const STEPS: Step[] = ['Select Specialty', 'Licensing', 'Insurance', 'Service Areas', 'Profile', 'Plan', 'Complete'];
  const progress = (STEPS.indexOf(currentStep) / (STEPS.length - 1)) * 100;

  /** Add a zip code to the service areas */
  const addZip = () => {
    const zip = formData.zipInput.trim();
    if (zip && /^\d{5}$/.test(zip) && !formData.serviceAreaZips.includes(zip)) {
      setFormData({ ...formData, serviceAreaZips: [...formData.serviceAreaZips, zip], zipInput: '' });
    }
  };

  /** Remove a zip code from service areas */
  const removeZip = (zip: string) => {
    setFormData({ ...formData, serviceAreaZips: formData.serviceAreaZips.filter(z => z !== zip) });
  };

  const handleNext = () => {
    const nextIdx = STEPS.indexOf(currentStep) + 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx]);
  };

  const handleBack = () => {
    const prevIdx = STEPS.indexOf(currentStep) - 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx]);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-12">
      <div className="w-full max-w-2xl bg-bg-surface border border-border-accent shadow-sm overflow-hidden">
        
        {/* Institutional Progress Header */}
        <div className="p-12 border-b border-pw-dashboard">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary mb-2">Professional Verification</p>
              <h2 className="text-3xl font-black tracking-tighter text-text-primary uppercase">{currentStep}</h2>
            </div>
            <p className="text-xs font-black text-text-secondary uppercase tracking-widest">{currentStep === 'Complete' ? 'Verification Pending' : `Step ${STEPS.indexOf(currentStep) + 1} of 5`}</p>
          </div>
          <div className="h-1 w-full bg-pw-dashboard">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-pw-black"
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="p-12 min-h-[450px]">
          {currentStep === 'Select Specialty' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-2">
                {VENDOR_TYPE_OPTIONS.map(opt => (
                  <SpecialityTypeCard
                    key={opt.value}
                    icon={<opt.icon className="w-5 h-5 text-text-primary" />}
                    title={opt.label}
                    description={opt.description}
                    active={formData.type === opt.value}
                    onClick={() => setFormData({...formData, type: opt.value, specialties: []})}
                  />
                ))}
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-secondary mb-4">Areas of Practice</label>
                <div className="flex flex-wrap gap-2">
                  {(SPECIALTIES_BY_TYPE[formData.type] ?? []).map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        const newSpecs = formData.specialties.includes(s) 
                          ? formData.specialties.filter(x => x !== s)
                          : [...formData.specialties, s];
                        setFormData({...formData, specialties: newSpecs});
                      }}
                      className={`px-5 py-2 border text-xs font-black uppercase tracking-widest transition-all ${
                        formData.specialties.includes(s) 
                          ? 'bg-pw-black text-white border-pw-border' 
                          : 'bg-bg-surface text-text-secondary border-border-accent hover:border-pw-border'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'Licensing' && (
            <div className="space-y-8">
              <InputField 
                label="Official Firm Name"
                placeholder="REGULATORY ENTITY NAME"
                value={formData.companyName}
                onChange={v => setFormData({...formData, companyName: v})}
              />
              <InputField 
                label="State License ID"
                placeholder="LICENSE NO."
                value={formData.licenseNumber}
                onChange={v => setFormData({...formData, licenseNumber: v})}
              />
              <div className="p-12 border border-dashed border-border-accent bg-pw-dashboard flex flex-col items-center justify-center text-center cursor-pointer hover:border-pw-border transition-colors group">
                <Camera className="w-6 h-6 text-text-secondary mb-4 group-hover:text-text-primary" />
                <p className="text-xs font-black text-text-primary uppercase tracking-widest mb-1">Upload State Credential</p>
                <p className="text-xs text-text-secondary font-bold tracking-tight">Valid JPEG or PDF scan required</p>
              </div>
            </div>
          )}

          {currentStep === 'Insurance' && (
            <div className="space-y-10">
              <div className="p-8 bg-pw-dashboard border border-border-accent flex items-start gap-6">
                <ShieldCheck className="w-8 h-8 text-text-primary shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-text-primary uppercase tracking-widest mb-2">E&O Requirement</h4>
                  <p className="text-sm font-medium text-text-secondary leading-relaxed">
                    PaperWorking requires errors & omissions coverage of at least $1,000,000 to maintain good standing in the marketplace.
                  </p>
                </div>
              </div>
              <div className="p-16 border border-dashed border-border-accent flex flex-col items-center justify-center text-center cursor-pointer hover:bg-pw-dashboard transition-all">
                <Upload className="w-8 h-8 text-text-secondary mb-4" />
                <p className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">Transmit Insurance Binder</p>
              </div>
            </div>
          )}

          {currentStep === 'Service Areas' && (
            <div className="space-y-8">
              <div className="p-8 bg-pw-dashboard border border-border-accent flex items-start gap-6">
                <MapPin className="w-8 h-8 text-text-primary shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-text-primary uppercase tracking-widest mb-2">Service Coverage</h4>
                  <p className="text-sm font-medium text-text-secondary leading-relaxed">
                    Add zip codes for the areas you serve. Investors in your service area will see your profile first.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  className="flex-1 px-6 py-4 bg-pw-dashboard border border-border-accent text-xs font-bold focus:outline-none focus:border-pw-border transition-all"
                  placeholder="ENTER 5-DIGIT ZIP CODE"
                  maxLength={5}
                  value={formData.zipInput}
                  onChange={e => setFormData({...formData, zipInput: e.target.value.replace(/\D/g, '')})}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addZip(); } }}
                />
                <button
                  onClick={addZip}
                  className="px-6 py-4 bg-pw-black text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-pw-fg transition-all"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {formData.serviceAreaZips.length === 0 && (
                  <p className="text-xs text-text-secondary italic">No zip codes added yet</p>
                )}
                {formData.serviceAreaZips.map(zip => (
                  <span key={zip} className="inline-flex items-center gap-2 px-4 py-2 bg-pw-black text-white text-xs font-bold tracking-widest">
                    {zip}
                    <button onClick={() => removeZip(zip)} className="hover:text-red-300 transition-colors" aria-label={`Remove ${zip}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'Profile' && (
            <div className="space-y-6">
               <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-secondary mb-3">Professional Statement</label>
                <textarea 
                  className="w-full px-6 py-5 bg-pw-dashboard border border-border-accent text-xs font-bold focus:outline-none focus:border-pw-border transition-all min-h-[200px]"
                  placeholder="DETAIL YOUR EXPERIENCE IN HIGH-YIELD REAL ESTATE..."
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 'Plan' && (
            <div className="space-y-6">
              <div className="p-8 bg-pw-dashboard border border-border-accent flex items-start gap-6">
                <CreditCard className="w-8 h-8 text-text-primary shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-text-primary uppercase tracking-widest mb-2">Subscription Plan</h4>
                  <p className="text-sm font-medium text-text-secondary leading-relaxed">
                    Choose your coverage level. You can change or cancel anytime from your vendor portal.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {PLAN_OPTIONS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setFormData({...formData, selectedPlan: plan.id})}
                    className={`p-8 border transition-all text-left flex items-start gap-6 ${
                      formData.selectedPlan === plan.id
                        ? 'bg-pw-black text-white border-pw-border'
                        : 'bg-bg-surface text-text-primary border-border-accent hover:border-pw-border'
                    }`}
                  >
                    <div className={`p-3 border ${
                      formData.selectedPlan === plan.id ? 'border-white/20' : 'border-border-accent bg-pw-dashboard'
                    }`}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-lg font-black tracking-tight uppercase">{plan.name}</h4>
                        <span className="text-xl font-black font-mono">${plan.price}<span className="text-xs font-bold">/mo</span></span>
                      </div>
                      <p className={`text-xs font-bold mt-1 ${
                        formData.selectedPlan === plan.id ? 'text-white/60' : 'text-text-secondary'
                      }`}>
                        {plan.coverage} · {plan.leadCap}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-secondary text-center">
                Billing will begin after your profile is verified. No charge during review.
              </p>
            </div>
          )}

          {currentStep === 'Complete' && (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="w-20 h-20 border-4 border-pw-border flex items-center justify-center mb-10">
                <BadgeCheck className="w-10 h-10 text-text-primary" />
              </div>
              <h3 className="text-3xl font-black text-text-primary mb-4 uppercase tracking-tighter">Registration Logged</h3>
              <p className="text-xs text-text-secondary font-bold max-w-[320px] leading-relaxed uppercase tracking-widest">
                Our operations team will cross-reference your credentials. Approval latency is typically 18-24 hours.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-12 pt-12 border-t border-pw-dashboard">
            {currentStep !== 'Select Specialty' && currentStep !== 'Complete' && (
              <button 
                onClick={handleBack}
                className="text-xs font-black uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
            <div className="ml-auto flex gap-4">
              {currentStep !== 'Complete' && (
                <button 
                  onClick={handleNext}
                  className="px-12 py-5 bg-pw-black text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-fg transition-all active:scale-95"
                >
                  {currentStep === 'Plan' ? 'Submit for Audit' : 'Next Phase'}
                </button>
              )}
              {currentStep === 'Complete' && (
                <button className="px-12 py-5 bg-pw-black text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-fg transition-all">
                  Go to Marketplace
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecialityTypeCard({ icon, title, description, active, onClick }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`p-10 border transition-all text-left flex items-start gap-8 ${
        active 
          ? 'bg-pw-black text-white border-pw-border' 
          : 'bg-bg-surface text-text-primary border-border-accent hover:border-pw-border'
      }`}
    >
      <div className={`p-4 border ${active ? 'border-white/20' : 'border-border-accent bg-pw-dashboard'}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-xl font-black tracking-tight mb-2 uppercase">{title}</h4>
        <p className={`text-sm font-bold leading-relaxed tracking-wider ${active ? 'text-pw-phase-1' : 'text-text-secondary'}`}>
          {description}
        </p>
      </div>
    </button>
  );
}

function InputField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest text-text-secondary mb-3">{label}</label>
      <input 
        type="text"
        className="w-full px-6 py-4 bg-pw-dashboard border border-border-accent text-xs font-bold focus:outline-none focus:border-pw-border transition-all"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Scale, Camera, CheckCircle, ChevronRight, ArrowLeft, Upload, BadgeCheck } from 'lucide-react';

type Step = 'Select Specialty' | 'Licensing' | 'Insurance' | 'Profile' | 'Complete';

export default function VendorOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('Select Specialty');
  const [formData, setFormData] = useState({
    type: 'Lawyer',
    companyName: '',
    licenseNumber: '',
    states: [] as string[],
    specialties: [] as string[],
    eoInsurancePolicy: '',
    bio: ''
  });

  const STEPS: Step[] = ['Select Specialty', 'Licensing', 'Insurance', 'Profile', 'Complete'];
  const progress = (STEPS.indexOf(currentStep) / (STEPS.length - 1)) * 100;

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
              <div className="grid grid-cols-1 gap-4">
                <SpecialityTypeCard 
                  icon={<Scale className="w-5 h-5 text-text-primary" />}
                  title="Real Estate Attorney"
                  description="Standard legal review, title clearing, and assignment drafting."
                  active={formData.type === 'Lawyer'}
                  onClick={() => setFormData({...formData, type: 'Lawyer'})}
                />
                <SpecialityTypeCard 
                  icon={<FileText className="w-5 h-5 text-text-primary" />}
                  title="Certified Appraiser"
                  description="Standardized valuation reports and market feasibility analysis."
                  active={formData.type === 'Appraiser'}
                  onClick={() => setFormData({...formData, type: 'Appraiser'})}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-secondary mb-4">Areas of Practice</label>
                <div className="flex flex-wrap gap-2">
                  {['Wholesale', 'Probate', 'Commerical', 'Foreclosure'].map(s => (
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
                          ? 'bg-pw-black text-white border-pw-black' 
                          : 'bg-bg-surface text-text-secondary border-border-accent hover:border-pw-black'
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
              <div className="p-12 border border-dashed border-border-accent bg-pw-dashboard flex flex-col items-center justify-center text-center cursor-pointer hover:border-pw-black transition-colors group">
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
                    PaperWorking requires errors & omissions coverage of at least $1,000,000 to maintain institutional standing in the marketplace.
                  </p>
                </div>
              </div>
              <div className="p-16 border border-dashed border-border-accent flex flex-col items-center justify-center text-center cursor-pointer hover:bg-pw-dashboard transition-all">
                <Upload className="w-8 h-8 text-text-secondary mb-4" />
                <p className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">Transmit Insurance Binder</p>
              </div>
            </div>
          )}

          {currentStep === 'Profile' && (
            <div className="space-y-6">
               <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-secondary mb-3">Professional Statement</label>
                <textarea 
                  className="w-full px-6 py-5 bg-pw-dashboard border border-border-accent rounded-none text-xs font-bold focus:outline-none focus:border-pw-black transition-all min-h-[200px]"
                  placeholder="DETAIL YOUR EXPERIENCE IN HIGH-YIELD REAL ESTATE..."
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 'Complete' && (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="w-20 h-20 border-4 border-pw-black flex items-center justify-center mb-10">
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
                  className="px-12 py-5 bg-pw-black text-white rounded-none font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-fg transition-all active:scale-95"
                >
                  {currentStep === 'Profile' ? 'Submit for Audit' : 'Next Phase'}
                </button>
              )}
              {currentStep === 'Complete' && (
                <button className="px-12 py-5 bg-pw-black text-white rounded-none font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-fg transition-all">
                  Navigate to Marketplace
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
          ? 'bg-pw-black text-white border-pw-black' 
          : 'bg-bg-surface text-text-primary border-border-accent hover:border-pw-black'
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
        className="w-full px-6 py-4 bg-pw-dashboard border border-border-accent rounded-none text-xs font-bold focus:outline-none focus:border-pw-black transition-all"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

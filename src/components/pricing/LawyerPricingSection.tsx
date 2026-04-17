import React from 'react';
import { ArrowRight, ClipboardCheck, Home } from 'lucide-react';

interface AppraiserPricingProps {
  onSelectPlan: (plan: string) => void;
}

/**
 * AppraiserPricingSection
 *
 * Appraisers/Inspectors pricing — a single professional vertical card.
 * (Lawyers have been promoted to a main pricing card.)
 */
export default function ProfessionalPricingSection({ onSelectPlan }: AppraiserPricingProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-6 lg:px-8">

      {/* Section Header */}
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mb-2">Also on PaperWorking</p>
        <h2 className="text-3xl font-medium tracking-tight text-black">Appraisers & Inspectors.</h2>
        <p className="text-sm text-phase-3 mt-2 max-w-lg mx-auto">
          Get matched with investors who need pre-purchase inspections and certified appraisals on active deals.
        </p>
      </div>

      {/* Single Centered Card */}
      <div className="border border-phase-1 bg-white shadow-sm overflow-hidden max-w-lg mx-auto">
        <div className="p-8 bg-dashboard">
          <div className="inline-flex items-center space-x-2 text-phase-4 font-bold uppercase tracking-widest text-xs mb-4">
            <ClipboardCheck className="w-4 h-4" />
            <span>Inspectors & Appraisers</span>
          </div>

          <div className="space-y-3 mt-2">
            <div className="flex items-start">
              <div className="bg-white p-1.5 border border-phase-1 shadow-sm mr-3 text-phase-4">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-black text-sm">Property Inspection Requests</h4>
                <p className="text-xs text-phase-3">Receive inspection requests tied to active acquisitions in your area.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-1.5 border border-phase-1 shadow-sm mr-3 text-phase-4">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-black text-sm">Report Upload & Verification</h4>
                <p className="text-xs text-phase-3">Upload appraisal reports directly into the investor&apos;s deal room.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 flex flex-col items-center text-center border-t border-dashboard">
          <div className="mb-4">
            <span className="text-4xl font-medium text-black">$59</span>
            <span className="text-sm font-medium text-phase-2 ml-1">/mo flat fee</span>
          </div>
          <button
            onClick={() => onSelectPlan('Appraiser / Inspector (Monthly)')}
            className="w-full bg-black text-white font-medium py-3.5 hover:bg-phase-4 transition active:scale-[0.97] flex justify-center items-center group"
          >
            Join the Network <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-xs text-phase-2 mt-2.5 font-medium uppercase tracking-widest">Cancel any time</p>
        </div>
      </div>
    </div>
  );
}

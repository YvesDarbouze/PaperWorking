import React, { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { Building2, Users, ArrowRight } from 'lucide-react';

export default function OnboardingWizard() {
  const { onboardingStep, setNextStep } = useUserStore();
  const [orgName, setOrgName] = useState('');
  const [market, setMarket] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamRole, setTeamRole] = useState('Accountant');

  if (onboardingStep > 2) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white max-w-md w-full mx-4 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1.5 line-height-none">
           <div className={`h-1.5 bg-indigo-600 transition-all duration-500 ease-out ${onboardingStep === 1 ? 'w-1/3' : 'w-2/3'}`}></div>
        </div>

        {onboardingStep === 1 && (
          <div className="p-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
               <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-light tracking-tight text-gray-900 mb-2">Set up your Organization</h2>
            <p className="text-sm text-gray-500 mb-8">Before we deploy your ledger, we need context. What entity are we managing?</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Entity / LLC Name</label>
                <input 
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="e.g. Apex Holdings LLC"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Primary Market</label>
                <select 
                   value={market}
                   onChange={(e) => setMarket(e.target.value)}
                   className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                   required
                >
                   <option value="" disabled>Select a market...</option>
                   <option value="FL">Florida</option>
                   <option value="TX">Texas</option>
                   <option value="OH">Ohio</option>
                   <option value="NY">New York</option>
                   <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <button 
               onClick={setNextStep}
               disabled={!orgName || !market}
               className="w-full mt-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium text-sm transition-colors flex justify-center items-center group"
            >
               Continue <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="p-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
               <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-light tracking-tight text-gray-900 mb-2">Build your Core Team</h2>
            <p className="text-sm text-gray-500 mb-8">PaperWorking is a multiplayer environment. Let's invite your first critical SME.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Team Member Email</label>
                <input 
                  type="email"
                  value={teamEmail}
                  onChange={(e) => setTeamEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Role Authorization</label>
                <select 
                   value={teamRole}
                   onChange={(e) => setTeamRole(e.target.value)}
                   className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                >
                   <option value="Accountant">Accountant (Ledger Viewer)</option>
                   <option value="General Contractor">General Contractor (Ops Manager)</option>
                   <option value="Real Estate Agent">Real Estate Agent (Listing Config)</option>
                </select>
              </div>
            </div>

            <button 
               onClick={setNextStep}
               disabled={!teamEmail}
               className="w-full mt-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium text-sm transition-colors flex justify-center items-center group"
            >
               Deploy Ledger Environment <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-center mt-4">
               <button onClick={setNextStep} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                  Skip for now
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

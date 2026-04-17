'use client';

import React, { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useAuth } from '@/context/AuthContext';
import { Building2, Users, ArrowRight, Info, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OnboardingWizard() {
  const { onboardingStep, setNextStep, completeOnboarding } = useUserStore();
  const { user } = useAuth();
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [market, setMarket] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamRole, setTeamRole] = useState('Accountant');

  const handleFinish = async () => {
    if (!user) return;
    setIsDeploying(true);
    try {
      await completeOnboarding(user.uid, { name: orgName, market: market });
      toast.success('ENVIRONMENT_DEPLOYED. Sensor sync successful.');
    } catch (error) {
       toast.error('DEPLOYMENT_FAILURE — Verify credentials.');
    } finally {
       setIsDeploying(false);
    }
  };

  if (onboardingStep > 2) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-pw-black/95 animate-in fade-in duration-500 px-6 backdrop-blur-xl">
      <div className="bg-pw-white max-w-xl w-full border border-pw-border shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-700">
        
        {/* Antigravity Segmented Progress Bar */}
        <div className="w-full flex h-2 bg-pw-bg border-b border-pw-border">
           <div className={`h-full bg-pw-accent transition-all duration-1000 ease-in-out ${onboardingStep === 1 ? 'w-1/2' : 'w-full'}`}></div>
           <div className={`h-full border-l border-pw-border w-1/2`}></div>
        </div>

        {onboardingStep === 1 && (
          <div className="p-16">
            <header className="flex items-center justify-between mb-16">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-pw-black flex items-center justify-center border border-pw-black">
                   <Building2 className="w-6 h-6 text-pw-accent" />
                </div>
                <div>
                   <p className="text-xs font-black text-pw-muted uppercase tracking-[0.5em] mb-1">PHASE_01</p>
                   <h3 className="text-sm font-black text-pw-black uppercase tracking-[0.2em]">INITIALIZE_ENTITY</h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-pw-accent uppercase tracking-widest font-mono">01/02</span>
              </div>
            </header>

            <div className="space-y-12 mb-20">
              <div className="space-y-4">
                <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Institutional Designation (LLC/CORP)</label>
                <input 
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-pw-subtle/30"
                  placeholder="INPUT_ENTITY_NAME..."
                  required
                />
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Market Vector Analysis</label>
                <select 
                   value={market}
                   onChange={(e) => setMarket(e.target.value)}
                   className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all appearance-none cursor-pointer"
                   required
                >
                   <option value="" disabled>SELECT_MARKET_DOMAIN...</option>
                   <option value="FL">SECTOR_FL (FLORIDA)</option>
                   <option value="TX">SECTOR_TX (TEXAS)</option>
                   <option value="OH">SECTOR_OH (OHIO)</option>
                   <option value="NY">SECTOR_NY (NEW YORK)</option>
                   <option value="OTHER">EXTERNAL_DOMAINS</option>
                </select>
              </div>
            </div>

            <button 
               onClick={setNextStep}
               disabled={!orgName || !market}
               className="w-full bg-pw-black hover:bg-pw-accent disabled:opacity-20 text-pw-white text-sm font-black py-6 uppercase tracking-[0.4em] transition-all flex justify-center items-center group border border-pw-black"
            >
               <span>CONTINUE_SEQUENCE</span>
               <ArrowRight className="w-5 h-5 ml-6 group-hover:translate-x-3 transition-transform" />
            </button>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="p-16">
            <header className="flex items-center justify-between mb-16">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-pw-black flex items-center justify-center border border-pw-black">
                   <Users className="w-6 h-6 text-pw-accent" />
                </div>
                <div>
                   <p className="text-xs font-black text-pw-muted uppercase tracking-[0.5em] mb-1">PHASE_02</p>
                   <h3 className="text-sm font-black text-pw-black uppercase tracking-[0.2em]">SME_AUTH_DELEGATION</h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-pw-accent uppercase tracking-widest font-mono">02/02</span>
              </div>
            </header>

            <div className="space-y-12 mb-20">
              <div className="space-y-4">
                <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Stakeholder Identity (Email)</label>
                <input 
                  type="email"
                  value={teamEmail}
                  onChange={(e) => setTeamEmail(e.target.value)}
                  className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-pw-subtle/30"
                  placeholder="OPERATOR_SIGNAL@LLC.IO"
                  required
                />
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Role Access Token</label>
                <select 
                   value={teamRole}
                   onChange={(e) => setTeamRole(e.target.value)}
                   className="w-full border border-pw-border bg-pw-bg px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all appearance-none cursor-pointer"
                >
                   <option value="Accountant">ACCOUNTANT (LEDGER_READ_ONLY)</option>
                   <option value="General Contractor">GC (OPERATIONAL_CONTROL)</option>
                   <option value="Real Estate Agent">AGENT (LISTING_AUDIT_AUTH)</option>
                </select>
              </div>
            </div>

            <button 
               onClick={handleFinish}
               disabled={!teamEmail || isDeploying}
               className="w-full bg-pw-black hover:bg-pw-accent disabled:opacity-20 text-pw-white text-sm font-black py-6 uppercase tracking-[0.4em] transition-all flex justify-center items-center group border border-pw-black"
            >
               <span>{isDeploying ? 'SYNCHRONIZING_LEDGER...' : 'DEPLOY_ENVIRONMENT'}</span>
               {!isDeploying && <ArrowRight className="w-5 h-5 ml-6 group-hover:translate-x-3 transition-transform" />}
            </button>
            
            <div className="text-center mt-12 flex items-center justify-center gap-3 grayscale opacity-30 hover:opacity-100 transition-all">
               <ShieldAlert className="w-3 h-3" />
               <button onClick={handleFinish} disabled={isDeploying} className="text-xs font-black text-pw-muted hover:text-pw-black uppercase tracking-[0.3em] transition-all cursor-crosshair">
                  {isDeploying ? 'LOCKING_INDEX...' : 'SKIP_TO_LOCAL_AUDIT'}
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

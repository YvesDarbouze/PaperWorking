'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/projects';
import { ArrowRight, Check, Loader2, MapPin, DollarSign, ClipboardCheck } from 'lucide-react';

interface WizardData {
  address:       string;
  city:          string;
  state:         string;
  purchasePrice: string;
  rehabBudget:   string;
}

const EMPTY: WizardData = { address: '', city: '', state: '', purchasePrice: '', rehabBudget: '' };

export default function OnboardingWizardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof WizardData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handleNext = () => {
    if (step === 1 && !data.address.trim()) {
      setError('Please enter a property address to continue.');
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsFinishing(true);
    setError(null);

    const orgId = profile?.personalOrganizationId || `org_${user.uid.slice(0, 8)}`;
    const fullAddress = [data.address, data.city, data.state].filter(Boolean).join(', ');

    try {
      const projectId = await projectsService.createProject(
        {
          name:       fullAddress || 'New Property',
          address:    fullAddress,
          ownerUid:   user.uid,
          phase:      'acquisition',
          status:     'Active',
          financials: {
            purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice.replace(/[^0-9.]/g, '')) : undefined,
            rehabBudget:   data.rehabBudget   ? parseFloat(data.rehabBudget.replace(/[^0-9.]/g, ''))   : undefined,
          } as any,
        },
        orgId,
      );

      router.push(`/dashboard/projects/${projectId}/phase-1`);
    } catch (err: any) {
      console.error('[OnboardingWizard] createProject failed:', err);
      setError('Could not create your project. Please try again.');
      setIsFinishing(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Progress Tracker */}
      <div className="flex items-center justify-between px-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1 last:flex-initial">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 border ${
                step >= s
                  ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(69,73,85,0.3)]'
                  : 'bg-white/5 border-white/10 text-[#9E9DA0]'
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${step > s ? 'bg-primary' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="glass-panel-elevated p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-b-2xl blur opacity-30" />

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Acquisition Wizard</h2>

          <div className="min-h-[160px] flex flex-col justify-center">

            {/* Step 1 — Property Address */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-lg font-semibold text-[#9E9DA0]">Step 1: Property Address</h3>
                </div>
                <input
                  type="text"
                  placeholder="Street address *"
                  value={data.address}
                  onChange={set('address')}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/50 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/40 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={data.city}
                    onChange={set('city')}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/50 focus:outline-none focus:ring-1 focus:ring-primary/60 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={data.state}
                    onChange={set('state')}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/50 focus:outline-none focus:ring-1 focus:ring-primary/60 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Step 2 — Basic Financials */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <h3 className="text-lg font-semibold text-[#9E9DA0]">Step 2: Initial Numbers</h3>
                </div>
                <p className="text-sm text-[#9E9DA0]/70">Optional — you can fill these in later inside the project workspace.</p>
                <input
                  type="text"
                  placeholder="Estimated purchase price (e.g. 320000)"
                  value={data.purchasePrice}
                  onChange={set('purchasePrice')}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/50 focus:outline-none focus:ring-1 focus:ring-primary/60 text-sm"
                />
                <input
                  type="text"
                  placeholder="Estimated rehab budget (e.g. 45000)"
                  value={data.rehabBudget}
                  onChange={set('rehabBudget')}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/50 focus:outline-none focus:ring-1 focus:ring-primary/60 text-sm"
                />
              </div>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                  <h3 className="text-lg font-semibold text-[#9E9DA0]">Step 3: Review</h3>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#9E9DA0]">Address</span>
                    <span className="text-white font-medium text-right max-w-[60%] truncate">
                      {[data.address, data.city, data.state].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9E9DA0]">Purchase Price</span>
                    <span className="text-white font-medium">{data.purchasePrice ? `$${Number(data.purchasePrice.replace(/[^0-9.]/g, '')).toLocaleString()}` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9E9DA0]">Rehab Budget</span>
                    <span className="text-white font-medium">{data.rehabBudget ? `$${Number(data.rehabBudget.replace(/[^0-9.]/g, '')).toLocaleString()}` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9E9DA0]">Starting Phase</span>
                    <span className="text-primary font-medium">Acquisition</span>
                  </div>
                </div>
                <p className="text-xs text-[#9E9DA0]/60">Clicking Finish creates your project and opens the Acquisition workspace.</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1 || isFinishing}
              className="px-4 py-2 text-sm text-[#9E9DA0] hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-primary text-black rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg shadow-primary/10 transition-all flex items-center gap-1.5"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isFinishing}
                className="px-5 py-2.5 bg-primary text-black rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg shadow-primary/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isFinishing ? (
                  <>
                    Creating project…
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </>
                ) : (
                  'Finish'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

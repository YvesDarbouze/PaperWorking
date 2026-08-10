'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Home, DollarSign, Wrench, TrendingUp, Save, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { JourneyProgressHeader } from '@/components/project/JourneyProgressHeader';

interface ExitFormData {
  purchasePrice: string;
  renovationCosts: string;
  monthlyRent: string;
  monthlyExpenses: string;
  currentValue: string;
}

export default function ExitDirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ExitFormData>({
    purchasePrice: '',
    renovationCosts: '',
    monthlyRent: '',
    monthlyExpenses: '',
    currentValue: '',
  });

  const handleChange = (field: keyof ExitFormData, value: string) => {
    // Allow only numbers and decimal points
    const sanitized = value.replace(/[^0-9.]/g, '');
    setForm(prev => ({ ...prev, [field]: sanitized }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    if (!form.purchasePrice) {
      toast.error('Purchase price is required');
      return;
    }

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/reil/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPhase: 4,
          status: 'exit',
          acquisitionStatus: 'OWNED',
          financials: {
            purchasePrice: parseFloat(form.purchasePrice) || 0,
            projectedRehabCost: parseFloat(form.renovationCosts) || 0,
            monthlyGrossRent: parseFloat(form.monthlyRent) || 0,
            monthlyExpenses: parseFloat(form.monthlyExpenses) || 0,
            estimatedCurrentValue: parseFloat(form.currentValue) || 0,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success('Property data saved! Redirecting to Exit workspace...');
      router.push(`/dashboard/projects/${projectId}/phase-4`);
    } catch (err) {
      console.error('ExitDirect save error:', err);
      toast.error('Failed to save property data');
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{ key: keyof ExitFormData; label: string; icon: React.ElementType; placeholder: string; required?: boolean }> = [
    { key: 'purchasePrice', label: 'Original Purchase Price', icon: DollarSign, placeholder: '250000', required: true },
    { key: 'renovationCosts', label: 'Total Renovation Costs', icon: Wrench, placeholder: '45000' },
    { key: 'monthlyRent', label: 'Monthly Gross Rent', icon: TrendingUp, placeholder: '2500' },
    { key: 'monthlyExpenses', label: 'Monthly Operating Expenses', icon: DollarSign, placeholder: '800' },
    { key: 'currentValue', label: 'Estimated Current Value', icon: Home, placeholder: '320000' },
  ];

  return (
    <div data-testid="exit-direct-page" className="min-h-screen py-8 px-6 bg-slate-50 dark:bg-[#121014]/30 overflow-x-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* REIL Journey Progress Header */}
        <JourneyProgressHeader projectId={projectId} currentPhase={4} />
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-slate-800/10">
              <Home className="w-6 h-6 text-slate-300 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Track Your Existing Property
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Enter your property's financial details to calculate KPIs and track performance.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Property Financials
          </h2>

          {fields.map(({ key, label, icon: Icon, placeholder, required }) => (
            <div key={key}>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Icon className="w-4 h-4 text-slate-400" />
                {label}
                {required && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  data-testid={`exit-input-${key}`}
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full h-10 pl-7 pr-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.purchasePrice}
            data-testid="exit-direct-submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-800 dark:hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save & Open Exit Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}

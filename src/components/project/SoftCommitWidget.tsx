import React, { useState } from 'react';
import { Landmark, Percent, Coins, ShieldAlert, Loader2, Edit, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { NON_BINDING_DISCLOSURE } from '@/lib/constants/disclosure';

export interface IndicationData {
  type: 'percentage' | 'amount';
  value: number;
  currency: string | null;
  updatedAt: string;
}

interface SoftCommitWidgetProps {
  token: string;
  initialIndication?: IndicationData | null;
  onUpdate?: (indication: IndicationData | null) => void;
}

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'];

export function SoftCommitWidget({ token, initialIndication = null, onUpdate }: SoftCommitWidgetProps) {
  const [indication, setIndication] = useState<IndicationData | null>(initialIndication);
  const [isEditing, setIsEditing] = useState(!initialIndication);
  const [type, setType] = useState<'percentage' | 'amount'>(initialIndication?.type || 'amount');
  const [valInput, setValInput] = useState<string>(initialIndication?.value ? String(initialIndication.value) : '');
  const [currency, setCurrency] = useState<string>(initialIndication?.currency || 'USD');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    const numVal = parseFloat(valInput);
    if (isNaN(numVal) || numVal <= 0) {
      toast.error('Please enter a positive numeric value.');
      return;
    }

    if (type === 'percentage' && numVal > 100) {
      toast.error('Percentage cannot exceed 100%.');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/invitations/${token}/indication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          value: numVal,
          currency: type === 'amount' ? currency : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit expression of interest');
      }

      const updated: IndicationData = {
        type,
        value: numVal,
        currency: type === 'amount' ? currency : null,
        updatedAt: new Date().toISOString()
      };

      setIndication(updated);
      setIsEditing(false);
      if (onUpdate) onUpdate(updated);
      toast.success('Expression of interest submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw your expression of interest? This action is immediate.')) {
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/invitations/${token}/indication`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to withdraw expression of interest');
      }

      setIndication(null);
      setValInput('');
      setIsEditing(true);
      if (onUpdate) onUpdate(null);
      toast.success('Expression of interest withdrawn.');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Glow highlight */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at top right, #10b981 0%, transparent 60%)' }}></div>

      <div className="border-b border-zinc-800/80 pb-4">
        <h3 className="text-md font-bold tracking-wider text-zinc-100 flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-500" />
          INDICATION OF INTEREST (SOFT COMMIT)
        </h3>
        <p className="text-xs text-zinc-500 font-mono mt-1">Submit a non-binding expression of interest in this project</p>
      </div>

      {/* Prominent, Non-Dismissible, Non-Collapsed Disclosure Block */}
      <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/10 flex items-start gap-3 select-none">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-500/90 leading-relaxed font-sans font-medium">
          <strong>Non-Binding Disclosure:</strong> {NON_BINDING_DISCLOSURE}
        </p>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* Format Selector Toggle */}
          <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800/60 w-fit">
            <button
              type="button"
              onClick={() => setType('amount')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                type === 'amount' ? 'bg-zinc-800 text-emerald-400 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              Currency Amount
            </button>
            <button
              type="button"
              onClick={() => setType('percentage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                type === 'percentage' ? 'bg-zinc-800 text-emerald-400 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              Project Share (%)
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {type === 'amount' && (
              <div className="w-32 shrink-0">
                <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                >
                  {SUPPORTED_CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1">
              <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1.5">
                {type === 'amount' ? 'Indicated Amount' : 'Indicated Share Percentage'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder={type === 'amount' ? 'e.g. 50,000' : 'e.g. 5'}
                  value={valInput}
                  onChange={(e) => setValInput(e.target.value)}
                  min="0.01"
                  step="any"
                  className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                />
                {type === 'percentage' && (
                  <span className="absolute right-3.5 top-3.5 text-xs text-zinc-500 font-mono">%</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Save Indication
            </button>
            {indication && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-10 px-4 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Your Current Indication</p>
              <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                {indication?.type === 'amount'
                  ? `${indication.currency} ${Number(indication.value).toLocaleString()}`
                  : `${indication?.value}%`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setType(indication!.type);
                  setValInput(String(indication!.value));
                  if (indication!.currency) setCurrency(indication!.currency);
                  setIsEditing(true);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Edit Indication"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-900/50 text-zinc-400 hover:text-red-400 transition-colors"
                title="Withdraw Indication"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 font-mono italic">
            Submitted/Updated at: {new Date(indication!.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

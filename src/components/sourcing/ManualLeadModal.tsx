'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createNewDeal } from '@/actions';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════
   ManualLeadModal — Slide-over form for adding a manual lead
   
   Saves via the `createNewDeal` server action which writes to
   the `projects` collection with status='Lead'. The real-time
   Firestore listener (useAllDealsSync) auto-refreshes the list.
   ═══════════════════════════════════════════════════════════════ */

interface ManualLeadModalProps {
  open: boolean;
  onClose: () => void;
}

const PROPERTY_TYPES = ['Residential', 'Multi-Family', 'Commercial', 'Land'] as const;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface FormData {
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: typeof PROPERTY_TYPES[number];
  source: string;
  notes: string;
}

const initialFormData: FormData = {
  address: '',
  city: '',
  state: '',
  zip: '',
  propertyType: 'Residential',
  source: 'Manual',
  notes: '',
};

export default function ManualLeadModal({ open, onClose }: ManualLeadModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in.');
      return;
    }

    // Basic validation
    if (!form.address.trim()) {
      toast.error('Address is required.');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();

      // Build the full address string for the project record
      const parts = [form.address.trim()];
      if (form.city.trim()) parts.push(form.city.trim());
      if (form.state.trim()) parts.push(form.state.trim());
      if (form.zip.trim()) parts.push(form.zip.trim());
      const fullAddress = parts.join(', ');

      await createNewDeal(idToken, {
        propertyName: form.address.trim(),
        address: fullAddress,
        assetClass: form.propertyType,
        leadSource: form.source || 'Manual',
        notes: form.notes.trim(),
      });

      toast.success('Lead added successfully!');
      setForm(initialFormData);
      onClose();
    } catch (err: any) {
      console.error('Failed to add manual lead:', err);
      toast.error(err.message || 'Failed to add lead. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  const inputClasses =
    'w-full rounded-lg border border-pw-border bg-white/5 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-[#6E7480]/40 focus:border-[#6E7480]/40 transition-colors';
  const labelClasses = 'block text-xs font-semibold text-text-secondary tracking-wider uppercase mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      {/* Slide-over panel */}
      <div className="glass-card w-full max-w-md h-full border-l border-pw-border overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-pw-border p-5 bg-inherit backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Add Manual Lead</h2>
            <p className="text-xs text-text-secondary mt-0.5">Enter property details to add to your sourcing pipeline</p>
          </div>
          <button
            onClick={onClose}
            className="pw-interactive rounded-full p-1.5 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Address */}
          <div>
            <label htmlFor="lead-address" className={labelClasses}>
              Address <span className="text-red-400">*</span>
            </label>
            <input
              id="lead-address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              placeholder="123 Main Street"
              className={inputClasses}
              required
            />
          </div>

          {/* City + State Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lead-city" className={labelClasses}>City</label>
              <input
                id="lead-city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                placeholder="Miami"
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="lead-state" className={labelClasses}>State</label>
              <select
                id="lead-state"
                name="state"
                value={form.state}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="">Select…</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Zip */}
          <div>
            <label htmlFor="lead-zip" className={labelClasses}>Zip Code</label>
            <input
              id="lead-zip"
              name="zip"
              type="text"
              value={form.zip}
              onChange={handleChange}
              placeholder="33101"
              maxLength={10}
              className={inputClasses}
            />
          </div>

          {/* Property Type */}
          <div>
            <label htmlFor="lead-propertyType" className={labelClasses}>Property Type</label>
            <select
              id="lead-propertyType"
              name="propertyType"
              value={form.propertyType}
              onChange={handleChange}
              className={inputClasses}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label htmlFor="lead-source" className={labelClasses}>Source</label>
            <input
              id="lead-source"
              name="source"
              type="text"
              value={form.source}
              onChange={handleChange}
              placeholder="Manual"
              className={inputClasses}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="lead-notes" className={labelClasses}>Notes</label>
            <textarea
              id="lead-notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any additional context about this lead…"
              rows={3}
              className={inputClasses + ' resize-none'}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-pw-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-full border border-pw-border text-sm font-semibold text-text-secondary hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 pw-interactive pw-btn pw-btn--primary rounded-full text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Add Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

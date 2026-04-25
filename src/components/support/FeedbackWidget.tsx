"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function FeedbackWidget() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleYes = () => {
    // In a real app, send metrics here
    setSubmitted(true);
  };

  const handleNo = () => {
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, send the feedback here
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-6 text-center mt-12">
        <p className="text-sm font-medium text-[var(--pw-black)]">Thank you for your feedback!</p>
        <p className="text-xs text-[var(--pw-muted)] mt-1">We use this to improve our documentation.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-6 mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm font-medium text-[var(--pw-black)]">Was this documentation helpful?</p>
        {!showForm && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleYes}
              className="px-5 py-2 border border-[var(--pw-black)] text-[var(--pw-black)] bg-transparent rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[var(--pw-black)] hover:text-white transition-colors"
            >
              Yes
            </button>
            <button
              onClick={handleNo}
              className="px-5 py-2 border border-[var(--pw-black)] text-[var(--pw-black)] bg-transparent rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[var(--pw-black)] hover:text-white transition-colors"
            >
              No
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
            onSubmit={handleSubmit}
          >
            <textarea
              required
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="How can we improve this SOP?"
              className="w-full bg-[var(--pw-bg)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors resize-none mb-4"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="ag-button text-xs py-2"
              >
                Submit Feedback
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

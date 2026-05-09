'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const FAQS = [
  {
    question: "What is PaperWorking?",
    answer: "PaperWorking is an operating system for real estate investors. It replaces spreadsheets and scattered emails with a unified pipeline that tracks every deal from sourcing to exit — including capital stack, holding costs, rehab budgets, and closing documents."
  },
  {
    question: "How do I share a deal with potential investors?",
    answer: "From your dashboard, you can invite partners to view a specific deal and its capital stack. Non-account holders receive an email link; they need a subscription to access full financial details and deal analytics. Every share is logged in the audit trail."
  },
  {
    question: "What is the 70% Rule in house flipping?",
    answer: "The 70% rule is a guideline that investors use to determine the maximum they should pay for a property. It states you should never pay more than 70% of the After Repair Value (ARV) minus the estimated cost of repairs. Our What-If Simulator actively enforces this calculation for you."
  },
  {
    question: "Can I manage contingencies and hidden costs?",
    answer: "Absolutely. Our platform encourages investors to add a 10–15% buffer for 'hidden' issues found behind walls. The Engine Room and Rehab trackers allow you to dynamically assign contingency budgets for materials and labor."
  },
  {
    question: "Does the app help me track my holding costs?",
    answer: "Yes. From the moment you close, the Acquisition tracker measures the 'carrying costs' while you own the home, accumulating property taxes, insurance, and utilities by the day until your Exit Strategy phase is complete."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 sm:py-32 bg-bg-surface text-text-primary">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pw-accent mb-4">
            How It Works
          </p>
          <h2 className="text-4xl font-black tracking-tighter text-text-primary mb-6 uppercase">
            Common Questions
          </h2>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <div 
              key={index} 
              className="border border-border-accent overflow-hidden"
            >
              <button
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none hover:bg-bg-primary transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="text-lg font-bold text-text-primary">{faq.question}</span>
                <span className="ml-6 flex-shrink-0">
                  {openIndex === index ? (
                    <Minus className="h-5 w-5 text-pw-accent" />
                  ) : (
                    <Plus className="h-5 w-5 text-text-secondary" />
                  )}
                </span>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-6 pt-0 text-text-secondary leading-relaxed border-t border-border-accent">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

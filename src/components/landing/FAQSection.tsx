'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const FAQS = [
  {
    question: "Why should I upgrade from spreadsheets to PaperWorking?",
    answer: "Spreadsheets leak money. PaperWorking is the institutional-grade operating system for elite real estate investors. We eliminate scattered emails and broken formulas by uniting your entire pipeline—from acquisition to exit—so you catch costly mistakes before they happen."
  },
  {
    question: "Will this help me raise capital from investors faster?",
    answer: "Yes. Capital follows professionalism. Instantly share a secure, beautiful deal portal with potential partners. You project institutional credibility, giving private lenders the confidence they need to wire funds today, not next week."
  },
  {
    question: "How does PaperWorking protect my profit margins?",
    answer: "By actively enforcing the 70% Rule and dynamically calculating your Maximum Allowable Offer (MAO). Our What-If Simulator prevents you from overpaying in competitive markets, shielding you from ruinous deals."
  },
  {
    question: "Can I manage hidden rehab costs and scope creep?",
    answer: "Scope creep destroys ROI. Our Engine Room forces you to assign hard contingency budgets for materials and labor. When unexpected issues hide behind the drywall, you're already financially prepared, preventing a delayed exit."
  },
  {
    question: "Does the platform track daily holding costs?",
    answer: "Every day you hold a property, you bleed profit. Our Acquisition tracker automatically measures your daily carrying costs—property taxes, insurance, utilities, and debt service—so you feel the urgency to exit faster and maximize your net return."
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
            Eliminate Uncertainty
          </p>
          <h2 className="text-4xl font-black tracking-tighter text-text-primary mb-6 uppercase">
            Frequently Asked Questions
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

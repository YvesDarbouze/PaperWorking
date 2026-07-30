'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'I only close three or four deals a year. Is this worth it?',
    answer:
      "Low volume makes each deal matter more, not less. When one deal carries your year's returns, an expired contingency or a rehab that drifts over budget hurts. Run one live deal through the trial and decide.",
  },
  {
    question: 'Is there a free trial? What happens to my data if I cancel?',
    answer:
      'Every plan includes a 14-day trial. A card is required to start; nothing is charged until day 15. If you cancel, you keep read access for 90 days and can export everything, including your full P&L, as CSV. Your data is yours.',
  },
  {
    question: 'Can I add my CPA or business partner?',
    answer:
      'On Investment Team, invite them with role permissions — your CPA can read everything and edit nothing. Investor is a solo plan; your CPA still gets the one-click P&L export.',
  },
  {
    question: 'Is there a contract or minimum commitment?',
    answer:
      'No contracts, no minimums. Cancel anytime from Settings — no call, no retention flow. Annual plans bill once a year and include a 30-day refund window.',
  },
  {
    question: 'My spreadsheet system works. Why switch?',
    answer:
      "Spreadsheets don't know when your earnest money goes hard. They don't alert you three days before your inspection period ends, tie draws to a line-item budget, or hand your CPA one organized export at year end. Run one deal in parallel and compare. If it doesn't catch something or save you time, cancel — the trial costs you nothing.",
  },
  {
    question: 'Does PaperWorking replace my accounting software?',
    answer:
      'No. It tracks project-level costs, budgets, and performance, and exports clean reports your accountant can use — alongside your accounting stack, not instead of it.',
  },
  {
    question: 'How is my data protected?',
    answer: 'Encrypted storage, redundant backups, and SOC 2-ready infrastructure.',
  },
];

function FAQSchemaMarkup({ items }: { items: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="w-full py-16">
      <FAQSchemaMarkup items={faqItems} />

      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-8 type-h2">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqItems.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="glass-card rounded-xl border border-white/10 overflow-hidden bg-surface-container-low/20"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer transition-colors hover:bg-white/5"
                >
                  <h3 className="text-lg font-bold text-on-surface pr-4 type-h3">
                    {item.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 border-t border-white/5 pt-4">
                    <p className="text-base text-on-surface-variant leading-relaxed type-body">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

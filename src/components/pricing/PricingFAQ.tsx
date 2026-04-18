'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. There are no long-term contracts. Cancel directly from your account settings at any time. You keep full access until the end of your current billing period — no surprise charges, no penalty fees.',
  },
  {
    question: 'How does billing work?',
    answer:
      'You are billed monthly or annually, depending on the plan you select. Monthly plans renew on the same date each month. Annual plans renew once per year. You will receive an email receipt for every charge. All payments are processed securely through Stripe.',
  },
  {
    question: 'What if I want a refund?',
    answer:
      'If you are unhappy within the first 14 days of a new subscription, contact us and we will issue a full refund — no questions asked. After that, we do not offer partial-month refunds, but you can cancel at any time to stop future charges.',
  },
  {
    question: 'How secure is my financial data?',
    answer:
      'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). PaperWorking enforces strict Role-Based Access Control at the database level, meaning every read and write is validated against your organization\'s permission model. We never share your data with third parties.',
  },
  {
    question: 'What happens if I downgrade or cancel? Will I lose my data?',
    answer:
      'No. Downgrading your plan does not delete any historical data. Your projects, ledger entries, financial reports, and uploaded documents are fully preserved and remain accessible at your new plan level. If you cancel entirely, your data is retained for 90 days. During that window, you can export everything (CSV or PDF) or reactivate your account to pick up exactly where you left off.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes. Every new account starts with a 14-day free trial of the Team plan with access to all features. No credit card required. At the end of the trial, choose the plan that fits — or walk away with no obligation.',
  },
  {
    question: 'Can I switch between Individual, Team, and Lawyer plans?',
    answer:
      'Absolutely. Upgrades take effect immediately with a prorated charge for the remainder of your billing cycle. Downgrades apply at the start of your next billing period. Your data carries forward seamlessly in both directions.',
  },
];

/**
 * Generate JSON-LD FAQ schema markup for SEO.
 * Google uses this to display rich FAQ snippets in search results.
 */
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

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      {/* SEO: FAQ structured data */}
      <FAQSchemaMarkup items={faqItems} />

      <div className="w-full max-w-3xl mx-auto mt-24 mb-16 px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-medium tracking-tight text-black">
            Common Questions.
          </h2>
          <p className="text-sm text-phase-3 mt-2">
            Everything you need to know before getting started.
          </p>
        </div>

        <div className="border border-phase-1 bg-white shadow-sm overflow-hidden divide-y divide-dashboard">
          {faqItems.map((item, index) => (
            <div key={index} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <button
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between py-5 px-6 text-left group hover:bg-dashboard/50 transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="text-sm font-semibold text-phase-4 pr-4" itemProp="name">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-phase-2 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                  openIndex === index ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                }`}
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <p className="px-6 pb-5 text-sm text-phase-3 leading-relaxed" itemProp="text">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

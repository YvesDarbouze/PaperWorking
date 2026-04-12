'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Script from 'next/script';

/**
 * FAQAccordion — v2
 *
 * Accordion FAQ component with JSON-LD FAQ Schema markup for SEO.
 * Data Security and Integrations are prioritized first.
 * Strict PaperWorking palette.
 */

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Generate JSON-LD FAQ Schema
  const faqSchema = {
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
    <>
      {/* FAQ Schema markup for SEO */}
      <Script
        id="faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="w-full divide-y divide-phase-1 border-y border-phase-1">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className="py-6">
              <button
                onClick={() => toggleOpen(index)}
                className="flex w-full items-center justify-between text-left focus:outline-none group cursor-pointer"
                aria-expanded={isOpen}
              >
                <h3 className="text-lg font-medium text-phase-4 group-hover:text-black transition-colors pr-4">
                  {item.question}
                </h3>
                <ChevronDown
                  className={`h-5 w-5 text-phase-2 flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`mt-4 text-base text-phase-3 leading-relaxed overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p>{item.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

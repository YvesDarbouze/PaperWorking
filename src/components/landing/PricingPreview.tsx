'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

/**
 * PricingPreview
 *
 * Landing-page pricing toggle section with Monthly/Annual switch,
 * smooth CSS transition, and savings badge. Links to full /pricing page.
 * Strict PaperWorking palette.
 */

const plans = [
  {
    name: 'Starter',
    monthly: 79,
    annual: 63,
    description: 'For solo operators managing 1–5 active projects.',
    features: [
      'Up to 5 active projects',
      'Single-user access',
      'Document upload & extraction',
      'Deal Pipeline view',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Professional',
    monthly: 149,
    annual: 119,
    description: 'For growing teams that need collaboration and reporting.',
    features: [
      'Unlimited active projects',
      'Up to 10 team members',
      'Role-based access control',
      'Engine Room ledger',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    monthly: null,
    annual: null,
    description: 'For firms with custom compliance and integration needs.',
    features: [
      'Unlimited everything',
      'Unlimited team members',
      'Custom integrations',
      'Dedicated success manager',
      'SLA & audit support',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export default function PricingPreview() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing-preview" className="py-24 bg-white border-b border-phase-1">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-phase-2 mb-4">
            Simple Pricing
          </p>
          <h2 className="text-3xl font-medium tracking-tight text-black sm:text-4xl text-balance">
            One price. Everything included.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-phase-3 leading-relaxed">
            14-day free trial on every plan. No credit card required.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center mb-12">
          <span className={`text-xs font-medium transition-colors duration-300 ${
            !isAnnual ? 'text-black' : 'text-phase-2'
          }`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative mx-4 w-14 h-7 bg-phase-1 cursor-pointer transition-colors duration-300 focus:outline-none"
            role="switch"
            aria-checked={isAnnual}
            aria-label="Toggle annual pricing"
          >
            <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-black transition-transform duration-300 ease-in-out ${
              isAnnual ? 'translate-x-7' : 'translate-x-0'
            }`} />
          </button>
          <span className={`text-xs font-medium transition-colors duration-300 ${
            isAnnual ? 'text-black' : 'text-phase-2'
          }`}>
            Annual
          </span>
          {/* Savings badge */}
          <span className={`ml-3 text-xs font-bold uppercase tracking-widest px-2 py-1 transition-all duration-300 ${
            isAnnual
              ? 'bg-black text-white opacity-100 translate-y-0'
              : 'bg-phase-1 text-phase-2 opacity-0 -translate-y-1'
          }`}>
            Save 20%
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-phase-1">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`p-8 flex flex-col ${
                plan.highlight ? 'bg-black text-white' : 'bg-white'
              } ${i < plans.length - 1 ? 'border-b md:border-b-0 md:border-r border-phase-1' : ''}`}
            >
              {/* Plan name */}
              <div className="mb-6">
                {plan.highlight && (
                  <span className="text-xs font-bold uppercase tracking-widest text-phase-2 mb-2 block">
                    Most Popular
                  </span>
                )}
                <h3 className={`text-lg font-bold ${plan.highlight ? 'text-white' : 'text-black'}`}>
                  {plan.name}
                </h3>
                <p className={`text-xs mt-1 ${plan.highlight ? 'text-phase-2' : 'text-phase-3'}`}>
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                {plan.monthly !== null ? (
                  <div className="flex items-baseline space-x-1">
                    <span className={`text-4xl font-medium tabular-nums transition-all duration-500 ${
                      plan.highlight ? 'text-white' : 'text-black'
                    }`}>
                      ${isAnnual ? plan.annual : plan.monthly}
                    </span>
                    <span className={`text-xs ${plan.highlight ? 'text-phase-2' : 'text-phase-3'}`}>
                      /mo
                    </span>
                  </div>
                ) : (
                  <span className={`text-4xl font-medium ${plan.highlight ? 'text-white' : 'text-black'}`}>
                    Custom
                  </span>
                )}
                {plan.monthly !== null && isAnnual && (
                  <p className={`text-xs mt-1 transition-all duration-300 ${
                    plan.highlight ? 'text-phase-2' : 'text-phase-2'
                  }`}>
                    Billed annually at ${(plan.annual! * 12).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start space-x-2">
                    <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      plan.highlight ? 'text-phase-2' : 'text-phase-3'
                    }`} />
                    <span className={`text-xs ${
                      plan.highlight ? 'text-phase-1' : 'text-phase-3'
                    }`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/pricing"
                className={`w-full py-3 text-xs font-bold uppercase tracking-widest text-center transition-colors flex items-center justify-center space-x-2 ${
                  plan.highlight
                    ? 'bg-white text-black hover:bg-dashboard'
                    : 'bg-black text-white hover:bg-phase-4'
                }`}
              >
                <span>{plan.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Link to full pricing */}
        <div className="text-center mt-8">
          <Link
            href="/pricing"
            className="text-xs font-bold uppercase tracking-widest text-phase-3 hover:text-black transition-colors"
          >
            View full plan comparison →
          </Link>
        </div>
      </div>
    </section>
  );
}

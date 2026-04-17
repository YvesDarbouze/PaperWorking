'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * TestimonialSlider
 *
 * Auto-advancing testimonial carousel with headshots (initials-based),
 * 5-star ratings, outcome-focused quotes, and role/company attribution.
 * Strict PaperWorking palette.
 */

const testimonials = [
  {
    name: 'David Chen',
    initials: 'DC',
    role: 'Managing Partner',
    company: 'Apex Capital Group',
    quote: 'We closed 14 deals last quarter without a single data entry error — something that cost us $38K the year before.',
    stars: 5,
  },
  {
    name: 'Rachel Okonkwo',
    initials: 'RO',
    role: 'Director of Operations',
    company: 'Meridian Property Holdings',
    quote: 'Our back-office team went from 6 people to 2 — not layoffs, we redeployed them to acquisitions because PaperWorking handles the rest.',
    stars: 5,
  },
  {
    name: 'Marcus Torres',
    initials: 'MT',
    role: 'Founder',
    company: 'Iron Bridge Developments',
    quote: 'I used to spend Sundays reconciling spreadsheets. Now the Engine Room does it in real time and I spend Sundays with my kids.',
    stars: 5,
  },
  {
    name: 'Samantha Liu',
    initials: 'SL',
    role: 'VP of Acquisitions',
    company: 'Vanguard RE Partners',
    quote: 'The role-based access alone saved us from a near-miss where a contractor almost saw our capital stack. Never again.',
    stars: 5,
  },
  {
    name: 'James Whitfield',
    initials: 'JW',
    role: 'Principal',
    company: 'Sterling & Associates',
    quote: 'Due diligence that took us 3 weeks now takes 4 days. Our investors noticed, and our fund size doubled.',
    stars: 5,
  },
];

export default function TestimonialSlider() {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const goTo = useCallback((index: number) => {
    setAutoPlay(false);
    setCurrent(index);
  }, []);

  const prev = useCallback(() => {
    setAutoPlay(false);
    setCurrent((p) => (p - 1 + testimonials.length) % testimonials.length);
  }, []);

  const next = useCallback(() => {
    setAutoPlay(false);
    setCurrent((p) => (p + 1) % testimonials.length);
  }, []);

  const t = testimonials[current];

  return (
    <section className="py-24 bg-white border-b border-phase-1">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-phase-2 mb-4">
            What Teams Are Saying
          </p>
          <h2 className="text-3xl font-medium tracking-tight text-black sm:text-4xl text-balance">
            Results that speak for themselves.
          </h2>
        </div>

        {/* Slider */}
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            {/* Card */}
            <div className="text-center py-10 px-6 sm:px-12 border border-phase-1 bg-dashboard">
              {/* Headshot (initials) */}
              <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-5">
                <span className="text-lg font-bold tracking-tight">{t.initials}</span>
              </div>

              {/* Stars */}
              <div className="flex items-center justify-center gap-0.5 mb-5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-phase-4 text-phase-4" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-base sm:text-lg text-phase-4 leading-relaxed mb-6 font-medium">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Attribution */}
              <p className="text-sm font-bold text-black">{t.name}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mt-1">
                {t.role} at {t.company}
              </p>
            </div>

            {/* Nav arrows */}
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-9 h-9 bg-white border border-phase-1 flex items-center justify-center text-phase-3 hover:text-black hover:border-phase-2 transition-colors cursor-pointer hidden sm:flex"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-9 h-9 bg-white border border-phase-1 flex items-center justify-center text-phase-3 hover:text-black hover:border-phase-2 transition-colors cursor-pointer hidden sm:flex"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2 h-2 transition-all cursor-pointer ${
                  i === current ? 'bg-black w-6' : 'bg-phase-1 hover:bg-phase-2'
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

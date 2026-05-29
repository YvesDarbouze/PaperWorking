'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

/**
 * TestimonialSlider — Stitch Obsidian Edition
 *
 * Auto-advancing glass-card testimonial carousel with outcome-focused
 * quotes from three named investors. Uses Stitch design tokens throughout.
 */

const testimonials = [
  {
    name: 'Marcus T.',
    initials: 'MT',
    role: 'Independent Flipper',
    company: 'Iron Bridge Developments',
    quote:
      'I used to spend Sundays reconciling spreadsheets. Now the Engine Room does it in real time and I spend Sundays with my kids.',
    metric: '12 hrs/week saved',
    stars: 5,
  },
  {
    name: 'Samantha Cho',
    initials: 'SC',
    role: 'Firm Partner',
    company: 'Vanguard RE Partners',
    quote:
      'We closed 14 projects last quarter without a single data entry error — something that cost us $38K the year before. Role-based access alone prevented a near-miss where a contractor almost saw our capital stack.',
    metric: '$38K errors eliminated',
    stars: 5,
  },
  {
    name: 'David R.',
    initials: 'DR',
    role: 'General Contractor',
    company: 'Sterling & Associates',
    quote:
      'Due diligence that took us 3 weeks now takes 4 days. Our investors noticed, and our fund size doubled. The burn rate tracker alone paid for PaperWorking ten times over.',
    metric: '3.2× faster closings',
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
    }, 6000);
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
    <section className="py-24 md:py-32 relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-container-max px-5 md:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-primary glass-card px-3 py-1 rounded-full inline-block mb-4">
            Don&apos;t Take Our Word For It
          </span>
          <h2 className="text-[28px] md:text-[32px] leading-tight font-bold tracking-tight text-on-surface">
            Look at their margins.
          </h2>
        </div>

        {/* Slider */}
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            {/* Card */}
            <div className="glass-card rounded-xl text-center py-10 px-6 sm:px-12 relative overflow-hidden">
              {/* Quote icon */}
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mx-auto mb-6">
                <Quote className="w-5 h-5 text-primary" />
              </div>

              {/* Stars */}
              <div className="flex items-center justify-center gap-0.5 mb-6">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-primary text-primary"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-base sm:text-lg text-on-surface leading-relaxed mb-6 font-medium">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Metric highlight */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {t.metric}
                </span>
              </div>

              {/* Attribution */}
              <div>
                {/* Initials avatar */}
                <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-sm font-bold text-primary tracking-tight">
                    {t.initials}
                  </span>
                </div>
                <p className="text-sm font-bold text-on-surface">{t.name}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant mt-1">
                  {t.role} · {t.company}
                </p>
              </div>
            </div>

            {/* Nav arrows */}
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-9 h-9 glass-card rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer hidden sm:flex"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-9 h-9 glass-card rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer hidden sm:flex"
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
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === current
                    ? 'bg-primary w-6'
                    : 'bg-surface-container-highest w-2 hover:bg-on-surface-variant/40'
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

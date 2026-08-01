'use client';

export default function WhatItDoesSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden border-b border-white/5 bg-surface-container-low/20">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-bold">
            What it does
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            One home for the whole deal.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed mb-6 type-body">
            Each investment gets a Project: one workspace for the deal and everything that happens to it. Tasks, deadlines, documents, budgets, and expenses live there. Log the work; PaperWorking calculates your investor metrics from it.
          </p>
        </div>
      </div>
    </section>
  );
}

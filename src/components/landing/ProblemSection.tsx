'use client';

export default function ProblemSection() {
  return (
    <section className="py-24 md:py-32 lg:py-36 relative overflow-hidden border-b border-white/5">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8">
        <div className="max-w-3xl">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-medium">
            The problem
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-on-surface mb-4 leading-tight type-h2">
            Your deals live in too many places
          </h2>
          <h3 className="text-xl sm:text-2xl font-semibold text-primary/90 mb-6 leading-snug type-h3">
            The spreadsheet isn&apos;t the problem. The scattered record is.
          </h3>
          <p className="text-base sm:text-lg text-on-surface-variant leading-[1.65] mb-6 type-body">
            The budget is in one spreadsheet. The inspection deadline is in an email. The contractor draw is in a text thread. The closing statement is a PDF in a folder named &quot;final FINAL.&quot; Scattered, they can&apos;t answer a simple question: which project is off budget right now?
          </p>
          <p className="text-lg sm:text-xl font-medium text-on-surface leading-relaxed type-body-lg">
            If your spreadsheet system works, keep it.
          </p>
        </div>
      </div>
    </section>
  );
}

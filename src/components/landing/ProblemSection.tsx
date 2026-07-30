'use client';

export default function ProblemSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden border-b border-white/5">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-bold">
            The problem
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4 leading-tight type-h2">
            Your deals live in too many places.
          </h2>
          <h3 className="text-xl sm:text-2xl font-bold text-primary/90 mb-6 leading-snug type-h3">
            The spreadsheet isn&apos;t the problem. The scattered record is.
          </h3>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed mb-6 type-body">
            The budget is in one spreadsheet. The inspection deadline is in an email. The contractor draw is in a text thread. The closing statement is a PDF in a folder named &quot;final FINAL.&quot; Scattered, they can&apos;t answer a simple question: which of your projects is off budget right now?
          </p>
          <p className="text-lg sm:text-xl font-semibold text-on-surface leading-relaxed type-body-lg">
            If your spreadsheet system works, keep it.
          </p>
        </div>
      </div>
    </section>
  );
}

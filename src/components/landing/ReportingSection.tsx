'use client';

export default function ReportingSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden border-b border-white/5 bg-surface-container-low/20">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-bold">
            Reporting
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            Your CPA gets one clean export, not a shoebox.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed type-body">
            Every expense is categorized by project and phase as you log it. At tax time, export a CPA-ready P&L and full CSVs. Reports for lenders and partners come from actuals — not a spreadsheet sprint the week before the meeting.
          </p>
        </div>
      </div>
    </section>
  );
}

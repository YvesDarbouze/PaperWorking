'use client';

export default function TeamSection() {
  return (
    <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden border-b border-white/5">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-bold">
            Teams and access
          </p>
          <h2 className="font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            Bring your team. Keep control of the keys.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed type-body">
            Run PaperWorking solo or as an Investment Team. The Lead Investor invites partners, CPAs, and contractors — and decides what each can see and edit. Your CPA reads everything and changes nothing. Your contractor sees the assigned work, not your portfolio.
          </p>
        </div>
      </div>
    </section>
  );
}

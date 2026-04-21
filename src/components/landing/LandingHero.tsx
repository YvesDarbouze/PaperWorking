import Link from 'next/link';

export default function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 lg:pb-32 overflow-hidden flex flex-col items-center text-center px-6 lg:px-8 max-w-5xl mx-auto h-[90vh] justify-center">
      <div className="z-10 relative space-y-8">
        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-[var(--pw-black)] leading-[1.05] max-w-4xl mx-auto">
          Project Management tools for REI. Let&apos;s make Real Estate Investment a Business.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-[var(--pw-subtle)] max-w-2xl mx-auto leading-relaxed">
          PaperWorking is a project management and team collaboration tool specifically for Real Estate Investors. Designed to organize tasks, communication, collaborators and files in one centralized location. PaperWorking captures the entire investment lifecycle from funding to exit.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/register" className="ag-button text-lg px-8 py-4">
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}

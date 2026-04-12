import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, FileSignature, HardHat, LogOut } from "lucide-react";
import VideoPlaceholder from "@/components/landing/VideoPlaceholder";
import LifecycleCard from "@/components/landing/LifecycleCard";
import FAQAccordion from "@/components/landing/FAQAccordion";

export default function Home() {
  const faqItems = [
    {
      question: "How does the subscription model work?",
      answer: "We offer tailored tiers depending on your operational volume. The 'Individual' tier supports up to 5 concurrent properties, while the 'Team' tier allows unlimited properties and delegated sub-accounts for General Contractors and Agents. Lawyers may join via the 'Lawyer Lead-Gen' tier to access closing artifact boards."
    },
    {
      question: "What is the Engine Room and who has access?",
      answer: "The Engine Room is the central financial ledger and ROI compliance matrix. To maintain data integrity and strict privacy boundaries, access is heavily masked. Only Lead Investors and designated Accountants can view the ROI metrics and full document hub. Subcontractors and General Contractors are routed solely to the Triage Queue for task management."
    },
    {
      question: "How is documentation verified during the lifecycle?",
      answer: "During Phase 5 (The Closing Room), Title Insurance, Closing Disclosures, and Wiring Instructions must be uploaded. A designated Lawyer must manually verify these artifacts inside the platform before the system permits any capital outlays or property stage advancements into Renovation."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f2] font-sans text-gray-900 selection:bg-gray-200">
      
      {/* 1. Global Navigation (Sticky) */}
      <header className="sticky top-0 z-50 w-full bg-[#f2f2f2]/90 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-black flex items-center">
            Paper<span className="font-light text-gray-500">Working</span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
              Log In
            </Link>
            <Link 
              href="/pricing" 
              className="px-5 py-2.5 text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* 2. Section 1: The Hero */}
        <section className="pt-24 pb-20 sm:pt-32 sm:pb-24 border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-2xl">
                <h1 className="text-5xl font-medium tracking-tight text-black sm:text-6xl text-balance leading-tight">
                  The Operational Engine for Real Estate Investors.
                </h1>
                <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
                  PaperWorking organizes the Real Estate Investment process to make property flipping simple, organized, and professional. Consolidate your capital network, reporting, and contractors into a singular, high-trust ledger.
                </p>
                <div className="mt-10 flex items-center gap-x-6">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors focus:outline-none"
                  >
                    View Pricing
                  </Link>
                  <Link
                    href="/dashboard"
                    className="group inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-black hover:text-gray-600 transition-colors focus:outline-none"
                  >
                    Start Your First Deal
                    <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </div>
              </div>
              <div className="w-full">
                 <VideoPlaceholder />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section 2: The Value Proposition */}
        <section className="py-24 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
             <h2 className="text-sm font-medium leading-7 text-gray-400 uppercase tracking-widest mb-4">
                Crowdfund & Find
             </h2>
             <p className="mx-auto max-w-3xl text-3xl font-medium tracking-tight text-black sm:text-4xl text-balance leading-tight">
                Scale your portfolio by unifying your Private Network, Lawyers, and General Contractors strictly under one roof.
             </p>
             <p className="mx-auto mt-6 max-w-2xl text-base text-gray-500 leading-relaxed">
                Stop chasing email threads for Wiring Instructions. Instantly list target properties, securely crowdfund capital from fractional investors, and actively manage escrow disbursements all without leaving your Dashboard.
             </p>
          </div>
        </section>

        {/* 4. Section 3: The 4-Phase Lifecycle Preview */}
        <section className="py-24 bg-[#f2f2f2] border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-3xl font-medium tracking-tight text-black sm:text-4xl mb-16">
              The Matrix Protocol.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-gray-200 shadow-sm bg-white">
               <LifecycleCard 
                 number="1" 
                 title="Find & Fund" 
                 description="Analyze targets with integrated ARV projectors and source liquidity directly from fractional private investors."
                 icon={<Search className="w-4 h-4" />}
               />
               <LifecycleCard 
                 number="2" 
                 title="Acquisition" 
                 description="Enter the Closing Room. Strict RBAC ensures proper legal review of titles and disclosures before funds unlock."
                 icon={<FileSignature className="w-4 h-4" />}
               />
               <LifecycleCard 
                 number="3" 
                 title="Renovation" 
                 description="Contractors submit digital receipts to the Triage Queue for rapid draw requests against the project ledger."
                 icon={<HardHat className="w-4 h-4" />}
               />
               <LifecycleCard 
                 number="4" 
                 title="Exit Strategy" 
                 description="Execute the final sale or BRRRR refinance. Automated dynamic cascades disperse equity distributions seamlessly."
                 icon={<LogOut className="w-4 h-4" />}
               />
            </div>
          </div>
        </section>

        {/* 5. Section 4: The Dynamic FAQ */}
        <section className="py-24 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <h2 className="text-3xl font-medium tracking-tight text-black mb-12">
              Common Questions.
            </h2>
            <FAQAccordion items={faqItems} />
          </div>
        </section>

      </main>

      {/* 6. Section 5: The Footer */}
      <footer className="bg-[#f2f2f2] py-12">
         <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="mb-4 md:mb-0">
               <span className="font-bold text-black">Paper</span>Working © {new Date().getFullYear()}
            </div>
            <div className="flex space-x-8">
               <Link href="#" className="hover:text-black transition-colors">Privacy Policy</Link>
               <Link href="#" className="hover:text-black transition-colors">Terms of Service</Link>
               <Link href="#" className="hover:text-black transition-colors">Contact</Link>
               <Link href="/dashboard" className="text-black font-medium hover:text-gray-600 transition-colors">Log In</Link>
            </div>
         </div>
      </footer>
    </div>
  );
}

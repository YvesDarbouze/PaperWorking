'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { BLOG_POSTS } from '@/lib/cms/blogData';
import BeforeAfterSlider from '@/components/marketing/BeforeAfterSlider';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, DollarSign, TrendingUp, Target } from 'lucide-react';
import Link from 'next/link';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) {
    notFound();
  }

  const isCaseStudy = post.category === 'Flip Case Studies';

  return (
    <div className="min-h-screen bg-white pb-32">
      <MarketingNavbar />
      
      <main className="max-w-[800px] mx-auto px-12 py-32">
        {/* Institutional Navigation */}
        <div className="flex items-center gap-8 mb-16">
          <Link 
            href="/blog"
            className="flex items-center gap-2 text-xs font-black text-pw-subtle uppercase tracking-[0.2em] hover:text-pw-black transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Intelligence Ledger
          </Link>
          <div className="w-1 h-1 bg-pw-border" />
          <span className="bg-pw-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest">
            {post.category}
          </span>
        </div>

        {/* Header Block */}
        <div className="mb-20">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-pw-black leading-none uppercase mb-12">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-12 text-xs font-black uppercase tracking-[0.2em] text-pw-subtle border-y border-pw-dashboard py-8">
            <div className="flex items-center gap-3"><Calendar className="w-4 h-4" /> {post.date}</div>
            <div className="flex items-center gap-3"><Clock className="w-4 h-4" /> {post.readTime} Disclosure</div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="w-6 h-6 border border-pw-border overflow-hidden">
                <img src={post.author.avatarUrl} className="w-full h-full object-cover grayscale" alt="" />
              </div>
              <span className="text-pw-black">{post.author.name}</span>
            </div>
          </div>
        </div>

        {/* SPECIAL FEATURE: Before/After Slider for Case Studies */}
        {isCaseStudy && post.caseStudyData && (
          <section className="mb-32 space-y-12">
            <div className="border border-pw-border p-2 bg-pw-dashboard">
              <BeforeAfterSlider 
                beforeImage={post.caseStudyData.beforeImageUrl}
                afterImage={post.caseStudyData.afterImageUrl}
              />
            </div>
            
            {/* Profit Formula Breakdown (Institutional Audit Style) */}
            <div className="border border-pw-border bg-pw-dashboard p-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-16">
                  <div>
                    <p className="text-xs font-black text-pw-subtle uppercase tracking-[0.4em] mb-3">Audit Metric 04.A</p>
                    <h3 className="text-3xl font-black tracking-tighter text-pw-black uppercase">Capital Settlement</h3>
                  </div>
                  <div className="bg-pw-black text-white px-8 py-4 flex flex-col items-center justify-center">
                    <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-1">Return on Asset</p>
                    <p className="text-3xl font-black tracking-tighter">+{post.caseStudyData.formula.roc}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
                  <FormulaItem label="Sale Disposition" value={post.caseStudyData.formula.salePrice} highlight />
                  <FormulaItem label="Basis Procurement" value={-post.caseStudyData.formula.purchasePrice} />
                  <FormulaItem label="Operational Rehab" value={-post.caseStudyData.formula.rehabCost} />
                  <FormulaItem label="Holding Latency" value={-post.caseStudyData.formula.holdingCosts} />
                </div>

                <div className="mt-16 pt-12 border-t border-pw-border flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 border border-pw-black flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-pw-black" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-pw-subtle uppercase tracking-[0.2em]">Net Procurement Delta</p>
                      <p className="text-4xl font-black tracking-tighter text-pw-black">
                        ${post.caseStudyData.formula.netProfit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Target className="w-12 h-12 text-pw-border hidden md:block" />
                </div>
            </div>
          </section>
        )}

        {/* Content Section */}
        <div className="prose prose-lg prose-gray max-w-none mb-32">
          <p className="text-xl text-pw-muted font-medium leading-relaxed mb-12 italic border-l-4 border-pw-black pl-8">
            {post.excerpt}
          </p>
          <div className="text-pw-black leading-loose space-y-8 text-base font-medium uppercase tracking-tight">
            {post.content}
            <p className="normal-case">
              The transformation strategy focused primarily on structural flow and premium surface materials. 
              By leveraging institutional-grade acquisitions data, we were able to identify a 30% discount 
              to neighborhood comps, allowing for a higher rehab ceiling.
            </p>
            <h4 className="text-2xl font-black tracking-tighter text-pw-black pt-12 uppercase">Operational Latency Control</h4>
            <p className="normal-case">
              In high-stakes property flipping, the bottleneck is rarely capital; it&apos;s operational consistency. 
              Our PaperWorking platform enabled the project manager to reduce communication latency across 
              four distinct sub-contractor teams, resulting in a 14-day reduction in the total lifecycle timeline.
            </p>
          </div>
        </div>

        {/* Institutional CTA */}
        <div className="bg-pw-black p-16 text-center text-white border border-pw-black group hover:bg-white hover:text-pw-black transition-all">
          <h4 className="text-3xl font-black tracking-tighter uppercase mb-6 transition-all">Scalability begins with visibility.</h4>
          <p className="text-white opacity-50 group-hover:text-pw-muted text-sm font-black uppercase tracking-widest mb-12 max-w-sm mx-auto transition-all">
            Deploy professional operational protocols with institutional consistency.
          </p>
          <Link 
            href="/#"
            className="inline-block px-12 py-5 bg-white text-pw-black font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-black hover:text-white border border-white transition-all"
          >
            Deploy Portfolio Baseline
          </Link>
        </div>
      </main>
    </div>
  );
}

function FormulaItem({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-black text-pw-subtle uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-black tracking-tighter ${highlight ? 'text-pw-black' : 'text-pw-muted'}`}>
        {value >= 0 ? '' : '-'}${Math.abs(value).toLocaleString()}
      </p>
    </div>
  );
}

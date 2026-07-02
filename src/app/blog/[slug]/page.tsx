'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import { BLOG_POSTS } from '@/lib/cms/blogData';
import BeforeAfterSlider from '@/components/marketing/BeforeAfterSlider';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  ArrowLeft,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   /blog/[slug] — Individual Blog Post
   
   Obsidian glass theme. Unified LandingHeader navigation.
   ═══════════════════════════════════════════════════════ */

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const isCaseStudy = post.category === 'Flip Case Studies';

  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-[800px] mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-4 mb-12">
          <Link
            href="/blog"
            className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
          <span className="w-1 h-1 rounded-full bg-on-surface-variant/40" />
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/20">
            {post.category}
          </span>
        </div>

        {/* ── Header ── */}
        <div className="mb-16">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-8">
            {post.title}
          </h1>

          <div
            className="flex flex-wrap items-center gap-6 font-body-sm text-body-sm text-on-surface-variant rounded-xl px-6 py-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> {post.date}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> {post.readTime}
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/10">
                <img
                  src={post.author.avatarUrl}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <span className="text-on-surface">{post.author.name}</span>
            </div>
          </div>
        </div>

        {/* ── Case Study: Before/After + Financials ── */}
        {isCaseStudy && post.caseStudyData && (
          <section className="mb-20 space-y-8">
            <div
              className="rounded-2xl p-3 overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <BeforeAfterSlider
                beforeImage={post.caseStudyData.beforeImageUrl}
                afterImage={post.caseStudyData.afterImageUrl}
              />
            </div>

            {/* Profit Formula Breakdown */}
            <div
              className="rounded-2xl p-8 sm:p-10"
              style={{
                background:
                  'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
                <div>
                  <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-2">
                    Capital Settlement
                  </p>
                  <h3 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                    Deal P&L Summary
                  </h3>
                </div>
                <div className="px-6 py-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-0.5">
                    Return on Capital
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-primary">
                    +{post.caseStudyData.formula.roc}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <FormulaItem
                  label="Sale Price"
                  value={post.caseStudyData.formula.salePrice}
                  highlight
                />
                <FormulaItem
                  label="Purchase"
                  value={-post.caseStudyData.formula.purchasePrice}
                />
                <FormulaItem
                  label="Rehab"
                  value={-post.caseStudyData.formula.rehabCost}
                />
                <FormulaItem
                  label="Holding Costs"
                  value={-post.caseStudyData.formula.holdingCosts}
                />
              </div>

              <div className="mt-10 pt-8 border-t border-white/8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Net Profit
                    </p>
                    <p className="text-3xl font-bold tracking-tight text-on-surface">
                      ${post.caseStudyData.formula.netProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Target className="w-8 h-8 text-primary/30 hidden md:block" />
              </div>
            </div>
          </section>
        )}

        {/* ── Content ── */}
        <div className="mb-20">
          <p
            className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed mb-10 pl-6"
            style={{ borderLeft: '3px solid #454955' }}
          >
            {post.excerpt}
          </p>
          <div className="font-body-md text-body-md text-on-surface-variant leading-loose space-y-6">
            {post.content}
            <p>
              The strategy focused on structural flow and premium finishes. We
              pulled comps data that showed comparable properties trading at 30%
              above our basis, giving us room to push the rehab budget higher
              than usual.
            </p>
            <h4 className="font-label-md text-label-md text-on-surface pt-6">
              Operational Latency Control
            </h4>
            <p>
              In flips like this, the bottleneck is rarely capital. It&apos;s
              coordination. PaperWorking cut the communication lag across four
              sub-contractor teams, shaving 14 days off the total project
              timeline.
            </p>
          </div>
        </div>

        {/* ── CTA ── */}
        <section
          className="rounded-2xl p-10 sm:p-14 text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <h4 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-4">
            Scalability begins with visibility.
          </h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-8 max-w-sm mx-auto">
            See every dollar, every deadline, every contractor — in one place.
          </p>
          <Link
            href="/#pricing"
            className="luminous-button inline-flex items-center gap-2 px-8 py-3 rounded-lg font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function FormulaItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-1">
        {label}
      </p>
      <p
        className={`text-xl font-bold tracking-tight ${
          highlight ? 'text-on-surface' : 'text-on-surface-variant'
        }`}
      >
        {value >= 0 ? '' : '-'}${Math.abs(value).toLocaleString()}
      </p>
    </div>
  );
}

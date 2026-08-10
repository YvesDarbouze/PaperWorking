'use client';

import React from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import { BLOG_POSTS, BlogPost } from '@/lib/cms/blogData';
import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════
   /blog — Blog Index
   
   Obsidian glass theme. Unified LandingHeader navigation.
   ═══════════════════════════════════════════════════════ */

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-7xl mx-auto px-6 md:px-margin-desktop pt-20 pb-16">
        {/* ── Header ── */}
        <div className="max-w-3xl mb-12">
          <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-6">
            Operator Intelligence Ledger
          </p>
          <h1 className="text-on-surface tracking-tight leading-none mb-6 type-display font-semibold">
            The Knowledge <br />
            Baseline.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-xl">
            Technical breakdowns, market reconnaissance, and operational
            protocols for modern high-yield real estate. Scaling from initial
            acquisition to profitable exit.
          </p>
        </div>

        {/* ── Masonry Grid ── */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {BLOG_POSTS.map((post, idx) => (
            <BlogCard key={post.slug} post={post} index={idx} />
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

function BlogCard({ post, index }: { post: BlogPost; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="break-inside-avoid"
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
        style={{
          background:
            'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(22,19,24,0.8))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a0b]/60 to-transparent" />
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary backdrop-blur-sm border border-primary/20">
            {post.category}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 font-body-sm text-body-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {post.readTime}
            </span>
            <span className="w-1 h-1 rounded-full bg-on-surface-variant/40" />
            <span>{post.date}</span>
          </div>

          <h3 className="font-label-md text-label-md text-on-surface leading-snug group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>

          <div className="pt-4 flex items-center justify-between border-t border-white/8">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/10">
                <img
                  src={post.author.avatarUrl}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <span className="font-body-sm text-body-sm text-on-surface">
                {post.author.name}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-on-surface-variant group-hover:text-primary transition-colors" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

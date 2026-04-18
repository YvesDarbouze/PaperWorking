'use client';

import React from 'react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { BLOG_POSTS, BlogPost } from '@/lib/cms/blogData';
import Link from 'next/link';
import { ArrowUpRight, Clock, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNavbar />
      
      <main className="max-w-7xl mx-auto px-12 py-32">
        {/* Institutional Header Section */}
        <div className="max-w-3xl mb-32">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-pw-subtle mb-6">
            Institutional intelligence ledger
          </p>
          <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-pw-black leading-none uppercase mb-10">
            The Knowledge <br />
            Baseline.
          </h1>
          <p className="text-pw-muted font-medium text-base leading-relaxed max-w-xl">
            Technical breakdowns, market reconnaissance, and operational protocols for modern high-yield real estate. 
            Scaling from initial acquisition to institutional exit.
          </p>
        </div>

        {/* Masonry Grid Layout - Professionalized */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-12 space-y-12">
          {BLOG_POSTS.map((post, idx) => (
            <BlogCard key={post.slug} post={post} index={idx} />
          ))}
        </div>
      </main>
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
      <Link href={`/blog/${post.slug}`} className="group block border border-pw-border transition-all hover:border-pw-black">
        <div className="relative aspect-[16/10] overflow-hidden bg-pw-dashboard">
          <img 
            src={post.thumbnailUrl} 
            alt={post.title}
            className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0 group-hover:scale-105"
          />
          <div className="absolute top-0 left-0">
            <span className="bg-pw-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest block">
              {post.category}
            </span>
          </div>
        </div>

        <div className="p-10 space-y-6 bg-white">
          <div className="flex items-center gap-6 text-pw-subtle text-xs font-black uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {post.readTime}</span>
            <span className="w-1 h-1 bg-pw-border" />
            <span>{post.date}</span>
          </div>

          <h3 className="text-2xl font-black tracking-tighter text-pw-black leading-tight uppercase group-hover:bg-pw-black group-hover:text-white transition-all px-0 group-hover:px-2 inline-block">
            {post.title}
          </h3>

          <p className="text-pw-muted text-sm font-medium leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>

          <div className="pt-6 flex items-center justify-between border-t border-pw-dashboard">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border border-pw-border overflow-hidden">
                <img src={post.author.avatarUrl} className="w-full h-full object-cover grayscale" alt="" />
              </div>
              <span className="text-xs font-black text-pw-black uppercase tracking-widest">{post.author.name}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-pw-subtle group-hover:text-pw-black transition-all" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

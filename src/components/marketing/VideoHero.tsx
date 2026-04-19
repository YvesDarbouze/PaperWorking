'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VideoHero() {
  return (
    <section className="relative h-screen min-h-[800px] w-full overflow-hidden flex items-center justify-center bg-pw-black">
      {/* Background Video - Institutional Desaturation */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover opacity-30 grayscale"
        >
          <source 
            src="https://player.vimeo.com/external/494252666.sd.mp4?s=7b9735410d059dc9979562cf88c57af969e06cd0&profile_id=165" 
            type="video/mp4" 
          />
        </video>
        {/* Stark Overlay */}
        <div className="absolute inset-0 bg-pw-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="inline-flex items-center space-x-4 px-6 py-2 border border-pw-white/20 text-pw-white text-xs font-black uppercase tracking-[0.4em] mb-12">
            <span className="w-2 h-2 bg-pw-accent" />
            <span>WELCOME TO PAPERWORKING.CO</span>
          </p>
          
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black text-pw-white tracking-tighter leading-[0.85] mb-12 uppercase">
            PROPERTY FLIPPING, <br/>
            ORGANIZED.
          </h1>

          <p className="mx-auto max-w-3xl text-sm sm:text-base text-pw-subtle font-black uppercase tracking-[0.2em] leading-loose mb-16 px-6">
            Paperworking organizes the Real Estate Investment process <br className="hidden md:block"/>
            to make property flipping simple, organized, and professional.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Link
              href="/register"
              className="group flex items-center space-x-4 bg-pw-white text-pw-black px-12 py-6 text-sm font-black uppercase tracking-[0.4em] transition-all hover:bg-pw-accent hover:text-pw-white shadow-2xl"
            >
              <span>START FLIPPING</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
            </Link>
            
            <button className="flex items-center space-x-4 text-pw-white text-sm font-black uppercase tracking-[0.4em] hover:text-pw-accent transition-all">
              <div className="w-14 h-14 border border-pw-white flex items-center justify-center">
                 <Play className="w-5 h-5 fill-pw-white" />
              </div>
              <span>WATCH EXPLAINER VIDEO</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator - Rigid */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30">
         <div className="w-[1px] h-16 bg-pw-white" />
         <span className="text-xs font-black text-pw-white uppercase tracking-[0.5em]">SCAN DOWN</span>
      </div>
    </section>
  );
}

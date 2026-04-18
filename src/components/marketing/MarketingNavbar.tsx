'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import { Menu, X } from 'lucide-react';

export default function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled
          ? 'bg-pw-white border-b border-pw-border py-4 shadow-sm'
          : 'bg-transparent py-8'
      }`}
    >
      <nav className="mx-auto max-w-7xl px-10 flex items-center justify-between">
        <Logo href="/" size="sm" className={scrolled ? 'text-pw-black' : 'text-pw-white'} />

        <div className="hidden md:flex items-center space-x-12">
          <Link 
            href="#features" 
            className={`text-xs font-black uppercase tracking-[0.3em] transition-colors ${scrolled ? 'text-pw-muted hover:text-pw-black' : 'text-pw-white/70 hover:text-pw-white'}`}
          >
            Features
          </Link>
          <Link 
            href="#marketplace" 
            className={`text-xs font-black uppercase tracking-[0.3em] transition-colors ${scrolled ? 'text-pw-muted hover:text-pw-black' : 'text-pw-white/70 hover:text-pw-white'}`}
          >
            Marketplace
          </Link>
          <Link 
            href="#pricing" 
            className={`text-xs font-black uppercase tracking-[0.3em] transition-colors ${scrolled ? 'text-pw-muted hover:text-pw-black' : 'text-pw-white/70 hover:text-pw-white'}`}
          >
            Pricing
          </Link>
          
          <div className="h-4 w-px bg-pw-border opacity-30" />
          
          <Link 
            href="/login" 
            className={`text-xs font-black uppercase tracking-[0.3em] transition-colors ${scrolled ? 'text-pw-muted hover:text-pw-black' : 'text-pw-white/70 hover:text-pw-white'}`}
          >
            Log in
          </Link>
          
          <Link
            href="/register"
            className={`px-8 py-4 border text-xs font-black uppercase tracking-[0.3em] transition-all active:scale-95 ${
              scrolled 
                ? 'bg-pw-black text-pw-white border-pw-black hover:bg-pw-white hover:text-pw-black shadow-lg shadow-pw-black/5' 
                : 'bg-pw-white text-pw-black border-pw-white hover:bg-transparent hover:text-pw-white'
            }`}
          >
            Deploy Environment
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-current"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-pw-white border-b border-pw-border p-12 flex flex-col gap-8 shadow-2xl">
           <Link href="#features" className="text-sm font-black uppercase tracking-[0.4em] text-pw-muted">Features</Link>
           <Link href="#pricing" className="text-sm font-black uppercase tracking-[0.4em] text-pw-muted">Pricing</Link>
           <Link href="/login" className="text-sm font-black uppercase tracking-[0.4em] text-pw-muted">Log in</Link>
           <Link href="/register" className="bg-pw-black text-pw-white py-5 text-center text-sm font-black uppercase tracking-[0.5em] border border-pw-black">Deploy Environment</Link>
        </div>
      )}
    </header>
  );
}

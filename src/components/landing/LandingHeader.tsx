'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import Logo from '@/components/brand/Logo';

export default function LandingHeader() {
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 50], [0, 1]);
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(242, 242, 242, 0)', 'rgba(242, 242, 242, 0.9)']
  );
  const backdropFilter = useTransform(
    scrollY,
    [0, 50],
    ['blur(0px)', 'blur(12px)']
  );

  return (
    <motion.header
      style={{ backgroundColor, backdropFilter }}
      className="fixed w-full top-0 z-50 transition-colors border-b border-transparent"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
          </div>

          <nav className="hidden md:flex gap-8 items-center" aria-label="Global">
            <Link 
              href="#how-it-works" 
              className="text-sm font-semibold text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors"
            >
              How It Works
            </Link>
            <Link 
              href="#faq" 
              className="text-sm font-semibold text-[var(--pw-subtle)] hover:text-[var(--pw-black)] transition-colors"
            >
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="text-sm font-medium text-[var(--pw-black)] hover:opacity-80 transition-opacity"
            >
              Sign-in
            </Link>
            <Link 
              href="/register" 
              className="ag-button"
            >
              Sign-up
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

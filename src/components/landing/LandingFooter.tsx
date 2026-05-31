'use client';

import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   LandingFooter — Antigravity Design System
   
   Reskinned to match the how_it_works.html mockup exactly.
   Clean, modern layout using Luminous Glass dark/light.
   ═══════════════════════════════════════════════════════ */

export default function LandingFooter() {
  return (
    <footer className="w-full py-stack-lg bg-surface-container-lowest border-t border-white/5 mt-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-md px-6 md:px-margin-desktop max-w-container-max mx-auto mb-stack-lg">
        
        {/* ── Brand Column ── */}
        <div className="col-span-2 md:col-span-1 mb-stack-md md:mb-0">
          <div className="flex items-center gap-2 mb-4">
            <img
              alt="PaperWorking Logo Minimal"
              className="h-6 w-6 object-contain grayscale opacity-70"
              src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVQodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
            />
            <span className="font-headline-md text-headline-md text-primary">
              <span className="font-bold">Paper</span>Working
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant/70 mb-4 pr-4">
            Deal pipeline, rehab tracking, and closing docs — all in one place. Built for serious real estate investors.
          </p>
        </div>

        {/* ── Product Column ── */}
        <div>
          <h4 className="font-label-md text-label-md text-on-surface mb-4">Product</h4>
          <ul className="space-y-2">
            <li>
              <Link
                href="/#news"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                News
              </Link>
            </li>
            <li>
              <a
                href="https://status.paperworking.co"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                System Status
              </a>
            </li>
          </ul>
        </div>

        {/* ── Company Column ── */}
        <div>
          <h4 className="font-label-md text-label-md text-on-surface mb-4">Company</h4>
          <ul className="space-y-2">
            <li>
              <Link
                href="/about"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/careers"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                Careers
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                Blog
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* ── Support Column ── */}
        <div>
          <h4 className="font-label-md text-label-md text-on-surface mb-4">Support</h4>
          <ul className="space-y-2">
            <li>
              <Link
                href="/support"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                Help Center
              </Link>
            </li>
            <li>
              <Link
                href="/faq"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                Industry FAQ
              </Link>
            </li>
            <li>
              <a
                href="mailto:support@paperworking.co"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary/50 cursor-pointer"
              >
                support@paperworking.co
              </a>
            </li>
          </ul>
        </div>

      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-white/5 pt-stack-md px-6 md:px-margin-desktop max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-body-sm text-body-sm text-on-surface-variant/50">
          © {new Date().getFullYear()} PaperWorking Corp. All rights reserved.
        </span>
        <div className="flex gap-4">
          <Link
            href="/privacy"
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}

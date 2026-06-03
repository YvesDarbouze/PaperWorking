'use client';

import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-surface-container-lowest border-t border-white/10 w-full py-stack-lg mt-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-lg px-6 md:px-gutter-desktop max-w-container-max mx-auto text-left">

        {/* ── Brand Column ── */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <img
              alt="PaperWorking Logo"
              className="h-6 w-6 rounded-md object-contain grayscale opacity-70"
              src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVQodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
            />
            <span className="font-headline-md text-headline-md text-on-surface font-semibold">
              Paper<span className="font-thin">Working</span>
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 pr-4">
            Precision Deal Management. Built for serious real estate investors.
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant/50">
            © {new Date().getFullYear()} PaperWorking Corp. All rights reserved.
          </p>
        </div>

        {/* ── Product Column ── */}
        <div>
          <h4 className="font-label-md text-label-md text-on-surface mb-4">Product</h4>
          <ul className="space-y-3 font-body-sm text-body-sm">
            <li>
              <Link href="/#how-it-works" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                How It Works
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/#news" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                News
              </Link>
            </li>
          </ul>
        </div>

        {/* ── Company Column ── */}
        <div>
          <h4 className="font-label-md text-label-md text-on-surface mb-4">Company</h4>
          <ul className="space-y-3 font-body-sm text-body-sm">
            <li>
              <Link href="/about" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                About
              </Link>
            </li>
            <li>
              <Link href="/careers" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                Careers
              </Link>
            </li>
            <li>
              <Link href="/blog" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* ── Legal Column ── */}
        <div>
          <h4 className="font-label-md text-label-md text-on-surface mb-4">Legal</h4>
          <ul className="space-y-3 font-body-sm text-body-sm">
            <li>
              <Link href="/privacy" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>

      </div>
    </footer>
  );
}

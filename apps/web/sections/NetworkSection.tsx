'use client';

import React from 'react';
import Link from 'next/link';
import { Handshake, Storefront, ArrowRight } from '@/components/icons/PhosphorIcons';
import { Button } from '@/components/ui/Button';

export default function NetworkSection() {
  return (
    <section className="relative overflow-hidden py-12 md:py-16 border-t border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
        <div className="text-center mb-12">
          <h2 className="mx-auto max-w-2xl text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-foreground text-balance">
            Come for the Tools. Stay for the Network.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-[1.6] text-muted-foreground">
            PaperWorking subscribers get exclusive access to an active network engineered for serious real estate operators, capital partners, and specialized vendors.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Deal Marketplace */}
          <div className="flex flex-col justify-between rounded-none border border-border bg-card p-6 md:p-8 text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:border-foreground/20">
            <div>
              <div className="mb-6 flex items-center justify-center size-10 rounded-none bg-muted text-foreground border border-border">
                <Handshake size={20} className="text-foreground" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mb-3">The Deal Marketplace</h3>
              <p className="text-sm sm:text-[15px] leading-[1.65] text-muted-foreground mb-6">
                helps investors crowdfund deals and gauge opportunities to partner with other real investors.
              </p>
            </div>
            <div>
              <Button asChild variant="outline" className="min-h-[44px] h-10 px-5 text-xs font-semibold uppercase tracking-wider rounded-none gap-2">
                <Link href="/login?mode=signup&accountType=investor&redirectTo=/dashboard/deals">
                  Browse Deal Marketplace
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </div>

          {/* Vendor Marketplace */}
          <div className="flex flex-col justify-between rounded-none border border-border bg-card p-6 md:p-8 text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:border-foreground/20">
            <div>
              <div className="mb-6 flex items-center justify-center size-10 rounded-none bg-muted text-foreground border border-border">
                <Storefront size={20} className="text-foreground" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mb-3">The Vendor Marketplace</h3>
              <p className="text-sm sm:text-[15px] leading-[1.65] text-muted-foreground mb-6">
                helps real estate investors find vendors when they need them. Appraisers, contractors, lawyers, and even bankers can list their services, and PaperWorking will recommend them to investors at the moment they need them.
              </p>
            </div>
            <div>
              <Button asChild variant="default" className="min-h-[44px] h-10 px-5 text-xs font-semibold uppercase tracking-wider rounded-none gap-2">
                <Link href="/login?mode=signup&accountType=vendor&redirectTo=/vendor-portal">
                  List Services as a Vendor ($39/mo)
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-xs text-muted-foreground/80 font-[family-name:var(--font-jetbrains-mono)] tracking-tight">
            Note: Automatic access included for all Investor and Investment Team accounts.
          </p>
        </div>
      </div>
    </section>
  );
}

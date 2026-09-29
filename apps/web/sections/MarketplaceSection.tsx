'use client';

import Link from 'next/link';
import {
  marketplaceSectionBody,
  dealMarketplaceDescription,
  vendorMarketplaceDescription,
} from '@/lib/marketing/copy';
import { Buildings, Handshake, ArrowRight } from '@/components/icons/PhosphorIcons';
import { Button } from '@/components/ui/Button';

export default function MarketplaceSection() {
  return (
    <section id="marketplace" className="relative overflow-hidden bg-background border-b border-border py-12 md:py-16">
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
        {/* Centered text block, max-width 720px */}
        <div className="mx-auto mb-16 max-w-[720px] text-center">
          <span className="mb-3 inline-block font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
            MARKETPLACE
          </span>
          <h2 className="text-xl leading-relaxed text-foreground md:text-2xl font-light">
            {marketplaceSectionBody}
          </h2>
        </div>

        {/* Two cards: side-by-side (desktop), stacked (mobile) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Card: Deal Marketplace */}
          <div className="group/card relative flex flex-col justify-between rounded-none border border-border bg-card p-6 md:p-8 shadow-sm ring-1 ring-foreground/10 text-card-foreground transition-colors hover:border-foreground/25">
            <div>
              <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-none border border-border bg-muted/40 text-foreground">
                <Buildings size={20} />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">Deal Marketplace</h3>
              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                {dealMarketplaceDescription}
              </p>
            </div>
            <div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 px-4 text-xs font-medium gap-1.5"
              >
                <Link href="/marketplaces#deals">
                  Browse deals
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Card: Vendor Marketplace */}
          <div className="group/card relative flex flex-col justify-between rounded-none border border-border bg-card p-6 md:p-8 shadow-sm ring-1 ring-foreground/10 text-card-foreground transition-colors hover:border-foreground/25">
            <div>
              <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-none border border-border bg-muted/40 text-foreground">
                <Handshake size={20} />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">Vendor Marketplace</h3>
              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                {vendorMarketplaceDescription}
              </p>
            </div>
            <div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 px-4 text-xs font-medium gap-1.5"
              >
                <Link href="/marketplaces#vendors">
                  List services
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

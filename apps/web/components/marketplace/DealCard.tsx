import Link from 'next/link';
import {
  calculateFundingProgress,
  formatDealCurrency,
} from '@/lib/marketplace/seed-data';

export interface DealCardData {
  id: string;
  slug: string;
  propertyName: string;
  address: string;
  city: string;
  state: string;
  assetClass: string;
  subStrategy: string;
  status: string;
  projectedRoi: number;
  fundingTarget: number;
  committedAmount: number;
  investorCount: number;
}

export default function DealCard({ deal }: { deal: DealCardData }) {
  const progress = calculateFundingProgress(deal.committedAmount, deal.fundingTarget);

  return (
    <article className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-white/15">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.07em] text-white/45">
            {deal.assetClass} · {deal.subStrategy}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{deal.propertyName}</h3>
          <p className="mt-1 text-sm text-white/60">
            {deal.city}, {deal.state}
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-white/70">
          {deal.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-white/45">Target</p>
          <p className="font-medium">{formatDealCurrency(deal.fundingTarget)}</p>
        </div>
        <div>
          <p className="text-white/45">Projected ROI</p>
          <p className="font-medium">{deal.projectedRoi.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-white/55">
          <span>{progress}% funded</span>
          <span>{deal.investorCount} investors</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white/70" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Link
        href={`/deals/${deal.slug}`}
        className="mt-5 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white/85 transition hover:bg-white/5"
      >
        View deal
      </Link>
    </article>
  );
}

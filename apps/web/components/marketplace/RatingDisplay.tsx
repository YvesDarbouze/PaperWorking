import { Star } from '@phosphor-icons/react';

interface RatingDisplayProps {
  rating?: number | null;
  totalReviews?: number | null;
  variant?: 'default' | 'compact';
}

export function RatingDisplay({ rating, totalReviews, variant = 'default' }: RatingDisplayProps) {
  const hasReviews =
    rating !== undefined &&
    rating !== null &&
    rating > 0 &&
    totalReviews !== undefined &&
    totalReviews !== null &&
    totalReviews > 0;

  if (!hasReviews) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-none border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-300">
          New Vendor
        </span>
        {variant === 'default' ? (
          <span className="text-[10px] font-normal italic text-neutral-400">No reviews yet</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-none border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        <Star weight="fill" className="h-3 w-3 text-amber-400" />
        {rating!.toFixed(1)}
      </span>
      {variant === 'default' ? (
        <span className="text-[10px] font-normal text-neutral-400">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      ) : null}
    </div>
  );
}

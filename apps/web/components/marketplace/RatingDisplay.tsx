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
        <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
          New Vendor
        </span>
        {variant === 'default' ? (
          <span className="text-[10px] font-medium italic text-white/45">No reviews yet</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
        <span className="material-symbols-outlined text-[12px] text-amber-400">star</span>
        {rating!.toFixed(1)}
      </span>
      {variant === 'default' ? (
        <span className="text-[10px] font-medium text-white/45">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      ) : null}
    </div>
  );
}

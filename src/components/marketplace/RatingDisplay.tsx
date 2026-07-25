import React from 'react';
import { Star } from 'lucide-react';

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
        <span className="px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
          New Vendor
        </span>
        <span className="text-[10px] text-[#9E9DA0] italic font-medium">
          No reviews yet
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-400/20 bg-amber-400/10 text-[10px] font-bold text-amber-400">
        <Star className="w-3 h-3 fill-amber-400 stroke-none" />
        {rating!.toFixed(1)}
      </span>
      {variant === 'default' && (
        <span className="text-[10px] text-[#9E9DA0] font-medium">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
}

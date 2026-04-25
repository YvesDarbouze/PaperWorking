import React from 'react';
import { Star } from 'lucide-react';

/**
 * Social Proof Bar
 * 
 * Grayscale company logo placeholders + star rating snippet.
 * Styled using the strict PaperWorking 5-color palette.
 */

const logos = [
  'Blackstone RE',
  'Fundrise',
  'Roofstock',
  'DealMachine',
  'Carrot',
];

export default function SocialProofBar() {
  return (
    <div className="w-full max-w-5xl mx-auto mt-20 px-4">
      <div className="border border-phase-1 bg-bg-surface py-8 px-6 shadow-sm">

        {/* Rating */}
        <div className="flex justify-center items-center mb-6">
          <div className="flex items-center space-x-1 mr-3">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-4 h-4 text-phase-4 fill-phase-4"
              />
            ))}
          </div>
          <span className="text-sm text-phase-3 font-medium">
            Rated <span className="text-phase-4 font-semibold">4.9/5</span> on G2
          </span>
        </div>

        {/* Company Logos (text placeholders in grayscale) */}
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
          {logos.map((name) => (
            <span
              key={name}
              className="text-sm font-bold uppercase tracking-widest text-phase-1 select-none"
            >
              {name}
            </span>
          ))}
        </div>

        <p className="text-center text-xs text-phase-2 mt-6 font-medium">
          Trusted by 2,400+ real estate professionals across 38 states
        </p>
      </div>
    </div>
  );
}

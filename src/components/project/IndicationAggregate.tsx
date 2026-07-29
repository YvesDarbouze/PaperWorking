import React from 'react';
import { Coins } from 'lucide-react';
import type { DealInvitation } from '@/types/dealInvitation';

interface IndicationAggregateProps {
  invitations: DealInvitation[];
}

export function IndicationAggregate({ invitations }: IndicationAggregateProps) {
  // Aggregate indications
  const indications = invitations.filter((inv) => inv.indication);
  const count = indications.length;

  const currencySums: Record<string, number> = {};
  let totalPercentage = 0;
  let percentageCount = 0;

  for (const inv of indications) {
    const ind = inv.indication!;
    if (ind.type === 'amount' && ind.currency) {
      currencySums[ind.currency] = (currencySums[ind.currency] || 0) + ind.value;
    } else if (ind.type === 'percentage') {
      totalPercentage += ind.value;
      percentageCount++;
    }
  }

  const currencies = Object.keys(currencySums);

  return (
    <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-6 backdrop-blur-md space-y-4">
      <div>
        <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-400 flex items-center gap-2">
          <Coins className="w-4 h-4 text-emerald-500" />
          INDICATIONS OF INTEREST AGGREGATE
        </h3>
        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">
          Lead Investor view (Non-binding summary)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Total Count Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 p-4 rounded-xl">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Total Responses</p>
          <p className="text-xl font-bold font-mono text-zinc-100 mt-1">{count}</p>
        </div>

        {/* Currency Sum Cards */}
        {currencies.map((cur) => (
          <div key={cur} className="bg-zinc-900/60 border border-zinc-800/60 p-4 rounded-xl">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Indicated sum ({cur})</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {cur} {currencySums[cur].toLocaleString()}
            </p>
          </div>
        ))}

        {/* Percentage Card */}
        {percentageCount > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800/60 p-4 rounded-xl">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Indicated share</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {totalPercentage}%
            </p>
          </div>
        )}
      </div>

      {/* Required non-binding disclaimer */}
      <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/60 text-[10px] text-zinc-400 font-medium">
        * Note: This aggregate represents non-binding expressions of interest only. No formal contracts, definitive agreements, or binding agreements have been recorded.
      </div>
    </div>
  );
}

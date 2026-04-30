import React from 'react';
import { Lightbulb } from 'lucide-react';

interface RehabStrategyAdviceProps {
  strategy?: 'Sell' | 'Rent';
}

export function RehabStrategyAdvice({ strategy }: RehabStrategyAdviceProps) {
  const getAdvice = () => {
    switch (strategy) {
      case 'Sell':
        return "Focus on high-ROI cosmetic updates. Don't over-improve for the neighborhood. Speed is critical to reduce holding costs.";
      case 'Rent':
        return "Prioritize durable materials and systems that reduce long-term maintenance. Luxury finishes aren't usually necessary unless it's a Class A property.";
      default:
        return "Establish a clear Scope of Work before beginning. Stick to the budget and closely monitor contractor progress.";
    }
  };

  return (
    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex gap-3">
      <div className="mt-0.5">
        <Lightbulb className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h4 className="font-medium text-blue-900 text-sm">Rehab Strategy Advice {strategy ? `(${strategy})` : ''}</h4>
        <p className="text-sm text-blue-800 mt-1">{getAdvice()}</p>
      </div>
    </div>
  );
}

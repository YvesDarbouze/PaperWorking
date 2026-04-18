'use client';

import React, { useState } from 'react';
import { MapPin, TrendingUp, ArrowUpRight, Star, BarChart3 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Market Analysis — Phase 1 Module
   Emerging neighborhood tracker with market heat indicators.
   ═══════════════════════════════════════════════════════ */

interface Neighborhood {
  id: string;
  name: string;
  medianPrice: number;
  appreciation: number; // YoY percentage
  daysOnMarket: number;
  heatScore: number; // 1-10
}

const SAMPLE_NEIGHBORHOODS: Neighborhood[] = [
  { id: '1', name: 'Overtown', medianPrice: 285000, appreciation: 12.4, daysOnMarket: 18, heatScore: 9 },
  { id: '2', name: 'Little Haiti', medianPrice: 310000, appreciation: 9.7, daysOnMarket: 22, heatScore: 8 },
  { id: '3', name: 'West Palm Beach (Northwood)', medianPrice: 245000, appreciation: 14.2, daysOnMarket: 14, heatScore: 10 },
  { id: '4', name: 'Opa-locka', medianPrice: 175000, appreciation: 6.3, daysOnMarket: 45, heatScore: 5 },
];

function HeatBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 w-2 rounded-sm transition-colors"
          style={{
            backgroundColor: i < score
              ? score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444'
              : '#e5e7eb',
          }}
        />
      ))}
    </div>
  );
}

export default function MarketAnalysis() {
  const [neighborhoods] = useState<Neighborhood[]>(SAMPLE_NEIGHBORHOODS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hottest = [...neighborhoods].sort((a, b) => b.heatScore - a.heatScore)[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-medium tracking-tight text-gray-900">Market Analysis</h3>
        </div>
        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Emerging Neighborhoods
        </span>
      </div>

      {/* Hottest Neighborhood Highlight */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1 flex items-center">
              <Star className="w-3 h-3 mr-1 text-yellow-400" /> Top Emerging Market
            </p>
            <p className="text-lg font-semibold text-white">{hottest.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              ${hottest.medianPrice.toLocaleString()} median · {hottest.daysOnMarket} DOM
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-emerald-400 text-sm font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              {hottest.appreciation}% YoY
            </div>
            <div className="mt-1">
              <HeatBar score={hottest.heatScore} />
            </div>
          </div>
        </div>
      </div>

      {/* Neighborhood Table */}
      <div className="space-y-2">
        {neighborhoods.map(n => (
          <div
            key={n.id}
            onClick={() => setSelectedId(selectedId === n.id ? null : n.id)}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
              selectedId === n.id
                ? 'border-gray-400 bg-gray-50'
                : 'border-gray-100 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{n.name}</p>
                <p className="text-xs text-gray-500">${n.medianPrice.toLocaleString()} median</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center text-xs font-medium text-emerald-600">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  {n.appreciation}%
                </div>
                <p className="text-xs text-gray-400">{n.daysOnMarket} DOM</p>
              </div>
              <HeatBar score={n.heatScore} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

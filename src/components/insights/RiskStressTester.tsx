'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Sliders, ShieldAlert, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { InsightsEngine, InsightsEngineInputs, InsightsEngineResult } from '@/lib/services/insightsEngine';

// ── Context Types ──
export interface StressTestSliders {
  vacancyRate: number;      // 0% to 25%
  interestRateHike: number; // +0% to +3%
  opexOverrun: number;      // +0% to +50%
  rentGrowth: number;       // -2% to +5% (annual)
  taxSpike: number;         // +0% to +40%
}

interface StressTestContextType {
  baseInputs: InsightsEngineInputs;
  setBaseInputs: (inputs: InsightsEngineInputs) => void;
  sliders: StressTestSliders;
  setSlider: (key: keyof StressTestSliders, value: number) => void;
  activePreset: string;
  applyPreset: (preset: string) => void;
  result: InsightsEngineResult;
}

const defaultBaseInputs: InsightsEngineInputs = {
  purchasePrice: 300000,
  rehabBudget: 30000,
  downPayment: 60000,
  interestRate: 6.0,
  amortizationTerm: 30,
  grossScheduledIncome: 36000,
  operatingExpenses: 12000,
  vacancyRate: 5.0,
  marketData: {
    daysOnMarket: 45,
    medianHomePrice: 320000,
    averageRent: 2200
  }
};

const defaultSliders: StressTestSliders = {
  vacancyRate: 5.0,
  interestRateHike: 0.0,
  opexOverrun: 0.0,
  rentGrowth: 3.0,
  taxSpike: 0.0
};

const StressTestContext = createContext<StressTestContextType | undefined>(undefined);

// ── Context Provider ──
export function StressTestProvider({ children, initialInputs = defaultBaseInputs }: { children: React.ReactNode; initialInputs?: InsightsEngineInputs }) {
  const [baseInputs, setBaseInputs] = useState<InsightsEngineInputs>(initialInputs);
  const [sliders, setSliders] = useState<StressTestSliders>(defaultSliders);
  const [activePreset, setActivePreset] = useState<string>('stabilized');

  const setSlider = useCallback((key: keyof StressTestSliders, value: number) => {
    setSliders(prev => ({ ...prev, [key]: value }));
    setActivePreset('custom');
  }, []);

  const applyPreset = useCallback((preset: string) => {
    setActivePreset(preset);
    switch (preset) {
      case 'stabilized':
        setSliders({
          vacancyRate: 5.0,
          interestRateHike: 0.0,
          opexOverrun: 0.0,
          rentGrowth: 3.0,
          taxSpike: 0.0
        });
        break;
      case 'downturn':
        setSliders({
          vacancyRate: 12.0,
          interestRateHike: 1.0,
          opexOverrun: 15.0,
          rentGrowth: 0.0,
          taxSpike: 10.0
        });
        break;
      case 'worst-case':
        setSliders({
          vacancyRate: 15.0,
          interestRateHike: 3.0,
          opexOverrun: 30.0,
          rentGrowth: -1.0,
          taxSpike: 30.0
        });
        break;
    }
  }, []);

  // Recalculate metrics in real-time on slider/input changes
  const result = useMemo(() => {
    // 1. Apply interest rate hike
    const interestRate = baseInputs.interestRate + sliders.interestRateHike;

    // 2. Apply OpEx overrun and Property Tax reassessment spike
    // Assuming property taxes constitute approx 25% of baseline Operating Expenses,
    // a tax spike increases total OpEx by taxSpike * 0.25.
    const taxImpact = 1 + (sliders.taxSpike / 100) * 0.25;
    const opexImpact = 1 + (sliders.opexOverrun / 100);
    const operatingExpenses = Math.round(baseInputs.operatingExpenses * opexImpact * taxImpact);

    // 3. Map adjusted inputs for InsightsEngine calculation
    const adjustedInputs: InsightsEngineInputs = {
      ...baseInputs,
      interestRate,
      operatingExpenses,
      vacancyRate: sliders.vacancyRate
    };

    // 4. Map assumptions growth rates
    const assumptions = {
      incomeGrowthRate: sliders.rentGrowth / 100
    };

    return InsightsEngine.calculate(adjustedInputs, assumptions);
  }, [baseInputs, sliders]);

  return (
    <StressTestContext.Provider
      value={{
        baseInputs,
        setBaseInputs,
        sliders,
        setSlider,
        activePreset,
        applyPreset,
        result
      }}
    >
      {children}
    </StressTestContext.Provider>
  );
}

// ── Custom Hook ──
export function useStressTest() {
  const context = useContext(StressTestContext);
  if (!context) {
    throw new Error('useStressTest must be used within a StressTestProvider');
  }
  return context;
}

// ── Risk Stress Tester Sidebar UI Component ──
export function RiskStressTester() {
  const { sliders, setSlider, activePreset, applyPreset } = useStressTest();

  return (
    <div className="w-full rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-md space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
            Risk Stress Tester
          </h3>
        </div>
        <button 
          onClick={() => applyPreset('stabilized')}
          className="p-1 rounded-md text-[#6B6870] hover:text-white hover:bg-white/5 transition-all"
          title="Reset to Baseline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset Dropdown Selector */}
      <div className="space-y-2">
        <label className="text-[10px] text-[#9E9DA0] font-semibold tracking-wider uppercase">
          Stress Scenario Preset
        </label>
        <select
          value={activePreset}
          onChange={(e) => applyPreset(e.target.value)}
          className="w-full bg-[#121014] border border-white/10 text-xs rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none font-light cursor-pointer"
        >
          <option value="stabilized">🟢 Baseline Stabilized (Ideal Underwrite)</option>
          <option value="downturn">🟡 Market Downturn (Surprise Carry)</option>
          <option value="worst-case">🔴 Worst-Case Underwrite (Recession Audit)</option>
          <option value="custom">⚙️ Custom Stress Underwrite</option>
        </select>
      </div>

      {/* Preset Status Card */}
      <div className="p-3.5 rounded-xl border bg-white/[0.01] flex items-start gap-3 border-white/5">
        {activePreset === 'stabilized' && (
          <>
            <CheckCircle className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed font-light text-[#C0BEC2]">
              <span className="font-semibold text-white block mb-0.5">Underwriting Thesis Intact</span>
              Ideal local conditions. Balanced tax, standard vacancy, and organic rent growth.
            </div>
          </>
        )}
        {activePreset === 'downturn' && (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed font-light text-[#C0BEC2]">
              <span className="font-semibold text-white block mb-0.5">Carry Stress Detected</span>
              Surprise vacancies and high holding costs. Yields are compressed but remaining positive.
            </div>
          </>
        )}
        {activePreset === 'worst-case' && (
          <>
            <ShieldAlert className="w-5 h-5 text-[#f43f5e] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed font-light text-[#C0BEC2]">
              <span className="font-semibold text-white block mb-0.5">Critical Risk Underwrite</span>
              Recessionary rent cuts, major opex leaks, interest spikes, and tax reassessment.
            </div>
          </>
        )}
        {activePreset === 'custom' && (
          <>
            <Sliders className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed font-light text-[#C0BEC2]">
              <span className="font-semibold text-white block mb-0.5">Custom Underwriting Model</span>
              Sliders adjusted. Visually check charts to analyze structural viability.
            </div>
          </>
        )}
      </div>

      {/* Sliders Container */}
      <div className="space-y-5 pt-2 border-t border-white/5">
        
        {/* Vacancy Rate Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C0BEC2] font-light">Vacancy Rate</span>
            <span className="font-mono text-white font-semibold">{sliders.vacancyRate.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="0.5"
            value={sliders.vacancyRate}
            onChange={(e) => setSlider('vacancyRate', parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <p className="text-[9px] text-[#6E7480] font-light">Models employer relocation or leasing downturns.</p>
        </div>

        {/* Interest Rate Hike Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C0BEC2] font-light">Interest Rate Hike</span>
            <span className="font-mono text-white font-semibold">+{sliders.interestRateHike.toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={sliders.interestRateHike}
            onChange={(e) => setSlider('interestRateHike', parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <p className="text-[9px] text-[#6E7480] font-light">Tests floating debt carry risk on DSCR limits.</p>
        </div>

        {/* OpEx Overrun Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C0BEC2] font-light">OpEx Overrun</span>
            <span className="font-mono text-white font-semibold">+{sliders.opexOverrun.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={sliders.opexOverrun}
            onChange={(e) => setSlider('opexOverrun', parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <p className="text-[9px] text-[#6E7480] font-light">Simulates cap-ex failure (roof, HVAC leaks).</p>
        </div>

        {/* Rent Growth Softening Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C0BEC2] font-light">Rent Growth (Annual)</span>
            <span className="font-mono text-white font-semibold">{sliders.rentGrowth.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="-2"
            max="5"
            step="0.5"
            value={sliders.rentGrowth}
            onChange={(e) => setSlider('rentGrowth', parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <p className="text-[9px] text-[#6E7480] font-light">Tests market growth deflation or flat appreciation.</p>
        </div>

        {/* Post-Sale Tax Reassessment Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C0BEC2] font-light">Tax Reassessment Spike</span>
            <span className="font-mono text-white font-semibold">+{sliders.taxSpike.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={sliders.taxSpike}
            onChange={(e) => setSlider('taxSpike', parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <p className="text-[9px] text-[#6E7480] font-light">Models tax revaluation spikes upon title transfer.</p>
        </div>

      </div>

    </div>
  );
}

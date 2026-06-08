"use client";

import React, { useState, useEffect } from "react";
import type { StressParameters } from "@/hooks/usePortfolioInsights";

export interface RiskStressTesterProps {
  params: StressParameters;
  onChange: (newParams: StressParameters) => void;
}

export default function RiskStressTester({ params, onChange }: RiskStressTesterProps) {
  const [preset, setPreset] = useState<string>("baseline");

  // Keep track of internal values matching sliders
  const [vacancy, setVacancy] = useState<number>(params.vacancyRate);
  const [interestSpike, setInterestSpike] = useState<number>(params.interestRateSpike);
  const [opexOverrun, setOpexOverrun] = useState<number>(params.opexOverrun);
  const [taxReassessment, setTaxReassessment] = useState<number>(params.taxReassessment);
  const [rentGrowth, setRentGrowth] = useState<number>(params.rentGrowthOverride ?? 3);
  const [expenseGrowth, setExpenseGrowth] = useState<number>(params.expenseGrowthOverride ?? 2.5);

  // Sync state from parent parameters (e.g. if presets change it from outside)
  useEffect(() => {
    setVacancy(params.vacancyRate);
    setInterestSpike(params.interestRateSpike);
    setOpexOverrun(params.opexOverrun);
    setTaxReassessment(params.taxReassessment);
    setRentGrowth(params.rentGrowthOverride ?? 3);
    setExpenseGrowth(params.expenseGrowthOverride ?? 2.5);
  }, [params]);

  const applyPreset = (presetName: string) => {
    setPreset(presetName);
    let newParams: StressParameters;

    if (presetName === "baseline") {
      newParams = {
        vacancyRate: 5,
        interestRateSpike: 0,
        opexOverrun: 0,
        taxReassessment: 0,
        rentGrowthOverride: 3,
        expenseGrowthOverride: 2.5,
      };
    } else if (presetName === "softening") {
      newParams = {
        vacancyRate: 10,
        interestRateSpike: 1,
        opexOverrun: 0,
        taxReassessment: 0,
        rentGrowthOverride: 0,
        expenseGrowthOverride: 3.0,
      };
    } else if (presetName === "worst_case") {
      newParams = {
        vacancyRate: 15,
        interestRateSpike: 2,
        opexOverrun: 20,
        taxReassessment: 30,
        rentGrowthOverride: -2,
        expenseGrowthOverride: 4.0,
      };
    } else {
      return; // custom
    }

    onChange(newParams);
  };

  const handleSliderChange = (key: keyof StressParameters, val: number) => {
    setPreset("custom");
    const updated = {
      ...params,
      [key]: val,
    };
    onChange(updated);
  };

  return (
    <aside
      className="w-full lg:w-[320px] shrink-0 bg-white rounded-lg border border-neutral-100 shadow-sm shadow-neutral-100 p-6 flex flex-col gap-6"
      style={{
        boxShadow: "0 2px 12px rgba(69, 73, 85, 0.04), 0 8px 30px rgba(69, 73, 85, 0.02)",
      }}
    >
      {/* Title */}
      <div>
        <h3
          className="text-neutral-900 text-[15px] font-bold tracking-tight mb-1"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Risk Stress Simulator
        </h3>
        <p
          className="text-neutral-500 text-[12px] leading-relaxed"
          style={{ fontFamily: "'Roboto', sans-serif" }}
        >
          Adjust variables to simulate macro market impacts on yields in real time.
        </p>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="stress-preset-select"
          className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider"
          style={{ fontFamily: "'Roboto', sans-serif" }}
        >
          Scenario Preset
        </label>
        <div className="relative">
          <select
            id="stress-preset-select"
            value={preset}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-[13px] rounded-md px-3 py-2 cursor-pointer appearance-none hover:bg-neutral-100 hover:border-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1 transition-all"
            style={{ fontFamily: "'Roboto', sans-serif" }}
          >
            <option value="baseline">Baseline Stabilized (Normal)</option>
            <option value="softening">Market Softening (Stressed)</option>
            <option value="worst_case">Worst-Case Scenario (Severe)</option>
            <option value="custom">Custom Configuration</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-neutral-500">
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 my-1" />

      {/* Sliders Container */}
      <div className="flex flex-col gap-5">
        {/* Vacancy Rate */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <span
              className="font-medium text-neutral-600"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Vacancy Rate
            </span>
            <span
              className="font-mono text-neutral-900 font-bold"
              style={{ fontFamily: "'PT Mono', monospace" }}
            >
              {vacancy.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="0.5"
            value={vacancy}
            onChange={(e) => handleSliderChange("vacancyRate", parseFloat(e.target.value))}
            className="w-full h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            aria-label="Vacancy Rate percentage override"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
            <span>0%</span>
            <span>25%</span>
          </div>
        </div>

        {/* Interest Rate Spike */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <span
              className="font-medium text-neutral-600"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Interest Rate Spike
            </span>
            <span
              className="font-mono text-neutral-900 font-bold"
              style={{ fontFamily: "'PT Mono', monospace" }}
            >
              +{interestSpike.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={interestSpike}
            onChange={(e) => handleSliderChange("interestRateSpike", parseFloat(e.target.value))}
            className="w-full h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            aria-label="Interest Rate Spike percentage adjustment"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
            <span>+0%</span>
            <span>+3%</span>
          </div>
        </div>

        {/* Operating Expense Overruns */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <span
              className="font-medium text-neutral-600"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              OpEx Overruns
            </span>
            <span
              className="font-mono text-neutral-900 font-bold"
              style={{ fontFamily: "'PT Mono', monospace" }}
            >
              +{opexOverrun.toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={opexOverrun}
            onChange={(e) => handleSliderChange("opexOverrun", parseInt(e.target.value, 10))}
            className="w-full h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            aria-label="Operating Expense Overrun percentage increase"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
            <span>+0%</span>
            <span>+50%</span>
          </div>
        </div>

        {/* Post-Sale Property Tax Reassessment */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <span
              className="font-medium text-neutral-600"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Tax Reassessment Spike
            </span>
            <span
              className="font-mono text-neutral-900 font-bold"
              style={{ fontFamily: "'PT Mono', monospace" }}
            >
              +{taxReassessment.toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={taxReassessment}
            onChange={(e) => handleSliderChange("taxReassessment", parseInt(e.target.value, 10))}
            className="w-full h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            aria-label="Post-Sale Property Tax Reassessment percentage increase"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
            <span>+0%</span>
            <span>+40%</span>
          </div>
        </div>

        {/* Rent Growth Rate */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <span
              className="font-medium text-neutral-600"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Annual Rent Growth
            </span>
            <span
              className="font-mono text-neutral-900 font-bold"
              style={{ fontFamily: "'PT Mono', monospace" }}
            >
              {rentGrowth.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="-5"
            max="10"
            step="0.5"
            value={rentGrowth}
            onChange={(e) => handleSliderChange("rentGrowthOverride", parseFloat(e.target.value))}
            className="w-full h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            aria-label="Annual Rent Growth percentage override"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
            <span>-5%</span>
            <span>+10%</span>
          </div>
        </div>

        {/* Expense Growth Rate */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <span
              className="font-medium text-neutral-600"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Annual Expense Inflation
            </span>
            <span
              className="font-mono text-neutral-900 font-bold"
              style={{ fontFamily: "'PT Mono', monospace" }}
            >
              {expenseGrowth.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={expenseGrowth}
            onChange={(e) => handleSliderChange("expenseGrowthOverride", parseFloat(e.target.value))}
            className="w-full h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            aria-label="Annual Expense Inflation percentage override"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
            <span>0%</span>
            <span>+10%</span>
          </div>
        </div>
      </div>

      {/* Disclaimer / Info */}
      <div className="mt-auto bg-neutral-50 rounded-md p-3 border border-neutral-100">
        <div className="flex gap-2 items-start">
          <span className="material-symbols-outlined text-[15px] text-neutral-500 mt-0.5">info</span>
          <span
            className="text-[10px] text-neutral-500 leading-relaxed"
            style={{ fontFamily: "'Roboto', sans-serif" }}
          >
            These stress metrics apply to pro forma calculations dynamically and reflect in portfolio-level DSCR and yield models.
          </span>
        </div>
      </div>
    </aside>
  );
}

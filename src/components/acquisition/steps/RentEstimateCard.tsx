"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

interface RentEstimateCardProps {
  projectId: string;
  value: string | number;
  onChange: (value: string, source: "rentcast" | "user") => void;
  initialSource?: string;
}

async function getProjectFacts(projectId: string, idToken: string) {
  const res = await fetch(`/api/reil/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Project fetch failed: ${res.status}`);
  return res.json();
}

export function RentEstimateCard({ projectId, value, onChange, initialSource }: RentEstimateCardProps) {
  const { user } = useAuth();
  const [useEstimate, setUseEstimate] = useState(initialSource === "rentcast");

  const { data, isLoading } = useQuery({
    queryKey: ["project-facts-rent-card", projectId],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) throw new Error("Not ready");
      return getProjectFacts(projectId, token);
    },
    enabled: !!projectId && !!user,
  });

  const facts = data?.propertyFacts;
  const rentCents = facts?.estRentCents ? Number(facts.estRentCents) : null;
  const rentLowCents = facts?.estRentLowCents ? Number(facts.estRentLowCents) : null;
  const rentHighCents = facts?.estRentHighCents ? Number(facts.estRentHighCents) : null;
  const fetchedAt = facts?.fetchedAt ? new Date(facts.fetchedAt) : null;

  const rentEstimate = rentCents ? rentCents / 100 : null;
  const rentLow = rentLowCents ? rentLowCents / 100 : null;
  const rentHigh = rentHighCents ? rentHighCents / 100 : null;

  // Handle setting/syncing estimate value on load or toggle
  useEffect(() => {
    if (useEstimate && rentEstimate) {
      onChange(String(rentEstimate), "rentcast");
    }
  }, [useEstimate, rentEstimate]);

  const handleToggle = (estimateMode: boolean) => {
    setUseEstimate(estimateMode);
    if (estimateMode && rentEstimate) {
      onChange(String(rentEstimate), "rentcast");
    } else {
      onChange("", "user");
    }
  };

  const handleInputChange = (val: string) => {
    onChange(val, "user");
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-lg rounded-2xl p-5 border border-white/5 bg-pw-bg animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
        <div className="h-8 bg-white/10 rounded w-full mb-3" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  // If no RentCast estimate is available, degrade gracefully to a simple currency input
  if (!rentEstimate) {
    return (
      <div className="space-y-2 w-full max-w-lg">
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-text-secondary">$</span>
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="0.00"
            className="pw-input text-lg py-3 pl-10 pr-4 w-full border border-pw-border focus:outline-none tabular-nums"
          />
        </div>
        <p className="text-[10px] text-text-secondary flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">info</span>
          No rent estimate available from RentCast for this area. Using custom entry.
        </p>
      </div>
    );
  }

  // Range bar position calculation (percentage)
  const rangeWidth = (rentHigh && rentLow) ? rentHigh - rentLow : 0;
  const pointOffsetPercent = (rangeWidth > 0 && rentEstimate && rentLow)
    ? ((rentEstimate - rentLow) / rangeWidth) * 100
    : 50;

  return (
    <div
      className="w-full max-w-lg rounded-2xl p-5 border transition-all duration-150"
      style={{
        background: "rgba(22,19,24,0.6)",
        borderColor: useEstimate ? "rgba(69,73,85,0.3)" : "rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Point Estimate & Range Text */}
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Rent AVM Estimate
          </span>
          <h4 className="text-2xl font-bold text-text-primary mt-0.5">
            ${rentEstimate.toLocaleString()}<span className="text-sm font-normal text-text-secondary">/mo</span>
          </h4>
        </div>
        {rentLow && rentHigh && (
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              Range
            </span>
            <p className="text-sm font-semibold text-text-primary mt-0.5">
              ${rentLow.toLocaleString()} – ${rentHigh.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Range Bar Visualization */}
      {rentLow && rentHigh && (
        <div className="space-y-1 mb-5">
          <div className="relative w-full h-2 rounded-full bg-white/10 overflow-visible">
            {/* The AVM point indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full bg-text-primary border-2 border-pw-bg flex items-center justify-center shadow-lg"
              style={{ left: `${pointOffsetPercent}%` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#454955]" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-text-secondary tracking-wide">
            <span>Low: ${rentLow.toLocaleString()}</span>
            <span>High: ${rentHigh.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Toggle Selector */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/5 mb-4">
        <button
          type="button"
          onClick={() => handleToggle(true)}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5"
          style={{
            background: useEstimate ? "rgba(69,73,85,0.15)" : "transparent",
            color: useEstimate ? "rgba(253,255,252,0.9)" : "rgba(253,255,252,0.4)",
            border: useEstimate ? "1px solid rgba(69,73,85,0.2)" : "1px solid transparent",
          }}
        >
          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
          Use RentCast Default
        </button>
        <button
          type="button"
          onClick={() => handleToggle(false)}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5"
          style={{
            background: !useEstimate ? "rgba(69,73,85,0.15)" : "transparent",
            color: !useEstimate ? "rgba(253,255,252,0.9)" : "rgba(253,255,252,0.4)",
            border: !useEstimate ? "1px solid rgba(69,73,85,0.2)" : "1px solid transparent",
          }}
        >
          <span className="material-symbols-outlined text-[14px]">edit</span>
          Custom Override
        </button>
      </div>

      {/* Input or Metadata Display */}
      {useEstimate ? (
        <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
          <span className="material-symbols-outlined text-[14px] text-[#454955]">verified</span>
          <span className="text-[10px] text-text-secondary">
            Sourced from <span className="font-semibold">RentCast AVM</span>
            {fetchedAt ? ` · As of ${fetchedAt.toLocaleDateString()}` : ""}
          </span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="relative w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-text-secondary">$</span>
            <input
              type="number"
              value={useEstimate ? String(rentEstimate) : value}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="0.00"
              className="pw-input text-lg py-3 pl-10 pr-4 w-full border border-pw-border focus:outline-none tabular-nums"
              autoFocus
            />
          </div>
          <p className="text-[9px] text-[#ffd1aa]">
            * Overriding the estimate will mark this parameter as user-entered.
          </p>
        </div>
      )}
    </div>
  );
}

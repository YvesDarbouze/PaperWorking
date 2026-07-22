"use client";

import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";

export function IntakeStep({ onNext }: { onNext: () => void }) {
  const { intake, setIntake } = useAcquisitionWizard();

  const journeyOptions = [
    {
      key: "targeting",
      label: "Targeting",
      description: "Researching properties, running underwriting, or preparing initial offers.",
      icon: "search",
    },
    {
      key: "under_contract",
      label: "Under contract",
      description: "Purchase agreement signed, in due diligence. (Skips to terms backfill)",
      icon: "handshake",
    },
    {
      key: "owned_closing",
      label: "Owned—funding/closing",
      description: "Acquisition complete. Opening capital raise room and title validation.",
      icon: "account_balance",
    },
    {
      key: "renovating_marketing",
      label: "Owned—renovating/marketing",
      description: "Rehab construction active, or currently marketing to tenants/buyers.",
      icon: "construction",
    },
    {
      key: "rented_leased_sold",
      label: "Already rented, leased, or sold",
      description: "Log historic deal performance and exit returns. (Retrospective Mode)",
      icon: "assignment_turned_in",
    },
  ] as const;

  const dispositionTypeOptions = [
    {
      key: "SALE",
      label: "Full Sale",
      description: "Fix & Flip, immediate liquidation, or full redevelopment exit strategy.",
      icon: "sell",
    },
    {
      key: "LEASE",
      label: "Lease",
      description: "Commercial lease, corporate housing, or tenant lease stabilization.",
      icon: "vpn_key",
    },
    {
      key: "RENT",
      label: "Rent",
      description: "Long-term residential rental or Buy & Hold exit strategy.",
      icon: "home",
    },
  ] as const;

  const canAdvance = !!intake.journey && !!intake.dispositionType;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 pb-10">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold mb-2" style={{ color: "rgba(253,255,252,0.95)" }}>
          Project Intake Router
        </h3>
        <p className="text-sm" style={{ color: "rgba(253,255,252,0.45)" }}>
          Establish the deal strategy and current progress to configure your investment workspace.
        </p>
      </div>

      {/* Question 1: Journey */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold uppercase tracking-wider" style={{ color: "rgba(253,255,252,0.6)" }}>
          Where is this property in its journey right now?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {journeyOptions.map((opt) => {
            const isSelected = intake.journey === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setIntake({ journey: opt.key })}
                className="flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200"
                style={{
                  background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                  border: isSelected ? "1px solid #F59E0B" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: isSelected ? "0 0 12px rgba(245,158,11,0.15)" : "none",
                }}
              >
                <span
                  className="material-symbols-outlined text-[22px] mt-0.5 flex-shrink-0"
                  style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.3)" }}
                >
                  {opt.icon}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold" style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.9)" }}>
                    {opt.label}
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: "rgba(253,255,252,0.4)" }}>
                    {opt.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question 2: Deal Type */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold uppercase tracking-wider" style={{ color: "rgba(253,255,252,0.6)" }}>
          Is this deal a full sale or a lease?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {dispositionTypeOptions.map((opt) => {
            const isSelected = intake.dispositionType === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setIntake({ dispositionType: opt.key })}
                className="flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200"
                style={{
                  background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                  border: isSelected ? "1px solid #F59E0B" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: isSelected ? "0 0 12px rgba(245,158,11,0.15)" : "none",
                }}
              >
                <span
                  className="material-symbols-outlined text-[22px] mt-0.5 flex-shrink-0"
                  style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.3)" }}
                >
                  {opt.icon}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold" style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.9)" }}>
                    {opt.label}
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: "rgba(253,255,252,0.4)" }}>
                    {opt.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action / Next */}
      <div className="flex justify-end pt-4 border-t border-white/5">
        <button
          disabled={!canAdvance}
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            background: canAdvance ? "#454955" : "rgba(255,255,255,0.06)",
            color: canAdvance ? "#0d0a0b" : "rgba(253,255,252,0.25)",
            cursor: canAdvance ? "pointer" : "not-allowed",
          }}
        >
          Continue
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

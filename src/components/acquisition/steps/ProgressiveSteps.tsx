"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronRight, Check } from "lucide-react";

interface StepProps {
  onNext: () => void;
  onBack: () => void;
}

// ─── WHY WE ASK COMPONENT ─────────────────────────────────────────────────────
function WhyWeAsk({ rationale }: { rationale: string }) {
  return (
    <div className="mt-8 p-4 rounded-xl bg-surface-container-low border border-pw-border/50">
      <p className="text-xs font-semibold text-amber-500 mb-1 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5" /> Why we ask
      </p>
      <p className="text-xs text-[var(--color-muted)] leading-relaxed">{rationale}</p>
    </div>
  );
}

// ─── BUTTON GROUP COMPONENT ───────────────────────────────────────────────────
function ActionButtons({
  canAdvance,
  onNext,
  onBack,
  nextLabel = "Continue"
}: {
  canAdvance: boolean;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/5">
      <button
        onClick={onBack}
        className="flex items-center justify-center h-11 px-5 rounded-xl border border-pw-border bg-transparent text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] hover:text-white transition-colors"
      >
        Back
      </button>
      <button
        disabled={!canAdvance}
        onClick={onNext}
        className="flex items-center justify-center gap-1.5 h-11 px-6 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-150"
        style={{
          background: canAdvance ? "#454955" : "rgba(255,255,252,0.04)",
          color: canAdvance ? "#0d0a0b" : "rgba(253,255,252,0.2)",
          cursor: canAdvance ? "pointer" : "not-allowed",
        }}
      >
        {nextLabel}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── STEP 2: PROJECT NAME ─────────────────────────────────────────────────────
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";

export function ProjectNameStep({ onNext, onBack }: StepProps) {
  const { projectName, setProjectName } = useAcquisitionWizard();
  const [val, setVal] = useState(projectName);

  const handleNext = () => {
    setProjectName(val);
    onNext();
  };

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          Name your project
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Give this transaction a clear, descriptive display name.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
          Project Display Name *
        </label>
        <input
          id="project-name-wizard-input"
          type="text"
          className="w-full h-12 rounded-xl px-4 bg-[#241e26] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#454955] text-sm"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g. Brooklyn Heights Victorian"
        />
      </div>

      <WhyWeAsk rationale="A recognizable name helps you identify this project on your dashboard, invite collaborators, and find details in multi-project reports." />

      <ActionButtons canAdvance={!!val.trim()} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 3: DISPOSITION STRATEGY ─────────────────────────────────────────────
export function StrategyStep({ onNext, onBack }: StepProps) {
  const { strategy, setStrategy } = useAcquisitionWizard();

  const options = [
    {
      key: "RENT",
      label: "Buy & Hold (Rent)",
      description: "Acquire, stabilize, and rent out residential multi-family/single-family units.",
      icon: "home",
    },
    {
      key: "LEASE",
      label: "Stabilize & Lease",
      description: "Acquire and lease out under NNN, modified gross, or commercial contract.",
      icon: "vpn_key",
    },
    {
      key: "SALE",
      label: "Fix & Flip (Sale)",
      description: "Renovate immediately and sell back to the market for short-term gains.",
      icon: "sell",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          Select investment strategy
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          What is the primary disposition strategy for this property?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {options.map((opt) => {
          const isSelected = strategy === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setStrategy(opt.key)}
              className="flex items-start gap-4 p-4 rounded-xl text-left border transition-all duration-200"
              style={{
                background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                borderColor: isSelected ? "#F59E0B" : "rgba(255,255,255,0.08)",
                boxShadow: isSelected ? "0 0 12px rgba(245,158,11,0.1)" : "none",
              }}
            >
              <span
                className="material-symbols-outlined text-[22px] mt-0.5 flex-shrink-0"
                style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.3)" }}
              >
                {opt.icon}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-white">
                  {opt.label}
                </span>
                <span className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {opt.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <WhyWeAsk rationale="Your strategy locks downstream renovation schedules, carrying cost calculation sheets, tax guidelines, and exit realization gates. This is locked once acquisition is complete." />

      <ActionButtons canAdvance={!!strategy} onNext={onNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 4: PIPELINE STATUS ──────────────────────────────────────────────────
export function StatusStep({ onNext, onBack }: StepProps) {
  const { status, setStatus } = useAcquisitionWizard();

  const options = [
    {
      key: "PROSPECT",
      label: "Prospect / Lead",
      description: "Evaluating metrics, compiling comparables, or preparing initial purchase offers.",
      icon: "search",
    },
    {
      key: "UNDER_CONTRACT",
      label: "Under Contract",
      description: "Purchase contract is signed and escrow deposits are logged. Under active due diligence.",
      icon: "handshake",
    },
    {
      key: "OWNED",
      label: "Owned (Closing Complete)",
      description: "Acquisition realized. Title is secured and property operations are active.",
      icon: "check_box",
    },
  ] as const;

  const currentStatus = status.acquisitionStatus || "";

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          Where does the deal stand?
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Select the initial pipeline stage for this project.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {options.map((opt) => {
          const isSelected = currentStatus === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setStatus({ acquisitionStatus: opt.key })}
              className="flex items-start gap-4 p-4 rounded-xl text-left border transition-all duration-200"
              style={{
                background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                borderColor: isSelected ? "#F59E0B" : "rgba(255,255,255,0.08)",
                boxShadow: isSelected ? "0 0 12px rgba(245,158,11,0.1)" : "none",
              }}
            >
              <span
                className="material-symbols-outlined text-[22px] mt-0.5 flex-shrink-0"
                style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.3)" }}
              >
                {opt.icon}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-white">
                  {opt.label}
                </span>
                <span className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {opt.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <WhyWeAsk rationale="Sets the entry phase inside the 4-Phase framework (Acquisition, Funding, Hold, Exit) and unlocks corresponding task timelines automatically." />

      <ActionButtons canAdvance={!!currentStatus} onNext={onNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 5: PROPERTY TYPE ────────────────────────────────────────────────────
export function PropertyTypeStep({ onNext, onBack }: StepProps) {
  const { propertyType, setPropertyType } = useAcquisitionWizard();

  const options = [
    "Single Family",
    "Multi-Family 2-4 Units",
    "Multi-Family 5+ Units",
    "Condo",
    "Townhouse",
    "Commercial",
    "Land"
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          Select property classification
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          What is the primary structure classification of this asset?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = propertyType === opt;
          return (
            <button
              key={opt}
              onClick={() => setPropertyType(opt)}
              className="flex items-center justify-between h-12 px-4 rounded-xl text-xs font-bold border transition-all duration-200"
              style={{
                background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                borderColor: isSelected ? "#F59E0B" : "rgba(255,255,255,0.08)",
                color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.85)",
              }}
            >
              {opt}
              {isSelected && <Check className="w-4 h-4 text-[#F59E0B]" />}
            </button>
          );
        })}
      </div>

      <WhyWeAsk rationale="Determines tax depreciation periods, structural insurance expectations, and sets appropriate units fields automatically." />

      <ActionButtons canAdvance={!!propertyType} onNext={onNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 6: UNITS COUNT ──────────────────────────────────────────────────────
export function UnitsStep({ onNext, onBack }: StepProps) {
  const { units, setUnits } = useAcquisitionWizard();
  const [val, setVal] = useState(units);

  const handleNext = () => {
    setUnits(val);
    onNext();
  };

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          How many units?
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Enter the total count of individual rentable units.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
          Number of Units *
        </label>
        <input
          type="number"
          min="1"
          className="w-full h-12 rounded-xl px-4 bg-[#241e26] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#454955] text-sm font-mono"
          value={val}
          onChange={(e) => setVal(Math.max(1, parseInt(e.target.value) || 1))}
        />
      </div>

      <WhyWeAsk rationale="We use the unit count to initialize your Rent Roll matrix, model individual unit leases, and calculate occupancy KPI percentages." />

      <ActionButtons canAdvance={val > 0} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 7: CONDITION ────────────────────────────────────────────────────────
export function ConditionStep({ onNext, onBack }: StepProps) {
  const { condition, setCondition } = useAcquisitionWizard();

  const options = [
    { key: "turnkey", label: "Turnkey (Ready)", desc: "No structural or aesthetic rehab required." },
    { key: "rehab-light", label: "Light Refurbish", desc: "Aesthetic painting, touch-ups, or minor staging work." },
    { key: "rehab-heavy", label: "Heavy Renovate", desc: "Mechanical updates, kitchen/bath replacement, major fixes." },
    { key: "gut", label: "Gut / Redevelop", desc: "Full framing strip, structural alterations, or ground-up build." }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          Select target condition
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          What is the physical condition of the property at entry?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((opt) => {
          const isSelected = condition === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setCondition(opt.key)}
              className="flex flex-col p-4 rounded-xl text-left border transition-all duration-200"
              style={{
                background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                borderColor: isSelected ? "#F59E0B" : "rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-sm font-bold text-white mb-0.5">{opt.label}</span>
              <span className="text-xs text-[var(--color-muted)] leading-relaxed">{opt.desc}</span>
            </button>
          );
        })}
      </div>

      <WhyWeAsk rationale="Helps pre-configure the Scope of Work contractor slots and flags CapEx budget warnings dynamically during due diligence." />

      <ActionButtons canAdvance={!!condition} onNext={onNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 8: OWNERSHIP STRUCTURE ──────────────────────────────────────────────
export function OwnershipStep({ onNext, onBack }: StepProps) {
  const { ownership, setOwnership } = useAcquisitionWizard();

  const options = [
    { key: "INDIVIDUAL", label: "Sole Owner", desc: "Held under personal individual title." },
    { key: "CO_OWNERSHIP", label: "Co-Ownership / JV", desc: "Multiple individual partners under Joint Venture contract." },
    { key: "ENTITY", label: "Corporate Entity", desc: "Held under a legal Entity (LLC, S-Corp, Partnership)." }
  ];

  const currentStruct = ownership.ownershipStructure || "";

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          Select ownership structure
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          How will the legal title of the property be held?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((opt) => {
          const isSelected = currentStruct === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setOwnership({ ownershipStructure: opt.key })}
              className="flex flex-col p-4 rounded-xl text-left border transition-all duration-200"
              style={{
                background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                borderColor: isSelected ? "#F59E0B" : "rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-sm font-bold text-white mb-0.5">{opt.label}</span>
              <span className="text-xs text-[var(--color-muted)] leading-relaxed">{opt.desc}</span>
            </button>
          );
        })}
      </div>

      <WhyWeAsk rationale="Ownership structure sets up the equity distribution splits and coordinates the correct closing title milestones automatically." />

      <ActionButtons canAdvance={!!currentStruct} onNext={onNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 9: ENTITY LEGAL DETAILS ─────────────────────────────────────────────
export function EntityNameStep({ onNext, onBack }: StepProps) {
  const { ownership, setOwnership } = useAcquisitionWizard();
  const [name, setName] = useState(ownership.entityName ?? "");
  const [type, setType] = useState(ownership.entityType ?? "LLC");

  const handleNext = () => {
    setOwnership({ entityName: name, entityType: type });
    onNext();
  };

  const entityTypes = ["LLC", "Corporation", "S-Corp", "Trust", "Partnership", "Other"];

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          Enter legal entity details
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Input the details of the corporate entity holding the property title.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
            Legal Entity Name *
          </label>
          <input
            type="text"
            className="w-full h-12 rounded-xl px-4 bg-[#241e26] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#454955] text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Acquisitions LLC"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
            Entity Type *
          </label>
          <select
            className="w-full h-12 rounded-xl px-4 bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {entityTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <WhyWeAsk rationale="We need the registered entity name to pre-fill the promissory notes, deed transfers, and closing packages for title confirmation." />

      <ActionButtons canAdvance={!!name.trim()} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 10: PURCHASE PRICE ──────────────────────────────────────────────────
export function PurchasePriceStep({ onNext, onBack }: StepProps) {
  const { purchasePrice, setPurchasePrice } = useAcquisitionWizard();
  const [val, setVal] = useState(purchasePrice ? (purchasePrice / 100).toString() : "");

  const handleNext = () => {
    const numeric = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
    setPurchasePrice(Math.round(numeric * 100));
    onNext();
  };

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          What is the target purchase price?
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Enter the target contract purchase price for the property.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
          Target Purchase Price ($) *
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-white/40">$</span>
          <input
            type="text"
            className="w-full h-12 rounded-xl pl-8 pr-4 bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] text-sm font-mono"
            value={val}
            onChange={(e) => {
              const stripped = e.target.value.replace(/[^0-9.]/g, "");
              setVal(stripped);
            }}
            placeholder="e.g. 350,000"
          />
        </div>
      </div>

      <WhyWeAsk rationale="Purchase price is the foundation of all underwriting models, LTV calculations, lender debt financing, and escrow variance checks." />

      <ActionButtons canAdvance={parseFloat(val) > 0} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

// ─── STEP 11: REHAB BUDGET ────────────────────────────────────────────────────
export function RehabBudgetStep({ onNext, onBack }: StepProps) {
  const { rehabBudget, setRehabBudget } = useAcquisitionWizard();
  const [val, setVal] = useState(rehabBudget ? (rehabBudget / 100).toString() : "0");

  const handleNext = () => {
    const numeric = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
    setRehabBudget(Math.round(numeric * 100));
    onNext();
  };

  return (
    <div className="flex flex-col gap-6 max-w-[560px] w-full mx-auto animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white/95">
          Estimated Renovation Budget
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Input your initial target CapEx refurbishment budget. Enter 0 if turnkey.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
          Estimated Renovation Budget ($) *
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-white/40">$</span>
          <input
            type="text"
            className="w-full h-12 rounded-xl pl-8 pr-4 bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] text-sm font-mono"
            value={val}
            onChange={(e) => {
              const stripped = e.target.value.replace(/[^0-9.]/g, "");
              setVal(stripped);
            }}
            placeholder="0"
          />
        </div>
      </div>

      <WhyWeAsk rationale="Allows estimating complete cost basis upfront (Purchase Price + Rehab) to calculate IRR and cash-on-cash yield indicators prior to project activation." />

      <ActionButtons canAdvance={val !== ""} onNext={handleNext} onBack={onBack} />
    </div>
  );
}

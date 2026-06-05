"use client";

import { useState, useCallback } from "react";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";
import { OwnershipStructure, OWNERSHIP_CARDS } from "@/lib/enums";

const ENTITY_TYPES = ["LLC", "Corporation", "S-Corp", "Trust", "Limited Partnership", "General Partnership", "Other"];

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnershipStep({ onNext }: { onNext: () => void }) {
  const { ownership, status, setOwnership, setStepDone } = useAcquisitionWizard();

  const selectedStructure = (ownership.ownershipStructure as OwnershipStructure) ?? null;
  const selectedCard      = OWNERSHIP_CARDS.find(c => c.value === selectedStructure) ?? null;

  // Local state for entity / co-owner fields (mirrors store)
  const [entityType, setEntityType] = useState(ownership.entityType ?? "");
  const [entityName, setEntityName] = useState(ownership.entityName ?? "");
  const [coOwners,   setCoOwners]   = useState<string[]>(ownership.coOwners ?? [""]);

  const handleStructureSelect = useCallback(
    (s: OwnershipStructure) => {
      setOwnership({ ownershipStructure: s });
      // Reset branch fields when structure changes
      if (s !== selectedStructure) {
        setEntityType("");
        setEntityName("");
        setCoOwners([""]);
        setOwnership({ entityType: undefined, entityName: undefined, coOwners: [] });
      }
    },
    [setOwnership, selectedStructure],
  );

  const handleEntityType = useCallback(
    (v: string) => { setEntityType(v); setOwnership({ entityType: v || undefined }); },
    [setOwnership],
  );

  const handleEntityName = useCallback(
    (v: string) => { setEntityName(v); setOwnership({ entityName: v || undefined }); },
    [setOwnership],
  );

  const handleCoOwnerChange = useCallback(
    (idx: number, val: string) => {
      const next = coOwners.map((c, i) => (i === idx ? val : c));
      setCoOwners(next);
      setOwnership({ coOwners: next.filter(Boolean) });
    },
    [coOwners, setOwnership],
  );

  const addCoOwner = useCallback(() => {
    setCoOwners(prev => [...prev, ""]);
  }, []);

  const removeCoOwner = useCallback(
    (idx: number) => {
      const next = coOwners.filter((_, i) => i !== idx);
      setCoOwners(next.length ? next : [""]);
      setOwnership({ coOwners: next.filter(Boolean) });
    },
    [coOwners, setOwnership],
  );

  // Determine if the step is skippable (early-stage deals don't need this)
  const acqStatus = ownership.ownershipStructure ? null : status.acquisitionStatus;
  const isEarlyStage =
    !acqStatus ||
    acqStatus === "PROSPECT" ||
    acqStatus === "OFFER_MADE";

  const canContinue = !!selectedStructure;

  return (
    <div className="flex flex-col gap-8 max-w-[680px] w-full mx-auto">

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "rgba(218,228,236,0.95)", letterSpacing: "-0.02em" }}>
          Ownership Structure
        </h2>
        <p className="text-sm" style={{ color: "rgba(218,228,236,0.4)" }}>
          How will title be held?{" "}
          {isEarlyStage && (
            <span style={{ color: "rgba(218,228,236,0.25)" }}>
              You can skip this for now and set it before closing.
            </span>
          )}
        </p>
      </div>

      {/* 6 structure cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {OWNERSHIP_CARDS.map(card => {
          const active = selectedStructure === card.value;
          return (
            <button
              key={card.value}
              onClick={() => handleStructureSelect(card.value)}
              className="flex flex-col gap-3 p-4 rounded-xl text-left transition-all duration-150"
              style={{
                background: active ? "rgba(87,241,219,0.08)" : "rgba(20,29,35,0.65)",
                border:     `1px solid ${active ? "rgba(87,241,219,0.28)" : "rgba(255,255,255,0.08)"}`,
                boxShadow:  active ? "0 0 0 3px rgba(87,241,219,0.05)" : "none",
              }}
            >
              {/* Icon + title row */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? "rgba(87,241,219,0.14)" : "rgba(255,255,255,0.06)" }}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ color: active ? "#57f1db" : "rgba(218,228,236,0.4)", fontVariationSettings: "'FILL' 0" }}
                  >
                    {card.icon}
                  </span>
                </div>
                <span
                  className="text-[13px] font-semibold leading-tight"
                  style={{ color: active ? "#57f1db" : "rgba(218,228,236,0.85)" }}
                >
                  {card.title}
                </span>
                {active && (
                  <span className="ml-auto material-symbols-outlined text-[16px]" style={{ color: "#57f1db", fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-[12px] leading-relaxed" style={{ color: "rgba(218,228,236,0.4)" }}>
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Entity branch ── */}
      {selectedCard?.isEntity && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(20,29,35,0.7)", border: "1px solid rgba(87,241,219,0.15)" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "#57f1db" }}>Entity Details</p>

          {/* Entity type selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.4)" }}>
              Entity Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ENTITY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => handleEntityType(t)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{
                    background: entityType === t ? "rgba(87,241,219,0.12)" : "rgba(255,255,255,0.05)",
                    border:     `1px solid ${entityType === t ? "rgba(87,241,219,0.25)" : "rgba(255,255,255,0.08)"}`,
                    color:      entityType === t ? "#57f1db" : "rgba(218,228,236,0.55)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Entity name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.4)" }}>
              Entity Name
            </label>
            <input
              className="w-full rounded-xl px-4 py-3 text-sm bg-transparent outline-none"
              style={{ background: "rgba(14,22,28,0.8)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(218,228,236,0.9)" }}
              placeholder="e.g. Brooklyn Heights LLC"
              value={entityName}
              onChange={e => handleEntityName(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Co-owner branch ── */}
      {selectedCard?.isMultiOwner && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(20,29,35,0.7)", border: "1px solid rgba(173,198,255,0.15)" }}
        >
          <div className="flex justify-between items-center">
            <p className="text-[13px] font-semibold" style={{ color: "#adc6ff" }}>Co-Owners</p>
            <span className="text-[11px]" style={{ color: "rgba(218,228,236,0.3)" }}>
              Link to Members in a later phase
            </span>
          </div>

          <div className="space-y-2">
            {coOwners.map((name, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl px-4 py-3 text-sm bg-transparent outline-none"
                  style={{ background: "rgba(14,22,28,0.8)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(218,228,236,0.9)" }}
                  placeholder={`Co-owner ${idx + 1} full name`}
                  value={name}
                  onChange={e => handleCoOwnerChange(idx, e.target.value)}
                />
                {coOwners.length > 1 && (
                  <button
                    onClick={() => removeCoOwner(idx)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                  >
                    <span className="material-symbols-outlined text-[15px]" style={{ color: "#F06543" }}>close</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addCoOwner}
            className="flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: "#adc6ff" }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add co-owner
          </button>
        </div>
      )}

      {/* Continue / skip */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onNext}
          className="text-[12px]"
          style={{ color: "rgba(218,228,236,0.3)" }}
        >
          Skip for now →
        </button>
        <button
          disabled={!canContinue}
          onClick={() => { setStepDone("ownership"); onNext(); }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
          style={{
            background: canContinue ? "#57f1db" : "rgba(255,255,255,0.06)",
            color:      canContinue ? "#0b141a"  : "rgba(218,228,236,0.25)",
            cursor:     canContinue ? "pointer"  : "not-allowed",
          }}
        >
          Continue
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
